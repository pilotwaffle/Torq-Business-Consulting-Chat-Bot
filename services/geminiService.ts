// AI service — ported from Google Gemini (@google/genai) to Anthropic Claude.
// The file name is kept as `geminiService.ts` only to avoid churning imports;
// it now talks to the Anthropic Messages API.
//
// SECURITY NOTE: This is a browser (Vite) app that calls Anthropic directly
// from client-side code, so the API key is bundled and `dangerouslyAllowBrowser`
// is required. This exposes the key to anyone who loads the site. It matches the
// prior Gemini setup and is fine for local/personal use — do NOT deploy this
// publicly with a live key. For a public deploy, move the call behind a small
// server-side proxy that holds the key.

import Anthropic from '@anthropic-ai/sdk';
import { Consultant, ChatMessage, ToolCallResponse, Attachment } from '../types';
import * as toolService from './toolService';

const MODEL = 'claude-sonnet-5';
// claude-sonnet-5 runs adaptive thinking by default (thinking counts against
// max_tokens). Give generous headroom so a thinking-heavy turn doesn't truncate
// the visible answer. Streaming is used, so a large cap doesn't risk HTTP timeouts.
const MAX_TOKENS = 32000;
const TITLE_MAX_TOKENS = 32;

let client: Anthropic | null = null;

const getClient = (): Anthropic => {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set.');
    }
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
};

// ---------------------------------------------------------------------------
// History conversion: our ChatMessage[] -> Anthropic MessageParam[]
// ---------------------------------------------------------------------------
// Anthropic is stateless: every request sends the full conversation. A model
// turn that made tool calls is an `assistant` message with `tool_use` blocks;
// the paired tool outputs are a following `user` message with `tool_result`
// blocks.

// Anthropic accepts only these image media types for base64 image blocks.
const SUPPORTED_IMAGE_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;
type SupportedImageMediaType = (typeof SUPPORTED_IMAGE_MEDIA_TYPES)[number];

function isSupportedImageMediaType(m: string): m is SupportedImageMediaType {
  return (SUPPORTED_IMAGE_MEDIA_TYPES as readonly string[]).includes(m);
}

function attachmentsToBlocks(attachments?: Attachment[]): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];
  if (!attachments) return blocks;
  for (const att of attachments) {
    if (att.source === 'base64') {
      // Skip unsupported image types rather than sending them and getting a 400.
      if (!isSupportedImageMediaType(att.mimeType)) {
        console.warn(`Unsupported image type "${att.mimeType}" for "${att.name}" — attachment skipped.`);
        continue;
      }
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: att.mimeType,
          data: att.data,
        },
      });
    }
    // 'text' attachments are folded into the prompt text by the caller.
  }
  return blocks;
}

