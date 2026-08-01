import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import type { ChatMessage } from '../types.js';

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

/** Reset cached client (tests). */
export function resetAnthropicClient(): void {
  client = null;
}

/**
 * Map BFF chat messages to Anthropic MessageParam[].
 * - Drops empty content
 * - Collapses consecutive same-role messages (Anthropic requires alternation)
 * - Maps role "tool" → "user" for Phase 1 (no tool-result protocol yet)
 * - Ensures the conversation starts with a user turn
 */
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

  // Anthropic requires the first message to be from the user.
  while (normalized.length > 0 && normalized[0].role !== 'user') {
    normalized.shift();
  }

  return normalized;
}

export interface StreamChatParams {
  systemInstruction: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export interface StreamChatResult {
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Stream a chat completion. Invokes onDelta for each text chunk.
 * Returns final usage counts.
 */
export async function streamChat(
  params: StreamChatParams,
  onDelta: (text: string) => void,
): Promise<StreamChatResult> {
  const anthropic = getAnthropicClient();
  const anthropicMessages = toAnthropicMessages(params.messages);

  if (anthropicMessages.length === 0) {
    throw new Error('No non-empty messages to send');
  }

  const stream = anthropic.messages.stream(
    {
      model: config.model,
      max_tokens: config.maxTokens,
      system: params.systemInstruction,
      messages: anthropicMessages,
    },
    params.signal ? { signal: params.signal } : undefined,
  );

  stream.on('text', (text) => {
    if (text) onDelta(text);
  });

  const finalMessage = await stream.finalMessage();

  return {
    usage: {
      input_tokens: finalMessage.usage?.input_tokens ?? 0,
      output_tokens: finalMessage.usage?.output_tokens ?? 0,
    },
  };
}
