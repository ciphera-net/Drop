import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextResponse } from 'next/server';

// 1. Hoist the mock object so it's initialized before mocks are applied
const mocks = vi.hoisted(() => {
  return {
    supabase: {
      from: vi.fn(),
    },
    checkRateLimit: vi.fn(),
  };
});

// 2. Mock dependencies using the hoisted object
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mocks.supabase),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

// Helper to create requests
const createRequest = (body: any) => new Request('http://localhost:3000/api/resolve-magic-words', {
  method: 'POST',
  body: JSON.stringify(body),
});

describe('POST /api/resolve-magic-words', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 if rate limit exceeded', async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: false });

    const req = createRequest({ words: 'happy-blue-tiger' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toBe('Too many attempts. Please try again later.');
  });

  it('should return 400 if words are missing', async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });

    const req = createRequest({}); // No words
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Words are required');
  });

  it('should return 404 if file not found', async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });

    mocks.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }),
      }),
    });

    const req = createRequest({ words: 'unknown-magic-words' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('File not found');
  });

  it('should return file ID if found', async () => {
    mocks.checkRateLimit.mockResolvedValue({ allowed: true });

    mocks.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'file-123' }, error: null }),
        }),
      }),
    });

    const req = createRequest({ words: 'happy-blue-tiger' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe('file-123');
    
    // Verify Supabase query
    expect(mocks.supabase.from).toHaveBeenCalledWith('uploads');
  });
});
