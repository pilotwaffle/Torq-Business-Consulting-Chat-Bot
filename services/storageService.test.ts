import { describe, it, expect, beforeEach } from 'vitest';
import { saveChatHistory, loadChatHistory, titleFromMessages } from '../services/storageService';
import { Conversation } from '../types';

const MOCK_KEY = 'torq-chat-history-v1';
const LEGACY_KEY = 'gemini-consultant-chat-history';

function makeConversation(id: string, title?: string): Conversation {
  return {
    id,
    timestamp: Date.now(),
    title,
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'model', content: 'Hi there!' },
    ],
  };
}

describe('storageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveChatHistory', () => {
    it('saves a Map to localStorage', () => {
      const history = new Map<string, Conversation[]>();
      history.set('consultant-1', [makeConversation('c1', 'Test')]);

      saveChatHistory(history);

      const raw = localStorage.getItem(MOCK_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0][0]).toBe('consultant-1');
    });

    it('saves an empty map', () => {
      const history = new Map<string, Conversation[]>();
      saveChatHistory(history);
      const raw = localStorage.getItem(MOCK_KEY);
      expect(raw).toBe('[]');
    });

    it('handles multiple consultants', () => {
      const history = new Map<string, Conversation[]>();
      history.set('a', [makeConversation('a1')]);
      history.set('b', [makeConversation('b1'), makeConversation('b2')]);

      saveChatHistory(history);

      const loaded = loadChatHistory();
      expect(loaded.size).toBe(2);
      expect(loaded.get('b')).toHaveLength(2);
    });
  });

  describe('loadChatHistory', () => {
    it('returns empty Map when nothing stored', () => {
      const result = loadChatHistory();
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('loads previously saved data', () => {
      const history = new Map<string, Conversation[]>();
      history.set('consultant-1', [makeConversation('c1')]);
      saveChatHistory(history);

      const loaded = loadChatHistory();
      expect(loaded.get('consultant-1')).toHaveLength(1);
      expect(loaded.get('consultant-1')![0]!.id).toBe('c1');
    });

    it('returns empty Map on corrupt data', () => {
      localStorage.setItem(MOCK_KEY, 'not-valid-json{{{');
      const result = loadChatHistory();
      expect(result.size).toBe(0);
    });

    it('migrates legacy gemini storage key', () => {
      const legacy = new Map<string, Conversation[]>();
      legacy.set('consultant-1', [makeConversation('legacy-1', 'Old')]);
      localStorage.setItem(LEGACY_KEY, JSON.stringify(Array.from(legacy.entries())));

      const loaded = loadChatHistory();
      expect(loaded.get('consultant-1')![0]!.id).toBe('legacy-1');
      expect(localStorage.getItem(MOCK_KEY)).not.toBeNull();
      expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    });
  });

  describe('titleFromMessages', () => {
    it('uses first user message', () => {
      expect(
        titleFromMessages([
          { role: 'user', content: 'Food cost basics' },
          { role: 'model', content: '…' },
        ]),
      ).toBe('Food cost basics');
    });

    it('truncates long titles', () => {
      const long = 'A'.repeat(60);
      const title = titleFromMessages([{ role: 'user', content: long }]);
      expect(title.length).toBeLessThanOrEqual(48);
      expect(title.endsWith('…')).toBe(true);
    });

    it('falls back to New chat', () => {
      expect(titleFromMessages([])).toBe('New chat');
    });
  });

  describe('round-trip', () => {
    it('preserves conversation data', () => {
      const original = new Map<string, Conversation[]>();
      const convo = makeConversation('c1', 'My Title');
      convo.messages.push({
        role: 'user',
        content: 'Another message',
        attachments: [
          { name: 'test.txt', mimeType: 'text/plain', data: 'file content', source: 'text' },
        ],
      });
      original.set('consultant-1', [convo]);

      saveChatHistory(original);
      const loaded = loadChatHistory();

      const loadedConvo = loaded.get('consultant-1')![0]!;
      expect(loadedConvo.id).toBe('c1');
      expect(loadedConvo.title).toBe('My Title');
      expect(loadedConvo.messages).toHaveLength(3);
      expect(loadedConvo.messages[2]!.attachments).toBeDefined();
    });
  });
});
