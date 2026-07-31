import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { ChatMessage } from '../types';

describe('ChatMessageBubble', () => {
  it('renders a user message', () => {
    const message: ChatMessage = { role: 'user', content: 'Hello world' };
    render(<ChatMessageBubble message={message} />);
    expect(screen.getByText('Hello world')).toBeDefined();
  });

  it('renders a model message with markdown', () => {
    const message: ChatMessage = { role: 'model', content: '**Bold** text' };
    render(<ChatMessageBubble message={message} />);
    expect(screen.getByText('Bold')).toBeDefined();
  });

  it('renders tool calls', () => {
    const message: ChatMessage = {
      role: 'model',
      content: '',
      toolCalls: [{ name: 'getStockPrice', args: { ticker: 'GOOG' } }],
    };
    render(<ChatMessageBubble message={message} />);
    expect(screen.getByText('getStockPrice')).toBeDefined();
    expect(screen.getByText(/ticker/)).toBeDefined();
  });

  it('renders grounding metadata sources', () => {
    const message: ChatMessage = {
      role: 'model',
      content: 'Here is some info.',
      groundingMetadata: [{ web: { uri: 'https://example.com', title: 'Example Source' } }],
    };
    render(<ChatMessageBubble message={message} />);
    expect(screen.getByText('Example Source')).toBeDefined();
    expect(screen.getByText('Sources')).toBeDefined();
  });

  it('does not render tool messages', () => {
    const message: ChatMessage = {
      role: 'tool',
      toolCallResponses: [{ name: 'test', response: {} }],
    };
    const { container } = render(<ChatMessageBubble message={message} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders loading skeleton when no content or tool calls', () => {
    const message: ChatMessage = { role: 'model', content: '' };
    const { container } = render(<ChatMessageBubble message={message} />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeDefined();
  });

  it('renders user attachments', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Check this',
      attachments: [{ name: 'test.png', mimeType: 'image/png', data: 'abc123', source: 'base64' }],
    };
    render(<ChatMessageBubble message={message} />);
    const img = screen.getByAltText('test.png');
    expect(img).toBeDefined();
  });
});