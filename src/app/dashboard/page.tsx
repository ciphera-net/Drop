import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard-view";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cleanupExpiredOrLimitReachedFile } from "@/lib/cleanup";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: uploads } = await supabase
    .from('uploads')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
    
  // Cleanup expired/limit reached files
  if (uploads) {
      const candidates = uploads.filter(file => {
          if (file.file_deleted) return false;
          const isExpired = new Date(file.expiration_time) < new Date();
          const isLimitReached = file.download_limit !== null && file.download_count >= file.download_limit;
          return isExpired || isLimitReached;
      });

      if (candidates.length > 0) {
          await Promise.all(candidates.map(file => cleanupExpiredOrLimitReachedFile(file.id)));
          
          // Update local state to reflect deletion
          candidates.forEach(file => {
              file.file_deleted = true;
          });
      }
  }

  // Fetch Requests
  const { data: requests } = await supabase
    .from('file_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-background flex flex-col">
       <SiteHeader user={user} />
       <main className="flex-1 max-w-4xl w-full mx-auto p-4 py-8 md:p-8">
          <DashboardView uploads={uploads || []} requests={requests || []} />
       </main>
       <SiteFooter />
    </div>
  )
}
