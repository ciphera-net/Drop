import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const { data, error } = await resend.emails.send({
      from: 'Drop <drop@operational.ciphera.net>',
      to: [reqData.notify_email],
      subject: `New File Uploaded: ${reqData.name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New File Received</h2>
          <p>A new file has been uploaded to your request <strong>"${reqData.name}"</strong>.</p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">File: ${fileName || 'Encrypted File'}</p>
          </div>
          <p>Log in to your dashboard to decrypt and download it.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: #fd5e0f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
        </div>
      `
    });

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
