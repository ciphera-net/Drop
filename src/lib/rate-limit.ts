import { createAdminClient } from "@/utils/supabase/admin";

export async function checkRateLimit(ip: string, endpoint: string, limit: number, windowSeconds: number) {
  const supabase = createAdminClient();

  // Use the atomic RPC function
  const { data: allowed, error } = await supabase.rpc('check_rate_limit_rpc', {
    _ip: ip,
    _endpoint: endpoint,
    _limit: limit,
    _window_seconds: windowSeconds
  });

  if (error) {
    console.error("Rate limit RPC error:", error);
    // Fail open to ensure availability during DB glitches
    return { allowed: true };
  }

  return { allowed: allowed };
}
