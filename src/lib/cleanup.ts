import { createAdminClient } from "@/utils/supabase/admin";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout: ${label} took longer than ${ms}ms`)), ms)
      )
  ]);
}

export async function cleanupExpiredOrLimitReachedFile(fileId: string) {
  const supabase = createAdminClient();

  // 1. Fetch file to verify conditions
  const { data: file, error } = await supabase
    .from('uploads')
    .select('expiration_time, file_deleted, iv, download_limit, download_count')
    .eq('id', fileId)
    .single();

  if (error || !file) {
    console.error(`Cleanup: File ${fileId} not found or error`, error);
    return;
  }

  // Note: We don't return early if file.file_deleted is true because we might still need to clean up storage
  // if it was only marked logically deleted by the increment API.

  const now = new Date();
  const expTime = new Date(file.expiration_time);
  // If date is invalid, treat as expired to be safe (or it will never be cleaned)
  const isInvalidDate = isNaN(expTime.getTime());
  const isExpired = isInvalidDate || expTime < now;
  
  const isLimitReached = file.download_limit !== null && file.download_count >= file.download_limit;
  
  // Debug log for troubleshooting stuck files
  if (!isExpired && !isLimitReached && !file.file_deleted) {
      console.log(`Cleanup: Skipping active file ${fileId}. Exp: ${file.expiration_time} (Invalid: ${isInvalidDate}), Limit: ${file.download_limit} (Count: ${file.download_count})`);
  }

  if (isExpired || isLimitReached || file.file_deleted) {
    // 2. Remove from Storage
    try {
        // Strategy A: Try to remove as a single file (Legacy)
        const { error: legacyError } = await withTimeout(
            supabase.storage.from('drop-files').remove([fileId]),
            5000, 
            `Legacy remove ${fileId}`
        );

        if (legacyError) {
             console.warn(`Cleanup: Legacy remove failed for ${fileId}`, legacyError);
        }

        // Strategy B: Check for chunks (Folder structure)
        // We list files inside the "folder" named fileId
        const { data: chunks, error: listError } = await withTimeout(
            supabase.storage.from('drop-files').list(fileId, { limit: 1000 }),
            10000,
            `List chunks ${fileId}`
        );

        if (listError) {
            console.error(`Cleanup: Failed to list chunks for ${fileId}`, listError);
        } else if (chunks && chunks.length > 0) {
            // Construct paths: {fileId}/{chunkName}
            const pathsToRemove = chunks.map(chunk => `${fileId}/${chunk.name}`);
            const { error: chunkRemoveError } = await withTimeout(
                supabase.storage.from('drop-files').remove(pathsToRemove),
                15000,
                `Remove chunks ${fileId}`
            );
            
            if (chunkRemoveError) {
                console.error(`Cleanup: Failed to remove chunks for ${fileId}`, chunkRemoveError);
            }
        }
    } catch (storageError) {
        console.error(`Cleanup: Storage operations failed for ${fileId} (proceeding to logical deletion)`, storageError);
    }

    // 3. Update DB
    const { error: dbError } = await supabase
        .from('uploads')
        .update({ file_deleted: true })
        .eq('id', fileId);

    if (dbError) {
        console.error(`Cleanup: Failed to update file_deleted flag for ${fileId}`, dbError);
    }
  }
}

export async function cleanupAllExpiredFiles() {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Find all files that are expired OR (limit reached AND not yet marked deleted)
    // Note: It's hard to query "download_count >= download_limit" directly in Supabase simple query syntax without RPC.
    // So we fetch files that are either expired OR have a limit set.
    
    // 1. Fetch Expired Files
    const { data: expiredFiles, error: expiredError } = await supabase
        .from('uploads')
        .select('id')
        .lt('expiration_time', now)
        .eq('file_deleted', false)
        .order('expiration_time', { ascending: true })
        .limit(50); // Process oldest first, limit batch size to avoid timeouts // Only active ones need logical deletion first

    if (expiredError) {
        console.error("Cleanup: Failed to fetch expired files", expiredError);
        return { error: expiredError };
    }

    // 2. Fetch Files with Limits (Potentially reached)
    // We can't easily do `where download_count >= download_limit` in standard PostgREST without a computed column or RPC.
    // For now, let's just iterate over active files that HAVE a limit.
    const { data: limitedFiles, error: limitedError } = await supabase
        .from('uploads')
        .select('id')
        .not('download_limit', 'is', null)
        .eq('file_deleted', false);

    if (limitedError) {
         console.error("Cleanup: Failed to fetch limited files", limitedError);
    }

    // Combine lists (Set to avoid duplicates)
    const filesToCheck = new Set<string>();
    expiredFiles?.forEach(f => filesToCheck.add(f.id));
    limitedFiles?.forEach(f => filesToCheck.add(f.id));

    // Also fetch ALREADY deleted files that might still have storage (Optional, but good for hygiene)
    // For this MVP cron, let's focus on logic deletion + immediate storage cleanup via the single file function.

    const results = {
        processed: 0,
        errors: 0
    };

    // Process sequentially to avoid overwhelming DB/Storage
    for (const fileId of filesToCheck) {
        try {
            await cleanupExpiredOrLimitReachedFile(fileId);
            results.processed++;
        } catch (e) {
            console.error(`Cleanup: Error processing ${fileId}`, e);
            results.errors++;
        }
    }

    return results;
}
