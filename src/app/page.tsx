import { UploadBox } from "@/components/upload-box";
import { FeatureSection } from "@/components/feature-section";
import { createClient } from "@/utils/supabase/server";
import { UserMenu } from "@/components/user-menu";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {/* Header */}
      <header className="w-full py-6 px-4 md:px-8 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
           <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-gray-900 tracking-tight hover:opacity-80 transition-opacity">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
               D
             </div>
             <span>Drop</span>
           </Link>
           
           <UserMenu user={user} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
         
         <div className="text-center mb-12 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
               The Secure Way <br/>
               <span className="text-primary relative whitespace-nowrap">
                 to Share
                 <svg className="absolute w-full h-3 -bottom-1 left-0 text-orange-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                 </svg>
               </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
               Share files with end-to-end encryption. <br className="hidden md:block"/>
               No tracking, no spying, just code.
            </p>
         </div>

         <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
           <UploadBox />
         </div>
         
         {/* Features Grid */}
         <div className="mt-24 w-full animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            <FeatureSection />
         </div>

      </main>

      <footer className="py-8 text-center text-sm text-gray-500 border-t bg-white">
         <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
            <p>© 2025 Ciphera. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
               <a href="#" className="hover:text-primary transition-colors">Privacy</a>
               <a href="#" className="hover:text-primary transition-colors">Terms</a>
               <a href="#" className="hover:text-primary transition-colors">Open Source</a>
            </div>
         </div>
      </footer>
    </div>
  );
}
