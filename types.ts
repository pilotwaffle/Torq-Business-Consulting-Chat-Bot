import { Chat, FunctionDeclaration, GroundingChunk } from "@google/genai";

export interface ToolCall {
  name: string;
  args: any;
}

export interface ToolCallResponse {
  name: string;
  response: any;
}

export interface GroundingMetadata {
  web: {
    uri: string;
    title: string;
  }
}

export interface ChatMessage {
  role: 'user' | 'model' | 'tool';
  content?: string;
  toolCalls?: ToolCall[];
  toolCallResponses?: ToolCallResponse[];
  groundingMetadata?: GroundingMetadata[];
}

export interface Conversation {
  id: string;
  timestamp: number;
  title?: string;
  messages: ChatMessage[];
}

export interface Consultant {
  id:string;
  name: string;
  description: string;
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  systemInstruction: string;
  promptSuggestions?: string[];
  tools?: {
    functionDeclarations?: FunctionDeclaration[];
    googleSearch?: {};
  }[];
}

export type ChatSessions = Map<string, Chat>;