function buildAnthropicHistory(history: ChatMessage[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  for (const msg of history) {
    if (msg.role === 'tool' && msg.toolCallResponses) {
      // Tool outputs -> a user message of tool_result blocks.
      messages.push({
        role: 'user',
        content: msg.toolCallResponses.map((tr) => ({
          type: 'tool_result' as const,
          tool_use_id: tr.id ?? tr.name,
          content: JSON.stringify(tr.response),
        })),
      });
      continue;
    }

    if (msg.role === 'model' && msg.toolCalls && msg.toolCalls.length > 0) {
      // Assistant turn that issued tool calls.
      const content: Anthropic.ContentBlockParam[] = [];
      if (msg.content) content.push({ type: 'text', text: msg.content });
      for (const call of msg.toolCalls) {
        content.push({
          type: 'tool_use',
          id: call.id ?? call.name,
          name: call.name,
          input: call.args ?? {},
        });
      }
      messages.push({ role: 'assistant', content });
      continue;
    }

    if (msg.role === 'model' || msg.role === 'user') {
      const role = msg.role === 'model' ? 'assistant' : 'user';
      const blocks: Anthropic.ContentBlockParam[] = [];
      if (msg.content) blocks.push({ type: 'text', text: msg.content });
      if (msg.role === 'user') blocks.push(...attachmentsToBlocks(msg.attachments));
      if (blocks.length === 0) continue;
      messages.push({ role, content: blocks });
    }
  }

  return messages;
}

// Build the `tools` array for a consultant: custom tools plus (optionally)
// Anthropic's server-side web_search tool where the consultant used Google search.
function buildTools(consultant: Consultant): Anthropic.ToolUnion[] | undefined {
  if (!consultant.tools) return undefined;
  const tools: Anthropic.ToolUnion[] = [];
  for (const group of consultant.tools) {
    if (group.functionDeclarations) {
      for (const fn of group.functionDeclarations) {
        tools.push({
          name: fn.name,
          description: fn.description,
          input_schema: fn.input_schema as Anthropic.Tool.InputSchema,
        });
      }
    }
    if (group.webSearch) {
      // Dynamic-filtering web search (supported on claude-sonnet-5): results are
      // filtered before reaching context, improving accuracy/token efficiency.
      tools.push({ type: 'web_search_20260209', name: 'web_search', max_uses: 5 } as Anthropic.ToolUnion);
    }
  }
  return tools.length > 0 ? tools : undefined;
}

// ---------------------------------------------------------------------------
// Streaming chat with the tool-use loop.
// ---------------------------------------------------------------------------
// Preserves the original interface: returns { stream, finalSession }.
// `finalSession` is a no-op placeholder — Anthropic keeps no server-side session;
// the App maintains conversation state in its message history.
export const getChatResponseStream = (
  consultant: Consultant,
  _session: unknown, // unused: Anthropic is stateless
  prompt: string,
  history: ChatMessage[],
  attachments: Attachment[] | undefined
) => {
  const stream = async function* (): AsyncGenerator<Partial<ChatMessage>, void, undefined> {
    const anthropic = getClient();
    const tools = buildTools(consultant);

    // Assemble the running message list from prior history + this user turn.
    const messages = buildAnthropicHistory(history);

    // Compose the current user turn (text + any image/text attachments).
    let userPrompt = prompt;
    const userBlocks: Anthropic.ContentBlockParam[] = [];
    if (attachments) {
      for (const att of attachments) {
        if (att.source === 'text') {
          userPrompt = `The user has provided the following file named "${att.name}":\n\n\`\`\`\n${att.data}\n\`\`\`\n\nNow, regarding this file, the user says: ${prompt}`;
        }
      }
      userBlocks.push(...attachmentsToBlocks(attachments));
    }
    // Only prepend a text block when there is actual text — an empty-text block
    // (or an empty content array) is rejected by the API with a 400.
    if (userPrompt.trim()) {
      userBlocks.unshift({ type: 'text', text: userPrompt });
    }
    if (userBlocks.length === 0) {
      throw new Error('Cannot send an empty message (no text and no valid attachments).');
    }
    messages.push({ role: 'user', content: userBlocks });

    // Tool-use loop: keep calling the model until it stops requesting tools.
    // Bounded to avoid runaway loops.
    for (let turn = 0; turn < 8; turn++) {
      const requestParams: Anthropic.MessageCreateParamsStreaming = {
        model: consultant.model || MODEL,
        max_tokens: MAX_TOKENS,
        system: consultant.systemInstruction,
        messages,
        stream: true,
        ...(tools ? { tools } : {}),
      };

      const streamResp = anthropic.messages.stream(requestParams);

      // Stream text deltas to the UI as they arrive.
      for await (const event of streamResp) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield { content: event.delta.text };
        }
      }

      const finalMessage = await streamResp.finalMessage();

      // Collect any tool_use blocks the model emitted this turn.
      const toolUseBlocks = finalMessage.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );

      // Surface web_search citations as grounding metadata (if present).
      const searchResults = finalMessage.content.filter(
        (b: any) => b.type === 'web_search_tool_result'
      ) as any[];
      if (searchResults.length > 0) {
        const grounding = searchResults.flatMap((r) =>
          Array.isArray(r.content)
            ? r.content
                .filter((c: any) => c.type === 'web_search_result')
                .map((c: any) => ({ uri: c.url, title: c.title }))
            : []
        );
        if (grounding.length > 0) {
          yield { groundingMetadata: grounding.map((g: any) => ({ web: g })) as any };
        }
      }

      if (toolUseBlocks.length === 0) {
        // No custom tools requested — the model is done (pause_turn from
        // server tools is resolved by the SDK internally in .finalMessage()).
        // Surface truncation instead of silently cutting off: adaptive thinking
        // is on by default for claude-sonnet-5, so a heavy turn can hit the cap.
        if (finalMessage.stop_reason === 'max_tokens') {
          yield { content: '\n\n_[Response truncated — reached the output length limit.]_' };
        }
        return;
      }

      // Append the assistant turn (with its tool_use blocks) to history.
      messages.push({ role: 'assistant', content: finalMessage.content });

      // Emit the tool calls to the App so it can render them.
      yield {
        role: 'model',
        toolCalls: toolUseBlocks.map((tu) => ({ id: tu.id, name: tu.name, args: tu.input })),
      };

      // Execute each requested (client-side) tool.
      const toolResponses: ToolCallResponse[] = [];
      const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUseBlocks) {
        const result = await toolService.executeTool(tu.name, tu.input);
        toolResponses.push({ id: tu.id, name: tu.name, response: result.response });
        toolResultBlocks.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result.response),
        });
      }

      // Emit the tool results to the App, then loop for the follow-up turn.
      yield { role: 'tool', toolCallResponses: toolResponses };
      yield { role: 'model', content: '' };

      messages.push({ role: 'user', content: toolResultBlocks });
    }
  };

  return {
    stream: stream(),
    // Stateless: nothing to resolve. Kept for interface compatibility.
    finalSession: Promise.resolve(undefined as unknown),
  };
};

// ---------------------------------------------------------------------------
// Title generation (non-streaming single call).
// ---------------------------------------------------------------------------
export const generateTitleForConversation = async (history: ChatMessage[]): Promise<string> => {
  const anthropic = getClient();

  const historyText = history
    .filter((m) => m.content && (m.role === 'user' || m.role === 'model'))
    .map((m) => `${m.role}: ${m.content}`)
    .slice(-4)
    .join('\n');

  if (!historyText) return '';

  const prompt = `Summarize the following conversation in 5 words or less to be used as a title. Return only the title itself, with no introductory text, quotation marks, or punctuation.\n\n---\n\n${historyText}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: TITLE_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    );
    return (textBlock?.text ?? '').trim().replace(/"/g, '');
  } catch (error) {
    console.error('Error generating title:', error);
    return '';
  }
};
