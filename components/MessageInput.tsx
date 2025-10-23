import React, { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { SendIcon } from './icons/SendIcon';
import { Attachment } from '../types';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { XIcon } from './icons/XIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface MessageInputProps {
  onSendMessage: (input: string, attachment: Attachment | null) => void;
  isLoading: boolean;
}

const readFile = (file: File): Promise<{ data: string; source: 'base64' | 'text' }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = error => reject(error);
        reader.onload = () => {
            if (file.type.startsWith('image/')) {
                resolve({ data: (reader.result as string).split(',')[1], source: 'base64' });
            } else {
                resolve({ data: reader.result as string, source: 'text' });
            }
        };

        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('text/') || file.type === 'application/json' || file.name.endsWith('.md')) {
            reader.readAsText(file);
        } else {
            // Fallback for other file types if needed, or reject
            reject(new Error("Unsupported file type"));
        }
    });
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachment) && !isLoading) {
      onSendMessage(input, attachment);
      setInput('');
      setAttachment(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            const { data, source } = await readFile(file);
            setAttachment({
                name: file.name,
                mimeType: file.type,
                data,
                source,
            });
        } catch (error) {
            console.error("Error reading file:", error);
            // Optionally, show an error to the user
        }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {attachment && (
            <div className="px-3 py-2 bg-[#EDF2F4] dark:bg-[#383a51] rounded-lg flex items-center justify-between text-sm text-[#2B2D42] dark:text-[#EDF2F4]">
                <div className="flex items-center gap-2 truncate">
                    {attachment.source === 'base64' ? (
                        <img src={`data:${attachment.mimeType};base64,${attachment.data}`} className="w-7 h-7 rounded object-cover flex-shrink-0" alt="Attachment preview"/>
                    ) : (
                        <DocumentTextIcon className="w-6 h-6 flex-shrink-0 text-[#8D99AE]" />
                    )}
                    <span className="truncate font-medium">{attachment.name}</span>
                </div>
                <button 
                    type="button" 
                    onClick={() => {
                        setAttachment(null);
                        if(fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                    aria-label="Remove attachment"
                >
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
        )}
        <div className="flex items-center gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp,image/gif,text/plain,text/csv,application/json,.md"
            />
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a business question..."
                className="flex-1 w-full px-4 py-3 bg-[#EDF2F4] dark:bg-[#383a51] text-[#2B2D42] dark:text-[#EDF2F4] border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D90429] transition"
                disabled={isLoading}
            />
             <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || !!attachment}
                className="p-3 text-[#8D99AE] rounded-full disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed hover:bg-[#EDF2F4] dark:hover:bg-[#383a51] transition-colors"
                aria-label="Attach file"
            >
                <PaperClipIcon className="w-5 h-5" />
            </button>
            <button
                type="submit"
                disabled={isLoading || (!input.trim() && !attachment)}
                className="p-3 bg-[#D90429] text-white rounded-full disabled:bg-[#D90429]/60 disabled:cursor-not-allowed hover:bg-[#EF233C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D90429] dark:focus:ring-offset-[#2B2D42] transition-colors"
                aria-label="Send message"
            >
                <SendIcon className="w-5 h-5" />
            </button>
        </div>
    </form>
  );
};