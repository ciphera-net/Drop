import { cleanupExpiredOrLimitReachedFile } from "@/lib/cleanup";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await cleanupExpiredOrLimitReachedFile(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

