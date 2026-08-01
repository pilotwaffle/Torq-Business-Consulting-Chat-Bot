import { z } from 'zod';
import { config } from './config.js';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool']),
  content: z.string().max(config.maxMessageChars),
});

export const ChatStreamBodySchema = z.object({
  consultantId: z.string().min(1).max(128),
  messages: z
    .array(ChatMessageSchema)
    .min(1, 'messages must not be empty')
    .max(100, 'messages exceeds maximum of 100'),
  // Accepted for wire-compat with the client but intentionally ignored.
  // System prompts are loaded server-side from consultants.ts only.
  // Prefer omitting this field; non-empty values are ignored by the route.
  systemInstruction: z.string().max(1).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatStreamBody = z.infer<typeof ChatStreamBodySchema>;

export interface SessionClaims {
  /** Subject — opaque anonymous session id. */
  sub: string;
  /** Issued-at (seconds). */
  iat: number;
  /** Expiry (seconds). */
  exp: number;
}

export interface SseDeltaEvent {
  type: 'delta';
  text: string;
}

export interface SseErrorEvent {
  type: 'error';
  message: string;
}

export interface SseDoneEvent {
  type: 'done';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export type SseEvent = SseDeltaEvent | SseErrorEvent | SseDoneEvent;
