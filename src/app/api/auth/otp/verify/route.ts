import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otp } = await request.json();

    if (!otp) {
        return NextResponse.json({ error: "OTP required" }, { status: 400 });
    }

    const { data: verification, error: dbError } = await supabase
      .from("user_verifications")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (dbError || !verification) {
        return NextResponse.json({ error: "Verification record not found" }, { status: 400 });
    }

    // Check if expired
    if (!verification.otp_expires_at || new Date(verification.otp_expires_at) < new Date()) {
        return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    // Check if match
    if (verification.otp_code !== otp) {
        return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Success
    const { error: updateError } = await supabase
      .from("user_verifications")
      .update({
          is_verified: true,
          otp_code: null,
          otp_expires_at: null,
          updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    if (updateError) {
        return NextResponse.json({ error: "Failed to update verification status" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OTP Verify Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

