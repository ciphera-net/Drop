import { createAdminClient } from "@/utils/supabase/admin";

export async function cleanupExpiredOrLimitReachedFile(fileId: string) {
  const supabase = createAdminClient();

  // 1. Fetch file to verify conditions (and check if already deleted to avoid redundant work)
  const { data: file, error } = await supabase
    .from('uploads')
    .select('expiration_time, download_limit, download_count, file_deleted, iv')
    .eq('id', fileId)
    .single();

  if (error || !file) {
    console.error(`Cleanup: File ${fileId} not found or error`, error);
    return;
  }

  if (file.file_deleted) {
    return; // Already deleted
  }

  const isExpired = new Date(file.expiration_time) < new Date();
  const isLimitReached = file.download_limit !== null && file.download_count >= file.download_limit;

  if (isExpired || isLimitReached) {
    console.log(`Cleaning up file ${fileId} (Expired: ${isExpired}, Limit: ${isLimitReached})`);
    
    // 2. Remove from Storage
    
    // Strategy A: Try to remove as a single file (Legacy)
    const { error: legacyError } = await supabase.storage
        .from('drop-files')
        .remove([fileId]);

    if (legacyError) {
         console.warn(`Cleanup: Legacy remove failed for ${fileId}`, legacyError);
    }

    // Strategy B: Check for chunks (Folder structure)
    // We list files inside the "folder" named fileId
    const { data: chunks, error: listError } = await supabase.storage
        .from('drop-files')
        .list(fileId, {
            limit: 1000, // Should cover most files. For huge files > 20GB (1000 * 20MB), might need pagination, but fine for now.
        });

    if (listError) {
        console.error(`Cleanup: Failed to list chunks for ${fileId}`, listError);
    } else if (chunks && chunks.length > 0) {
        // Construct paths: {fileId}/{chunkName}
        const pathsToRemove = chunks.map(chunk => `${fileId}/${chunk.name}`);
        const { error: chunkRemoveError } = await supabase.storage
            .from('drop-files')
            .remove(pathsToRemove);
        
        if (chunkRemoveError) {
            console.error(`Cleanup: Failed to remove chunks for ${fileId}`, chunkRemoveError);
        } else {
            console.log(`Cleanup: Removed ${chunks.length} chunks for ${fileId}`);
        }
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
