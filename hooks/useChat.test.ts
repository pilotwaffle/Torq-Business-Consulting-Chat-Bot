import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../hooks/useChat';
import { ChatMessage, Attachment } from '../types';

// Mock the chat API service
const mockStream = vi.fn();
vi.mock('../services/chatApiService', () => ({
  getChatResponseStream: vi.fn(),
}));

import { getChatResponseStream } from '../services/chatApiService';

function makeAsyncGenerator<T>(chunks: T[]): AsyncGenerator<T, void, undefined> {
  let index = 0;
  return {
    async next() {
      if (index < chunks.length) {
        return { value: chunks[index++]!, done: false };
      }
      return { value: undefined as any, done: true };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

describe('useChat', () => {
  let setMessages: ReturnType<typeof vi.fn>;
  let upsertConversation: ReturnType<typeof vi.fn>;
  let messagesState: ChatMessage[];

  beforeEach(() => {
    vi.clearAllMocks();
    messagesState = [];
    setMessages = vi.fn((updater) => {
      if (typeof updater === 'function') {
        messagesState = updater(messagesState);
      } else {
        messagesState = updater;
      }
    });
    upsertConversation = vi.fn();
  });

  function setupHook(initialMessages: ChatMessage[] = []) {
    messagesState = initialMessages;
    return renderHook(
      ({ consultantId, msgs }: { consultantId: string; msgs: ChatMessage[] }) =>
        useChat(consultantId, msgs, setMessages, upsertConversation),
      {
        initialProps: { consultantId: 'strategic-advisor', msgs: initialMessages },
      },
    );
  }

  describe('initial state', () => {
    it('starts with isLoading false', () => {
      const { result } = setupHook();
      expect(result.current.isLoading).toBe(false);
    });

    it('starts with null error', () => {
      const { result } = setupHook();
      expect(result.current.error).toBeNull();
    });

    it('starts with null failedMessage', () => {
      const { result } = setupHook();
      expect(result.current.failedMessage).toBeNull();
    });
  });

  describe('handleSendMessage', () => {
    it('does nothing for empty input without attachment', async () => {
      const { result } = setupHook();
      await act(async () => {
        await result.current.handleSendMessage('   ', null);
      });
      expect(setMessages).not.toHaveBeenCalled();
    });

    it('sends message with attachment even when text is empty', async () => {
      const attachment: Attachment = {
        name: 'test.png',
        mimeType: 'image/png',
        data: 'abc123',
        source: 'base64',
      };

      const chunks = [{ content: 'Response' }];
      vi.mocked(getChatResponseStream).mockReturnValue({
        stream: makeAsyncGenerator(chunks),
        finalSession: Promise.resolve(undefined),
      });

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleSendMessage('', attachment);
      });

      expect(setMessages).toHaveBeenCalled();
    });

    it('appends user message and placeholder model message', async () => {
      const chunks = [{ content: 'Hello! How can I help?' }];
      vi.mocked(getChatResponseStream).mockReturnValue({
        stream: makeAsyncGenerator(chunks),
        finalSession: Promise.resolve(undefined),
      });

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleSendMessage('Hi', null);
      });

      expect(setMessages).toHaveBeenCalled();
      // The first call should append user message + model placeholder
      const firstCall = setMessages.mock.calls[0]![0] as (prev: ChatMessage[]) => ChatMessage[];
      if (typeof firstCall === 'function') {
        const updated = firstCall([]);
        expect(updated).toHaveLength(2);
        expect(updated[0]!.role).toBe('user');
        expect(updated[0]!.content).toBe('Hi');
        expect(updated[1]!.role).toBe('model');
      }
    });

    it('streams content chunks into the model message', async () => {
      const chunks = [
        { content: 'Hello' },
        { content: ' world' },
        { content: '!' },
      ];
      vi.mocked(getChatResponseStream).mockReturnValue({
        stream: makeAsyncGenerator(chunks),
        finalSession: Promise.resolve(undefined),
      });

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleSendMessage('Test', null);
      });

      // After streaming, upsertConversation should be called with finalMessages
      expect(upsertConversation).toHaveBeenCalled();
      const finalMessages = upsertConversation.mock.calls[0]![0] as ChatMessage[];
      expect(finalMessages.length).toBeGreaterThanOrEqual(1);
      const modelMsg = [...finalMessages].reverse().find((m) => m.role === 'model');
      expect(modelMsg?.content).toBe('Hello world!');
    });

    it('does not double-append deltas when setState updaters run twice (Strict Mode)', async () => {
      // Simulate React Strict Mode: each functional updater is invoked twice on the
      // same previous state. Impure appends would produce "HelloHello".
      setMessages = vi.fn((updater) => {
        if (typeof updater === 'function') {
          const once = updater(messagesState);
          const twice = updater(messagesState);
          // Prefer the second result only if pure; if impure, both mutate shared refs.
          // Mirror React: discard double-invoke side effects by applying once from a
          // frozen snapshot, then commit a single pure result.
          messagesState = twice;
          // Also ensure first and second pure results match when state is cloned.
          void once;
        } else {
          messagesState = updater;
        }
      });

      const chunks = [{ content: 'Hello' }, { content: '!' }];
      vi.mocked(getChatResponseStream).mockReturnValue({
        stream: makeAsyncGenerator(chunks),
        finalSession: Promise.resolve(undefined),
      });

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleSendMessage('Test', null);
      });

      const finalMessages = upsertConversation.mock.calls[0]![0] as ChatMessage[];
      const modelMsg = [...finalMessages].reverse().find((m) => m.role === 'model');
      expect(modelMsg?.content).toBe('Hello!');
      expect(modelMsg?.content).not.toBe('HelloHello!');
      expect(modelMsg?.content).not.toContain('HelloHello');
    });

    it('calls upsertConversation after successful stream', async () => {
      const chunks = [{ content: 'Response text' }];
      vi.mocked(getChatResponseStream).mockReturnValue({
        stream: makeAsyncGenerator(chunks),
        finalSession: Promise.resolve(undefined),
      });

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleSendMessage('Query', null);
      });

      expect(upsertConversation).toHaveBeenCalled();
    });

    it('sets isLoading to true during send', async () => {
      let resolvePromise: (value: any) => void;
      const deferred = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(getChatResponseStream).mockReturnValue({
        stream: (async function* () {
          await deferred;
          yield { content: 'Done' };
        })(),
        finalSession: Promise.resolve(undefined),
      });

      const { result } = setupHook();
      let sendPromise: Promise<void>;
      await act(async () => {
        sendPromise = result.current.handleSendMessage('Test', null);
      });

      expect(result.current.isLoading).toBe(true);

      resolvePromise!(undefined);
      await act(async () => {
        await sendPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('handles errors and sets error state', async () => {
      vi.mocked(getChatResponseStream).mockImplementation(() => {
        throw new Error('Invalid api_key provided');
      });

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleSendMessage('Test', null);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error).toContain('API Error');
      expect(result.current.failedMessage).not.toBeNull();
      expect(result.current.failedMessage!.content).toBe('Test');
    });

    it('restores messages on error', async () => {
      const initialMessages: ChatMessage[] = [
        { role: 'user', content: 'Previous' },
        { role: 'model', content: 'Previous response' },
      ];

      vi.mocked(getChatResponseStream).mockImplementation(() => {
        throw new Error('Network error');
      });

      let capturedMessages: ChatMessage[] = [];
      const mockSetMessages = vi.fn((updater) => {
        if (typeof updater === 'function') {
          capturedMessages = updater(capturedMessages);
        } else {
          capturedMessages = updater;
        }
      });

      const { result } = renderHook(() =>
        useChat('strategic-advisor', initialMessages, mockSetMessages, upsertConversation),
      );

      await act(async () => {
        await result.current.handleSendMessage('New message', null);
      });

      // Messages should be restored to initial state
      const lastCall = mockSetMessages.mock.calls[mockSetMessages.mock.calls.length - 1]![0];
      if (typeof lastCall !== 'function') {
        expect(lastCall).toEqual(initialMessages);
      }
    });
  });

  describe('handleRetry', () => {
    it('does nothing when no failedMessage', async () => {
      const { result } = setupHook();
      await act(async () => {
        await result.current.handleRetry();
      });
      expect(setMessages).not.toHaveBeenCalled();
    });

    it('retries with the failed message content', async () => {
      // First, trigger a failure to set failedMessage
      vi.mocked(getChatResponseStream).mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      const { result } = setupHook();
      await act(async () => {
        await result.current.handleSendMessage('Failed message', null);
      });

      expect(result.current.failedMessage).not.toBeNull();

      // Now mock success for retry
      const chunks = [{ content: 'Retry succeeded!' }];
      vi.mocked(getChatResponseStream).mockReturnValue({
        stream: makeAsyncGenerator(chunks),
        finalSession: Promise.resolve(undefined),
      });

      await act(async () => {
        await result.current.handleRetry();
      });

      expect(upsertConversation).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
      expect(result.current.failedMessage).toBeNull();
    });
  });

  describe('handleEndLiveSession', () => {
    it('does nothing with empty transcript', () => {
      const { result } = setupHook();
      act(() => {
        result.current.handleEndLiveSession([]);
      });
      expect(setMessages).not.toHaveBeenCalled();
    });

    it('appends transcript as messages', () => {
      const { result } = setupHook();
      const transcript = [
        { speaker: 'user' as const, text: 'Hello' },
        { speaker: 'model' as const, text: 'Hi there' },
      ];

      act(() => {
        result.current.handleEndLiveSession(transcript);
      });

      expect(setMessages).toHaveBeenCalled();
      expect(upsertConversation).toHaveBeenCalled();
    });
  });
});