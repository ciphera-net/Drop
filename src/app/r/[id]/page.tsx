import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { RequestUploadBox } from "@/components/request-upload-box";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from('file_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !request || request.status !== 'active') {
    notFound();
  }
  
  const { data: { user } } = await supabase.auth.getUser();

  // Check expiration
  if (request.expiration_time && new Date(request.expiration_time) < new Date()) {
      return (
         <div className="min-h-screen flex flex-col bg-background">
             <SiteHeader simple={true} user={user} />
             <main className="flex-1 flex items-center justify-center p-4">
                 <div className="text-center p-8 bg-card rounded-2xl shadow-xl max-w-md mx-4 border border-border">
                     <div className="mx-auto bg-muted p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                     </div>
                     <h1 className="text-2xl font-bold text-foreground mb-2">Request Expired</h1>
                     <p className="text-muted-foreground">This file request is no longer accepting uploads.</p>
                 </div>
             </main>
             <SiteFooter simple={true} />
         </div>
       );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader simple={true} user={user} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
         
         <div className="text-center mb-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
               {request.name}
            </h1>
            {request.description && (
                <p className="text-lg text-muted-foreground leading-relaxed">
                   {request.description}
                </p>
            )}
            <div className="mt-4 inline-block bg-secondary/50 px-3 py-1 rounded-full text-xs text-muted-foreground border">
                Secure File Request • Encrypted Upload
            </div>
         </div>

         <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
           <RequestUploadBox request={request} />
         </div>
      </main>

      <SiteFooter simple={true} />
    </div>
  );
}

