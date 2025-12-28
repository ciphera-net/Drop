import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { size } = await request.json();
    
    if (!size || typeof size !== 'number') {
        return NextResponse.json({ error: "Invalid size" }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Call the RPC function we created in the migration
    const { error } = await supabase.rpc('increment_global_stats', { 
        bytes_added: Math.round(size) 
    });

    if (error) {
        console.error("RPC Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Increment error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
