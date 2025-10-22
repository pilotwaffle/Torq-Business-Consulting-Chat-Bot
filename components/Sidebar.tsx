
import React, { useState, useRef, useEffect } from 'react';
import { Consultant, Conversation } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { EllipsisHorizontalIcon } from './icons/EllipsisHorizontalIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';

interface SidebarProps {
  consultants: Consultant[];
  selectedConsultantId: string;
  onSelectConsultant: (id: string) => void;
  onNewChat: () => void;
  chatHistory: Map<string, Conversation[]>;
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isSidebarOpen: boolean;
  onDeleteConversation: (consultantId: string, conversationId: string) => void;
  onRenameConversation: (consultantId: string, conversationId: string, newTitle: string) => void;
}

const logoBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMyQjJENDIiLz4KPHBhdGggZD0iTTEyIDEyTDIwIDIwTDI4IDEyIiBzdHJva2U9IiNFRjIzM0MiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMiAyMEwyMCAyOEwyOCAyMCIgc3Ryb2tlPSIjRURGMkY0IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K';

export const Sidebar: React.FC<SidebarProps> = ({
  consultants,
  selectedConsultantId,
  onSelectConsultant,
  onNewChat,
  chatHistory,
  activeConversationId,
  onSelectConversation,
  theme,
  onToggleTheme,
  isSidebarOpen,
  onDeleteConversation,
  onRenameConversation,
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const consultantConversations = chatHistory.get(selectedConsultantId) || [];

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuOpenId && !(event.target as HTMLElement).closest('.menu-container')) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [menuOpenId]);


  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.title) {
      return conversation.title;
    }
    if (conversation.messages.length === 0) {
      return "New Conversation";
    }
    const firstUserMessage = conversation.messages.find(m => m.role === 'user');
    const content = firstUserMessage?.content || conversation.messages[0].content;
    return `${content.substring(0, 35)}${content.length > 35 ? "..." : ""}`;
  };

  const handleRename = (conversation: Conversation) => {
    setRenamingId(conversation.id);
    setRenameValue(getConversationTitle(conversation));
    setMenuOpenId(null);
  };
  
  const handleConfirmRename = () => {
    if (renamingId && renameValue.trim()) {
        onRenameConversation(selectedConsultantId, renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleConfirmRename();
    } else if (e.key === 'Escape') {
        setRenamingId(null);
        setRenameValue('');
    }
  };


  return (
    <aside className={`w-80 flex flex-col bg-[#F8F9FA] dark:bg-[#212332] border-r border-[#EDF2F4] dark:border-white/10 transform transition-transform duration-300 ease-in-out z-30 fixed md:relative h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="p-4 border-b border-[#EDF2F4] dark:border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={logoBase64} alt="Logo" className="w-8 h-8 rounded-full" />
          <h1 className="text-xl font-bold tracking-tight">TORQ AI</h1>
        </div>
        <button
          onClick={onNewChat}
          className="p-2 rounded-md hover:bg-[#EDF2F4] dark:hover:bg-[#383a51] transition-colors"
          aria-label="New chat"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-4">
          <div>
            <h3 className="px-2 text-xs font-semibold uppercase text-[#8D99AE] tracking-wider mb-2">Consultants</h3>
            <ul className="space-y-1">
              {consultants.map((consultant) => (
                <li key={consultant.id}>
                  <button
                    onClick={() => onSelectConsultant(consultant.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                      selectedConsultantId === consultant.id
                        ? 'bg-[#D90429]/10 text-[#D90429] dark:bg-[#D90429]/20'
                        : 'hover:bg-[#EDF2F4] dark:hover:bg-[#383a51]'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${selectedConsultantId === consultant.id ? 'bg-[#D90429]' : 'bg-[#8D99AE]'}`}></div>
                    <span className="font-medium">{consultant.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {consultantConversations.length > 0 && (
            <div>
              <h3 className="px-2 text-xs font-semibold uppercase text-[#8D99AE] tracking-wider mb-2">History</h3>
              <ul className="space-y-1">
                {consultantConversations.sort((a, b) => Number(b.timestamp) - Number(a.timestamp)).map((conversation) => (
                  <li key={conversation.id} className="relative group">
                    {renamingId === conversation.id ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleConfirmRename}
                        onKeyDown={handleRenameKeyDown}
                        className="w-full text-sm font-medium px-3 py-2 rounded-lg bg-[#EDF2F4] dark:bg-[#383a51] focus:ring-2 focus:ring-[#D90429] outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => onSelectConversation(conversation.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg truncate transition-colors ${
                          activeConversationId === conversation.id
                            ? 'bg-[#EDF2F4] dark:bg-[#383a51]'
                            : 'hover:bg-[#EDF2F4]/50 dark:hover:bg-[#383a51]/50'
                        }`}
                      >
                        <p className="text-sm font-medium">{getConversationTitle(conversation)}</p>
                      </button>
                    )}
                    {renamingId !== conversation.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity menu-container">
                        <button onClick={() => setMenuOpenId(menuOpenId === conversation.id ? null : conversation.id)} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
                            <EllipsisHorizontalIcon className="w-5 h-5"/>
                        </button>
                        {menuOpenId === conversation.id && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#2B2D42] rounded-lg shadow-lg border border-black/10 dark:border-white/10 z-10">
                                <button onClick={() => handleRename(conversation)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10">
                                    <PencilIcon className="w-4 h-4"/> Rename
                                </button>
                                <button onClick={() => onDeleteConversation(selectedConsultantId, conversation.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-600 dark:text-red-500 hover:bg-black/5 dark:hover:bg-white/10">
                                    <TrashIcon className="w-4 h-4"/> Delete
                                </button>
                            </div>
                        )}
                    </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      </div>
      <div className="p-4 border-t border-[#EDF2F4] dark:border-white/10">
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-lg text-[#8D99AE] hover:bg-[#EDF2F4] dark:hover:bg-[#383a51] transition-colors"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <MoonIcon className="w-5 h-5" />
          ) : (
            <SunIcon className="w-5 h-5" />
          )}
          <span className="font-medium text-sm">Switch Theme</span>
        </button>
      </div>
    </aside>
  );
};
