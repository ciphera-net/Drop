import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanupExpiredOrLimitReachedFile } from '../cleanup';

// 1. Create a chainable mock builder
const createMockBuilder = () => {
  const builder: any = {};
  
  // Chainable methods
  builder.from = vi.fn().mockReturnValue(builder);
  builder.select = vi.fn().mockReturnValue(builder);
  builder.update = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.single = vi.fn(); // Ends query chain
  builder.storage = {
    from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
        list: vi.fn(),
    }),
  };

  // Allow awaiting the builder directly for the update query
  builder.then = (resolve: any) => resolve({ error: null });

  return builder;
};

// 2. Hoist the instance
const mockClient = createMockBuilder();

// 3. Mock dependencies
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockClient),
}));

describe('cleanupExpiredOrLimitReachedFile', () => {
  const fileId = 'test-file-id';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default behaviors
    mockClient.storage.from().list.mockResolvedValue({ data: [], error: null });
    mockClient.then = (resolve: any) => resolve({ error: null });
  });

  it('should cleanup if expiration time has passed', async () => {
    // Mock file expired yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    mockClient.single.mockResolvedValue({
      data: {
        expiration_time: yesterday.toISOString(),
        file_deleted: false,
        download_limit: null,
        download_count: 0,
      },
      error: null,
    });

    await cleanupExpiredOrLimitReachedFile(fileId);

    // Verify storage removal (legacy + chunks)
    expect(mockClient.storage.from).toHaveBeenCalledWith('drop-files');
    
    // Check legacy removal
    expect(mockClient.storage.from().remove).toHaveBeenCalledWith([fileId]);
    
    // Check DB update
    expect(mockClient.update).toHaveBeenCalledWith({ file_deleted: true });
    expect(mockClient.eq).toHaveBeenCalledWith('id', fileId);
  });

  it('should cleanup if download limit reached', async () => {
    // Mock file active but limit reached
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    mockClient.single.mockResolvedValue({
      data: {
        expiration_time: tomorrow.toISOString(),
        file_deleted: false,
        download_limit: 5,
        download_count: 5,
      },
      error: null,
    });

    await cleanupExpiredOrLimitReachedFile(fileId);

    expect(mockClient.storage.from().remove).toHaveBeenCalled();
    expect(mockClient.update).toHaveBeenCalledWith({ file_deleted: true });
  });

  it('should cleanup if already marked deleted (storage cleanup)', async () => {
    // Mock file explicitly deleted
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    mockClient.single.mockResolvedValue({
      data: {
        expiration_time: tomorrow.toISOString(),
        file_deleted: true, // TRUE
        download_limit: 5,
        download_count: 0,
      },
      error: null,
    });

    await cleanupExpiredOrLimitReachedFile(fileId);

    // Should still try to remove from storage
    expect(mockClient.storage.from().remove).toHaveBeenCalled();
  });

  it('should NOT cleanup if valid and limit not reached', async () => {
    // Mock valid file
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    mockClient.single.mockResolvedValue({
      data: {
        expiration_time: tomorrow.toISOString(),
        file_deleted: false,
        download_limit: 5,
        download_count: 4, // Under limit
      },
      error: null,
    });

    await cleanupExpiredOrLimitReachedFile(fileId);

    // Should NOT touch storage
    expect(mockClient.storage.from().remove).not.toHaveBeenCalled();
    // Should NOT update DB
    expect(mockClient.update).not.toHaveBeenCalled();
  });

  it('should handle chunked files cleanup', async () => {
    // Mock expired file
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    mockClient.single.mockResolvedValue({
        data: {
            expiration_time: yesterday.toISOString(),
            file_deleted: false,
            download_limit: null,
            download_count: 0,
        },
        error: null,
    });

    // Mock chunks found
    mockClient.storage.from().list.mockResolvedValue({
        data: [{ name: '0' }, { name: '1' }, { name: '2' }],
        error: null,
    });

    await cleanupExpiredOrLimitReachedFile(fileId);

    // Should call list
    expect(mockClient.storage.from().list).toHaveBeenCalledWith(fileId, expect.any(Object));

    // Should remove chunks paths
    expect(mockClient.storage.from().remove).toHaveBeenCalledWith([
        `${fileId}/0`,
        `${fileId}/1`,
        `${fileId}/2`,
    ]);
  });
});

