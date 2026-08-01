// TORQ Chat client → BFF API (no Anthropic SDK / no browser API key).
// Server holds ANTHROPIC_API_KEY; client only holds a short-lived session token.

import { Consultant, ChatMessage, Attachment } from '../types';

const SESSION_STORAGE_KEY = 'torq-chat-session-v1';
const DEFAULT_API_BASE = 'http://localhost:8787';

type ApiRole = 'user' | 'assistant';

interface ApiMessage {
  role: ApiRole;
  content: string;
}

interface SessionPayload {
  sessionToken: string;
  expiresAt: string;
}

interface StoredSession extends SessionPayload {
  // reserved for future fields
}

function getApiBase(): string {
  const fromEnv =
    (typeof process !== 'undefined' && process.env?.VITE_TORQ_API_BASE) ||
    // Vite also exposes VITE_* on import.meta.env when present
    (typeof import.meta !== 'undefined' &&
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_TORQ_API_BASE);
  const base = (fromEnv || DEFAULT_API_BASE).replace(/\/$/, '');
  return base;
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.sessionToken || !parsed?.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(session: SessionPayload): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // private mode / quota — session still works for this page load
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function isSessionFresh(session: StoredSession, skewMs = 60_000): boolean {
  const expires = Date.parse(session.expiresAt);
  if (Number.isNaN(expires)) return false;
  return expires > Date.now() + skewMs;
}

async function createSession(): Promise<SessionPayload> {
  const res = await fetch(`${getApiBase()}/v1/session`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Failed to create chat session (${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`,
    );
  }
  const data = (await res.json()) as SessionPayload;
  if (!data?.sessionToken) {
    throw new Error('Session response missing sessionToken.');
  }
  writeStoredSession(data);
  return data;
}

/** Ensure a valid session token exists (localStorage key torq-chat-session-v1). */
export async function ensureSessionToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const existing = readStoredSession();
    if (existing && isSessionFresh(existing)) {
      return existing.sessionToken;
    }
  }
  const created = await createSession();
  return created.sessionToken;
}

/**
 * Map local ChatMessage history + current prompt into BFF messages.
 * model → assistant; tool-only turns are skipped for v1 plain chat.
 */
function buildApiMessages(
  history: ChatMessage[],
  prompt: string,
  attachments: Attachment[] | undefined,
): ApiMessage[] {
  const messages: ApiMessage[] = [];

  for (const msg of history) {
    if (msg.role === 'tool') {
      // Phase 1: skip tool result turns (streaming tools = Phase 1.1)
      continue;
    }

    if (msg.role === 'model') {
      // Skip pure tool-call shells with no visible text
      if (msg.toolCalls?.length && !(msg.content && msg.content.trim())) {
        continue;
      }
      const content = (msg.content ?? '').trim();
      if (!content) continue;
      messages.push({ role: 'assistant', content });
      continue;
    }

    if (msg.role === 'user') {
      let content = msg.content ?? '';
      if (msg.attachments?.length) {
        for (const att of msg.attachments) {
          if (att.source === 'text') {
            content = `The user has provided the following file named "${att.name}":\n\n\`\`\`\n${att.data}\n\`\`\`\n\n${content}`;
          } else if (att.source === 'base64') {
            const note = `[Image attachment: ${att.name}]`;
            content = content.trim() ? `${content}\n\n${note}` : note;
          }
        }
      }
      if (!content.trim()) continue;
      messages.push({ role: 'user', content });
    }
  }

  // Current user turn
  let userPrompt = prompt;
  if (attachments?.length) {
    for (const att of attachments) {
      if (att.source === 'text') {
        userPrompt = `The user has provided the following file named "${att.name}":\n\n\`\`\`\n${att.data}\n\`\`\`\n\nNow, regarding this file, the user says: ${prompt}`;
      } else if (att.source === 'base64') {
        // Phase 1 BFF accepts text content only — surface a note rather than fail.
        const note = `[Image attachment: ${att.name} — binary image upload not yet supported via TORQ API]`;
        userPrompt = userPrompt.trim() ? `${userPrompt}\n\n${note}` : note;
      }
    }
  }

  if (!userPrompt.trim()) {
    throw new Error('Cannot send an empty message (no text and no valid attachments).');
  }
  messages.push({ role: 'user', content: userPrompt });

  return messages;
}

async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ content?: string }, void, undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines; process complete lines.
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // keep-alive / comments
        if (!trimmed.startsWith('data:')) continue;

        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        let event: { type?: string; text?: string; message?: string };
        try {
          event = JSON.parse(payload) as { type?: string; text?: string; message?: string };
        } catch {
          // Incomplete or non-JSON data line — skip
          continue;
        }

        if (event.type === 'delta' && typeof event.text === 'string' && event.text.length > 0) {
          // Yield pure deltas only — callers accumulate (no double-append).
          yield { content: event.text };
        } else if (event.type === 'error') {
          throw new Error(event.message || 'Chat stream error from server.');
        } else if (event.type === 'done') {
          return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function openChatStream(
  consultantId: string,
  messages: ApiMessage[],
  token: string,
): Promise<Response> {
  return fetch(`${getApiBase()}/v1/chat/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ consultantId, messages }),
  });
}

/**
 * Streaming chat via TORQ BFF.
 * Preserves the prior export shape used by hooks/useChat.ts:
 *   { stream: AsyncGenerator, finalSession: Promise }
 */
export const getChatResponseStream = (
  consultant: Consultant,
  _session: unknown,
  prompt: string,
  history: ChatMessage[],
  attachments: Attachment[] | undefined,
) => {
  const stream = async function* (): AsyncGenerator<Partial<ChatMessage>, void, undefined> {
    const apiMessages = buildApiMessages(history, prompt, attachments);

    let token = await ensureSessionToken(false);
    let res = await openChatStream(consultant.id, apiMessages, token);

    // One retry on auth failure with a fresh session.
    if (res.status === 401 || res.status === 403) {
      clearStoredSession();
      token = await ensureSessionToken(true);
      res = await openChatStream(consultant.id, apiMessages, token);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Chat API error ${res.status}${body ? `: ${body.slice(0, 300)}` : ''}`,
      );
    }

    if (!res.body) {
      throw new Error('Chat API returned an empty response body.');
    }

    for await (const chunk of parseSseStream(res.body)) {
      yield chunk;
    }
  };

  return {
    stream: stream(),
    // Stateless client session placeholder (compat with useChat).
    finalSession: Promise.resolve(undefined as unknown),
  };
};

/**
 * Local title helper (no model call in Phase 1 — BFF has no title endpoint).
 * Keeps useConversations import working without shipping Anthropic to the browser.
 */
export const generateTitleForConversation = async (history: ChatMessage[]): Promise<string> => {
  const text = history
    .filter((m) => m.content && (m.role === 'user' || m.role === 'model'))
    .map((m) => m.content!.trim())
    .find((c) => c.length > 0);

  if (!text) return '';

  const words = text.replace(/\s+/g, ' ').split(' ').slice(0, 6);
  let title = words.join(' ');
  if (text.split(' ').length > 6) title += '…';
  return title.replace(/["']/g, '').slice(0, 60);
};
