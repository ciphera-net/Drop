import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard-view";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const { data: uploads } = await supabase
    .from('uploads')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
    
  // Fetch Requests
  const { data: requests } = await supabase
    .from('file_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen bg-background flex flex-col">
       <SiteHeader user={user} displayName={profile?.display_name} />
       <main className="flex-1 max-w-4xl w-full mx-auto p-4 py-8 md:p-8">
          <DashboardView uploads={uploads || []} requests={requests || []} />
       </main>
       <SiteFooter />
    </div>
  )
}
