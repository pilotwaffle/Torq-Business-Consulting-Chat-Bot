import { Conversation } from '../types';

const CHAT_HISTORY_KEY = 'gemini-consultant-chat-history';

export const saveChatHistory = (history: Map<string, Conversation[]>): void => {
  try {
    const serializedHistory = JSON.stringify(Array.from(history.entries()));
    localStorage.setItem(CHAT_HISTORY_KEY, serializedHistory);
  } catch (error) {
    console.error("Failed to save chat history to localStorage:", error);
  }
};

export const loadChatHistory = (): Map<string, Conversation[]> => {
  try {
    const serializedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (serializedHistory === null) {
      return new Map();
    }
    // The stored value is an array of [key, value] pairs.
    const parsedHistory = JSON.parse(serializedHistory) as [string, Conversation[]][];
    return new Map(parsedHistory);
  } catch (error) {    
    console.error("Failed to load chat history from localStorage:", error);
    return new Map();
  }
};
