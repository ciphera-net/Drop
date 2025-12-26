import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SiteHeader user={user} displayName={profile?.display_name} />
      <main className="flex-1 w-full max-w-5xl mx-auto py-10 px-4 md:px-6">
        <div className="space-y-6">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">
              Manage your account settings and preferences.
            </p>
          </div>
          <div className="my-6 border-t" />
          <SettingsView user={user} profile={profile} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
