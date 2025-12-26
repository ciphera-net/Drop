import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/utils/supabase/server";

export default async function PrivacyPage() {
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
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
      <SiteHeader user={user} displayName={profile?.display_name} />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose dark:prose-invert max-w-none space-y-6">
          <p className="text-lg text-muted-foreground">Last updated: December 2025</p>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. The Short Version</h2>
            <p>
              We prioritize your privacy above all else. <strong>We cannot read your files.</strong> 
              Files are encrypted in your browser before they ever reach our servers. 
              We only store the encrypted data, and we do not have the decryption keys—you do.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Encrypted Files:</strong> We store the encrypted binary data you upload. We cannot decrypt this.</li>
              <li><strong>Metadata:</strong> We store basic metadata (file size, upload time, expiration time) to manage the service. Filenames and MIME types are encrypted.</li>
              <li><strong>Access Logs:</strong> For security and rate-limiting, we may temporarily log IP addresses and request timestamps.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Data Retention</h2>
            <p>
              Files are automatically deleted from our servers when:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The expiration time is reached (1 hour, 1 day, etc.).</li>
              <li>The download limit is reached (if "Burn on download" is enabled).</li>
              <li>You manually delete the file via the dashboard.</li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

