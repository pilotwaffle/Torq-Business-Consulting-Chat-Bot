import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { getChatResponse } from './services/geminiService';
import { saveChatHistory, loadChatHistory } from './services/storageService';
import { ChatMessage, ChatSessions, Conversation } from './types';
import { CONSULTANTS } from './constants';

const App: React.FC = () => {
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>(CONSULTANTS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessions>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<Map<string, Conversation[]>>(new Map());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    setChatHistory(loadChatHistory());
  }, []);

  useEffect(() => {
    if (chatHistory.size > 0) {
      saveChatHistory(chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    const consultantConvos = chatHistory.get(selectedConsultantId);
    if (consultantConvos && consultantConvos.length > 0) {
      const latestConvo = [...consultantConvos].sort((a, b) => b.timestamp - a.timestamp)[0];
      setActiveConversationId(latestConvo.id);
    } else {
      setActiveConversationId(null);
    }
  }, [selectedConsultantId, chatHistory]);

  useEffect(() => {
    if (activeConversationId) {
        const consultantConvos = chatHistory.get(selectedConsultantId) || [];
        const activeConvo = consultantConvos.find(c => c.id === activeConversationId);
        setMessages(activeConvo ? activeConvo.messages : []);
    } else {
        setMessages([]);
    }
  }, [activeConversationId, selectedConsultantId, chatHistory]);


  const handleSelectConsultant = (id: string) => {
    setSelectedConsultantId(id);
    setError(null);
    setFailedMessage(null);
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    const newSessions = new Map(chatSessions);
    newSessions.delete(selectedConsultantId);
    setChatSessions(newSessions);
    setError(null);
    setFailedMessage(null);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    const newSessions = new Map(chatSessions);
    newSessions.delete(selectedConsultantId);
    setChatSessions(newSessions);
    setError(null);
    setFailedMessage(null);
  };

  const upsertConversation = useCallback((updatedMessages: ChatMessage[]) => {
    setChatHistory(prevHistory => {
        const newHistory = new Map(prevHistory);
        const consultantConvos = newHistory.get(selectedConsultantId) || [];
        let conversationId = activeConversationId;
        let updatedConvos: Conversation[];

        if (conversationId) {
            updatedConvos = consultantConvos.map(convo =>
                convo.id === conversationId
                    ? { ...convo, messages: updatedMessages, timestamp: Date.now() }
                    : convo
            );
        } else {
            conversationId = `convo-${Date.now()}`;
            const newConversation: Conversation = {
                id: conversationId,
                timestamp: Date.now(),
                messages: updatedMessages,
            };
            updatedConvos = [...consultantConvos, newConversation];
            setActiveConversationId(conversationId);
        }
        newHistory.set(selectedConsultantId, updatedConvos);
        return newHistory;
    });
  }, [selectedConsultantId, activeConversationId]);

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;

    setError(null);
    setFailedMessage(null);

    const userMessage: ChatMessage = { role: 'user', content: userInput };
    const currentMessages = messages;
    const newMessages: ChatMessage[] = [...currentMessages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const selectedConsultant = CONSULTANTS.find(c => c.id === selectedConsultantId);
      if (!selectedConsultant) {
        throw new Error("Selected consultant not found.");
      }

      const { response, updatedSession } = await getChatResponse(
        selectedConsultant,
        chatSessions.get(selectedConsultantId),
        userInput,
        currentMessages
      );

      setChatSessions(prevSessions => {
        const newSessions = new Map(prevSessions);
        newSessions.set(selectedConsultantId, updatedSession);
        return newSessions;
      });

      // FIX: Explicitly type the model message to match ChatMessage interface.
      const modelMessage: ChatMessage = { role: 'model', content: response };
      const finalMessages = [...newMessages, modelMessage];
      setMessages(finalMessages);
      upsertConversation(finalMessages);

    } catch (e: any) {
      console.error("Error fetching chat response:", e);
      setError("Sorry, something went wrong. Please try again.");
      setFailedMessage(userInput);
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedConsultantId, chatSessions, upsertConversation]);

  const handleRetry = useCallback(async () => {
    if (!failedMessage) return;

    const messageToRetry = failedMessage;
    const history = messages.slice(0, messages.length -1); // remove last user message for history

    setError(null);
    setFailedMessage(null);
    setIsLoading(true);

    try {
        const selectedConsultant = CONSULTANTS.find(c => c.id === selectedConsultantId);
        if (!selectedConsultant) {
            throw new Error("Selected consultant not found.");
        }
        
        const newSessions = new Map(chatSessions);
        newSessions.delete(selectedConsultantId);
        setChatSessions(newSessions);

        const { response, updatedSession } = await getChatResponse(
            selectedConsultant,
            undefined,
            messageToRetry,
            history
        );

        setChatSessions(prevSessions => {
            const newSessions = new Map(prevSessions);
            newSessions.set(selectedConsultantId, updatedSession);
            return newSessions;
        });
        
        // FIX: Explicitly type the model message to match ChatMessage interface.
        const modelMessage: ChatMessage = { role: 'model', content: response };
        const finalMessages = [...messages, modelMessage];
        setMessages(finalMessages);
        upsertConversation(finalMessages);

    } catch (e: any) {
        console.error("Error retrying chat response:", e);
        setError("Sorry, the attempt to retry failed. Please try again.");
        setFailedMessage(messageToRetry);
    } finally {
        setIsLoading(false);
    }
  }, [failedMessage, selectedConsultantId, chatSessions, messages, upsertConversation]);

  const selectedConsultant = CONSULTANTS.find(c => c.id === selectedConsultantId) || CONSULTANTS[0];

  return (
    <div className="flex h-screen font-sans text-[#2B2D42] dark:text-[#EDF2F4]">
      <Sidebar
        consultants={CONSULTANTS}
        selectedConsultantId={selectedConsultantId}
        onSelectConsultant={handleSelectConsultant}
        onNewChat={handleNewChat}
        chatHistory={chatHistory}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
      />
      <main className="flex-1 flex flex-col h-screen">
        <ChatView
          consultant={selectedConsultant}
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSendMessage={handleSendMessage}
          onRetry={handleRetry}
        />
      </main>
    </div>
  );
};

export default App;
