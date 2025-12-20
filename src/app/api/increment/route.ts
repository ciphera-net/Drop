import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing file ID' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Get current count and limit
    const { data: file, error: fetchError } = await supabase
      .from('uploads')
      .select('download_count, download_limit')
      .eq('id', id)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 2. Check limit
    if (file.download_limit !== null && file.download_count >= file.download_limit) {
        return NextResponse.json({ error: 'Download limit reached' }, { status: 403 });
    }

    // 3. Increment
    // Note: In a high-concurrency environment, this should be an RPC or use optimistic locking.
    // For this app's scale, this read-then-write approach is acceptable.
    const { error: updateError } = await supabase
      .from('uploads')
      .update({ download_count: file.download_count + 1 })
      .eq('id', id);

    if (updateError) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, new_count: file.download_count + 1 });
  } catch (error) {
    console.error('Increment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

