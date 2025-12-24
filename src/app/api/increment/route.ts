import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { sendDownloadNotification } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

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
                .catch(err => console.error("Failed to send notification email:", err));
        }
    } catch (e) {
        console.error("Error checking notification prefs:", e);
        // Don't fail the request if notification fails
    }

    return NextResponse.json({ 
        success: true, 
        count: new_count, 
        limitReached: limit_reached 
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
