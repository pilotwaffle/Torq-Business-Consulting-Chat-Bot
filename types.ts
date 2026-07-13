// Anthropic-native types. (Ported from @google/genai.)

// JSON Schema for a tool's input (Anthropic `input_schema` shape).
export interface ToolInputSchema {
  type: 'object';
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

// A custom (client-executed) tool definition, matching Anthropic's Tool shape.
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
}

export interface ToolCall {
  id?: string; // Anthropic tool_use block id, needed to correlate the result
  name: string;
  args: any;
}

export interface ToolCallResponse {
  id?: string; // matches the originating tool_use id
  name: string;
  response: any;
}

export interface GroundingMetadata {
  web: {
    uri: string;
    title: string;
  }
}

export interface Attachment {
    name: string;
    mimeType: string;
    data: string; // base64 for images, text content for text files
    source: 'base64' | 'text';
}

export interface ChatMessage {
  role: 'user' | 'model' | 'tool';
  content?: string;
  attachments?: Attachment[];
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
  id: string;
  name: string;
  description: string;
  model: 'claude-sonnet-5';
  systemInstruction: string;
  promptSuggestions?: string[];
  // `functionDeclarations` = custom client tools; `webSearch` opts the
  // consultant into Anthropic's server-side web_search tool.
  tools?: {
    functionDeclarations?: ToolDefinition[];
    webSearch?: boolean;
  }[];
}

// Anthropic is stateless — there is no persistent Chat session object.
// Sessions are represented by their message history (managed in App state),
// so ChatSessions is no longer needed. Kept as an alias for source compat.
export type ChatSessions = Map<string, unknown>;
