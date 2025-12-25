import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MagicWordInput } from '../magic-word-input';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock sonner toast
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => mockToastError(...args),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('MagicWordInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the input field', () => {
    render(<MagicWordInput />);
    expect(screen.getByPlaceholderText(/Magic words/i)).toBeDefined();
  });

  it('updates input value when typing', () => {
    render(<MagicWordInput />);
    const input = screen.getByPlaceholderText(/Magic words/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: 'happy blue tiger' } });
    expect(input.value).toBe('happy blue tiger');
  });

  it('calls API and navigates on successful search', async () => {
    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '123' }),
    });

    render(<MagicWordInput />);
    
    const input = screen.getByPlaceholderText(/Magic words/i);
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'Happy Blue Tiger' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/resolve-magic-words', expect.objectContaining({
        body: JSON.stringify({ words: 'happy-blue-tiger' }) // Normalized
      }));
      expect(mockPush).toHaveBeenCalledWith('/d/happy-blue-tiger');
    });
  });

  it('displays error toast on failed search', async () => {
    // Mock failed API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'File not found' }),
    });

    render(<MagicWordInput />);
    
    const input = screen.getByPlaceholderText(/Magic words/i);
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'wrong words here' } });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('No file found with those magic words');
    });
  });
});
