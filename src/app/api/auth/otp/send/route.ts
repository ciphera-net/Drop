import { createClient } from "@/utils/supabase/server";
import { sendOtpEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { randomInt } from "crypto";
import { hashOtp } from "@/lib/otp-security";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Rate Limit Check
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const { allowed } = await checkRateLimit(ip, 'send-otp', 5, 3600); // 5 requests per hour

    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    // * Generate 6 digit OTP using cryptographic RNG
    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    // * Hash OTP before storing (security best practice)
    const hashedOtp = hashOtp(otp);

    // Upsert OTP
    // We explicitly set user_id. user_verifications has user_id as PK.
    // If it exists, we update otp_code and otp_expires_at.
    // is_verified is NOT included, so it should be preserved on update.
    // On insert, is_verified defaults to false.
    const { error: dbError } = await supabase
      .from("user_verifications")
      .upsert({
        user_id: user.id,
        otp_code: hashedOtp,
        otp_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      
    if (dbError) {
      console.error("Error storing OTP:", dbError);
      return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 });
    }
    
    await sendOtpEmail(user.email, otp);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OTP Send Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

