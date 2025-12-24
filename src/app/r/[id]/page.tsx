import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { RequestUploadBox } from "@/components/request-upload-box";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

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
      <header className="w-full py-6 px-4 md:px-8 border-border border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
           <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-foreground tracking-tight hover:opacity-80 transition-opacity">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg shadow-orange-500/30">
               D
             </div>
             <span>Drop</span>
           </Link>
           
           <div className="flex items-center gap-4">
             <ThemeToggle />
           </div>
        </div>
      </header>

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

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border bg-background">
         <div className="max-w-6xl mx-auto px-4">
            <p>Securely powered by Ciphera Drop</p>
         </div>
      </footer>
    </div>
  );
}

