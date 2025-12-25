"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Copy, Trash, FolderOpen, ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { EncryptionService } from "@/lib/encryption";
import { FileIconDisplay } from "./file-icon-display";
import { cn } from "@/lib/utils";
import { FileRequest, DecryptedFile, FileUpload } from "@/types";
import { deleteFileFromStorage } from "@/utils/file-helpers";

export function RequestList({ requests: initialRequests }: { requests: FileRequest[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [requests, setRequests] = useState<FileRequest[]>(initialRequests);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Inbox State
  const [selectedRequest, setSelectedRequest] = useState<FileRequest | null>(null);
  const [inboxPassword, setInboxPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockedFiles, setUnlockedFiles] = useState<DecryptedFile[] | null>(null);
  const [unlockedKey, setUnlockedKey] = useState<CryptoKey | null>(null); // The private key

  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  const handleDelete = async (id: string) => {
      setDeleting(id);
      try {
          // 1. First, delete all uploads associated with this request (Manual Cascade)
          // We must do this because we didn't set ON DELETE CASCADE in the migration
          const { data: linkedUploads } = await supabase
              .from('uploads')
              .select('id')
              .eq('request_id', id);

          if (linkedUploads && linkedUploads.length > 0) {
              // Delete from storage first
              const ids = linkedUploads.map(u => u.id);
              // For chunked uploads, we need to remove the folder. 
              // Supabase storage remove() might expect full paths to files, not folders.
              // But if we delete the database rows, the cleanup script might handle it later?
              // No, let's try to remove what we can.
              // Actually, deleting the DB row is the most important part to satisfy the constraint.
              
              const { error: deleteUploadsError } = await supabase
                  .from('uploads')
                  .delete()
                  .eq('request_id', id);
              
              if (deleteUploadsError) throw deleteUploadsError;
              
              // Optionally: trigger async cleanup or try to delete from storage
              // We can fire-and-forget storage deletion for these IDs
              ids.forEach(async (fileId) => {
                  await deleteFileFromStorage(supabase, fileId);
              });
          }

          // 2. Delete the request
          const { error } = await supabase.from('file_requests').delete().eq('id', id);
          if (error) throw error;
          
          toast.success("Request deleted");
          router.refresh();
      } catch (e) {
          console.error(e);
          toast.error("Failed to delete request");
      } finally {
          setDeleting(null);
      }
  };

  const copyLink = (id: string) => {
      const url = `${window.location.origin}/r/${id}`;
      navigator.clipboard.writeText(url);
      toast.success("Request link copied!");
  };

  const handleOpenInbox = (req: FileRequest) => {
      setSelectedRequest(req);
      setInboxPassword("");
      setUnlockedFiles(null);
      setUnlockedKey(null);
  };

  const unlockInbox = async () => {
      if (!selectedRequest || !inboxPassword) return;
      setUnlocking(true);
      try {
          // 1. Derive Key from Password
          const wrappingKey = await EncryptionService.deriveKeyFromPassword(inboxPassword, selectedRequest.salt);
          
          // 2. Decrypt Private Key
          const privateKeyJwkStr = await EncryptionService.decryptText(
              selectedRequest.encrypted_private_key,
              selectedRequest.encrypted_private_key_iv,
              wrappingKey
          );

          // 3. Import Private Key
          const privateKey = await EncryptionService.importPrivateKey(privateKeyJwkStr);
          setUnlockedKey(privateKey);

          // 4. Fetch Files
          const { data: uploads, error } = await supabase
            .from('uploads')
            .select('*')
            .eq('request_id', selectedRequest.id)
            .eq('file_deleted', false);
          
          if (error) throw error;

          // 5. Decrypt File Metadata (Filename)
          // To decrypt filename, we need the AES key.
          // The AES key is encrypted with the Public Key.
          // So we need to decrypt the AES key with our Private Key first.
          
          const decryptedFiles = await Promise.all(uploads.map(async (file: FileUpload) => {
              try {
                  // The AES Key is stored in `encrypted_key` (reused column)
                  // It was wrapped using RSA-OAEP
                  if (!file.encrypted_key) return { ...file, name: "Unknown (No Key)" } as DecryptedFile;

                  const aesKey = await EncryptionService.unwrapKeyWithPrivateKey(
                      file.encrypted_key,
                      privateKey
                  );

                  // Now decrypt metadata
                  const name = await EncryptionService.decryptText(
                      file.filename_encrypted,
                      file.filename_iv,
                      aesKey
                  );
                  
                  return { ...file, name, aesKey } as DecryptedFile;
              } catch (e) {
                  // console.error("Failed to decrypt file metadata", e);
                  return { ...file, name: "Decryption Failed" } as DecryptedFile;
              }
          }));

          setUnlockedFiles(decryptedFiles);

      } catch (e) {
          console.error(e);
          toast.error("Incorrect password or corruption.");
      } finally {
          setUnlocking(false);
      }
  };

  const downloadFile = async (file: DecryptedFile) => {
      if (!file.aesKey) return;
      
      const toastId = toast.loading("Preparing secure download...");
      try {
          // Export the AES key to base64
          const keyBase64 = await EncryptionService.exportKey(file.aesKey);
          
          // Open the download page with the key in the hash
          // The DownloadView component will handle the chunked download and decryption
          window.open(`/d/${file.id}#${keyBase64}`, '_blank');
          
          toast.dismiss(toastId);
      } catch (e) {
          console.error(e);
          toast.error("Download failed");
          toast.dismiss(toastId);
      }
  };

  if (requests.length === 0) {
      return (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
             <p>No active file requests.</p>
             <p className="text-sm mt-2">Create a request to receive files securely.</p>
          </div>
      );
  }

  return (
    <div className="space-y-4">
        {requests.map(req => (
            <div key={req.id} className="bg-card p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
                <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        {req.name}
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold",
                             req.status === 'active' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"
                        )}>
                            {req.status}
                        </span>
                    </h3>
                    {req.description && <p className="text-sm text-muted-foreground">{req.description}</p>}
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1 font-mono">
                        <span>ID: {req.id.slice(0, 8)}...</span>
                        {req.expiration_time && (
                            <span title={new Date(req.expiration_time).toLocaleString()}>
                                Expires: {new Date(req.expiration_time).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyLink(req.id)}>
                        <Copy className="mr-2" /> Copy Link
                    </Button>
                    <Button variant="default" size="sm" onClick={() => handleOpenInbox(req)}>
                        <FolderOpen className="mr-2" /> Inbox
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(req.id)} disabled={deleting === req.id}>
                        <Trash className="text-muted-foreground hover:text-destructive" />
                    </Button>
                </div>
            </div>
        ))}

        <Dialog open={!!selectedRequest} onOpenChange={(o) => !o && setSelectedRequest(null)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{selectedRequest?.name} - Inbox</DialogTitle>
                    <DialogDescription>
                        Enter your Access Password to decrypt and view the received files.
                    </DialogDescription>
                </DialogHeader>
                
                {!unlockedFiles ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Access Password</Label>
                            <Input 
                                type="password" 
                                value={inboxPassword} 
                                onChange={e => setInboxPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && unlockInbox()}
                            />
                        </div>
                        <Button className="w-full" onClick={unlockInbox} disabled={unlocking || !inboxPassword}>
                            {unlocking ? "Decrypting Keys..." : "Unlock Inbox"}
                        </Button>
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b">
                            <h4 className="font-semibold">{unlockedFiles.length} Files Received</h4>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {unlockedFiles.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">No files received yet.</p>
                            )}
                            {unlockedFiles.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileIconDisplay category={file.file_type} className="w-5 h-5 text-primary" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={() => downloadFile(file)}>
                                        <ArrowRight className="mr-2" /> Open
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}

