import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { DownloadView } from "@/components/download-view";
import Link from "next/link";
import { cleanupExpiredOrLimitReachedFile } from "@/lib/cleanup";

export default async function DownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: file, error } = await supabase
    .from('uploads')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !file) {
    notFound();
  }

  // Check expiration (Server side check)
  const isExpired = new Date(file.expiration_time) < new Date();
  const isLimitReached = file.download_limit !== null && file.download_count >= file.download_limit;
  
  // If logically deleted but not marked, or marked deleted, handle it.
  if (isExpired || isLimitReached || file.file_deleted) {
      if (!file.file_deleted) {
          // Trigger cleanup if not already marked
          await cleanupExpiredOrLimitReachedFile(file.id);
      }
      
      return (
         <div className="min-h-screen flex items-center justify-center bg-gray-50">
             <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md mx-4">
                 <div className="mx-auto bg-gray-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                 </div>
                 <h1 className="text-2xl font-bold text-gray-900 mb-2">Transfer Expired</h1>
                 <p className="text-gray-600">This file is no longer available. It has either expired or reached its download limit.</p>
             </div>
         </div>
     )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
       <header className="py-6 text-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <Link href="/" className="inline-flex items-center justify-center gap-2 font-bold text-xl text-gray-900 hover:opacity-80 transition-opacity">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
               D
             </div>
             <span>Drop</span>
          </Link>
       </header>
       <main className="flex-1 flex items-center justify-center p-4">
          <DownloadView file={file} />
       </main>
    </div>
  );
}

