
import React, { useState } from 'react';
import { SendIcon } from './icons/SendIcon';

interface MessageInputProps {
  onSendMessage: (input: string) => void;
  isLoading: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask a business question..."
        className="flex-1 w-full px-4 py-2 bg-[#EDF2F4] dark:bg-[#383a51] text-[#2B2D42] dark:text-[#EDF2F4] border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D90429] transition"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="p-3 bg-[#D90429] text-white rounded-full disabled:bg-[#D90429]/60 disabled:cursor-not-allowed hover:bg-[#EF233C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D90429] dark:focus:ring-offset-[#2B2D42] transition-colors"
        aria-label="Send message"
      >
        <SendIcon className="w-5 h-5" />
      </button>
    </form>
  );
};
