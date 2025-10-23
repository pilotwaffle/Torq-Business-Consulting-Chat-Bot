import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { getChatResponseStream, generateTitleForConversation } from './services/geminiService';
import { saveChatHistory, loadChatHistory } from './services/storageService';
import { ChatMessage, ChatSessions, Conversation, Attachment } from './types';
import { CONSULTANTS } from './constants';

const generateErrorMessage = (e: any, context: 'send' | 'retry'): string => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const baseMessage = context === 'send' 
        ? 'Sorry, your message could not be sent.' 
        : 'Sorry, the attempt to retry failed.';
    
    let details: string;

    if (!navigator.onLine) {
        details = 'Network issue: You seem to be offline. Please check your connection.';
    } else if (e instanceof Error) {
        if (e.message.toLowerCase().includes('api_key')) {
            details = 'API Error: There may be an issue with the service configuration.';
        } else if (e.message.toLowerCase().includes('fetch') || e.message.toLowerCase().includes('network')) {
            details = 'Network Error: Could not connect to the server.';
        } else {
            details = 'An unexpected error occurred.';
        }
    } else {
        details = 'An unknown error occurred.';
    }
    
    return `${baseMessage} ${details} (at ${timestamp})`;
};

const App: React.FC = () => {
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>(CONSULTANTS[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSessions>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<{ content: string; attachments?: Attachment[]; history: ChatMessage[] } | null>(null);

  const [chatHistory, setChatHistory] = useState<Map<string, Conversation[]>>(new Map());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  
  const [titlingInProgress, setTitlingInProgress] = useState<Set<string>>(new Set());

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
    // FIX: Explicitly typing `prevHistory` resolves type inference issues within the updater function.
    setChatHistory((prevHistory: Map<string, Conversation[]>) => {
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
  
  const handleRenameConversation = useCallback((consultantId: string, conversationId: string, newTitle: string) => {
    // FIX: Explicitly typing `prevHistory` resolves type inference issues within the updater function.
    setChatHistory((prevHistory: Map<string, Conversation[]>) => {
        const newHistory = new Map(prevHistory);
        const consultantConvos = newHistory.get(consultantId) || [];
        // Prevent title overwriting if it's already being titled by AI
        const currentConvo = consultantConvos.find(c => c.id === conversationId);
        if(!currentConvo) return prevHistory;

        const updatedConvos = consultantConvos.map(convo =>
            convo.id === conversationId ? { ...convo, title: newTitle } : convo
        );
        newHistory.set(consultantId, updatedConvos);
        return newHistory;
    });
  }, []);

  const handleExportConversation = (consultantId: string, conversationId: string) => {
    const consultant = CONSULTANTS.find(c => c.id === consultantId);
    const conversation = chatHistory.get(consultantId)?.find(c => c.id === conversationId);
    if (!consultant || !conversation) return;

    let markdownContent = `# Conversation with ${consultant.name}\n\n**ID:** \`${conversation.id}\`\n**Timestamp:** \`${new Date(conversation.timestamp).toLocaleString()}\`\n\n---\n\n`;

    conversation.messages.forEach(msg => {
        if (msg.role === 'tool') return;
        
        const author = msg.role === 'user' ? 'User' : consultant.name;
        markdownContent += `### **${author}**\n`;
        if (msg.content) {
            markdownContent += `${msg.content.replace(/\n/g, '\n\n')}\n\n`;
        }
        if (msg.attachments) {
            msg.attachments.forEach(att => {
                 markdownContent += `*Attachment: \`${att.name}\`*\n\n`;
            });
        }
        if (msg.toolCalls) {
            msg.toolCalls.forEach(tc => {
                 markdownContent += `*Executing Tool: \`${tc.name}\` with arguments \`${JSON.stringify(tc.args)}\`*\n\n`;
            });
        }
        markdownContent += `---\n\n`;
    });

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const title = conversation.title || `conversation-${conversation.id}`;
    const safeFilename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.href = url;
    a.download = `${safeFilename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const upsertConversation = useCallback((finalMessages: ChatMessage[]) => {
    setChatHistory((prevHistory: Map<string, Conversation[]>) => {
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
            // This is async, so we use the new ID directly for subsequent operations
            setActiveConversationId(conversationId);
        }
        newHistory.set(selectedConsultantId, updatedConvos);
        return newHistory;
    });
  }, [selectedConsultantId, activeConversationId]);

  // Implements AI-powered conversation titling.
  // This effect triggers after a message is successfully received and the chat is idle.
  // It checks if the active conversation has at least two messages, does not already have a title,
  // and is not currently being processed for a title. If these conditions are met, it makes an
  // asynchronous call to the Gemini API to generate a concise title and updates the conversation state.
  useEffect(() => {
    // Guard against running when loading, no active conversation, or already processed for titling.
    if (isLoading || !activeConversationId || titlingInProgress.has(activeConversationId)) {
        return;
    }

    const consultantConvos = chatHistory.get(selectedConsultantId);
    const activeConvo = consultantConvos?.find(c => c.id === activeConversationId);

    // Conditions for titling: conversation exists, has no title yet, and has at least two messages.
    if (activeConvo && !activeConvo.title && activeConvo.messages.length >= 2) {
        // Mark this conversation as being processed to prevent duplicate requests.
        setTitlingInProgress(prev => new Set(prev).add(activeConversationId));
        
        generateTitleForConversation(activeConvo.messages)
            .then(newTitle => {
                if (newTitle) {
                    handleRenameConversation(selectedConsultantId, activeConvo.id, newTitle);
                }
            })
            .catch(err => {
                console.error("Title generation failed:", err);
                // Optional: If you want to allow retries on failure, remove from the set here.
            });
    }
  }, [isLoading, activeConversationId, chatHistory, selectedConsultantId, titlingInProgress, handleRenameConversation]);


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

  const handleSendMessage = useCallback(async (userInput: string, attachment: Attachment | null) => {
    if (!userInput.trim() && !attachment) return;
    
    closeSidebarOnMobile();
    setError(null);
    setFailedMessage(null);

    const userMessage: ChatMessage = { 
        role: 'user', 
        content: userInput,
        ...(attachment && { attachments: [attachment] })
    };
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
            currentMessagesForHistory,
            attachment ? [attachment] : undefined
        );

        const finalMessages = await processStream(streamGenerator.stream);
        
        const finalSession = await streamGenerator.finalSession;
        setChatSessions(prev => new Map(prev).set(selectedConsultantId, finalSession));

        upsertConversation(finalMessages);

    } catch (e: any) {
        console.error("Error fetching chat response:", e);
        setError(generateErrorMessage(e, 'send'));
        setFailedMessage({ content: userInput, attachments: attachment ? [attachment] : undefined, history: currentMessagesForHistory });
        setMessages(currentMessagesForHistory);
    } finally {
        setIsLoading(false);
    }
  }, [messages, selectedConsultantId, chatSessions, upsertConversation, processStream]);


  const handleRetry = useCallback(async () => {
    if (!failedMessage) return;

    closeSidebarOnMobile();
    const { content: messageToRetry, attachments: attachmentsForRetry, history: historyForRetry } = failedMessage;
    
    setError(null);
    setFailedMessage(null);
    const userMessage: ChatMessage = { role: 'user', content: messageToRetry, attachments: attachmentsForRetry };
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
            historyForRetry,
            attachmentsForRetry
        );

        const finalMessages = await processStream(streamGenerator.stream);

        const finalSession = await streamGenerator.finalSession;
        setChatSessions(prev => new Map(prev).set(selectedConsultantId, finalSession));
        
        upsertConversation(finalMessages);

    } catch (e: any) {
        console.error("Error retrying chat response:", e);
        setError(generateErrorMessage(e, 'retry'));
        setFailedMessage({ content: messageToRetry, attachments: attachmentsForRetry, history: historyForRetry });
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
        onExportConversation={handleExportConversation}
      />
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
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