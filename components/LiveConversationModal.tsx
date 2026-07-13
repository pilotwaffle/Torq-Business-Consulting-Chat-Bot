import React from 'react';
import { Consultant } from '../types';

// NOTE: The live voice conversation feature previously used Google Gemini's
// real-time native-audio Live API. Anthropic (Claude) has no equivalent
// bidirectional audio streaming API, so this feature is disabled after the
// migration to Anthropic. The "Go Live" button that opened this modal is
// hidden in ChatView, so this component is not rendered. It remains as a
// no-op stub to preserve the import in App.tsx.
//
// To restore live voice, integrate a real-time voice provider (e.g. a
// speech-to-text + Claude + text-to-speech pipeline, or a provider with a
// realtime audio API) behind this component's interface.

interface LiveConversationModalProps {
  consultant: Consultant;
  onClose: (transcript: Array<{ speaker: 'user' | 'model'; text: string }>) => void;
}

export const LiveConversationModal: React.FC<LiveConversationModalProps> = ({ onClose }) => {
  // Immediately close with an empty transcript if somehow rendered.
  React.useEffect(() => {
    onClose([]);
  }, [onClose]);
  return null;
};
