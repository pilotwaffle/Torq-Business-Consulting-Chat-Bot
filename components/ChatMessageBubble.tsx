
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../types';
import { UserIcon } from './icons/UserIcon';
import { BotIcon } from './icons/BotIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CodeBracketIcon } from './icons/CodeBracketIcon';
import { LinkIcon } from './icons/LinkIcon';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const { role, content, toolCalls, groundingMetadata } = message;
  const isUser = role === 'user';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const hasContent = content && content.trim().length > 0;
  const hasToolCalls = toolCalls && toolCalls.length > 0;
  const hasGrounding = groundingMetadata && groundingMetadata.length > 0;

  if (role === 'tool') {
    return null; // Don't render tool responses directly
  }

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#EDF2F4] dark:bg-[#383a51] flex items-center justify-center flex-shrink-0">
          <BotIcon className="w-5 h-5 text-[#8D99AE]" />
        </div>
      )}
      
      <div
        className={`group relative max-w-xl flex flex-col gap-2 rounded-2xl shadow-sm ${
          isUser
            ? 'bg-[#D90429] text-white rounded-br-none'
            : 'bg-[#EDF2F4] dark:bg-[#383a51] text-[#2B2D42] dark:text-[#EDF2F4] rounded-bl-none'
        }`}
      >
        {isUser ? (
          <p className="px-4 py-3 whitespace-pre-wrap">{content}</p>
        ) : (
          <>
            {hasToolCalls && (
                <div className="px-4 pt-3">
                    <div className="p-3 rounded-lg bg-black/5 dark:bg-black/20">
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-[#8D99AE]">
                        <CodeBracketIcon className="w-5 h-5" />
                        <span>Using Tool: <strong>{toolCalls[0].name}</strong></span>
                    </div>
                    <pre className="text-xs bg-black/5 dark:bg-black/20 p-2 rounded-md overflow-x-auto">
                        <code>{JSON.stringify(toolCalls[0].args, null, 2)}</code>
                    </pre>
                    </div>
                </div>
            )}
            {hasContent && (
                <div className="relative px-4 pb-3 pt-3">
                    <div className="prose prose-sm dark:prose-invert max-w-none 
                                prose-p:my-0 prose-headings:my-0 prose-ul:my-0 prose-ol:my-0 
                                prose-a:text-[#D90429] hover:prose-a:underline
                                prose-code:text-[#D90429] prose-code:before:content-[''] prose-code:after:content-[''] prose-code:font-mono
                                prose-pre:bg-black/5 dark:prose-pre:bg-black/20 prose-pre:rounded-md prose-pre:p-2 prose-pre:my-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                    </ReactMarkdown>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/70 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/10 dark:hover:bg-white/20"
                        aria-label={isCopied ? 'Copied' : 'Copy message'}
                    >
                        {isCopied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                    </button>
                </div>
            )}
             {hasGrounding && (
                <div className="px-4 pb-3 border-t border-black/10 dark:border-white/10">
                    <div className="flex items-center gap-2 text-xs font-semibold mt-2 mb-2 text-[#8D99AE]">
                        <LinkIcon className="w-4 h-4" />
                        <span>Sources</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {groundingMetadata.map((meta, index) => (
                            <a 
                                href={meta.web.uri}
                                key={index}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs p-2 bg-black/5 dark:bg-black/20 rounded-md truncate hover:underline"
                                title={meta.web.title}
                            >
                                {meta.web.title}
                            </a>
                        ))}
                    </div>
                </div>
            )}
             {!hasContent && !hasToolCalls && (
              <div className="px-4 py-3">
                <div className="animate-pulse flex space-x-2">
                  <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-2 w-2"></div>
                  <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-2 w-2"></div>
                  <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-2 w-2"></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

       {isUser && (
        <div className="w-8 h-8 rounded-full bg-[#EDF2F4] dark:bg-[#383a51] flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-5 h-5 text-[#8D99AE]" />
        </div>
      )}
    </div>
  );
};