import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, Consultant, Attachment } from '../types';
import { ChatMessageBubble } from './ChatMessageBubble';
import { MessageInput } from './MessageInput';
import { MenuIcon } from './icons/MenuIcon';
import { ArrowDownCircleIcon } from './icons/ArrowDownCircleIcon';

const LOGO_SRC = '/torq-chat-logo.jpg';

interface ChatViewProps {
  consultant: Consultant;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (input: string, attachment: Attachment | null) => void;
  onRetry: () => void;
  onToggleSidebar: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  consultant,
  messages,
  isLoading,
  error,
  onSendMessage,
  onRetry,
  onToggleSidebar,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledRef = useRef(false);
  const [liveRegionMessage, setLiveRegionMessage] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    isUserScrolledRef.current = false;
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (container) {
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 48;
      if (!atBottom) {
        isUserScrolledRef.current = true;
        setShowScrollButton(true);
      } else {
        isUserScrolledRef.current = false;
        setShowScrollButton(false);
      }
    }
  };

  useEffect(() => {
    if (!isUserScrolledRef.current) {
      scrollToBottom(isLoading ? 'auto' : 'smooth');
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isLoading) {
      setLiveRegionMessage(`${consultant.name} is typing...`);
    } else if (error) {
      setLiveRegionMessage(`Error: ${error}`);
    } else {
      const timer = setTimeout(() => setLiveRegionMessage(''), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, error, consultant.name]);

  const visibleMessages = messages.filter((m) => m.role !== 'tool');

  return (
    <div className="flex-1 grid grid-rows-[auto,1fr,auto] bg-white dark:bg-[#2B2D42] overflow-hidden relative">
      <div
        aria-live="polite"
        className="sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
      >
        {liveRegionMessage}
      </div>

      <header className="px-4 py-3 border-b border-[#EDF2F4] dark:border-white/10 flex items-center justify-between gap-4 bg-white/90 dark:bg-[#2B2D42]/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md hover:bg-[#EDF2F4] dark:hover:bg-[#383a51] transition-colors md:hidden shrink-0"
            aria-label="Toggle sidebar"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <img
            src={LOGO_SRC}
            alt=""
            className="w-9 h-9 rounded-full object-cover shrink-0 hidden sm:block ring-1 ring-black/5 dark:ring-white/10"
          />
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold truncate">{consultant.name}</h2>
            <p className="text-sm text-[#8D99AE] truncate">{consultant.description}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#8D99AE] shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDF2F4] dark:bg-[#383a51]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Claude · TORQ Chat
          </span>
        </div>
      </header>

      <div ref={chatContainerRef} onScroll={handleScroll} className="overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center text-[#8D99AE] px-2">
            <img
              src={LOGO_SRC}
              alt="TORQ Chat"
              className="w-20 h-20 mb-5 rounded-full object-cover shadow-lg ring-2 ring-[#D90429]/20"
            />
            <h3 className="text-2xl font-semibold text-[#2B2D42] dark:text-[#EDF2F4] mb-1">
              {consultant.name}
            </h3>
            <p className="mb-2 max-w-md text-[#2B2D42]/80 dark:text-[#EDF2F4]/80">
              {consultant.description}
            </p>
            <p className="mb-8 text-sm">Pick a starter prompt or ask anything.</p>

            {consultant.promptSuggestions && (
              <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                {consultant.promptSuggestions.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSendMessage(prompt, null)}
                    className="text-left text-sm p-4 bg-[#EDF2F4] dark:bg-[#383a51] rounded-xl hover:bg-[#D90429]/10 dark:hover:bg-[#D90429]/15 hover:ring-1 hover:ring-[#D90429]/30 transition-all text-[#2B2D42] dark:text-[#EDF2F4] shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {visibleMessages.map((msg, index) => {
          const isLastModel =
            !isUserScrolledRef.current &&
            isLoading &&
            msg.role === 'model' &&
            index === visibleMessages.length - 1;
          return (
            <ChatMessageBubble
              key={`${msg.role}-${index}-${msg.content?.slice(0, 12) ?? ''}`}
              message={msg}
              isStreaming={Boolean(isLastModel)}
            />
          );
        })}

        {error && (
          <div className="flex justify-center">
            <div
              className="bg-[#EF233C]/10 border border-[#EF233C]/50 text-[#D90429] dark:text-[#EF233C] px-4 py-3 rounded-lg relative max-w-lg flex items-center justify-between gap-3"
              role="alert"
            >
              <div>
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
              <button
                onClick={onRetry}
                className="shrink-0 px-3 py-1.5 bg-[#D90429] text-white rounded-md hover:bg-[#EF233C] transition-colors text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#D90429]"
                aria-label="Retry sending message"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => scrollToBottom('smooth')}
            className="p-1.5 bg-white dark:bg-[#383a51] rounded-full shadow-lg border border-black/5 dark:border-white/10 text-[#D90429] hover:bg-gray-100 dark:hover:bg-[#4a4d6a] transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#D90429]"
            aria-label="Scroll to bottom"
          >
            <ArrowDownCircleIcon className="w-8 h-8" />
          </button>
        </div>
      )}

      <div className="p-3 sm:p-4 border-t border-[#EDF2F4] dark:border-white/10 bg-white dark:bg-[#2B2D42]">
        <MessageInput onSendMessage={onSendMessage} isLoading={isLoading} />
        <p className="mt-2 text-center text-[11px] text-[#8D99AE]">
          TORQ Chat · advice is general guidance, not professional counsel ·{' '}
          <a href="/privacy.html" className="underline hover:text-[#D90429]">Privacy</a>
          {' · '}
          <a href="/terms.html" className="underline hover:text-[#D90429]">Terms</a>
          {' · '}Ctrl/⌘+Shift+O new chat
        </p>
      </div>
    </div>
  );
};
