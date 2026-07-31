import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '../components/MessageInput';

describe('MessageInput', () => {
  let onSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSendMessage = vi.fn();
  });

  function renderInput(isLoading = false) {
    return render(<MessageInput onSendMessage={onSendMessage} isLoading={isLoading} />);
  }

  describe('text input', () => {
    it('renders a text input', () => {
      renderInput();
      expect(screen.getByPlaceholderText(/Ask a business question/i)).toBeDefined();
    });

    it('updates input value on typing', async () => {
      renderInput();
      const input = screen.getByPlaceholderText(/Ask a business question/i);
      await userEvent.type(input, 'Hello');
      expect(input).toHaveValue('Hello');
    });

    it('calls onSendMessage on submit with text', async () => {
      renderInput();
      const input = screen.getByPlaceholderText(/Ask a business question/i);
      await userEvent.type(input, 'Hello world');
      fireEvent.submit(input.closest('form')!);

      expect(onSendMessage).toHaveBeenCalledWith('Hello world', null);
    });

    it('clears input after submit', async () => {
      renderInput();
      const input = screen.getByPlaceholderText(/Ask a business question/i);
      await userEvent.type(input, 'Hello');
      fireEvent.submit(input.closest('form')!);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('does not submit empty input', async () => {
      renderInput();
      const input = screen.getByPlaceholderText(/Ask a business question/i);
      fireEvent.submit(input.closest('form')!);
      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('does not submit whitespace-only input', async () => {
      renderInput();
      const input = screen.getByPlaceholderText(/Ask a business question/i);
      await userEvent.type(input, '   ');
      fireEvent.submit(input.closest('form')!);
      expect(onSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('disables input when loading', () => {
      renderInput(true);
      const input = screen.getByPlaceholderText(/Ask a business question/i);
      expect(input).toBeDisabled();
    });

    it('disables send button when loading', () => {
      renderInput(true);
      const sendButton = screen.getByLabelText('Sending');
      expect(sendButton).toBeDisabled();
    });

    it('does not submit when loading', async () => {
      renderInput(true);
      const input = screen.getByPlaceholderText(/Ask a business question/i);
      // Can't type into disabled input, but submit should be blocked
      fireEvent.submit(input.closest('form')!);
      expect(onSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('send button', () => {
    it('is disabled when input is empty', () => {
      renderInput();
      const sendButton = screen.getByLabelText('Send message');
      expect(sendButton).toBeDisabled();
    });

    it('enables when input has text', async () => {
      renderInput();
      const input = screen.getByPlaceholderText(/Ask a business question/i);
      await userEvent.type(input, 'Hello');
      const sendButton = screen.getByLabelText('Send message');
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('file attachment', () => {
    it('renders attach button', () => {
      renderInput();
      expect(screen.getByLabelText('Attach file')).toBeDefined();
    });

    it('disables attach button when loading', () => {
      renderInput(true);
      expect(screen.getByLabelText('Attach file')).toBeDisabled();
    });

    it('has a hidden file input', () => {
      renderInput();
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeDefined();
      expect(fileInput!.className).toContain('hidden');
    });
  });
});