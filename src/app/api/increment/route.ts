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
    // Because RLS prevents public access once limit is reached (or count > limit),
    // and we just incremented the count, we might have hit the limit.
    // However, if isDownloadAllowed is true, it means we are still within limit (or just hit it).
    // But RLS "Secure public download" checks "download_count < download_limit".
    // If we just hit the limit (count == limit), then RLS will return false immediately after this request.
    // BUT we need to give the user the file NOW.
    // So we use the Service Role to sign the URL, bypassing RLS.
    // This is safer than Client Side signing because we've already validated the limit here.

    const EXPIRES_IN = 60 * 60; // 1 hour link validity
    let downloadUrls: string[] = [];
    
    // Check if it's a chunked file (folder) or single file
    // We can list the folder to see chunks.
    const { data: listData, error: listError } = await supabase.storage
        .from('drop-files')
        .list(id); // List folder 'id'

    if (!listError && listData && listData.length > 0) {
        // Sort chunks numerically (0, 1, 2...)
        const sortedChunks = listData.sort((a, b) => {
             const idxA = parseInt(a.name);
             const idxB = parseInt(b.name);
             return idxA - idxB;
        });

        const urls = await Promise.all(sortedChunks.map(async (chunk) => {
             const { data: signed } = await supabase.storage
                .from('drop-files')
                .createSignedUrl(`${id}/${chunk.name}`, EXPIRES_IN);
             return signed?.signedUrl;
        }));
        
        // Filter out undefined
        downloadUrls = urls.filter(u => u) as string[];


    } else {
        // Legacy Single File or CHUNKED_V1 (TUS)
        // For TUS, the signed URL is for the whole file ID usually? 
        // Or CHUNKED_V1 implies a folder... 
        // Wait, TUS uploads are usually single objects in S3 if they are finalized?
        // Let's assume standard download logic for single file.
        // If it's CHUNKED_V1 (Legacy), we might need to handle it differently, 
        // but the client logic uses `downloadStream` with a single signed URL for `file.id`.
        
        const { data: signedData, error: signError } = await supabase.storage
            .from('drop-files')
            .createSignedUrl(id, EXPIRES_IN);

        if (signError || !signedData) {
             console.error("Failed to sign URL", signError);
             return NextResponse.json({ error: "Failed to sign download URL" }, { status: 500 });
        }
        
        downloadUrls = [signedData.signedUrl];
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
        downloadUrls: downloadUrls
    });

  } catch (error: unknown) {
    console.error("Increment Route Error:", error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
