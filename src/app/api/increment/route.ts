import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { sendDownloadNotification } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

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

    const { new_count, limit_reached, allowed } = result;

    if (!allowed) {
        return NextResponse.json({ 
            error: "This file has reached its download limit and is no longer available.",
            limitReached: true 
        }, { status: 410 }); // 410 Gone
    }

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
        limitReached: limit_reached 
    });

  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
