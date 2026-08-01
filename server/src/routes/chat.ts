import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { ZodError } from 'zod';
import { config } from '../config.js';
import { getConsultant, isKnownConsultantId } from '../consultants.js';
import { requireSession } from '../middleware/auth.js';
import { rateLimitSession } from '../middleware/rateLimit.js';
import { streamChat } from '../services/anthropic.js';
import { dailyTokenBudget } from '../services/rateLimit.js';
import { ChatStreamBodySchema, type SseEvent } from '../types.js';

export const chatRoutes = new Hono();

chatRoutes.post('/v1/chat/stream', requireSession, rateLimitSession, async (c) => {
  // Soft daily token budget check (global). We can't know usage before the
  // call, so we only reject when already over budget.
  if (
    config.dailyTokenBudget > 0 &&
    dailyTokenBudget.getUsed() >= config.dailyTokenBudget
  ) {
    return c.json(
      {
        error: 'Daily token budget exceeded',
        code: 'DAILY_BUDGET_EXCEEDED',
      },
      429,
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json(
      { error: 'Invalid JSON body', code: 'INVALID_JSON' },
      400,
    );
  }

  // Rough body-size guard (JSON already parsed; string length as proxy).
  try {
    const serialized = JSON.stringify(rawBody);
    if (serialized.length > config.maxBodyBytes) {
      return c.json(
        { error: 'Request body too large', code: 'BODY_TOO_LARGE' },
        413,
      );
    }
  } catch {
    return c.json(
      { error: 'Invalid request body', code: 'INVALID_BODY' },
      400,
    );
  }

  let body;
  try {
    body = ChatStreamBodySchema.parse(rawBody);
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: err.flatten(),
        },
        422,
      );
    }
    return c.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR' },
      422,
    );
  }

  // Reject if every message is empty/whitespace.
  const hasContent = body.messages.some((m) => m.content.trim().length > 0);
  if (!hasContent) {
    return c.json(
      {
        error: 'messages must contain at least one non-empty content field',
        code: 'EMPTY_MESSAGES',
      },
      400,
    );
  }

  if (!isKnownConsultantId(body.consultantId)) {
    return c.json(
      {
        error: `Unknown consultantId: ${body.consultantId}`,
        code: 'UNKNOWN_CONSULTANT',
      },
      400,
    );
  }

  const consultant = getConsultant(body.consultantId);
  if (!consultant) {
    return c.json(
      {
        error: `Unknown consultantId: ${body.consultantId}`,
        code: 'UNKNOWN_CONSULTANT',
      },
      400,
    );
  }

  // SECURITY: client-supplied systemInstruction is intentionally ignored.
  // System prompt comes only from the server-side consultant registry.
  const systemInstruction = consultant.systemInstruction;

  if (!config.anthropicApiKey) {
    return c.json(
      {
        error: 'Anthropic API key is not configured on the server',
        code: 'SERVER_MISCONFIGURED',
      },
      503,
    );
  }

  c.header('Cache-Control', 'no-cache, no-transform');
  c.header('X-Accel-Buffering', 'no');

  return streamSSE(c, async (stream) => {
    // Cancel upstream Anthropic work if the client disconnects (cost control).
    const abort = new AbortController();
    const onAbort = () => {
      if (!abort.signal.aborted) abort.abort();
    };
    c.req.raw.signal.addEventListener('abort', onAbort);
    stream.onAbort(() => onAbort());

    // Serialize SSE writes so concurrent delta callbacks cannot interleave.
    let writeChain: Promise<void> = Promise.resolve();
    const writeEvent = (event: SseEvent): Promise<void> => {
      writeChain = writeChain
        .then(() => stream.writeSSE({ data: JSON.stringify(event) }))
        .catch(() => {
          // Client may have disconnected mid-stream.
          onAbort();
        });
      return writeChain;
    };

    try {
      const result = await streamChat(
        {
          systemInstruction,
          messages: body.messages,
          signal: abort.signal,
        },
        (text) => {
          void writeEvent({ type: 'delta', text });
        },
      );

      // Drain pending deltas before the terminal event.
      await writeChain;

      const totalTokens =
        result.usage.input_tokens + result.usage.output_tokens;
      dailyTokenBudget.add(totalTokens);

      await writeEvent({
        type: 'done',
        usage: {
          input_tokens: result.usage.input_tokens,
          output_tokens: result.usage.output_tokens,
        },
      });
    } catch (err) {
      if (abort.signal.aborted) {
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Chat stream failed';
      // Never log API keys or full request bodies.
      console.error('[chat/stream] error', {
        error: message,
        consultantId: body.consultantId,
      });
      await writeChain;
      await writeEvent({ type: 'error', message: 'Upstream model error' });
    } finally {
      c.req.raw.signal.removeEventListener('abort', onAbort);
    }
  });
});
