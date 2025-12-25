import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileIconDisplay } from '../file-icon-display';

// Mock phosphor-icons
vi.mock('@phosphor-icons/react', () => ({
  FileImage: () => <div data-testid="icon-image" />,
  FileVideo: () => <div data-testid="icon-video" />,
  FileAudio: () => <div data-testid="icon-audio" />,
  FilePdf: () => <div data-testid="icon-pdf" />,
  FileArchive: () => <div data-testid="icon-archive" />,
  FileCode: () => <div data-testid="icon-code" />,
  FileText: () => <div data-testid="icon-text" />,
  File: () => <div data-testid="icon-default" />,
}));

describe('FileIconDisplay', () => {
  // Note: The component takes `category` prop, NOT `fileName`.
  
  it('renders image icon for image category', () => {
    render(<FileIconDisplay category="image" className="w-4 h-4" />);
    expect(screen.getByTestId('icon-image')).toBeDefined();
  });

  it('renders video icon for video category', () => {
    render(<FileIconDisplay category="video" />);
    expect(screen.getByTestId('icon-video')).toBeDefined();
  });

  it('renders pdf icon for pdf category', () => {
    render(<FileIconDisplay category="pdf" />);
    expect(screen.getByTestId('icon-pdf')).toBeDefined();
  });

  it('renders archive icon for archive category', () => {
    render(<FileIconDisplay category="archive" />);
    expect(screen.getByTestId('icon-archive')).toBeDefined();
  });

  it('renders code icon for code category', () => {
    render(<FileIconDisplay category="code" />);
    expect(screen.getByTestId('icon-code')).toBeDefined();
  });

  it('renders default icon for unknown category', () => {
    render(<FileIconDisplay category="other" />);
    expect(screen.getByTestId('icon-default')).toBeDefined();
  });
  
  it('renders default icon when category is missing', () => {
      render(<FileIconDisplay />);
      expect(screen.getByTestId('icon-default')).toBeDefined();
    });
});
