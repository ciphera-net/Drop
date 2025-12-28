import { createClient } from "@/utils/supabase/server";

export interface GlobalStats {
  filesProtected: number;
  gbSecured: number;
}

export async function getGlobalStats(): Promise<GlobalStats> {
  try {
    const supabase = await createClient();

    // Fetch from the persistent global_stats table
    const { data: globalStats, error } = await supabase
      .from('global_stats')
      .select('total_files_protected, total_bytes_secured')
      .single();

    if (error || !globalStats) {
       return { filesProtected: 0, gbSecured: 0 };
    }

    const gbSecured = (globalStats.total_bytes_secured || 0) / (1024 * 1024 * 1024);

    return {
      filesProtected: globalStats.total_files_protected || 0,
      gbSecured: Math.round(gbSecured * 10) / 10,
    };

  } catch (error) {
    console.error("Stats fetch error:", error);
    return { filesProtected: 0, gbSecured: 0 };
  }
}
