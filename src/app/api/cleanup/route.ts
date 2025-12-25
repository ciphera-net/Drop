import { cleanupExpiredOrLimitReachedFile, cleanupAllExpiredFiles } from "@/lib/cleanup";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Authorization: Check CRON_SECRET or Bearer Token
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Determine Mode (Single vs Bulk)
    let body = {};
    try {
        const text = await request.text();
        if (text) {
            body = JSON.parse(text);
        }
    } catch (e) {
        // Body parsing failed or empty, assume bulk mode
    }

    const { id } = body as { id?: string };

    if (id) {
        // Manual/Single Mode
        await cleanupExpiredOrLimitReachedFile(id);
        return NextResponse.json({ success: true, mode: 'single', id });
    } else {
        // Bulk/Cron Mode
        const results = await cleanupAllExpiredFiles();
        return NextResponse.json({ success: true, mode: 'bulk', results });
    }

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
