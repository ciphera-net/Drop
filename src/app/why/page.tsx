import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/utils/supabase/server";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why Drop? - Privacy as a Human Right",
  description: "We built Drop because we believe in digital sovereignty. No tracking, no ads, just secure file sharing.",
  alternates: {
    canonical: '/why',
  },
};

export default async function AboutPage() {
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
      
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-16 md:py-24">
        
        {/* Header */}
        <section className="mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
            Why We Built <span className="text-primary">Drop</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            We believe privacy is a fundamental human right. In a world where your data is constantly mined, tracked, and sold, we wanted to build a simple way to share files without compromising your security.
          </p>
        </section>

        {/* The Problem */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">The Problem with "Secure" Storage</h2>
          <div className="prose dark:prose-invert max-w-none text-muted-foreground">
            <p className="mb-4">
              Most file sharing services promise encryption, but there's a catch: <strong>they hold the keys</strong>. 
              This means they can—and do—scan your files, hand them over to governments, or lose them in data breaches.
            </p>
            <p>
              When a service encrypts your data but keeps the decryption key, it's like locking your front door but leaving a spare key under the mat where anyone can find it. You aren't truly in control.
            </p>
          </div>
        </section>

        {/* The Solution */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">True End-to-End Encryption</h2>
          <div className="prose dark:prose-invert max-w-none text-muted-foreground">
            <p className="mb-4">
              Drop is different. We use <strong>end-to-end encryption</strong>. When you upload a file, it is encrypted on your device <em>before</em> it ever touches our servers. The key is generated in your browser and is part of the share link.
            </p>
            <p className="mb-4">
              We never see the key. We cannot read your files. Even if we wanted to, we couldn't.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Zero Knowledge:</strong> We don't know what you're sharing.</li>
                <li><strong>Client-Side Encryption:</strong> Encryption happens on your device, not our servers.</li>
                <li><strong>Ephemeral Storage:</strong> Files can be set to self-destruct or expire automatically.</li>
            </ul>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-foreground">How We Compare</h2>
          
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/50 p-4 font-bold border-b text-sm md:text-base">
              <div>Feature</div>
              <div className="text-center">Typical Cloud</div>
              <div className="text-center text-primary">Drop by Ciphera</div>
            </div>
            
            <div className="grid grid-cols-3 p-4 border-b hover:bg-muted/20 items-center">
              <div className="font-medium text-sm">End-to-End Encryption</div>
              <div className="text-center text-red-500 text-sm">No</div>
              <div className="text-center text-green-500 font-bold text-sm">Yes</div>
            </div>

            <div className="grid grid-cols-3 p-4 border-b hover:bg-muted/20 items-center">
              <div className="font-medium text-sm">Access to Your Files</div>
              <div className="text-center text-sm text-muted-foreground">Provider has keys</div>
              <div className="text-center text-sm text-foreground">Only you have keys</div>
            </div>

            <div className="grid grid-cols-3 p-4 border-b hover:bg-muted/20 items-center">
              <div className="font-medium text-sm">Secure File Requests</div>
              <div className="text-center text-sm text-muted-foreground">Rare</div>
              <div className="text-center text-green-500 font-bold text-sm">Yes</div>
            </div>

            <div className="grid grid-cols-3 p-4 border-b hover:bg-muted/20 items-center">
              <div className="font-medium text-sm">Smart PGP Emails</div>
              <div className="text-center text-sm text-muted-foreground">No</div>
              <div className="text-center text-green-500 font-bold text-sm">Yes</div>
            </div>

            <div className="grid grid-cols-3 p-4 border-b hover:bg-muted/20 items-center">
              <div className="font-medium text-sm">Tracking & Ads</div>
              <div className="text-center text-sm text-muted-foreground">Yes</div>
              <div className="text-center text-sm text-foreground">No</div>
            </div>

            <div className="grid grid-cols-3 p-4 hover:bg-muted/20 items-center">
              <div className="font-medium text-sm">Registration Required</div>
              <div className="text-center text-sm text-muted-foreground">Usually</div>
              <div className="text-center text-sm text-foreground">Optional</div>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">Our Promise</h2>
          <div className="prose dark:prose-invert max-w-none text-muted-foreground">
            <p className="mb-4">
              We built Drop to be the tool we wanted to use ourselves: fast, beautiful, and strictly private. 
              In an internet that increasingly treats users as products, we are taking a stand for digital sovereignty.
            </p>
            <p className="mb-4">
              There are no investors demanding growth at the cost of your privacy. There are no ads scanning your data to build a profile of who you are. 
              We don't track your behavior, we don't sell your metadata, and we have zero interest in knowing what you share.
            </p>
            <p className="mb-4">
              Our code is open source because we believe trust should be earned, not assumed. You don't have to take our word for it—anyone can inspect how Drop works to verify our security claims.
            </p>
            <p>
              We promise to keep Drop simple, secure, and user-first. Just secure file sharing, the way it should be.
            </p>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}

