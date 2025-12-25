import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextResponse } from 'next/server';
import { cleanupExpiredOrLimitReachedFile, cleanupAllExpiredFiles } from '@/lib/cleanup';

// Mock dependencies
vi.mock('@/lib/cleanup', () => ({
  cleanupExpiredOrLimitReachedFile: vi.fn(),
  cleanupAllExpiredFiles: vi.fn().mockResolvedValue({ processed: 5, errors: 0 }),
}));

// Helper to create requests
const createRequest = (body: any, headers: Record<string, string> = {}) => new Request('http://localhost:3000/api/cleanup', {
  method: 'POST',
  body: body ? JSON.stringify(body) : null,
  headers: headers,
});

describe('POST /api/cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  it('should return 401 if unauthorized', async () => {
    const req = createRequest({ id: 'file-123' }, { 'authorization': 'Bearer wrong-secret' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should execute SINGLE cleanup if ID provided', async () => {
    const req = createRequest({ id: 'file-123' }, { 'authorization': 'Bearer test-secret' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('single');
    expect(cleanupExpiredOrLimitReachedFile).toHaveBeenCalledWith('file-123');
    expect(cleanupAllExpiredFiles).not.toHaveBeenCalled();
  });

  it('should execute BULK cleanup if NO ID provided (Cron Mode)', async () => {
    const req = createRequest(null, { 'authorization': 'Bearer test-secret' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('bulk');
    expect(data.results.processed).toBe(5);
    expect(cleanupAllExpiredFiles).toHaveBeenCalled();
    expect(cleanupExpiredOrLimitReachedFile).not.toHaveBeenCalled();
  });
});
