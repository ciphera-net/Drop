import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate Limit Check
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    // Allow 20 attempts per hour (generous for typos, tight for brute force)
    const { allowed } = await checkRateLimit(ip, 'resolve-magic-words', 20, 3600); 

    if (!allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

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

