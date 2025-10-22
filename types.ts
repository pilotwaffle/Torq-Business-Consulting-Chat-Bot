import { Chat } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Conversation {
  id: string;
  timestamp: number;
  messages: ChatMessage[];
}

export interface Consultant {
  id: string;
  name: string;
  description: string;
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  systemInstruction: string;
}

export type ChatSessions = Map<string, Chat>;