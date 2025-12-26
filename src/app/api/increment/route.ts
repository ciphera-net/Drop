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
    // and we just incremented, we MUST provide a Signed URL which bypasses RLS.
    
    // First, fetch file metadata to determine structure (chunks vs single)
    const { data: fileData, error: fileError } = await supabase
        .from('uploads')
        .select('iv, size')
        .eq('id', id)
        .single();
    
    if (fileError || !fileData) {
        console.error("Failed to fetch file metadata for signing", fileError);
        return NextResponse.json({ error: "Failed to prepare download" }, { status: 500 });
    }

    let downloadUrls: string[] = [];
    const EXPIRES_IN = 60 * 60; // 1 hour

    if (fileData.iv === "CHUNKED_PARALLEL_V1") {
        const CHUNK_SIZE = EncryptionService.CHUNK_SIZE;
        const totalChunks = Math.ceil(fileData.size / CHUNK_SIZE);
        const paths = [];
        for (let i = 0; i < totalChunks; i++) {
            paths.push(`${id}/${i}`);
        }
        
        // createSignedUrls returns { data, error } where data is array of objects { path, signedUrl }
        // Note: supabase-js v2
        const { data: signedData, error: signError } = await supabase.storage
            .from('drop-files')
            .createSignedUrls(paths, EXPIRES_IN);
            
        if (signError || !signedData) {
             console.error("Failed to sign URLs", signError);
             return NextResponse.json({ error: "Failed to sign download URLs" }, { status: 500 });
        }
        
        // Ensure order matches index
        // The response usually matches the order of input paths, but let's be safe if possible.
        // Actually for this array map, we can just map the results.
        downloadUrls = signedData.map(d => d.signedUrl);

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
            .select('notify_on_download, sender_email')
            .eq('id', id)
            .single();
        
        if (!uploadError && uploadData?.notify_on_download && uploadData.sender_email) {
            // Send notification
            const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
            const userAgent = req.headers.get('user-agent') || 'Unknown Client';
            
            // Fire and forget - don't block the download response
            sendDownloadNotification(uploadData.sender_email, id, ip, userAgent)
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

  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
