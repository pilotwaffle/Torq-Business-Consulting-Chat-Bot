import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, Consultant, Attachment } from '../types';
import { ChatMessageBubble } from './ChatMessageBubble';
import { MessageInput } from './MessageInput';
import { BotIcon } from './icons/BotIcon';
import { MenuIcon } from './icons/MenuIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { ArrowDownCircleIcon } from './icons/ArrowDownCircleIcon';

interface ChatViewProps {
  consultant: Consultant;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (input: string, attachment: Attachment | null) => void;
  onRetry: () => void;
  onToggleSidebar: () => void;
  onStartLiveSession: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ consultant, messages, isLoading, error, onSendMessage, onRetry, onToggleSidebar, onStartLiveSession }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledRef = useRef(false);
  const [liveRegionMessage, setLiveRegionMessage] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    // When we programmatically scroll, we can assume the user wants to be at the bottom.
    isUserScrolledRef.current = false;
    setShowScrollButton(false);
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (container) {
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;
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
    // Only auto-scroll if the user hasn't scrolled up manually.
    if (!isUserScrolledRef.current) {
      // Use 'auto' for instant scroll during streaming to avoid jerky/laggy animations.
      scrollToBottom(isLoading ? 'auto' : 'smooth');
    }
  }, [messages, isLoading]);
  
  useEffect(() => {
    if (isLoading) {
      setLiveRegionMessage(`${consultant.name} is typing...`);
    } else if (error) {
      setLiveRegionMessage(`Error: ${error}`);
    } else {
      // Clear message after a short delay to allow screen readers to announce completion if needed
      const timer = setTimeout(() => setLiveRegionMessage(''), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, error, consultant.name]);

  return (
    <div className="flex-1 grid grid-rows-[auto,1fr,auto] bg-white dark:bg-[#2B2D42] overflow-hidden relative">
       <div 
        aria-live="polite" 
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {liveRegionMessage}
      </div>
      <header className="p-4 border-b border-[#EDF2F4] dark:border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <button 
              onClick={onToggleSidebar} 
              className="p-2 rounded-md hover:bg-[#EDF2F4] dark:hover:bg-[#383a51] transition-colors md:hidden"
              aria-label="Toggle sidebar"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            <div>
                <h2 className="text-xl font-semibold">{consultant.name}</h2>
                <p className="text-sm text-[#8D99AE]">{consultant.description}</p>
            </div>
        </div>
        {consultant.id === 'strategic-advisor' && (
            <button 
                onClick={onStartLiveSession}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#D90429] rounded-lg hover:bg-[#EF233C] transition-colors"
                aria-label="Start live voice session"
            >
                <MicrophoneIcon className="w-4 h-4" />
                <span>Go Live</span>
            </button>
        )}
      </header>

      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="overflow-y-auto p-6 space-y-6"
      >
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#8D99AE]">
            <BotIcon className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-2xl font-semibold text-[#2B2D42] dark:text-[#EDF2F4]">Ask me anything</h3>
            <p className="mb-6">I'm the {consultant.name}, ready to help with your business questions.</p>
            
            {consultant.promptSuggestions && (
              <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3">
                {consultant.promptSuggestions.map((prompt, i) => (
                  <button 
                    key={i} 
                    onClick={() => onSendMessage(prompt, null)}
                    className="text-left text-sm p-3 bg-[#EDF2F4] dark:bg-[#383a51] rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-[#2B2D42] dark:text-[#EDF2F4]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((msg, index) => (
          <ChatMessageBubble key={index} message={msg} />
        ))}
         {error && (
            <div className="flex justify-center">
                <div className="bg-[#EF233C]/10 border border-[#EF233C]/50 text-[#D90429] dark:text-[#EF233C] px-4 py-3 rounded-lg relative max-w-md flex items-center justify-between" role="alert">
                    <div>
                      <strong className="font-bold">Error: </strong>
                      <span className="block sm:inline">{error}</span>
                    </div>
                    <button
                      onClick={onRetry}
                      className="ml-4 px-3 py-1 bg-[#D90429] text-white rounded hover:bg-[#EF233C] active:bg-red-800 transition-colors text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#D90429] focus:ring-offset-2 dark:focus:ring-offset-gray-800"
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
                className="p-1.5 bg-white dark:bg-[#383a51] rounded-full shadow-lg border border-black/5 dark:border-white/10 text-[#D90429] hover:bg-gray-100 dark:hover:bg-[#4a4d6a] transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D90429] dark:focus:ring-offset-[#2B2D42]"
                aria-label="Scroll to bottom"
            >
                <ArrowDownCircleIcon className="w-8 h-8"/>
            </button>
        </div>
      )}

      <div className="p-4 border-t border-[#EDF2F4] dark:border-white/10 bg-white dark:bg-[#2B2D42]">
        <MessageInput onSendMessage={onSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};