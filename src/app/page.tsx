import { FeatureSection } from "@/components/feature-section";
import { createClient } from "@/utils/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HomeView } from "@/components/home-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drop - Secure, Encrypted File Sharing",
  description: "Share files securely with end-to-end encryption. No signup required for basic sharing. Zero-knowledge architecture ensures only you hold the keys.",
  alternates: {
    canonical: '/',
  },
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Drop",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "End-to-end encrypted file sharing application.",
    "author": {
      "@type": "Organization",
      "name": "Ciphera",
      "url": "https://ciphera.net"
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader user={user} />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
         
         <div className="text-center mb-12 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
               The Secure Way <br/>
               <span className="text-primary relative whitespace-nowrap">
                 to Share
                 <svg className="absolute w-full h-3 -bottom-1 left-0 text-orange-200 dark:text-orange-900 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                 </svg>
               </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
               Share files with end-to-end encryption. <br className="hidden md:block"/>
               No tracking, no spying, just code.
            </p>
         </div>

         <HomeView user={user} />
         
         {/* Features Grid */}
         <div className="mt-24 w-full animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            <FeatureSection />
         </div>

      </main>

      <SiteFooter />
    </div>
  );
}
