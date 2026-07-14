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
import { SpinnerIcon } from './icons/SpinnerIcon';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

const ToolArgsDisplay: React.FC<{ args: any }> = ({ args }) => {
    if (typeof args !== 'object' || args === null) {
      return <code>{String(args)}</code>;
    }
  
    return (
      <div className="text-xs space-y-1.5">
        {Object.entries(args).map(([key, value]) => (
          <div key={key} className="grid grid-cols-[auto,1fr] items-start gap-x-2">
            <span className="font-semibold text-gray-600 dark:text-gray-400 break-keep">{key}:</span>
            <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] break-all font-mono">
              {JSON.stringify(value, null, 2).replace(/"/g, '')}
            </code>
          </div>
        ))}
      </div>
    );
};

const CustomCodeBlock: React.FC<React.DetailedHTMLProps<React.HTMLAttributes<HTMLPreElement>, HTMLPreElement>> = ({ children, ...props }) => {
    const codeElement = React.Children.toArray(children)[0] as React.ReactElement<{className?: string, children: React.ReactNode}> | undefined;
    
    if (!codeElement) {
        return null;
    }

    const language = codeElement.props.className?.replace('language-', '') || '';
    const codeContent = codeElement.props.children;
    
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = () => {
      if (!codeContent) return;
      navigator.clipboard.writeText(String(codeContent)).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    };

    return (
        <div className="relative group/pre my-2 bg-gray-100/50 dark:bg-[#212332] rounded-lg border border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-1.5">
            <span className="text-xs font-sans text-gray-500 dark:text-gray-400 font-medium">{language || 'code'}</span>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors opacity-50 group-hover/pre:opacity-100"
            >
              {isCopied ? <CheckIcon className="w-3 h-3 text-green-500" /> : <CopyIcon className="w-3 h-3" />}
              {isCopied ? 'Copied' : 'Copy code'}
            </button>
          </div>
          <pre {...props} className="p-4 pt-0 overflow-x-auto text-sm !bg-transparent !my-0 border-t border-black/10 dark:border-white/10">{children}</pre>
        </div>
    );
}
  

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const { role, content, toolCalls, groundingMetadata, attachments } = message;
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
            <div className="px-4 py-3">
                {attachments && attachments.map((att, index) => (
                    <div key={index} className="mb-2 last:mb-0">
                        {att.mimeType.startsWith('image/') ? (
                        <img 
                            src={`data:${att.mimeType};base64,${att.data}`} 
                            alt={att.name}
                            className="rounded-lg max-w-xs max-h-64 object-contain border border-white/20"
                        />
                        ) : (
                        <div className="p-2 rounded-md bg-black/20 text-xs flex items-center gap-2">
                            <span>{att.name}</span>
                        </div>
                        )}
                    </div>
                ))}
                {content && <p className="whitespace-pre-wrap">{content}</p>}
            </div>
        ) : (
          <>
            {hasToolCalls && (
                <div className="px-4 pt-3">
                    <div className="p-3 rounded-lg bg-black/5 dark:bg-black/20">
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-[#8D99AE]">
                        <CodeBracketIcon className="w-5 h-5" />
                        <span>Using Tool: <strong>{toolCalls[0].name}</strong></span>
                        {!hasContent && (
                            <SpinnerIcon className="w-4 h-4 animate-spin ml-2" />
                        )}
                    </div>
                    <div className="bg-black/5 dark:bg-black/20 p-2 rounded-md">
                        <ToolArgsDisplay args={toolCalls[0].args} />
                    </div>
                    </div>
                </div>
            )}
            {hasContent && (
                <div className="relative px-4 pb-3 pt-3">
                    <div className="prose prose-sm dark:prose-invert max-w-none 
                                prose-p:my-0 prose-headings:my-0 prose-ul:my-0 prose-ol:my-0 
                                prose-a:text-[#D90429] hover:prose-a:underline
                                prose-code:font-mono prose-code:before:content-[''] prose-code:after:content-['']">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            pre: CustomCodeBlock,
                            code({ node, className, children, ...props }) {
                                const isInline = !String(children).includes('\n');
                                if (isInline) {
                                    return (
                                        <code 
                                            className="bg-[#D90429]/10 text-[#D90429] dark:bg-[#D90429]/20 dark:text-red-400 px-1.5 py-1 rounded-md text-[90%]" 
                                            {...props}
                                        >
                                            {children}
                                        </code>
                                    );
                                }
                                
                                return (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            }
                        }}
                      >
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
              <div className="px-4 py-3 w-48">
                <div className="animate-pulse space-y-2.5">
                  <div className="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-full"></div>
                  <div className="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-11/12"></div>
                  <div className="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full w-4/5"></div>
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