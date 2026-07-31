import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, Conversation } from '../types';
import { saveChatHistory, loadChatHistory, titleFromMessages } from '../services/storageService';
import { generateTitleForConversation } from '../services/anthropicService';

const SELECTED_CONSULTANT_KEY = 'torq-chat-selected-consultant';

export function loadSelectedConsultantId(fallback: string): string {
  try {
    return localStorage.getItem(SELECTED_CONSULTANT_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function persistSelectedConsultantId(id: string): void {
  try {
    localStorage.setItem(SELECTED_CONSULTANT_KEY, id);
  } catch {
    // ignore quota / private mode
  }
}

export function useConversations(selectedConsultantId: string) {
  const [chatHistory, setChatHistory] = useState<Map<string, Conversation[]>>(new Map());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const titlingAttempted = useRef<Set<string>>(new Set());
  const prevConsultantId = useRef<string | null>(null);

  useEffect(() => {
    setChatHistory(loadChatHistory());
    setHistoryReady(true);
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    saveChatHistory(chatHistory);
  }, [chatHistory, historyReady]);

  // Consultant switch: always open a fresh thread (history is still in the sidebar).
  useEffect(() => {
    if (prevConsultantId.current === null) {
      prevConsultantId.current = selectedConsultantId;
      return;
    }
    if (prevConsultantId.current === selectedConsultantId) return;
    prevConsultantId.current = selectedConsultantId;
    setActiveConversationId(null);
    setMessages([]);
  }, [selectedConsultantId]);

  // Hydrate messages when picking a conversation from history.
  useEffect(() => {
    if (!activeConversationId) return;
    const consultantConvos = chatHistory.get(selectedConsultantId) || [];
    const activeConvo = consultantConvos.find((c) => c.id === activeConversationId);
    if (activeConvo) {
      setMessages(activeConvo.messages);
    }
  }, [activeConversationId, selectedConsultantId, chatHistory]);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const handleDeleteConversation = useCallback(
    (consultantId: string, conversationId: string) => {
      const clearActive = activeConversationId === conversationId;
      setChatHistory((prevHistory: Map<string, Conversation[]>) => {
        const newHistory = new Map(prevHistory);
        const consultantConvos = newHistory.get(consultantId) || [];
        const updatedConvos = consultantConvos.filter((c) => c.id !== conversationId);

        if (updatedConvos.length > 0) {
          newHistory.set(consultantId, updatedConvos);
        } else {
          newHistory.delete(consultantId);
        }

        return newHistory;
      });

      if (clearActive) {
        handleNewChat();
      }
    },
    [activeConversationId, handleNewChat],
  );

  const handleRenameConversation = useCallback(
    (consultantId: string, conversationId: string, newTitle: string) => {
      setChatHistory((prevHistory: Map<string, Conversation[]>) => {
        const newHistory = new Map(prevHistory);
        const consultantConvos = newHistory.get(consultantId) || [];
        const currentConvo = consultantConvos.find((c) => c.id === conversationId);
        if (!currentConvo) return prevHistory;

        const updatedConvos = consultantConvos.map((convo) =>
          convo.id === conversationId ? { ...convo, title: newTitle } : convo,
        );
        newHistory.set(consultantId, updatedConvos);
        return newHistory;
      });
    },
    [],
  );

  const upsertConversation = useCallback(
    (finalMessages: ChatMessage[]) => {
      setChatHistory((prevHistory: Map<string, Conversation[]>) => {
        const newHistory = new Map(prevHistory);
        const consultantConvos = newHistory.get(selectedConsultantId) || [];
        let conversationId = activeConversationId;
        let updatedConvos: Conversation[];

        if (conversationId) {
          updatedConvos = consultantConvos.map((convo) =>
            convo.id === conversationId
              ? {
                  ...convo,
                  messages: finalMessages,
                  timestamp: Date.now(),
                  title: convo.title || titleFromMessages(finalMessages),
                }
              : convo,
          );
        } else {
          conversationId = `convo-${Date.now()}`;
          const newConversation: Conversation = {
            id: conversationId,
            timestamp: Date.now(),
            messages: finalMessages,
            title: titleFromMessages(finalMessages),
          };
          updatedConvos = [...consultantConvos, newConversation];
          setActiveConversationId(conversationId);
        }
        newHistory.set(selectedConsultantId, updatedConvos);
        return newHistory;
      });
    },
    [selectedConsultantId, activeConversationId],
  );

  // Optional AI title upgrade (once per conversation).
  useEffect(() => {
    if (!activeConversationId || titlingAttempted.current.has(activeConversationId)) {
      return;
    }

    const consultantConvos = chatHistory.get(selectedConsultantId);
    const activeConvo = consultantConvos?.find((c) => c.id === activeConversationId);
    if (!activeConvo || activeConvo.messages.length < 2) return;

    const provisional = titleFromMessages(activeConvo.messages);
    // Skip if already has a polished title different from the provisional first-line title.
    if (activeConvo.title && activeConvo.title !== provisional && activeConvo.title !== 'New chat') {
      titlingAttempted.current.add(activeConversationId);
      return;
    }

    const convoId = activeConversationId;
    titlingAttempted.current.add(convoId);

    generateTitleForConversation(activeConvo.messages)
      .then((newTitle) => {
        if (newTitle?.trim()) {
          handleRenameConversation(selectedConsultantId, activeConvo.id, newTitle.trim());
        }
      })
      .catch((err) => {
        console.error('Title generation failed:', err);
      });
  }, [activeConversationId, chatHistory, selectedConsultantId, handleRenameConversation]);

  return {
    chatHistory,
    activeConversationId,
    messages,
    setMessages,
    handleNewChat,
    handleSelectConversation,
    handleDeleteConversation,
    handleRenameConversation,
    upsertConversation,
  };
}
