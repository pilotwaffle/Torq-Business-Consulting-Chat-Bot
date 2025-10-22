
import React from 'react';
import { ChatMessage } from '../types';
import { UserIcon } from './icons/UserIcon';
import { BotIcon } from './icons/BotIcon';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isLoading?: boolean;
}

const LoadingIndicator: React.FC = () => (
  <div className="flex items-center space-x-2">
    <div className="w-2 h-2 bg-[#8D99AE] rounded-full animate-pulse [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-[#8D99AE] rounded-full animate-pulse [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-[#8D99AE] rounded-full animate-pulse"></div>
  </div>
);

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, isLoading = false }) => {
  const { role, content } = message;
  const isUser = role === 'user';

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#EDF2F4] dark:bg-[#383a51] flex items-center justify-center flex-shrink-0">
          <BotIcon className="w-5 h-5 text-[#8D99AE]" />
        </div>
      )}
      
      <div
        className={`max-w-xl px-4 py-3 rounded-2xl shadow-sm ${
          isUser
            ? 'bg-[#D90429] text-white rounded-br-none'
            : 'bg-[#EDF2F4] dark:bg-[#383a51] text-[#2B2D42] dark:text-[#EDF2F4] rounded-bl-none'
        }`}
      >
        {isLoading ? <LoadingIndicator /> : <p className="whitespace-pre-wrap">{content}</p>}
      </div>

       {isUser && (
        <div className="w-8 h-8 rounded-full bg-[#EDF2F4] dark:bg-[#383a51] flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-5 h-5 text-[#8D99AE]" />
        </div>
      )}
    </div>
  );
};
