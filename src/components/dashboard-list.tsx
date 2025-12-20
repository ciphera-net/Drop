"use client";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";
import { Trash, Clock, File, DownloadSimple, FileText, Timer } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

function FileCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expirationDate = new Date(expiresAt).getTime();
      const distance = expirationDate - now;

      if (distance < 0) {
        setTimeLeft("Expired");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      let timeString = "";
      if (days > 0) {
        timeString = `${days}d ${hours}h`;
      } else if (hours > 0) {
        timeString = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        timeString = `${minutes}m ${seconds}s`;
      } else {
        timeString = `${seconds}s`;
      }
      
      setTimeLeft(timeString);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft === "Expired" || !timeLeft) return null;

  return (
      <span className="flex items-center gap-1 text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded text-[10px] md:text-xs" title="Expires in">
          <Timer className="w-3 h-3" />
          {timeLeft}
      </span>
  );
}

export function DashboardList({ uploads }: { uploads: any[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
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
        // We try to remove from storage too just in case, it's idempotent
        await supabase.storage.from('drop-files').remove([id]);
        router.refresh();
      } catch (e) {
          console.error(e);
      } finally {
          setDeleting(null);
      }
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
        {files.map(file => {
           const isExpired = new Date(file.expiration_time) < new Date();
           const isLimitReached = file.download_limit !== null && file.download_count >= file.download_limit;
           const isDeleted = file.file_deleted || isExpired || isLimitReached;

           let statusLabel = null;
           if (file.file_deleted) {
               if (isLimitReached) statusLabel = "Limit Reached";
               else if (isExpired) statusLabel = "Expired";
               else statusLabel = "Deleted";
           } else {
               if (isLimitReached) statusLabel = "Limit Reached";
               else if (isExpired) statusLabel = "Expired";
           }

           return (
           <div key={file.id} className={`bg-white p-4 rounded-xl border flex items-center justify-between shadow-sm hover:shadow-md transition-shadow ${isDeleted ? 'opacity-75 bg-gray-50' : ''}`}>
              <div className="flex items-center gap-4 overflow-hidden">
                 <div className={`p-3 rounded-lg flex-shrink-0 ${isDeleted ? 'bg-gray-100' : 'bg-orange-50'}`}>
                    <File className={`w-6 h-6 ${isDeleted ? 'text-gray-400' : 'text-primary'}`} weight="duotone" />
                 </div>
                 <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`font-medium truncate ${isDeleted ? 'text-gray-500' : 'text-gray-900'}`}>
                        {/* We can't decrypt name, so show generic name + ID slice */}
                        <Link href={isDeleted ? '#' : `/d/${file.id}`} target={isDeleted ? undefined : "_blank"} className={isDeleted ? 'cursor-default' : 'hover:underline decoration-primary'}>
                            {file.magic_words ? (
                                <span className="font-mono font-bold text-primary mr-2">{file.magic_words}</span>
                            ) : (
                                <span>File </span>
                            )}
                            <span className="text-gray-400 text-xs font-mono">#{file.id.slice(0, 8)}</span>
                        </Link>
                        </p>
                        {statusLabel && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                                {statusLabel}
                            </span>
                        )}
                    </div>
                   <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1" title="Created at">
                         <Clock className="w-3 h-3" />
                         {new Date(file.created_at).toLocaleDateString()}
                      </span>
                     <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                     <span className="flex items-center gap-1" title="File size">
                        <FileText className="w-3 h-3" />
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                     </span>
                     {!isDeleted && (
                        <>
                           <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                           <FileCountdown expiresAt={file.expiration_time} />
                        </>
                     )}
                      {/* Show download count if relevant (limit exists or count > 0) */}
                      {(file.download_limit !== null || file.download_count > 0) && (
                        <>
                           <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                           <span className="flex items-center gap-1" title="Downloads">
                              <DownloadSimple className="w-3 h-3" />
                              {file.download_count || 0}
                              {file.download_limit !== null ? ` / ${file.download_limit}` : ''}
                           </span>
                        </>
                      )}
                   </div>
                 </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(file.id)} 
                    className="text-muted-foreground hover:text-destructive hover:bg-red-50"
                    disabled={deleting === file.id}
                    title={isDeleted ? "Remove from History" : "Delete File"}
                  >
                     {deleting === file.id ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div> : <Trash weight="bold" />}
                  </Button>
              </div>
           </div>
        )})}
     </div>
  )
}

