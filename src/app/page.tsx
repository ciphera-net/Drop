import { UploadBox } from "@/components/upload-box";
import { FeatureSection } from "@/components/feature-section";
import { MagicWordInput } from "@/components/magic-word-input";
import { createClient } from "@/utils/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-background">
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

         <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
           <MagicWordInput />
           <UploadBox />
         </div>
         
         {/* Features Grid */}
         <div className="mt-24 w-full animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            <FeatureSection />
         </div>

      </main>

      <SiteFooter />
    </div>
  );
}
