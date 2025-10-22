
import React, { useState, useCallback } from 'react';
import { Chat } from "@google/genai";
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { getChatResponse } from './services/geminiService';
import { ChatMessage, ChatSessions } from './types';
import { CONSULTANTS } from './constants';

const App: React.FC = () => {
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>(CONSULTANTS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessions>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);


  const handleSelectConsultant = (id: string) => {
    setSelectedConsultantId(id);
    setMessages([]);
    setError(null);
    setFailedMessage(null);
  };

  const handleNewChat = () => {
    setMessages([]);
    setError(null);
    setFailedMessage(null);
  };

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;

    setError(null);
    setFailedMessage(null);

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userInput }];
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
        userInput
      );

      setChatSessions(prevSessions => {
        const newSessions = new Map(prevSessions);
        newSessions.set(selectedConsultantId, updatedSession);
        return newSessions;
      });

      setMessages([...newMessages, { role: 'model', content: response }]);
    } catch (e: any) {
      console.error("Error fetching chat response:", e);
      setError("Sorry, something went wrong. Please try again.");
      setFailedMessage(userInput);
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedConsultantId, chatSessions]);

  const handleRetry = useCallback(async () => {
    if (!failedMessage) return;

    const messageToRetry = failedMessage;
    setError(null);
    setFailedMessage(null);
    setIsLoading(true);

    try {
        const selectedConsultant = CONSULTANTS.find(c => c.id === selectedConsultantId);
        if (!selectedConsultant) {
            throw new Error("Selected consultant not found.");
        }

        const { response, updatedSession } = await getChatResponse(
            selectedConsultant,
            chatSessions.get(selectedConsultantId),
            messageToRetry
        );

        setChatSessions(prevSessions => {
            const newSessions = new Map(prevSessions);
            newSessions.set(selectedConsultantId, updatedSession);
            return newSessions;
        });

        setMessages(prevMessages => [...prevMessages, { role: 'model', content: response }]);
    } catch (e: any) {
        console.error("Error retrying chat response:", e);
        setError("Sorry, the attempt to retry failed. Please try again.");
        setFailedMessage(messageToRetry);
    } finally {
        setIsLoading(false);
    }
  }, [failedMessage, selectedConsultantId, chatSessions]);

  const selectedConsultant = CONSULTANTS.find(c => c.id === selectedConsultantId) || CONSULTANTS[0];

  return (
    <div className="flex h-screen font-sans text-[#2B2D42] dark:text-[#EDF2F4]">
      <Sidebar
        consultants={CONSULTANTS}
        selectedConsultantId={selectedConsultantId}
        onSelectConsultant={handleSelectConsultant}
        onNewChat={handleNewChat}
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
