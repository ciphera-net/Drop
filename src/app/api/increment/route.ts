import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { sendDownloadNotification } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { EncryptionService } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Rate Limit Check to prevent DoS on download limits
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    // 100 downloads per hour per IP seems reasonable for a legitimate user
    // This prevents a single IP from rapidly exhausting a file's download limit (griefing)
    const { allowed } = await checkRateLimit(ip, 'increment-download', 100, 3600);

    if (!allowed) {
        return NextResponse.json({ error: "Too many download attempts. Please try again later." }, { status: 429 });
    }

    const supabase = createAdminClient();

    // Call the atomic RPC function
    const { data, error } = await supabase
        .rpc('increment_download_count', { row_id: id });

    if (error) {
        console.error("RPC Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // RPC returns an array of rows (even if just one)
    const result = Array.isArray(data) ? data[0] : data;
    
    if (!result) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const { new_count, limit_reached, allowed: isDownloadAllowed } = result;

    if (!isDownloadAllowed) {
        return NextResponse.json({ 
            error: "This file has reached its download limit and is no longer available.",
            limitReached: true 
        }, { status: 410 }); // 410 Gone
    }

    // --- Generate Signed URLs for Access ---
    const EXPIRES_IN = 60 * 60; // 1 hour link validity
    let downloadUrls: string[] = [];
    
    // Fetch file metadata to determine structure (Chunked vs Single)
    const { data: fileData, error: fileError } = await supabase
        .from('uploads')
        .select('iv, size')
        .eq('id', id)
        .single();

    if (fileError || !fileData) {
         console.error("Failed to fetch file metadata", fileError);
         // Fallback to legacy list behavior if metadata fetch fails
         const { data: listData, error: listError } = await supabase.storage
            .from('drop-files')
            .list(id); 

         if (!listError && listData && listData.length > 0) {
            const sortedChunks = listData.sort((a, b) => parseInt(a.name) - parseInt(b.name));
            const urls = await Promise.all(sortedChunks.map(async (chunk) => {
                 const { data: signed } = await supabase.storage
                    .from('drop-files')
                    .createSignedUrl(`${id}/${chunk.name}`, EXPIRES_IN);
                 return signed?.signedUrl;
            }));
            downloadUrls = urls.filter(u => u) as string[];
         } else {
            const { data: signedData } = await supabase.storage
                .from('drop-files')
                .createSignedUrl(id, EXPIRES_IN);
            if (signedData?.signedUrl) downloadUrls = [signedData.signedUrl];
         }
    } else {
        // Robust generation based on metadata
        if (fileData.iv === 'CHUNKED_PARALLEL_V1' || fileData.iv === 'CHUNKED_V1') {
            const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB - Must match EncryptionService.CHUNK_SIZE
            // Note: DB size is original size.
            // If size is 0 (empty file), it has 1 chunk (empty).
            const totalChunks = Math.max(1, Math.ceil((fileData.size || 0) / CHUNK_SIZE));
            
            const urls = await Promise.all(Array.from({ length: totalChunks }, async (_, i) => {
                 const { data: signed } = await supabase.storage
                    .from('drop-files')
                    .createSignedUrl(`${id}/${i}`, EXPIRES_IN);
                 return signed?.signedUrl;
            }));
            downloadUrls = urls.filter(u => u) as string[];
        } else {
            // Legacy single file
            const { data: signedData } = await supabase.storage
                .from('drop-files')
                .createSignedUrl(id, EXPIRES_IN);
            if (signedData?.signedUrl) downloadUrls = [signedData.signedUrl];
        }
    }
    
    if (downloadUrls.length === 0) {
         console.warn("No download URLs generated for id:", id);
    }

    // --- End Signed URLs ---

    // Check for notification preferences
    try {
        const { data: uploadData, error: uploadError } = await supabase
            .from('uploads')
            .select('notify_on_download, sender_email, user_id')
            .eq('id', id)
            .single();
        
        if (!uploadError && uploadData?.notify_on_download && uploadData.sender_email) {
            // Fetch PGP Key if user exists
            let pgpKey: string | null = null;
            if (uploadData.user_id) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('pgp_public_key')
                    .eq('id', uploadData.user_id)
                    .single();
                
                if (profile?.pgp_public_key) {
                    pgpKey = profile.pgp_public_key;
                }
            }

            // Send notification
            const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
            const userAgent = req.headers.get('user-agent') || 'Unknown Client';
            
            // Fire and forget - don't block the download response
            sendDownloadNotification(uploadData.sender_email, id, ip, userAgent, pgpKey)
                .catch(err => console.warn("Failed to send notification email:", err));
        }
    } catch (e) {
        console.warn("Error checking notification prefs:", e);
        // Don't fail the request if notification fails
    }

    return NextResponse.json({ 
        success: true, 
        count: new_count,
        limitReached: limit_reached,
        signedUrls: downloadUrls
    });

  } catch (error: unknown) {
    console.error("Increment Route Error:", error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
