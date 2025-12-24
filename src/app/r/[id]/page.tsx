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

