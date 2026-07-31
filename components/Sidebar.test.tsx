import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../components/Sidebar';
import { Consultant, Conversation } from '../types';

const mockConsultants: Consultant[] = [
  {
    id: 'strategic-advisor',
    name: 'Strategic Advisor',
    description: 'Business strategy',
    model: 'claude-sonnet-5',
    systemInstruction: 'You are an advisor.',
    promptSuggestions: ['Help me'],
  },
  {
    id: 'code-architect',
    name: 'Code Architect',
    description: 'Software design',
    model: 'claude-sonnet-5',
    systemInstruction: 'You are a coder.',
    promptSuggestions: ['Review this'],
  },
];

function makeConversation(id: string, title?: string): Conversation {
  return {
    id,
    timestamp: Date.now(),
    title,
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'model', content: 'Hi there!' },
    ],
  };
}

describe('Sidebar', () => {
  let onSelectConsultant: ReturnType<typeof vi.fn>;
  let onNewChat: ReturnType<typeof vi.fn>;
  let onSelectConversation: ReturnType<typeof vi.fn>;
  let onDeleteConversation: ReturnType<typeof vi.fn>;
  let onRenameConversation: ReturnType<typeof vi.fn>;
  let onExportConversation: ReturnType<typeof vi.fn>;
  let onToggleTheme: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSelectConsultant = vi.fn();
    onNewChat = vi.fn();
    onSelectConversation = vi.fn();
    onDeleteConversation = vi.fn();
    onRenameConversation = vi.fn();
    onExportConversation = vi.fn();
    onToggleTheme = vi.fn();
  });

  function renderSidebar(
    overrides: Partial<{
      chatHistory: Map<string, Conversation[]>;
      activeConversationId: string | null;
      selectedConsultantId: string;
      theme: 'light' | 'dark';
      isSidebarOpen: boolean;
    }> = {},
  ) {
    return render(
      <Sidebar
        consultants={mockConsultants}
        selectedConsultantId={overrides.selectedConsultantId ?? 'strategic-advisor'}
        onSelectConsultant={onSelectConsultant}
        onNewChat={onNewChat}
        chatHistory={overrides.chatHistory ?? new Map()}
        activeConversationId={overrides.activeConversationId ?? null}
        onSelectConversation={onSelectConversation}
        theme={overrides.theme ?? 'light'}
        onToggleTheme={onToggleTheme}
        isSidebarOpen={overrides.isSidebarOpen ?? true}
        onDeleteConversation={onDeleteConversation}
        onRenameConversation={onRenameConversation}
        onExportConversation={onExportConversation}
      />,
    );
  }

  describe('consultant list', () => {
    it('renders all consultants', () => {
      renderSidebar();
      expect(screen.getByText('Strategic Advisor')).toBeDefined();
      expect(screen.getByText('Code Architect')).toBeDefined();
    });

    it('highlights selected consultant', () => {
      renderSidebar({ selectedConsultantId: 'code-architect' });
      const buttons = screen.getAllByRole('button');
      const codeButton = buttons.find((b) => b.textContent?.includes('Code Architect'));
      expect(codeButton).toBeDefined();
    });

    it('calls onSelectConsultant when clicking a consultant', async () => {
      renderSidebar();
      await userEvent.click(screen.getByText('Code Architect'));
      expect(onSelectConsultant).toHaveBeenCalledWith('code-architect');
    });
  });

  describe('new chat button', () => {
    it('renders new chat button', () => {
      renderSidebar();
      expect(screen.getByLabelText('New chat')).toBeDefined();
    });

    it('calls onNewChat when clicked', async () => {
      renderSidebar();
      await userEvent.click(screen.getByLabelText('New chat'));
      expect(onNewChat).toHaveBeenCalled();
    });
  });

  describe('conversation history', () => {
    it('does not show history section when no conversations', () => {
      renderSidebar();
      expect(screen.queryByText('History')).toBeNull();
    });

    it('shows conversation titles', () => {
      const history = new Map<string, Conversation[]>();
      history.set('strategic-advisor', [
        makeConversation('c1', 'My conversation'),
      ]);

      renderSidebar({ chatHistory: history });
      expect(screen.getByText('My conversation')).toBeDefined();
    });

    it('shows truncated content as title when no title set', () => {
      const history = new Map<string, Conversation[]>();
      history.set('strategic-advisor', [
        makeConversation('c1', undefined),
      ]);

      renderSidebar({ chatHistory: history });
      expect(screen.getByText('Hello')).toBeDefined();
    });

    it('calls onSelectConversation when clicking a conversation', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('strategic-advisor', [makeConversation('c1', 'Test')]);

      renderSidebar({ chatHistory: history });
      await userEvent.click(screen.getByText('Test'));
      expect(onSelectConversation).toHaveBeenCalledWith('c1');
    });
  });

  describe('search', () => {
    it('renders search input when conversations exist', () => {
      const history = new Map<string, Conversation[]>();
      history.set('strategic-advisor', [makeConversation('c1', 'Test')]);

      renderSidebar({ chatHistory: history });
      expect(screen.getByPlaceholderText('Search history...')).toBeDefined();
    });

    it('filters conversations by title', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('strategic-advisor', [
        makeConversation('c1', 'Alpha chat'),
        makeConversation('c2', 'Beta discussion'),
      ]);

      renderSidebar({ chatHistory: history });
      const searchInput = screen.getByPlaceholderText('Search history...');
      await userEvent.type(searchInput, 'Beta');

      expect(screen.getByText('Beta discussion')).toBeDefined();
      expect(screen.queryByText('Alpha chat')).toBeNull();
    });

    it('filters conversations by message content', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('strategic-advisor', [
        {
          id: 'c1',
          timestamp: Date.now(),
          title: 'Untitled',
          messages: [
            { role: 'user', content: 'How to deploy React?' },
            { role: 'model', content: 'Use Vercel...' },
          ],
        },
        {
          id: 'c2',
          timestamp: Date.now(),
          title: 'Another',
          messages: [
            { role: 'user', content: 'How to cook pasta?' },
            { role: 'model', content: 'Boil water...' },
          ],
        },
      ]);

      renderSidebar({ chatHistory: history });
      const searchInput = screen.getByPlaceholderText('Search history...');
      await userEvent.type(searchInput, 'deploy');

      expect(screen.getByText('Untitled')).toBeDefined();
      expect(screen.queryByText('Another')).toBeNull();
    });
  });

  describe('theme toggle', () => {
    it('renders theme toggle button', () => {
      renderSidebar();
      expect(screen.getByText('Switch Theme')).toBeDefined();
    });

    it('calls onToggleTheme when clicked', async () => {
      renderSidebar();
      await userEvent.click(screen.getByText('Switch Theme'));
      expect(onToggleTheme).toHaveBeenCalled();
    });

    it('shows moon icon in light mode', () => {
      renderSidebar({ theme: 'light' });
      expect(screen.getByLabelText('Switch to dark mode')).toBeDefined();
    });

    it('shows sun icon in dark mode', () => {
      renderSidebar({ theme: 'dark' });
      expect(screen.getByLabelText('Switch to light mode')).toBeDefined();
    });
  });

  describe('context menu', () => {
    it('shows menu on ellipsis click', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('strategic-advisor', [makeConversation('c1', 'Test')]);

      renderSidebar({ chatHistory: history });

      const menuButton = screen.getByLabelText('Conversation options for Test');
      await userEvent.click(menuButton);

      expect(screen.getByText('Rename')).toBeDefined();
      expect(screen.getByText('Export')).toBeDefined();
      expect(screen.getByText('Delete')).toBeDefined();
    });

    it('calls onDeleteConversation when delete is clicked', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('strategic-advisor', [makeConversation('c1', 'Test')]);

      renderSidebar({ chatHistory: history });

      await userEvent.click(screen.getByLabelText('Conversation options for Test'));
      await userEvent.click(screen.getByText('Delete'));

      expect(onDeleteConversation).toHaveBeenCalledWith('strategic-advisor', 'c1');
    });

    it('enters rename mode', async () => {
      const history = new Map<string, Conversation[]>();
      history.set('strategic-advisor', [makeConversation('c1', 'Old Title')]);

      renderSidebar({ chatHistory: history });

      await userEvent.click(screen.getByLabelText('Conversation options for Old Title'));
      await userEvent.click(screen.getByText('Rename'));

      // The input should appear with the current title
      const renameInput = screen.getByDisplayValue('Old Title');
      expect(renameInput).toBeDefined();
    });
  });
});