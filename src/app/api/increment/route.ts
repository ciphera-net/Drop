import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredOrLimitReachedFile } from "@/lib/cleanup";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const supabase = createAdminClient();

    // Fetch current count and limit
    const { data: file, error: fetchError } = await supabase
        .from('uploads')
        .select('download_count, download_limit')
        .eq('id', id)
        .single();
        
    if (fetchError || !file) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const newCount = (file.download_count || 0) + 1;
    
    // Update count
    const { error: updateError } = await supabase
        .from('uploads')
        .update({ download_count: newCount })
        .eq('id', id);

    if (updateError) throw updateError;

    let limitReached = false;

    // Check if limit reached AFTER increment
    if (file.download_limit !== null && newCount >= file.download_limit) {
         limitReached = true;
         // Mark as deleted in DB immediately so no new users can access it
         await supabase.from('uploads').update({ file_deleted: true }).eq('id', id);
         
         // NOTE: We do NOT trigger storage cleanup here to allow the current user to complete their download.
         // The client is responsible for calling the cleanup endpoint after download, 
         // or it will be cleaned up by the sender's dashboard check eventually.
    }

    return NextResponse.json({ success: true, count: newCount, limitReached });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

