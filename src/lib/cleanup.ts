import { createAdminClient } from "@/utils/supabase/admin";

export async function cleanupExpiredOrLimitReachedFile(fileId: string) {
  const supabase = createAdminClient();

  // 1. Fetch file to verify conditions (and check if already deleted to avoid redundant work)
  const { data: file, error } = await supabase
    .from('uploads')
    .select('expiration_time, download_limit, download_count, file_deleted')
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
    const { error: storageError } = await supabase.storage
        .from('drop-files')
        .remove([fileId]);

    if (storageError) {
        console.error(`Cleanup: Failed to remove file ${fileId} from storage`, storageError);
        // Continue to update DB flag? Maybe, but better to retry. 
        // However, if we fail to delete from storage, we shouldn't mark it as deleted in DB?
        // Or we should mark it as deleted so we don't serve it, even if storage delete failed.
        // Yes, mark as deleted to stop access. Storage can be cleaned up later if needed (orphaned).
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

