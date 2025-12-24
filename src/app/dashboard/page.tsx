import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard-view";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
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
    <div className="min-h-screen bg-background">
       <header className="bg-background/80 backdrop-blur-sm border-b border-border py-4 px-4 md:px-8 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
             <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm">
                        D
                    </div>
                    <span className="hidden sm:inline">Drop</span>
                </Link>
             </div>
             <div className="flex items-center gap-4">
                <ThemeToggle />
                <UserMenu user={user} />
             </div>
          </div>
       </header>
       <main className="max-w-4xl mx-auto p-4 py-8 md:p-8">
          <DashboardView uploads={uploads || []} requests={requests || []} />
       </main>
    </div>
  )
}
