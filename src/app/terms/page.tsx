import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/utils/supabase/server";

export default async function TermsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
      <SiteHeader user={user} />
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="prose dark:prose-invert max-w-none space-y-6">
          <p className="text-lg text-muted-foreground">Last updated: December 2025</p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptable Use</h2>
            <p>By using Drop, you agree NOT to upload or share:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Malware, viruses, or malicious code.</li>
              <li>Illegal content, including CSAM or copyrighted material you do not have the right to share.</li>
              <li>Content that promotes violence or hatred.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Disclaimer of Warranties</h2>
            <p>
              The service is provided "as is". While we strive for 100% uptime and security, 
              we cannot guarantee that files will never be lost or that the service will never be interrupted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Termination</h2>
            <p>
              We reserve the right to delete any file or ban any user that violates these terms, 
              at our sole discretion.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

