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
  builder.single = vi.fn(); 
  builder.rpc = vi.fn(); // Added RPC mock
  
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

  it('should allow request if RPC returns true', async () => {
    // Mock RPC returning true (allowed)
    mockClient.rpc.mockResolvedValue({ data: true, error: null });
    
    const result = await checkRateLimit(ip, endpoint, limit, windowSeconds);

    expect(result.allowed).toBe(true);
    expect(mockClient.rpc).toHaveBeenCalledWith('check_rate_limit_rpc', {
      _ip: ip,
      _endpoint: endpoint,
      _limit: limit,
      _window_seconds: windowSeconds
    });
  });

  it('should block request if RPC returns false', async () => {
    // Mock RPC returning false (blocked)
    mockClient.rpc.mockResolvedValue({ data: false, error: null });

    const result = await checkRateLimit(ip, endpoint, limit, windowSeconds);

    expect(result.allowed).toBe(false);
    expect(mockClient.rpc).toHaveBeenCalledWith('check_rate_limit_rpc', expect.anything());
  });

  it('should fail open (allow) if DB error occurs', async () => {
    // Mock RPC Error
    mockClient.rpc.mockResolvedValue({ 
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
