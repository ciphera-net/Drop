import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '../rate-limit';

// 1. Create a mock that acts as both a builder and a promise
const createMockBuilder = () => {
  const builder: any = {};
  
  // Chainable methods
  builder.from = vi.fn().mockReturnValue(builder);
  builder.select = vi.fn().mockReturnValue(builder);
  builder.insert = vi.fn().mockReturnValue(builder);
  builder.update = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.single = vi.fn(); // Terminating method 1
  
  // Make it thenable (awaitable)
  // Default to returning { error: null } if awaited directly
  builder.then = (resolve: any) => resolve({ error: null });

  return builder;
};

// 2. Hoist the instance
const mockClient = createMockBuilder();

// 3. Mock dependencies
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockClient),
}));

describe('checkRateLimit', () => {
  const ip = '127.0.0.1';
  const endpoint = 'test-endpoint';
  const limit = 5;
  const windowSeconds = 60;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default behavior
    mockClient.then = (resolve: any) => resolve({ error: null });
  });

  it('should allow request if no record exists (first request)', async () => {
    // Mock single() returning null (no record found)
    mockClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    
    // insert() is awaited in the code, so it needs to resolve
    mockClient.insert.mockReturnValue({
       then: (resolve: any) => resolve({ error: null })
    });

    const result = await checkRateLimit(ip, endpoint, limit, windowSeconds);

    expect(result.allowed).toBe(true);
    expect(mockClient.insert).toHaveBeenCalledWith(expect.objectContaining({
      ip,
      endpoint,
      requests: 1,
    }));
  });

  it('should allow request if limit not reached', async () => {
    // Mock existing record with 2 requests
    const now = new Date();
    mockClient.single.mockResolvedValue({
      data: { 
        ip, 
        endpoint, 
        requests: 2, 
        last_request: now.toISOString() 
      }, 
      error: null 
    });

    // Code: .update(...).eq(...).eq(...)
    // We need the final .eq() to resolve to { error: null }
    // Since our builder returns itself, and itself is thenable (default success), this should work.
    // However, let's be explicit to avoid "then is not a function" if I mess up the chain.
    
    const result = await checkRateLimit(ip, endpoint, limit, windowSeconds);

    expect(result.allowed).toBe(true);
    expect(mockClient.update).toHaveBeenCalledWith({ requests: 3 });
    expect(mockClient.eq).toHaveBeenCalledWith('ip', ip);
    expect(mockClient.eq).toHaveBeenCalledWith('endpoint', endpoint);
  });

  it('should block request if limit reached within window', async () => {
    // Mock existing record with 5 requests (at limit)
    const now = new Date();
    mockClient.single.mockResolvedValue({
      data: { 
        ip, 
        endpoint, 
        requests: 5, 
        last_request: now.toISOString() 
      }, 
      error: null 
    });

    const result = await checkRateLimit(ip, endpoint, limit, windowSeconds);

    expect(result.allowed).toBe(false);
    expect(mockClient.update).not.toHaveBeenCalled();
  });

  it('should reset limit if window has passed', async () => {
    // Mock existing record with 5 requests (at limit) but OLD timestamp
    const oldDate = new Date();
    oldDate.setSeconds(oldDate.getSeconds() - (windowSeconds + 10)); // Past the window

    mockClient.single.mockResolvedValue({
      data: { 
        ip, 
        endpoint, 
        requests: 5, 
        last_request: oldDate.toISOString() 
      }, 
      error: null 
    });

    const result = await checkRateLimit(ip, endpoint, limit, windowSeconds);

    expect(result.allowed).toBe(true);
    // Should reset requests to 1
    expect(mockClient.update).toHaveBeenCalledWith(expect.objectContaining({
      requests: 1,
    }));
  });

  it('should fail open (allow) if DB error occurs', async () => {
    // Mock DB Error
    mockClient.single.mockResolvedValue({ 
      data: null, 
      error: { code: '500', message: 'DB Disconnected' } 
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await checkRateLimit(ip, endpoint, limit, windowSeconds);

    expect(result.allowed).toBe(true); // Fails open
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});
