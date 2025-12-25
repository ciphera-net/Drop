import { describe, it, expect } from 'vitest';
import { generateMagicWords } from '../magic-words';

describe('generateMagicWords', () => {
  it('should generate a string with 3 words', () => {
    const words = generateMagicWords();
    const parts = words.split('-');
    expect(parts.length).toBe(3);
  });

  it('should separate words with hyphens', () => {
    const words = generateMagicWords();
    expect(words).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
  });

  it('should generate different words on subsequent calls (probabilistic)', () => {
    const words1 = generateMagicWords();
    const words2 = generateMagicWords();
    expect(words1).not.toBe(words2);
  });
});

