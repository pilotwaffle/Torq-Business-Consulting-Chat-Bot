import { useState, useCallback, useRef } from 'react';
import { ChatMessage, ChatSessions, Attachment } from '../types';
import { CONSULTANTS } from '../constants';
import { getChatResponseStream } from '../services/chatApiService';

const generateErrorMessage = (e: any, context: 'send' | 'retry'): string => {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const baseMessage =
    context === 'send'
      ? 'Sorry, your message could not be sent.'
      : 'Sorry, the attempt to retry failed.';

  let details: string;

  if (!navigator.onLine) {
    details = 'Network issue: You seem to be offline. Please check your connection.';
  } else if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    if (msg.includes('abort') || e.name === 'AbortError') {
      details = 'Generation stopped.';
    } else if (msg.includes('api_key')) {
      details = 'API Error: There may be an issue with the service configuration.';
    } else if (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('failed to create chat session') ||
      msg.includes('failed to fetch')
    ) {
      details =
        'Network Error: Could not reach the TORQ Chat API. Ensure the BFF is running (default http://localhost:8787).';
    } else {
      details = 'An unexpected error occurred.';
    }
  } else {
    details = 'An unknown error occurred.';
  }

  return `${baseMessage} ${details} (at ${timestamp})`;
};

export function useChat(
  selectedConsultantId: string,
  messages: ChatMessage[],
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  upsertConversation: (finalMessages: ChatMessage[]) => void,
) {
  const [chatSessions, setChatSessions] = useState<ChatSessions>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<{
    content: string;
    attachments?: Attachment[];
    history: ChatMessage[];
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);

  const processStream = useCallback(
    async (streamGenerator: AsyncGenerator<Partial<ChatMessage>, any, undefined>) => {
      let finalMessages: ChatMessage[] = [];
      // Accumulate model text outside React so Strict Mode double-updaters cannot
      // double-append deltas (the old code mutated the last message object in place).
      let modelText = '';

      for await (const chunk of streamGenerator) {
        const startsNewModelTurn =
          chunk.role === 'model' &&
          chunk.content === '' &&
          !chunk.toolCalls &&
          !chunk.groundingMetadata;

        if (startsNewModelTurn) {
          modelText = '';
        }

        if (chunk.content) {
          modelText += chunk.content;
        }

        // Snapshots for this tick — updaters must be pure/idempotent.
        const textSnapshot = modelText;
        const roleSnapshot = chunk.role;
        const toolCallsSnapshot = chunk.toolCalls;
        const toolResponsesSnapshot = chunk.toolCallResponses;
        const groundingSnapshot = chunk.groundingMetadata;
        const deltaContent = chunk.content;

        setMessages((currentMessages) => {
          if (currentMessages.length === 0) {
            return currentMessages;
          }

          const newMessages = currentMessages.slice();
          const last = newMessages[newMessages.length - 1]!;

          if (roleSnapshot && last.role !== roleSnapshot) {
            newMessages.push({
              role: roleSnapshot,
              content: roleSnapshot === 'model' ? textSnapshot : (deltaContent ?? ''),
              ...(toolCallsSnapshot ? { toolCalls: toolCallsSnapshot } : {}),
              ...(toolResponsesSnapshot ? { toolCallResponses: toolResponsesSnapshot } : {}),
              ...(groundingSnapshot ? { groundingMetadata: groundingSnapshot } : {}),
            });
          } else {
            // Immutable replace of last message — never mutate shared objects.
            newMessages[newMessages.length - 1] = {
              ...last,
              content: last.role === 'model' ? textSnapshot : last.content + (deltaContent ?? ''),
              ...(toolCallsSnapshot ? { toolCalls: toolCallsSnapshot } : {}),
              ...(toolResponsesSnapshot ? { toolCallResponses: toolResponsesSnapshot } : {}),
              ...(groundingSnapshot ? { groundingMetadata: groundingSnapshot } : {}),
            };
          }

          finalMessages = newMessages;
          return newMessages;
        });
      }
      return finalMessages;
    },
    [setMessages],
  );

  const executeChatTurn = useCallback(
    async (
      userInput: string,
      attachments: Attachment[] | undefined,
      historyForContext: ChatMessage[],
      existingSession: unknown,
    ) => {
      setError(null);
      setFailedMessage(null);
      stoppedRef.current = false;

      const selectedConsultant = CONSULTANTS.find((c) => c.id === selectedConsultantId);
      if (!selectedConsultant) throw new Error('Selected consultant not found.');

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const streamGenerator = getChatResponseStream(
        selectedConsultant,
        existingSession,
        userInput,
        historyForContext,
        attachments,
        controller.signal,
      );

      const finalMessages = await processStream(streamGenerator.stream);
      const finalSession = await streamGenerator.finalSession;
      setChatSessions((prev) => new Map(prev).set(selectedConsultantId, finalSession));

      if (!stoppedRef.current && finalMessages.length > 0) {
        upsertConversation(finalMessages);
      }
    },
    [selectedConsultantId, processStream, upsertConversation],
  );

  const handleStop = useCallback(() => {
    stoppedRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const handleSendMessage = useCallback(
    async (userInput: string, attachment: Attachment | null) => {
      if (!userInput.trim() && !attachment) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: userInput,
        ...(attachment && { attachments: [attachment] }),
      };
      const currentMessagesForHistory = messages;
      setMessages((prev) => [...prev, userMessage, { role: 'model', content: '' }]);
      setIsLoading(true);

      try {
        await executeChatTurn(
          userInput,
          attachment ? [attachment] : undefined,
          currentMessagesForHistory,
          chatSessions.get(selectedConsultantId),
        );
      } catch (e: any) {
        if (stoppedRef.current || e?.name === 'AbortError' || String(e?.message || '').toLowerCase().includes('abort')) {
          // Keep partial stream content; do not wipe messages.
          return;
        }
        console.error('Error fetching chat response:', e);
        setError(generateErrorMessage(e, 'send'));
        setFailedMessage({
          content: userInput,
          attachments: attachment ? [attachment] : undefined,
          history: currentMessagesForHistory,
        });
        setMessages(currentMessagesForHistory);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, selectedConsultantId, chatSessions, executeChatTurn, setMessages],
  );

  const handleRetry = useCallback(async () => {
    if (!failedMessage) return;

    const {
      content: messageToRetry,
      attachments: attachmentsForRetry,
      history: historyForRetry,
    } = failedMessage;

    setError(null);
    setFailedMessage(null);
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageToRetry,
      attachments: attachmentsForRetry,
    };
    setMessages([...historyForRetry, userMessage, { role: 'model', content: '' }]);
    setIsLoading(true);

    try {
      setChatSessions((prev) => {
        const next = new Map(prev);
        next.delete(selectedConsultantId);
        return next;
      });

      await executeChatTurn(messageToRetry, attachmentsForRetry, historyForRetry, undefined);
    } catch (e: any) {
      if (stoppedRef.current || e?.name === 'AbortError' || String(e?.message || '').toLowerCase().includes('abort')) {
        return;
      }
      console.error('Error retrying chat response:', e);
      setError(generateErrorMessage(e, 'retry'));
      setFailedMessage({
        content: messageToRetry,
        attachments: attachmentsForRetry,
        history: historyForRetry,
      });
      setMessages([...historyForRetry, userMessage]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [failedMessage, selectedConsultantId, executeChatTurn, setMessages]);

  const handleEndLiveSession = useCallback(
    (transcript: Array<{ speaker: 'user' | 'model'; text: string }>) => {
      if (transcript.length === 0) return;

      const formattedTranscript = transcript
        .map((t) => `**${t.speaker === 'user' ? 'You' : 'Advisor'}:** ${t.text}`)
        .join('\n\n');

      const userMessage: ChatMessage = {
        role: 'user',
        content: `Live voice session started.`,
      };
      const modelMessage: ChatMessage = {
        role: 'model',
        content: `### Live Session Transcript\n\n---\n\n${formattedTranscript}`,
      };

      const finalMessages = [...messages, userMessage, modelMessage];
      setMessages(finalMessages);
      upsertConversation(finalMessages);
    },
    [messages, setMessages, upsertConversation],
  );

  return {
    isLoading,
    error,
    failedMessage,
    handleSendMessage,
    handleRetry,
    handleStop,
    handleEndLiveSession,
  };
}