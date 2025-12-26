import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/utils/supabase/server";

export default async function NotFound() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <SiteHeader user={user} displayName={profile?.display_name} />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
           <span className="text-4xl font-bold text-primary">404</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Page Not Found</h1>
        <p className="text-lg text-muted-foreground max-w-md mb-8">
          The page you are looking for does not exist, or the secure link has expired or been deleted.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
