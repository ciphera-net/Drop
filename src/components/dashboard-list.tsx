"use client";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";
import { Trash, Clock, File, Link as LinkIcon, Check, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export function DashboardList({ uploads }: { uploads: any[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [files, setFiles] = useState(uploads);

  useEffect(() => {
    setFiles(uploads);
  }, [uploads]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-uploads')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'uploads',
        },
        (payload) => {
          setFiles((currentFiles) =>
            currentFiles.map((file) =>
              file.id === payload.new.id ? { ...file, ...payload.new } : file
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleDelete = async (id: string) => {
      setDeleting(id);
      try {
        await supabase.from('uploads').delete().eq('id', id);
        await supabase.storage.from('drop-files').remove([id]);
        router.refresh();
      } catch (e) {
          console.error(e);
      } finally {
          setDeleting(null);
      }
  };

  const handleCopyLink = async (file: any) => {
    let url = `${window.location.origin}/d/${file.id}`;
    
    // For non-password protected files, the key is NOT stored on server (Zero-Knowledge)
    // So we cannot recover the full link.
    if (!file.is_password_protected) {
       // We can only copy the base URL, which will prompt for key manually.
       // Ideally we might want to warn the user, but for now we just copy what we have.
    }

    navigator.clipboard.writeText(url);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (files.length === 0) {
      return (
          <div className="text-center py-20 text-gray-500 bg-white rounded-2xl border border-dashed">
             <p>No active transfers.</p>
             <p className="text-sm mt-2">Upload a file to see it here.</p>
          </div>
      )
  }

  return (
     <div className="space-y-4">
        {files.map(file => (
           <div key={file.id} className="bg-white p-4 rounded-xl border flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 overflow-hidden">
                 <div className="bg-orange-50 p-3 rounded-lg flex-shrink-0">
                    <File className="w-6 h-6 text-primary" weight="duotone" />
                 </div>
                 <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                       {/* We can't decrypt name, so show generic name + ID slice */}
                       <Link href={`/d/${file.id}`} target="_blank" className="hover:underline decoration-primary">
                          File <span className="text-gray-400 text-xs font-mono">#{file.id.slice(0, 8)}</span>
                       </Link>
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                       <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(file.created_at).toLocaleDateString()}
                       </span>
                       <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                       <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                       <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                       <span>{file.download_count} / {file.download_limit || '∞'} downloads</span>
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleCopyLink(file)} 
                    className="text-muted-foreground hover:text-primary hover:bg-blue-50"
                    title={!file.is_password_protected ? "Copy Link (Key missing for non-password files)" : "Copy Share Link"}
                  >
                     {copiedId === file.id ? <Check weight="bold" className="text-green-600" /> : <LinkIcon weight="bold" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(file.id)} 
                    className="text-muted-foreground hover:text-destructive hover:bg-red-50"
                    disabled={deleting === file.id}
                    title="Delete File"
                  >
                     {deleting === file.id ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div> : <Trash weight="bold" />}
                  </Button>
              </div>
           </div>
        ))}
     </div>
  )
}

