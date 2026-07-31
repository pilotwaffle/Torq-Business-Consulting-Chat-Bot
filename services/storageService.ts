import { Conversation } from '../types';

const CHAT_HISTORY_KEY = 'torq-chat-history-v1';
const LEGACY_CHAT_HISTORY_KEY = 'gemini-consultant-chat-history';

function parseHistory(serialized: string): Map<string, Conversation[]> {
  const parsedHistory = JSON.parse(serialized) as [string, Conversation[]][];
  if (!Array.isArray(parsedHistory)) {
    return new Map();
  }
  return new Map(parsedHistory);
}

export const saveChatHistory = (history: Map<string, Conversation[]>): void => {
  try {
    const serializedHistory = JSON.stringify(Array.from(history.entries()));
    localStorage.setItem(CHAT_HISTORY_KEY, serializedHistory);
  } catch (error) {
    console.error('Failed to save chat history to localStorage:', error);
  }
};

export const loadChatHistory = (): Map<string, Conversation[]> => {
  try {
    const current = localStorage.getItem(CHAT_HISTORY_KEY);
    if (current !== null) {
      return parseHistory(current);
    }

    // One-time migration from pre-rebrand storage key.
    const legacy = localStorage.getItem(LEGACY_CHAT_HISTORY_KEY);
    if (legacy !== null) {
      const migrated = parseHistory(legacy);
      saveChatHistory(migrated);
      localStorage.removeItem(LEGACY_CHAT_HISTORY_KEY);
      return migrated;
    }

    return new Map();
  } catch (error) {
    console.error('Failed to load chat history from localStorage:', error);
    return new Map();
  }
};

/** Best-effort title from the first user message (no API call). */
export const titleFromMessages = (messages: { role: string; content?: string }[]): string => {
  const firstUser = messages.find((m) => m.role === 'user' && m.content?.trim());
  if (!firstUser?.content) return 'New chat';
  const cleaned = firstUser.content.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 48) return cleaned;
  return `${cleaned.slice(0, 45).trimEnd()}…`;
};
