import { describe, it, expect, vi } from 'vitest';
import { getFileCategory } from '../file-helpers';

// We mock hash-wasm since it's an external dependency and we're testing logic not the library
vi.mock('hash-wasm', () => ({
  createSHA256: vi.fn().mockResolvedValue({
    update: vi.fn(),
    digest: vi.fn().mockReturnValue('mock-hash'),
  }),
}));

describe('getFileCategory', () => {
  it('should identify images', () => {
    const file = new File([''], 'test.png', { type: 'image/png' });
    expect(getFileCategory(file)).toBe('image');
  });

  it('should identify videos', () => {
    const file = new File([''], 'test.mp4', { type: 'video/mp4' });
    expect(getFileCategory(file)).toBe('video');
  });

  it('should identify pdfs', () => {
    const file = new File([''], 'doc.pdf', { type: 'application/pdf' });
    expect(getFileCategory(file)).toBe('pdf');
  });

  it('should identify archives by mime type', () => {
    const file = new File([''], 'archive.zip', { type: 'application/zip' });
    expect(getFileCategory(file)).toBe('archive');
  });

  it('should identify archives by extension', () => {
    const file = new File([''], 'archive.7z', { type: 'application/octet-stream' });
    expect(getFileCategory(file)).toBe('archive');
  });

  it('should identify code files', () => {
    const file = new File([''], 'script.ts', { type: 'text/plain' }); // TS often has text/plain
    expect(getFileCategory(file)).toBe('code');
  });

  it('should default to other', () => {
    const file = new File([''], 'unknown.xyz', { type: 'application/octet-stream' });
    expect(getFileCategory(file)).toBe('other');
  });
});

