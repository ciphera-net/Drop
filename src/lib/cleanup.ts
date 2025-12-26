import { createAdminClient } from "@/utils/supabase/admin";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout: ${label} took longer than ${ms}ms`)), ms)
      )
  ]);
}

/**
 * Forcefully deletes a file's resources (storage and DB flag) regardless of expiration.
 * Used by "Delete All" functionality and internal cleanup.
 * @param fileId - The ID of the file to delete.
 * @param hardDelete - If true, permanently deletes the record from the database. If false, marks it as deleted (soft delete).
 */
export async function forceDeleteFile(fileId: string, hardDelete: boolean = false) {
    const supabase = createAdminClient();
    
    // 1. Remove from Storage
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

    // 2. Update DB or Delete
    if (hardDelete) {
         const { error: dbError } = await supabase
            .from('uploads')
            .delete()
            .eq('id', fileId);
         if (dbError) {
            console.error(`Cleanup: Failed to hard delete file record ${fileId}`, dbError);
            throw dbError;
         }
    } else {
         const { error: dbError } = await supabase
            .from('uploads')
            .update({ file_deleted: true })
            .eq('id', fileId);
         if (dbError) {
            console.error(`Cleanup: Failed to update file_deleted flag for ${fileId}`, dbError);
            throw dbError;
         }
    }
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
      await forceDeleteFile(fileId);
  }
}

export async function cleanupAllExpiredFiles() {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    console.log(`[Cleanup] Starting cleanup job at ${now}`);

    // 1. Fetch Expired Files (High Priority)
    const { data: expiredFiles, error: expiredError } = await supabase
        .from('uploads')
        .select('id')
        .lt('expiration_time', now)
        .eq('file_deleted', false)
        .order('expiration_time', { ascending: true })
        .limit(50);

    if (expiredError) {
        console.error("[Cleanup] Failed to fetch expired files", expiredError);
        return { error: expiredError };
    }

    console.log(`[Cleanup] Found ${expiredFiles?.length || 0} expired files to process.`);

    // 2. Fetch Files with Limits (Potentially reached)
    // OPTIMIZATION: Fetch counts and limits upfront to filter in memory
    // This avoids processing active files that haven't reached their limit
    const { data: limitedFiles, error: limitedError } = await supabase
        .from('uploads')
        .select('id, download_limit, download_count')
        .not('download_limit', 'is', null)
        .eq('file_deleted', false);

    if (limitedError) {
         console.error("[Cleanup] Failed to fetch limited files", limitedError);
    }

    const limitReachedIds = limitedFiles
        ?.filter(f => f.download_limit !== null && f.download_count >= f.download_limit)
        .map(f => f.id) || [];
    
    console.log(`[Cleanup] Found ${limitReachedIds.length} limit-reached files.`);

    // Combine lists
    const filesToCheck = new Set<string>();
    expiredFiles?.forEach(f => filesToCheck.add(f.id));
    limitReachedIds.forEach(id => filesToCheck.add(id));

    const results = {
        processed: 0,
        errors: 0,
        total_candidates: filesToCheck.size
    };

    // Process sequentially to avoid overwhelming DB/Storage
    for (const fileId of filesToCheck) {
        try {
            console.log(`[Cleanup] Processing ${fileId}...`);
            await cleanupExpiredOrLimitReachedFile(fileId);
            results.processed++;
        } catch (e) {
            console.error(`[Cleanup] Critical error processing ${fileId}`, e);
            results.errors++;
        }
    }

    console.log(`[Cleanup] Job finished. Processed: ${results.processed}, Errors: ${results.errors}`);
    return results;
}
