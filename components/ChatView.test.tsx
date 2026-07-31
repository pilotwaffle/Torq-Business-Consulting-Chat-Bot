import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatView } from '../components/ChatView';
import { ChatMessage, Consultant, Attachment } from '../types';

const mockConsultant: Consultant = {
  id: 'strategic-advisor',
  name: 'Strategic Advisor',
  description: 'Business strategy and planning',
  model: 'claude-sonnet-5',
  systemInstruction: 'You are an advisor.',
  promptSuggestions: ['Help me plan', 'Analyze my business'],
};

describe('ChatView', () => {
  let onSendMessage: ReturnType<typeof vi.fn>;
  let onRetry: ReturnType<typeof vi.fn>;
  let onToggleSidebar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSendMessage = vi.fn();
    onRetry = vi.fn();
    onToggleSidebar = vi.fn();
  });

  function renderChatView(
    overrides: Partial<{
      messages: ChatMessage[];
      isLoading: boolean;
      error: string | null;
    }> = {},
  ) {
    return render(
      <ChatView
        consultant={mockConsultant}
        messages={overrides.messages ?? []}
        isLoading={overrides.isLoading ?? false}
        error={overrides.error ?? null}
        onSendMessage={onSendMessage}
        onRetry={onRetry}
        onToggleSidebar={onToggleSidebar}
      />,
    );
  }

  describe('empty state', () => {
    it('shows consultant name and description', () => {
      renderChatView();
      expect(screen.getAllByText('Strategic Advisor').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Business strategy and planning').length).toBeGreaterThan(0);
    });

    it('shows starter prompt helper text', () => {
      renderChatView();
      expect(screen.getByText(/Pick a starter prompt/i)).toBeDefined();
    });

    it('shows prompt suggestions', () => {
      renderChatView();
      expect(screen.getByText('Help me plan')).toBeDefined();
      expect(screen.getByText('Analyze my business')).toBeDefined();
    });

    it('clicking a suggestion sends it as a message', async () => {
      renderChatView();
      await userEvent.click(screen.getByText('Help me plan'));
      expect(onSendMessage).toHaveBeenCalledWith('Help me plan', null);
    });
  });

  describe('messages', () => {
    it('renders user messages', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];
      renderChatView({ messages });
      expect(screen.getByText('Hello')).toBeDefined();
    });

    it('renders model messages', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hi there!' },
      ];
      renderChatView({ messages });
      expect(screen.getByText('Hi there!')).toBeDefined();
    });

    it('does not show empty state when messages exist', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];
      renderChatView({ messages });
      expect(screen.queryByText('Ask me anything')).toBeNull();
    });
  });

  describe('error state', () => {
    it('shows error message', () => {
      renderChatView({ error: 'Something went wrong' });
      expect(screen.getByText('Something went wrong')).toBeDefined();
    });

    it('shows retry button with error', () => {
      renderChatView({ error: 'Something went wrong' });
      expect(screen.getByText('Retry')).toBeDefined();
    });

    it('calls onRetry when retry button clicked', async () => {
      renderChatView({ error: 'Something went wrong' });
      await userEvent.click(screen.getByText('Retry'));
      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('shows typing indicator in live region', () => {
      renderChatView({ isLoading: true });
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toContain('typing');
    });
  });

  describe('sidebar toggle', () => {
    it('shows menu button on mobile', () => {
      renderChatView();
      expect(screen.getByLabelText('Toggle sidebar')).toBeDefined();
    });

    it('calls onToggleSidebar when clicked', async () => {
      renderChatView();
      await userEvent.click(screen.getByLabelText('Toggle sidebar'));
      expect(onToggleSidebar).toHaveBeenCalled();
    });
  });

  describe('message input', () => {
    it('renders MessageInput', () => {
      renderChatView();
      expect(screen.getByPlaceholderText(/Ask a business question/i)).toBeDefined();
    });

    it('passes onSendMessage to MessageInput', async () => {
      renderChatView();
      const input = screen.getByPlaceholderText(/Ask a business question/i);
      await userEvent.type(input, 'Test message');
      fireEvent.submit(input.closest('form')!);
      expect(onSendMessage).toHaveBeenCalledWith('Test message', null);
    });
  });
});