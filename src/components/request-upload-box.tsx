"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";
import { EncryptionService } from "@/lib/encryption";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { Progress } from "./ui/progress";
import { CloudArrowUp, Check, X, LockKey } from "@phosphor-icons/react";
import { toast } from "sonner";
import { getFileCategory, calculateFileHash } from "@/utils/file-helpers";
import { FileIconDisplay } from "@/components/file-icon-display";
import { uploadEncryptedFile } from "@/utils/upload-manager";

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

export function RequestUploadBox({ request }: { request: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [zipping, setZipping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    if (fileList.length === 0) return;

    // Reset state
    setFile(null);
    setCompleted(false);
    setProgress(0);

    let totalSize = 0;
    for (let i = 0; i < fileList.length; i++) {
      totalSize += fileList[i].size;
    }

    if (totalSize > MAX_FILE_SIZE) {
      toast.error("Total file size exceeds the 5GB limit.");
      return;
    }

    if (fileList.length === 1) {
      setFile(fileList[0]);
      return;
    }

    setZipping(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < fileList.length; i++) {
        zip.file(fileList[i].name, fileList[i]);
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      const zipFile = new File([content], `archive-${Date.now()}.zip`, { type: "application/zip" });
      
      if (zipFile.size > MAX_FILE_SIZE) {
        toast.error("Resulting archive exceeds the 5GB limit.");
        return;
      }
      
      setFile(zipFile);
    } catch (e) {
      console.error("Failed to zip files:", e);
      toast.error("Failed to process multiple files.");
    } finally {
      setZipping(false);
    }
  }, []);

  // Drag and Drop handlers (Reuse from UploadBox)
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current += 1;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) setIsDragging(false);
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounter.current = 0;
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [processFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(1);

    try {
      // 1. Generate AES Key for the file
      const aesKey = await EncryptionService.generateKey();
      
      // 2. Import Public Key
      const publicKey = await EncryptionService.importPublicKey(request.public_key);

      // 3. Encrypt AES Key with Public Key (RSA Wrap)
      const encryptedAesKeyBase64 = await EncryptionService.wrapKeyWithPublicKey(aesKey, publicKey);
      
      // 4. Encrypt Metadata (with AES Key)
      const { encrypted: encFilename, iv: filenameIv } = await EncryptionService.encryptText(file.name, aesKey);
      const { encrypted: encMime, iv: mimeIv } = await EncryptionService.encryptText(file.type || 'application/octet-stream', aesKey);

      // 5. Upload File (Chunked)
      const fileId = crypto.randomUUID();
      const storagePath = `${fileId}`; // Bucket is drop-files.

      // Start hashing
      const hashPromise = calculateFileHash(file);

      await uploadEncryptedFile(
          file, 
          aesKey, 
          'drop-files', 
          storagePath, 
          (stats) => {
              setProgress(stats.percent);
          }
      );

      const fileHash = await hashPromise;

      // 6. DB Insert
      // We set expiration to match Request policy or default (e.g., 30 days)
      // Since it's a request, it might stick around until the requester deletes it?
      // Or we give it 7 days.
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days default for requests

      const { error: dbError } = await supabase.from('uploads').insert({
        id: fileId,
        // user_id is NULL for anonymous uploader
        request_id: request.id, 
        filename_encrypted: encFilename,
        filename_iv: filenameIv,
        mime_type_encrypted: encMime,
        mime_type_iv: mimeIv,
        file_type: getFileCategory(file),
        size: file.size,
        iv: "CHUNKED_PARALLEL_V1",
        expiration_time: expiresAt.toISOString(),
        encrypted_key: encryptedAesKeyBase64, // Storing RSA-Wrapped AES Key here
        // No password protection for requests (Access is controlled by Request Owner)
        is_password_protected: false, 
        file_hash: fileHash
      });

      if (dbError) throw dbError;

      // Trigger notification email (fire and forget)
      fetch('/api/notify-upload', {
        method: 'POST',
        body: JSON.stringify({
            requestId: request.id,
            fileName: file.name
        })
      }).catch(console.error);

      setProgress(100);
      setCompleted(true);
      toast.success("File uploaded securely!");

    } catch (e) {
      console.error(e);
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (completed) {
      return (
        <Card className="w-full max-w-md mx-auto animate-in fade-in zoom-in duration-300">
            <CardHeader>
                <div className="mx-auto bg-green-100 dark:bg-green-900/20 p-3 rounded-full mb-2">
                    <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-center text-primary">Upload Complete</CardTitle>
                <CardDescription className="text-center">
                    Your file has been securely encrypted and sent to the requester.
                </CardDescription>
            </CardHeader>
            <CardFooter>
                <Button onClick={() => { setFile(null); setCompleted(false); }} variant="outline" className="w-full">
                    Send Another File
                </Button>
            </CardFooter>
        </Card>
      );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
           <LockKey className="text-primary" weight="fill" />
           Secure Upload
        </CardTitle>
        <CardDescription className="text-center">
            Files are encrypted on your device before uploading. Only the requester can decrypt them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {zipping ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
             <p className="text-muted-foreground font-medium">Zipping files...</p>
          </div>
        ) : !file ? (
          <div 
            className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-10 text-center cursor-pointer hover:bg-secondary/50 transition-all duration-300 group"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
             <input 
               type="file" 
               multiple
               className="hidden" 
               ref={fileInputRef} 
               onChange={handleFileSelect} 
             />
             <div className="bg-secondary group-hover:bg-secondary/80 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <CloudArrowUp className="w-8 h-8 text-primary" weight="fill" />
             </div>
             <p className="font-medium text-foreground">Click to upload or drag and drop</p>
             <p className="text-sm text-muted-foreground mt-1">Single file or multiple files (auto-zipped) up to 5GB</p>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="flex items-center p-3 bg-secondary/50 rounded-lg border border-border/50">
                <FileIconDisplay category={getFileCategory(file)} className="w-8 h-8 text-primary mr-3" weight="duotone" />
                <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                   <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFile(null)} disabled={uploading} className="text-muted-foreground hover:text-destructive">
                   <X weight="bold" />
                </Button>
             </div>
             
             {uploading && (
               <div className="space-y-2">
                 <Progress value={progress} className="h-2" />
                 <p className="text-xs text-center text-muted-foreground">
                    {progress < 100 ? 'Encrypting & Uploading...' : 'Finalizing...'} {progress}%
                 </p>
               </div>
             )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {file && !uploading && (
           <Button className="w-full font-semibold" size="lg" onClick={handleUpload}>
             Send Securely
           </Button>
        )}
      </CardFooter>
    </Card>
  );
}

