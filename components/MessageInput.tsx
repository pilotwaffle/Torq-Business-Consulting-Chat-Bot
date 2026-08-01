import React, { useState, useRef, ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { SendIcon } from './icons/SendIcon';
import { Attachment } from '../types';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { XIcon } from './icons/XIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface MessageInputProps {
  onSendMessage: (input: string, attachment: Attachment | null) => void;
  isLoading: boolean;
  onStop?: () => void;
}

// Keep under BFF maxBodyBytes (~1 MiB) so large files fail before upload.
const MAX_SIZE = 900 * 1024; // 900 KiB

const readFile = (file: File): Promise<{ data: string; source: 'base64' | 'text' }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (error) => reject(error);
    reader.onload = () => {
      if (file.type.startsWith('image/')) {
        resolve({ data: (reader.result as string).split(',')[1]!, source: 'base64' });
      } else {
        resolve({ data: reader.result as string, source: 'text' });
      }
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else if (
      file.type.startsWith('text/') ||
      file.type === 'application/json' ||
      file.name.endsWith('.md')
    ) {
      reader.readAsText(file);
    } else {
      reject(new Error('Unsupported file type. Use images, text, JSON, or Markdown.'));
    }
  });
};

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading, onStop }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = (input.trim() || attachment) && !isLoading;

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    onSendMessage(input, attachment);
    setInput('');
    setAttachment(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (value: string) => {
    setInput(value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) return;

    if (file.size > MAX_SIZE) {
      setFileError('File too large. Maximum size is 900KB (server limit).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const { data, source } = await readFile(file);
      setAttachment({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        data,
        source,
      });
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Could not read that file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-4xl mx-auto w-full">
      {attachment && (
        <div className="px-3 py-2 bg-[#EDF2F4] dark:bg-[#383a51] rounded-lg flex items-center justify-between text-sm text-[#2B2D42] dark:text-[#EDF2F4]">
          <div className="flex items-center gap-2 truncate">
            {attachment.source === 'base64' ? (
              <img
                src={`data:${attachment.mimeType};base64,${attachment.data}`}
                className="w-7 h-7 rounded object-cover flex-shrink-0"
                alt="Attachment preview"
              />
            ) : (
              <DocumentTextIcon className="w-6 h-6 flex-shrink-0 text-[#8D99AE]" />
            )}
            <span className="truncate font-medium">{attachment.name}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAttachment(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Remove attachment"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {fileError && (
        <p className="text-sm text-[#D90429] px-1" role="alert">
          {fileError}
        </p>
      )}

      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/gif,text/plain,text/csv,application/json,.md"
        />
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a business question… (Enter to send, Shift+Enter for newline)"
          className="flex-1 w-full px-4 py-3 bg-[#EDF2F4] dark:bg-[#383a51] text-[#2B2D42] dark:text-[#EDF2F4] border border-transparent rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D90429] transition resize-none max-h-40 leading-relaxed"
          disabled={isLoading}
          aria-label="Message"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || !!attachment}
          className="p-3 text-[#8D99AE] rounded-full disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed hover:bg-[#EDF2F4] dark:hover:bg-[#383a51] transition-colors shrink-0"
          aria-label="Attach file"
        >
          <PaperClipIcon className="w-5 h-5" />
        </button>
        {isLoading && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="p-3 bg-[#2B2D42] text-white rounded-full hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D90429] dark:focus:ring-offset-[#2B2D42] transition-colors shrink-0"
            aria-label="Stop generating"
          >
            <span className="block w-3.5 h-3.5 bg-white rounded-sm" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="p-3 bg-[#D90429] text-white rounded-full disabled:bg-[#D90429]/60 disabled:cursor-not-allowed hover:bg-[#EF233C] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D90429] dark:focus:ring-offset-[#2B2D42] transition-colors shrink-0"
            aria-label="Send message"
          >
            {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <SendIcon className="w-5 h-5" />}
          </button>
        )}
      </div>
    </form>
  );
};
