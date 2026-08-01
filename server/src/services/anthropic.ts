import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import type { ChatMessage } from '../types.js';
import { executeTool, getToolDefinitions } from './tools.js';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    if (!config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

export function resetAnthropicClient(): void {
  client = null;
}

export function toAnthropicMessages(
  messages: ChatMessage[],
): Anthropic.MessageParam[] {
  const normalized: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    const content = msg.content?.trim() ?? '';
    if (!content) continue;

    const role: 'user' | 'assistant' =
      msg.role === 'assistant' ? 'assistant' : 'user';

    const last = normalized[normalized.length - 1];
    if (last && last.role === role && typeof last.content === 'string') {
      last.content = `${last.content}\n\n${content}`;
      continue;
    }

    normalized.push({ role, content });
  }

  while (normalized.length > 0 && normalized[0]!.role !== 'user') {
    normalized.shift();
  }

  return normalized;
}

export interface StreamChatParams {
  systemInstruction: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  enableWebSearch?: boolean;
  toolNames?: string[];
}

export interface StreamChatResult {
  usage: { input_tokens: number; output_tokens: number };
}

type OnDelta = (text: string) => void;
type OnStatus = (status: string) => void;

/**
 * Stream chat with optional web_search + custom tools agent loop (max 5 turns).
 */
export async function streamChat(
  params: StreamChatParams,
  onDelta: OnDelta,
  onStatus?: OnStatus,
): Promise<StreamChatResult> {
  const anthropic = getAnthropicClient();
  const working = toAnthropicMessages(params.messages);

  if (working.length === 0) {
    throw new Error('No non-empty messages to send');
  }

  const tools: Anthropic.Messages.ToolUnion[] = [];
  if (params.enableWebSearch) {
    tools.push({
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: 3,
    } as Anthropic.Messages.ToolUnion);
  }
  const custom = getToolDefinitions(params.toolNames ?? []);
  for (const t of custom) {
    tools.push({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema,
    });
  }

  let inputTokens = 0;
  let outputTokens = 0;
  const maxTurns = 5;

  for (let turn = 0; turn < maxTurns; turn++) {
    if (params.signal?.aborted) {
      throw new Error('Aborted');
    }

    const stream = anthropic.messages.stream(
      {
        model: config.model,
        max_tokens: config.maxTokens,
        system: params.systemInstruction,
        messages: working,
        ...(tools.length ? { tools } : {}),
      },
      params.signal ? { signal: params.signal } : undefined,
    );

    stream.on('text', (text) => {
      if (text) onDelta(text);
    });

    const finalMessage = await stream.finalMessage();
    inputTokens += finalMessage.usage?.input_tokens ?? 0;
    outputTokens += finalMessage.usage?.output_tokens ?? 0;

    const toolUses = finalMessage.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
    );

    // Server-side web_search is resolved by the API; only client tools need local exec.
    const clientTools = toolUses.filter((t) =>
      (params.toolNames ?? []).includes(t.name),
    );

    if (clientTools.length === 0) {
      return {
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      };
    }

    onStatus?.(`Running tool: ${clientTools.map((t) => t.name).join(', ')}`);

    working.push({
      role: 'assistant',
      content: finalMessage.content,
    });

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tu of clientTools) {
      const result = await executeTool(tu.name, tu.input);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(result.response),
      });
    }

    // If the model mixed web_search with client tools, also pass through any
    // non-client tool_use as empty results so the conversation stays valid.
    for (const tu of toolUses) {
      if ((params.toolNames ?? []).includes(tu.name)) continue;
      // web_search results are usually already in content; skip orphan tool_use
    }

    working.push({
      role: 'user',
      content: toolResults,
    });

    onDelta('\n\n');
  }

  return {
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  };
}
