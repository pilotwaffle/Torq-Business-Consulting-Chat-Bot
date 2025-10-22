

import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { getChatResponseStream } from './services/geminiService';
import { saveChatHistory, loadChatHistory } from './services/storageService';
import { ChatMessage, ChatSessions, Conversation } from './types';
import { CONSULTANTS } from './constants';

const App: React.FC = () => {
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>(CONSULTANTS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessions>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<{ content: string; history: ChatMessage[] } | null>(null);

  const [chatHistory, setChatHistory] = useState<Map<string, Conversation[]>>(new Map());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (prefersDark) {
      setTheme('dark');
    }
  }, []);
  
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

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
    closeSidebarOnMobile();
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    const newSessions = new Map(chatSessions);
    newSessions.delete(selectedConsultantId);
    setChatSessions(newSessions);
    setError(null);
    setFailedMessage(null);
    closeSidebarOnMobile();
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    const newSessions = new Map(chatSessions);
    newSessions.delete(selectedConsultantId);
    setChatSessions(newSessions);
    setError(null);
    setFailedMessage(null);
    closeSidebarOnMobile();
  };
  
  const handleDeleteConversation = (consultantId: string, conversationId: string) => {
    setChatHistory(prevHistory => {
        const newHistory = new Map(prevHistory);
        const consultantConvos = newHistory.get(consultantId) || [];
        const updatedConvos = consultantConvos.filter(c => c.id !== conversationId);
        
        if (updatedConvos.length > 0) {
            newHistory.set(consultantId, updatedConvos);
        } else {
            newHistory.delete(consultantId);
        }

        if (activeConversationId === conversationId) {
            handleNewChat();
        }

        return newHistory;
    });
  };
  
  const handleRenameConversation = (consultantId: string, conversationId: string, newTitle: string) => {
    setChatHistory(prevHistory => {
        const newHistory = new Map(prevHistory);
        const consultantConvos = newHistory.get(consultantId) || [];
        const updatedConvos = consultantConvos.map(convo =>
            convo.id === conversationId ? { ...convo, title: newTitle } : convo
        );
        newHistory.set(consultantId, updatedConvos);
        return newHistory;
    });
  };

  const upsertConversation = useCallback((finalMessages: ChatMessage[]) => {
    setChatHistory(prevHistory => {
        const newHistory = new Map(prevHistory);
        const consultantConvos = newHistory.get(selectedConsultantId) || [];
        let conversationId = activeConversationId;
        let updatedConvos: Conversation[];

        if (conversationId) {
            updatedConvos = consultantConvos.map(convo =>
                convo.id === conversationId
                    ? { ...convo, messages: finalMessages, timestamp: Date.now() }
                    : convo
            );
        } else {
            conversationId = `convo-${Date.now()}`;
            const newConversation: Conversation = {
                id: conversationId,
                timestamp: Date.now(),
                messages: finalMessages,
            };
            updatedConvos = [...consultantConvos, newConversation];
            setActiveConversationId(conversationId);
        }
        newHistory.set(selectedConsultantId, updatedConvos);
        return newHistory;
    });
  }, [selectedConsultantId, activeConversationId]);

  const processStream = useCallback(async (streamGenerator: AsyncGenerator<Partial<ChatMessage>, any, undefined>) => {
    let finalMessages: ChatMessage[] = [];
    
    for await (const chunk of streamGenerator) {
        setMessages(currentMessages => {
            const newMessages = [...currentMessages];
            let lastMessage = newMessages[newMessages.length - 1];

            if (chunk.role && lastMessage.role !== chunk.role) {
                newMessages.push({ role: chunk.role, content: '' });
                lastMessage = newMessages[newMessages.length - 1];
            }
            
            if (chunk.content) {
                lastMessage.content = (lastMessage.content || '') + chunk.content;
            }
            if (chunk.toolCalls) {
                lastMessage.toolCalls = chunk.toolCalls;
            }
            if (chunk.groundingMetadata) {
                lastMessage.groundingMetadata = chunk.groundingMetadata;
            }
            
            finalMessages = newMessages;
            return newMessages;
        });
    }
    return finalMessages;
  }, []);

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;
    
    closeSidebarOnMobile();
    setError(null);
    setFailedMessage(null);

    const userMessage: ChatMessage = { role: 'user', content: userInput };
    const currentMessagesForHistory = messages;
    setMessages(prev => [...prev, userMessage, { role: 'model', content: '' }]);
    setIsLoading(true);

    try {
        const selectedConsultant = CONSULTANTS.find(c => c.id === selectedConsultantId);
        if (!selectedConsultant) throw new Error("Selected consultant not found.");

        const streamGenerator = getChatResponseStream(
            selectedConsultant,
            chatSessions.get(selectedConsultantId),
            userInput,
            currentMessagesForHistory
        );

        const finalMessages = await processStream(streamGenerator.stream);
        
        const finalSession = await streamGenerator.finalSession;
        setChatSessions(prev => new Map(prev).set(selectedConsultantId, finalSession));

        upsertConversation(finalMessages);

    } catch (e: any) {
        console.error("Error fetching chat response:", e);
        setError("Sorry, something went wrong. Please try again.");
        setFailedMessage({ content: userInput, history: currentMessagesForHistory });
        setMessages(currentMessagesForHistory);
    } finally {
        setIsLoading(false);
    }
  }, [messages, selectedConsultantId, chatSessions, upsertConversation, processStream]);


  const handleRetry = useCallback(async () => {
    if (!failedMessage) return;

    closeSidebarOnMobile();
    const { content: messageToRetry, history: historyForRetry } = failedMessage;
    
    setError(null);
    setFailedMessage(null);
    const userMessage: ChatMessage = { role: 'user', content: messageToRetry };
    setMessages([...historyForRetry, userMessage, { role: 'model', content: '' }]);
    setIsLoading(true);
    
    try {
        const selectedConsultant = CONSULTANTS.find(c => c.id === selectedConsultantId);
        if (!selectedConsultant) throw new Error("Selected consultant not found.");
        
        const newSessions = new Map(chatSessions);
        newSessions.delete(selectedConsultantId);
        setChatSessions(newSessions);

        const streamGenerator = getChatResponseStream(
            selectedConsultant,
            undefined, 
            messageToRetry,
            historyForRetry
        );

        const finalMessages = await processStream(streamGenerator.stream);

        const finalSession = await streamGenerator.finalSession;
        setChatSessions(prev => new Map(prev).set(selectedConsultantId, finalSession));
        
        upsertConversation(finalMessages);

    } catch (e: any) {
        console.error("Error retrying chat response:", e);
        setError("Sorry, the attempt to retry failed. Please try again.");
        setFailedMessage({ content: messageToRetry, history: historyForRetry });
        setMessages([...historyForRetry, userMessage]);
    } finally {
        setIsLoading(false);
    }
  }, [failedMessage, selectedConsultantId, chatSessions, upsertConversation, processStream]);

  const selectedConsultant = CONSULTANTS.find(c => c.id === selectedConsultantId) || CONSULTANTS[0];

  return (
    <div className="flex h-screen font-sans text-[#2B2D42] dark:text-[#EDF2F4] relative overflow-hidden">
      {isSidebarOpen && (
        <div 
            onClick={handleToggleSidebar} 
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            aria-hidden="true"
        ></div>
      )}
      <Sidebar
        consultants={CONSULTANTS}
        selectedConsultantId={selectedConsultantId}
        onSelectConsultant={handleSelectConsultant}
        onNewChat={handleNewChat}
        chatHistory={chatHistory}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isSidebarOpen={isSidebarOpen}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatView
          consultant={selectedConsultant}
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSendMessage={handleSendMessage}
          onRetry={handleRetry}
          onToggleSidebar={handleToggleSidebar}
        />
      </main>
    </div>
  );
};

export default App;