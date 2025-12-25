import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendUploadNotification } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate Limit Check
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const { allowed } = await checkRateLimit(ip, 'notify-upload', 5, 3600); // 5 requests per hour

    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { requestId, fileName } = await request.json();

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    // Use Admin Client to bypass RLS and read notify_email
    const supabase = createAdminClient();

    const { data: reqData, error: reqError } = await supabase
        .from('file_requests')
        .select('notify_email, name')
        .eq('id', requestId)
        .single();
        
    if (reqError) {
        console.error("[Notify] DB Error:", reqError);
        return NextResponse.json({ error: "Failed to fetch request" }, { status: 500 });
    }
    
    if (!reqData) {
         return NextResponse.json({ success: true }); // Silent fail
    }

    if (!reqData.notify_email) {
        return NextResponse.json({ success: true });
    }

    const { data, error } = await sendUploadNotification(reqData.notify_email, reqData.name, fileName);

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, id: data?.id });

  } catch (error: any) {
    console.error("Notification Route Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
