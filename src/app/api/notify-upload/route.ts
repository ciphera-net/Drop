import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendUploadNotification } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { requestId, fileName } = await request.json();

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    console.log(`[Notify] Sending email for Request ID: ${requestId}`);

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
         console.log("[Notify] Request not found");
         return NextResponse.json({ success: true }); // Silent fail
    }

    if (!reqData.notify_email) {
        console.log("[Notify] No notification email configured for this request.");
        return NextResponse.json({ success: true });
    }

    console.log(`[Notify] Sending to ${reqData.notify_email}`);

    const { data, error } = await sendUploadNotification(reqData.notify_email, reqData.name, fileName);

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log("[Notify] Email sent successfully:", data?.id);

    return NextResponse.json({ success: true, id: data?.id });

  } catch (error: any) {
    console.error("Notification Route Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
