'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { PGPService } from "@/lib/pgp";
import { cleanupExpiredOrLimitReachedFile, forceDeleteFile } from "@/lib/cleanup";
import { Session } from "@/types";

export async function updatePGPKey(key: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // Allow empty key to clear it
  if (key && key.trim() !== "") {
    if (!(await PGPService.validateKey(key))) {
        throw new Error("Invalid PGP Public Key. Must start with '-----BEGIN PGP PUBLIC KEY BLOCK-----' and be a valid key.");
    }
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ pgp_public_key: key || null })
    .eq("id", user.id);

  if (error) {
    console.error("PGP update error:", error);
    throw new Error("Failed to update PGP key");
  }

  return { success: true };
}

export async function getStorageStats() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
  
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get all active files
    const { data: files, error } = await supabase
        .from('uploads')
        .select('size')
        .eq('user_id', user.id)
        .eq('file_deleted', false);

    if (error) {
        console.error("Error fetching storage stats:", error);
        throw new Error("Failed to fetch storage stats");
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('storage_limit')
        .eq('id', user.id)
        .single();

    const fileCount = files?.length || 0;
    const totalBytes = files?.reduce((acc, file) => acc + (file.size || 0), 0) || 0;
    const limit = profile?.storage_limit || null;

    return { fileCount, totalBytes, limit };
}

export async function deleteAllFiles() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
  
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get all active files for user
    const { data: files } = await supabase
        .from('uploads')
        .select('id')
        .eq('user_id', user.id)
        .eq('file_deleted', false);

    if (!files || files.length === 0) {
        return { success: true, count: 0 };
    }

    // Process deletion
    let deletedCount = 0;
    for (const file of files) {
        try {
            await forceDeleteFile(file.id, true);
            deletedCount++;
        } catch (e) {
            console.error(`Failed to force delete file ${file.id}`, e);
        }
    }

    return { success: true, count: deletedCount };
}

export async function deleteExpiredFiles() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
  
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const now = new Date().toISOString();

    // Get expired files for user
    const { data: files } = await supabase
        .from('uploads')
        .select('id')
        .eq('user_id', user.id)
        .eq('file_deleted', false)
        .lt('expiration_time', now);

    if (!files || files.length === 0) {
        return { success: true, count: 0 };
    }

    // Process deletion
    let deletedCount = 0;
    for (const file of files) {
        await cleanupExpiredOrLimitReachedFile(file.id);
        deletedCount++;
    }

    return { success: true, count: deletedCount };
}

export async function getSessions() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase.rpc('get_active_sessions');
  if (error) {
     console.error("Error fetching sessions:", error);
     return []; 
  }
  return data as Session[];
}

export async function revokeSession(sessionId: string) {
   const supabase = await createClient();
   const { data: { user }, error: authError } = await supabase.auth.getUser();

   if (authError || !user) {
      throw new Error("Unauthorized");
   }

   const { error } = await supabase.rpc('revoke_session', { session_id: sessionId });
   if (error) throw new Error(error.message);
   return { success: true };
}

export async function revokeAllOtherSessions() {
   const supabase = await createClient();
   const { data: { user }, error: authError } = await supabase.auth.getUser();

   if (authError || !user) {
      throw new Error("Unauthorized");
   }

   const { error } = await supabase.rpc('revoke_all_other_sessions');
   if (error) throw new Error(error.message);
   return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const adminSupabase = createAdminClient();

  // 1. Get all uploads for this user
  const { data: uploads, error: fetchError } = await adminSupabase
    .from('uploads')
    .select('id')
    .eq('user_id', user.id);

  if (fetchError) {
      console.error("Error fetching uploads for deletion:", fetchError);
      throw new Error("Failed to prepare account deletion");
  }

  if (uploads && uploads.length > 0) {
      const uploadIds = uploads.map(u => u.id);

      // 2. Delete files from Storage
      // We need to delete the folder `id/` for each upload.
      // Supabase storage doesn't support recursive folder delete easily.
      // We have to list files in each folder.
      
      // We'll try to do this in batches or just loop. 
      // Since this is a "Nuke" operation, slowness is acceptable.
      for (const id of uploadIds) {
          const { data: files } = await adminSupabase.storage
            .from('drop-files')
            .list(id);
          
          if (files && files.length > 0) {
              const paths = files.map(f => `${id}/${f.name}`);
              await adminSupabase.storage
                .from('drop-files')
                .remove(paths);
          }
      }

      // 3. Delete upload records (if not cascaded yet)
      await adminSupabase
        .from('uploads')
        .delete()
        .in('id', uploadIds);
  }

  // 4. Delete user (this cascades to profiles and other tables via FK if configured, 
  // otherwise we should manually delete profiles too if needed, but profiles has CASCADE)
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Delete user error:", deleteError);
    throw new Error("Failed to delete account");
  }
  
  return { success: true };
}
