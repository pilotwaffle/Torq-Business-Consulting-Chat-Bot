import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConversations } from '../hooks/useConversations';
import { Conversation, ChatMessage } from '../types';

vi.mock('../services/storageService', () => ({
  saveChatHistory: vi.fn(),
  loadChatHistory: vi.fn(() => new Map()),
  titleFromMessages: vi.fn((messages: { role: string; content?: string }[]) => {
    const first = messages.find((m) => m.role === 'user' && m.content?.trim());
    return first?.content?.trim() || 'New chat';
  }),
}));

vi.mock('../services/anthropicService', () => ({
  generateTitleForConversation: vi.fn(() => Promise.resolve('')),
}));

import { saveChatHistory, loadChatHistory } from '../services/storageService';
import { generateTitleForConversation } from '../services/anthropicService';

function makeConversation(
  id: string,
  title?: string,
  messages: ChatMessage[] = [
    { role: 'user', content: 'Hello' },
    { role: 'model', content: 'Hi there!' },
  ],
  ts?: number,
): Conversation {
  return { id, timestamp: ts ?? Date.now(), title, messages };
}

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadChatHistory).mockReturnValue(new Map());
  });

  describe('initialization', () => {
    it('loads chat history on mount', () => {
      renderHook(() => useConversations('consultant-1'));
      expect(loadChatHistory).toHaveBeenCalled();
    });

    it('starts with null activeConversationId', () => {
      const { result } = renderHook(() => useConversations('consultant-1'));
      expect(result.current.activeConversationId).toBeNull();
    });

    it('starts with empty messages', () => {
      const { result } = renderHook(() => useConversations('consultant-1'));
      expect(result.current.messages).toEqual([]);
    });
  });

  describe('loading saved history', () => {
    it('starts on a fresh thread even when history exists', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('consultant-1', [
        makeConversation('old', 'Old', [{ role: 'user', content: 'Old' }], 1000),
        makeConversation('new', 'New', [{ role: 'user', content: 'New' }], 2000),
      ]);
      vi.mocked(loadChatHistory).mockReturnValue(history);

      const { result } = renderHook(() => useConversations('consultant-1'));
      await waitFor(() => {
        expect(loadChatHistory).toHaveBeenCalled();
      });
      expect(result.current.activeConversationId).toBeNull();
      expect(result.current.messages).toEqual([]);
      expect(result.current.chatHistory.get('consultant-1')).toHaveLength(2);
    });

    it('loads messages when a conversation is selected', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('consultant-1', [makeConversation('c1', 'Test', [
        { role: 'user', content: 'Q1' },
        { role: 'model', content: 'A1' },
      ])]);
      vi.mocked(loadChatHistory).mockReturnValue(history);

      const { result } = renderHook(() => useConversations('consultant-1'));
      await waitFor(() => {
        expect(result.current.chatHistory.size).toBe(1);
      });

      act(() => {
        result.current.handleSelectConversation('c1');
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(2);
      });
    });
  });

  describe('handleNewChat', () => {
    it('clears activeConversationId', () => {
      const history = new Map<string, Conversation[]>();
      history.set('consultant-1', [makeConversation('c1')]);
      vi.mocked(loadChatHistory).mockReturnValue(history);

      const { result } = renderHook(() => useConversations('consultant-1'));
      act(() => result.current.handleNewChat());
      expect(result.current.activeConversationId).toBeNull();
      expect(result.current.messages).toEqual([]);
    });
  });

  describe('handleSelectConversation', () => {
    it('sets activeConversationId', () => {
      const { result } = renderHook(() => useConversations('consultant-1'));
      act(() => result.current.handleSelectConversation('conv-123'));
      expect(result.current.activeConversationId).toBe('conv-123');
    });
  });

  describe('handleDeleteConversation', () => {
    it('removes conversation from history', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('consultant-1', [
        makeConversation('c1', 'Keep'),
        makeConversation('c2', 'Delete'),
      ]);
      vi.mocked(loadChatHistory).mockReturnValue(history);

      const { result } = renderHook(() => useConversations('consultant-1'));
      await waitFor(() => {
        expect(result.current.chatHistory.get('consultant-1')).toHaveLength(2);
      });

      act(() => result.current.handleDeleteConversation('consultant-1', 'c2'));

      await waitFor(() => {
        const convos = result.current.chatHistory.get('consultant-1');
        expect(convos).toHaveLength(1);
        expect(convos![0]!.id).toBe('c1');
      });
    });

    it('removes consultant key when last conversation deleted', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('consultant-1', [makeConversation('c1')]);
      vi.mocked(loadChatHistory).mockReturnValue(history);

      const { result } = renderHook(() => useConversations('consultant-1'));
      await waitFor(() => {
        expect(result.current.chatHistory.has('consultant-1')).toBe(true);
      });

      act(() => result.current.handleDeleteConversation('consultant-1', 'c1'));

      await waitFor(() => {
        expect(result.current.chatHistory.has('consultant-1')).toBe(false);
      });
    });

    it('clears active thread when deleting the active conversation', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('consultant-1', [
        makeConversation('c1', undefined, undefined, 1000),
        makeConversation('c2', undefined, undefined, 2000),
      ]);
      vi.mocked(loadChatHistory).mockReturnValue(history);

      const { result } = renderHook(() => useConversations('consultant-1'));
      await waitFor(() => {
        expect(result.current.chatHistory.get('consultant-1')).toHaveLength(2);
      });

      act(() => result.current.handleSelectConversation('c2'));
      act(() => result.current.handleDeleteConversation('consultant-1', 'c2'));

      await waitFor(() => {
        expect(result.current.activeConversationId).toBeNull();
        const convos = result.current.chatHistory.get('consultant-1');
        expect(convos).toHaveLength(1);
        expect(convos![0]!.id).toBe('c1');
      });
    });
  });

  describe('handleRenameConversation', () => {
    it('updates the conversation title', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('consultant-1', [makeConversation('c1', 'Old Title')]);
      vi.mocked(loadChatHistory).mockReturnValue(history);

      const { result } = renderHook(() => useConversations('consultant-1'));
      await waitFor(() => {
        expect(result.current.chatHistory.get('consultant-1')![0]!.title).toBe('Old Title');
      });

      act(() => result.current.handleRenameConversation('consultant-1', 'c1', 'New Title'));

      await waitFor(() => {
        expect(result.current.chatHistory.get('consultant-1')![0]!.title).toBe('New Title');
      });
    });

    it('does nothing for non-existent conversation', async () => {
      const { result } = renderHook(() => useConversations('consultant-1'));
      act(() => result.current.handleRenameConversation('consultant-1', 'nonexistent', 'Title'));
      expect(result.current.chatHistory.size).toBe(0);
    });
  });

  describe('upsertConversation', () => {
    it('creates a new conversation when no active one', async () => {
      const { result } = renderHook(() => useConversations('consultant-1'));
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hi' },
      ];

      act(() => result.current.upsertConversation(messages));

      await waitFor(() => {
        expect(result.current.activeConversationId).not.toBeNull();
        const convos = result.current.chatHistory.get('consultant-1');
        expect(convos).toHaveLength(1);
        expect(convos![0]!.messages).toEqual(messages);
      });
    });

    it('updates existing conversation', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('consultant-1', [makeConversation('c1', 'Test', [
        { role: 'user', content: 'Q1' },
      ])]);
      vi.mocked(loadChatHistory).mockReturnValue(history);

      const { result } = renderHook(() => useConversations('consultant-1'));
      await waitFor(() => {
        expect(result.current.chatHistory.get('consultant-1')).toHaveLength(1);
      });
      act(() => result.current.handleSelectConversation('c1'));

      const newMessages: ChatMessage[] = [
        { role: 'user', content: 'Q1' },
        { role: 'model', content: 'A1' },
      ];
      act(() => result.current.upsertConversation(newMessages));

      await waitFor(() => {
        const convos = result.current.chatHistory.get('consultant-1');
        expect(convos).toHaveLength(1);
        expect(convos![0]!.messages).toEqual(newMessages);
      });
    });
  });

  describe('persistence', () => {
    it('saves to localStorage when history changes', async () => {
      const { result } = renderHook(() => useConversations('consultant-1'));
      act(() =>
        result.current.upsertConversation([
          { role: 'user', content: 'Test' },
          { role: 'model', content: 'Response' },
        ]),
      );

      await waitFor(() => {
        expect(saveChatHistory).toHaveBeenCalled();
      });
    });
  });

  describe('titling', () => {
    it('triggers title generation for provisional titles with 2+ messages', async () => {
      vi.mocked(generateTitleForConversation).mockResolvedValue('Generated Title');

      const history = new Map<string, Conversation[]>();
      history.set(
        'consultant-1',
        [makeConversation('c1', 'Q1', [
          { role: 'user', content: 'Q1' },
          { role: 'model', content: 'A1' },
        ])],
      );
      vi.mocked(loadChatHistory).mockReturnValue(history);

      const { result } = renderHook(() => useConversations('consultant-1'));
      act(() => result.current.handleSelectConversation('c1'));

      await waitFor(() => {
        expect(generateTitleForConversation).toHaveBeenCalled();
      });
    });

    it('does not trigger titling for already-polished titles', async () => {
      const history = new Map<string, Conversation[]>();
      history.set(
        'consultant-1',
        [makeConversation('c1', 'Already Titled', [
          { role: 'user', content: 'Q1' },
          { role: 'model', content: 'A1' },
        ])],
      );
      vi.mocked(loadChatHistory).mockReturnValue(history);

      const { result } = renderHook(() => useConversations('consultant-1'));
      act(() => result.current.handleSelectConversation('c1'));

      // Wait a tick to ensure effects have run
      await new Promise((r) => setTimeout(r, 50));
      expect(generateTitleForConversation).not.toHaveBeenCalled();
    });
  });
});