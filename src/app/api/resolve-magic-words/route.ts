import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { words } = await request.json();
    
    if (!words) {
        return NextResponse.json({ error: 'Words are required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('uploads')
      .select('id')
      .eq('magic_words', words)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

