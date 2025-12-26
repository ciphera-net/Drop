import { createAdminClient } from "../utils/supabase/admin";

export async function identifyAndCleanupOrphans(dryRun = false) {
  const supabase = createAdminClient();
  const bucketName = 'drop-files';

  console.log(`[Storage Cleanup] Starting... Dry Run: ${dryRun}`);

  // 1. Get all active files from DB (Allow List)
  const { data: activeUploads, error: dbError } = await supabase
    .from('uploads')
    .select('id')
    .eq('file_deleted', false);

  if (dbError) {
      console.error("DB Error", dbError);
      throw new Error(`DB Error: ${dbError.message}`);
  }

  const activeIds = new Set(activeUploads?.map(u => u.id) || []);
  console.log(`[Storage Cleanup] Found ${activeIds.size} active files in DB.`);

  // 2. List all files/folders in Storage Root
  let allObjects: any[] = [];
  let page = 0;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const { data, error: storageError } = await supabase
      .storage
      .from(bucketName)
      .list('', { limit: pageSize, offset: page * pageSize });

    if (storageError) {
        console.error("Storage Error", storageError);
        throw new Error(`Storage Error: ${storageError.message}`);
    }

    if (data && data.length > 0) {
      allObjects = [...allObjects, ...data];
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`[Storage Cleanup] Found ${allObjects.length} objects in storage root.`);

  // 3. Identify Orphans
  // Objects in storage that are NOT in activeIds
  const orphans = allObjects.filter(obj => {
    // Ignore standard system files if they appear (e.g. .emptyFolderPlaceholder)
    if (obj.name.startsWith('.')) return false; 
    return !activeIds.has(obj.name);
  });

  console.log(`[Storage Cleanup] Identified ${orphans.length} orphans.`);

  const results = {
    found_orphans: orphans.length,
    deleted_count: 0,
    errors_count: 0,
    orphans: orphans.map(o => o.name),
    dry_run: dryRun
  };

  if (dryRun) {
    return results;
  }

  // 4. Delete Orphans
  for (const orphan of orphans) {
    const path = orphan.name;
    console.log(`[Storage Cleanup] Deleting orphan: ${path}`);
    
    try {
      // Strategy A: Try to remove as a single file
      const { error: rmError } = await supabase.storage.from(bucketName).remove([path]);
      
      // Strategy B: Check for chunks (Folder content)
      const { data: chunks, error: listError } = await supabase.storage.from(bucketName).list(path);
      
      if (!listError && chunks && chunks.length > 0) {
        console.log(`[Storage Cleanup] Found ${chunks.length} chunks inside ${path}`);
        const chunkPaths = chunks.map(c => `${path}/${c.name}`);
        const { error: chunkRmError } = await supabase.storage.from(bucketName).remove(chunkPaths);
        if (chunkRmError) {
            console.error(`[Storage Cleanup] Error removing chunks for ${path}`, chunkRmError);
            throw chunkRmError;
        }
      }
      
      results.deleted_count++;

    } catch (e) {
      console.error(`[Storage Cleanup] Failed to delete ${path}`, e);
      results.errors_count++;
    }
  }

  return results;
}

