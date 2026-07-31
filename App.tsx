import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { CONSULTANTS } from './constants';
import { useTheme } from './hooks/useTheme';
import {
  useConversations,
  loadSelectedConsultantId,
  persistSelectedConsultantId,
} from './hooks/useConversations';
import { useChat } from './hooks/useChat';

const App: React.FC = () => {
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>(() =>
    loadSelectedConsultantId(CONSULTANTS[0]!.id),
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768,
  );

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((open) => !open);
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const {
    chatHistory,
    activeConversationId,
    messages,
    setMessages,
    handleNewChat,
    handleSelectConversation,
    handleDeleteConversation,
    handleRenameConversation,
    upsertConversation,
  } = useConversations(selectedConsultantId);

  const { isLoading, error, handleSendMessage, handleRetry } = useChat(
    selectedConsultantId,
    messages,
    setMessages,
    upsertConversation,
  );

  const handleSelectConsultant = (id: string) => {
    setSelectedConsultantId(id);
    persistSelectedConsultantId(id);
    closeSidebarOnMobile();
  };

  const handleExportConversation = useCallback(
    (consultantId: string, conversationId: string) => {
      const consultant = CONSULTANTS.find((c) => c.id === consultantId);
      const conversation = chatHistory.get(consultantId)?.find((c) => c.id === conversationId);
      if (!consultant || !conversation) return;

      let markdownContent = `# Conversation with ${consultant.name}\n\n**TORQ Chat**\n**ID:** \`${conversation.id}\`\n**Timestamp:** \`${new Date(conversation.timestamp).toLocaleString()}\`\n\n---\n\n`;

      conversation.messages.forEach((msg) => {
        if (msg.role === 'tool') return;

        const author = msg.role === 'user' ? 'User' : consultant.name;
        markdownContent += `### **${author}**\n`;
        if (msg.content) {
          markdownContent += `${msg.content.replace(/\n/g, '\n\n')}\n\n`;
        }
        if (msg.attachments) {
          msg.attachments.forEach((att) => {
            markdownContent += `*Attachment: \`${att.name}\`*\n\n`;
          });
        }
        if (msg.toolCalls) {
          msg.toolCalls.forEach((tc) => {
            markdownContent += `*Tool: \`${tc.name}\` — \`${JSON.stringify(tc.args)}\`*\n\n`;
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
      a.download = `torq-chat-${safeFilename}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [chatHistory],
  );

  // Global shortcuts: Ctrl/Cmd+Shift+O new chat, Esc close mobile sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleNewChat();
      }
      if (e.key === 'Escape' && window.innerWidth < 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNewChat, isSidebarOpen]);

  const selectedConsultant =
    CONSULTANTS.find((c) => c.id === selectedConsultantId) || CONSULTANTS[0]!;

  return (
    <div className="flex h-screen font-sans text-[#2B2D42] dark:text-[#EDF2F4] relative overflow-hidden bg-[#EDF2F4] dark:bg-[#2B2D42]">
      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          aria-hidden="true"
        />
      )}
      <Sidebar
        consultants={CONSULTANTS}
        selectedConsultantId={selectedConsultantId}
        onSelectConsultant={handleSelectConsultant}
        onNewChat={handleNewChat}
        chatHistory={chatHistory}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          handleSelectConversation(id);
          closeSidebarOnMobile();
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
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
          onToggleSidebar={toggleSidebar}
        />
      </main>
    </div>
  );
};

export default App;
