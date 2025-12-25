import { createAdminClient } from "@/utils/supabase/admin";

export async function checkRateLimit(ip: string, endpoint: string, limit: number, windowSeconds: number) {
  const supabase = createAdminClient();
  const now = new Date();
  
  // 1. Get current usage
  const { data: current, error: fetchError } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('ip', ip)
    .eq('endpoint', endpoint)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error("Rate limit fetch error:", fetchError);
    return { allowed: true }; // Fail open on DB error to avoid blocking users
  }

  // 2. If no record, create one
  if (!current) {
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert({ ip, endpoint, requests: 1, last_request: now.toISOString() });
      
    if (insertError) console.error("Rate limit insert error:", insertError);
    return { allowed: true };
  }

  // 3. Check window
  const lastRequest = new Date(current.last_request);
  const timeDiff = (now.getTime() - lastRequest.getTime()) / 1000;

  if (timeDiff > windowSeconds) {
    // Reset window
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ requests: 1, last_request: now.toISOString() })
      .eq('ip', ip)
      .eq('endpoint', endpoint);
      
    if (updateError) console.error("Rate limit reset error:", updateError);
    return { allowed: true };
  }

  // 4. Check limit
  if (current.requests >= limit) {
    return { allowed: false };
  }

  // 5. Increment
  const { error: incrementError } = await supabase
    .from('rate_limits')
    .update({ requests: current.requests + 1 })
    .eq('ip', ip)
    .eq('endpoint', endpoint);

  if (incrementError) console.error("Rate limit increment error:", incrementError);
  return { allowed: true };
}

