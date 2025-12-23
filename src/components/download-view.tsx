"use client";
import { useEffect, useState } from "react";
import { EncryptionService } from "@/lib/encryption";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { Progress } from "./ui/progress";
import { LockKey, DownloadSimple, File as FileIcon, WarningCircle, NotePencil, Fire } from "@phosphor-icons/react";
import { Input } from "./ui/input";

export function DownloadView({ file }: { file: any }) {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [decryptedName, setDecryptedName] = useState<string | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [password, setPassword] = useState("");
  const [showLimitReachedMessage, setShowLimitReachedMessage] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash && !file.is_password_protected) {
       attemptDecryptMetadata(hash);
    }
  }, [file.is_password_protected]);

  const attemptDecryptMetadata = async (base64Key: string) => {
     try {
        setError(null);
        const k = await EncryptionService.importKey(base64Key);
        
        // Decrypt filename
        const name = await EncryptionService.decryptText(
            file.filename_encrypted, 
            file.filename_iv, 
            k
        );

        // Decrypt message if present
        if (file.message_encrypted && file.message_iv) {
            try {
                const msg = await EncryptionService.decryptText(
                    file.message_encrypted,
                    file.message_iv,
                    k
                );
                setDecryptedMessage(msg);
            } catch (e) {
                console.error("Failed to decrypt message", e);
            }
        }

        setKey(k);
        setDecryptedName(name);
     } catch (e) {
        console.error("Invalid key", e);
        setError("Decryption failed. The key might be invalid.");
     }
  };

  const attemptUnlockWithPassword = async () => {
    try {
        setError(null);
        if (!password) return;

        const passwordKey = await EncryptionService.deriveKeyFromPassword(password, file.password_salt);
        const k = await EncryptionService.decryptKey(file.encrypted_key, file.encrypted_key_iv, passwordKey);

        // Decrypt filename
        const name = await EncryptionService.decryptText(
            file.filename_encrypted, 
            file.filename_iv, 
            k
        );

        // Decrypt message if present
        if (file.message_encrypted && file.message_iv) {
            try {
                const msg = await EncryptionService.decryptText(
                    file.message_encrypted,
                    file.message_iv,
                    k
                );
                setDecryptedMessage(msg);
            } catch (e) {
                console.error("Failed to decrypt message", e);
            }
        }

        setKey(k);
        setDecryptedName(name);
    } catch (e: any) {
        // If it's a crypto operation error, it usually means the password (and thus the key) is wrong.
        // We suppress the console error to avoid alarming developers/users, as this is a handled "business logic" failure.
        if (e.name !== 'OperationError') {
             console.error("Unlock failed", e);
        }
        setError("Incorrect password. Please try again.");
    }
  };

  const handleDownload = async () => {
    if (!key) return;
    setError(null);
    setDownloading(true);
    setProgress(1);
    
    try {
       // Increment download count first
       const incRes = await fetch('/api/increment', {
            method: 'POST',
            body: JSON.stringify({ id: file.id }),
            headers: { 'Content-Type': 'application/json' }
       });
        
       if (!incRes.ok) {
            const err = await incRes.json();
            // If the error indicates limit reached, show specific UI state
            if (incRes.status === 410 || err.limitReached) {
                setShowLimitReachedMessage(true);
                throw new Error("This file is no longer available.");
            }
            throw new Error(err.error || "Failed to initiate download");
       }

       const incData = await incRes.json();
       const isLimitReached = incData.limitReached;

       const supabase = createClient();
       let decryptedBlob: Blob;

       if (file.iv === "CHUNKED_V1") {
           // --- Legacy TUS Chunked Download Logic ---
           // We keep this for backward compatibility with the previous implementation
           const { data: signedData, error: urlError } = await supabase.storage
              .from('drop-files')
              .createSignedUrl(file.id, 60 * 60);
           
           if (urlError) throw urlError;
           if (!signedData?.signedUrl) throw new Error("Failed to get download URL");

           decryptedBlob = await downloadStream(signedData.signedUrl, file.size, key);

       } else if (file.iv === "CHUNKED_PARALLEL_V1") {
           // --- Parallel Chunked Download Logic ---
           const CHUNK_SIZE = EncryptionService.CHUNK_SIZE;
           const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
           const decryptedChunks: BlobPart[] = [];
           let totalBytesDecrypted = 0;

           for (let i = 0; i < totalChunks; i++) {
                // Fetch each chunk
                const chunkPath = `${file.id}/${i}`;
                const { data: chunkData, error: chunkError } = await supabase.storage
                    .from('drop-files')
                    .download(chunkPath);
                
                if (chunkError) throw chunkError;
                
                // Decrypt
                const buffer = await chunkData.arrayBuffer();
                const decryptedChunk = await EncryptionService.decryptChunk(buffer, key);
                decryptedChunks.push(decryptedChunk);

                totalBytesDecrypted += decryptedChunk.byteLength;
                const percent = Math.round((totalBytesDecrypted / file.size) * 100);
                setProgress(percent);
           }
           
           decryptedBlob = new Blob(decryptedChunks);

       } else {
           // --- Legacy Single File Download Logic ---
           setProgress(10);
           const { data: fileData, error } = await supabase.storage
              .from('drop-files')
              .download(file.id);

           if (error) throw error;
           setProgress(60);

           const iv = EncryptionService.base64ToIv(file.iv);
           decryptedBlob = await EncryptionService.decryptFile(fileData, key, iv);
       }
       
       setProgress(100);

       // Trigger browser download
       const url = URL.createObjectURL(decryptedBlob);
       const a = document.createElement('a');
       a.href = url;
       a.download = decryptedName || 'downloaded-file';
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);

       if (isLimitReached) {
           setShowLimitReachedMessage(true);
           // Trigger final cleanup to remove storage
           await fetch('/api/cleanup', {
               method: 'POST',
               body: JSON.stringify({ id: file.id }),
               headers: { 'Content-Type': 'application/json' }
           });
       }

    } catch (e: any) {
       console.error(e);
       setError(e.message || "Download failed. Please try again.");
    } finally {
       setDownloading(false);
    }
  };

  // Helper for TUS stream
  async function downloadStream(url: string, originalSize: number, key: CryptoKey): Promise<Blob> {
        const response = await fetch(url);
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Stream not supported by browser");

        const decryptedChunks: BlobPart[] = [];
        const CHUNK_SIZE = EncryptionService.CHUNK_SIZE;
        const OVERHEAD = EncryptionService.ENCRYPTED_CHUNK_OVERHEAD;
        
        let remainingOriginalSize = originalSize;
        let streamBuffer = new Uint8Array(0);
        let processedBytes = 0;
        
        while (remainingOriginalSize > 0) {
            const currentPlainSize = Math.min(remainingOriginalSize, CHUNK_SIZE);
            const currentEncryptedSize = currentPlainSize + OVERHEAD;
            
            while (streamBuffer.length < currentEncryptedSize) {
                const { done, value } = await reader.read();
                if (done) break;
                const newBuffer = new Uint8Array(streamBuffer.length + value.length);
                newBuffer.set(streamBuffer);
                newBuffer.set(value, streamBuffer.length);
                streamBuffer = newBuffer;
            }
            
            if (streamBuffer.length < currentEncryptedSize) {
                // If this happens at the very end and we have a few bytes, it might be padding issues?
                // But for now strict check.
                 if (streamBuffer.length === 0 && remainingOriginalSize > 0) throw new Error("Unexpected end of stream");
                 // If we have some data but not enough, that's an error.
                 throw new Error("Corrupted stream");
            }
            
            const chunkData = streamBuffer.slice(0, currentEncryptedSize);
            streamBuffer = streamBuffer.slice(currentEncryptedSize);
            
            const decrypted = await EncryptionService.decryptChunk(chunkData.buffer, key);
            decryptedChunks.push(decrypted);
            
            remainingOriginalSize -= currentPlainSize;
            processedBytes += currentPlainSize;
            
            const percent = Math.round((processedBytes / originalSize) * 100);
            setProgress(percent);
        }
        return new Blob(decryptedChunks);
  }

  if (!key) {
      return (
          <Card className="w-full max-w-md shadow-xl">
             <CardHeader className="text-center">
                 <div className="mx-auto bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full mb-2">
                     <LockKey className="w-8 h-8 text-orange-600 dark:text-orange-400" weight="fill" />
                 </div>
                 <CardTitle>{file.is_password_protected ? "Password Protected" : "Encrypted File"}</CardTitle>
                 <CardDescription>
                     {file.is_password_protected 
                        ? "This file is protected with a password. Enter it below to unlock."
                        : "This file is end-to-end encrypted. We need the key to unlock it."
                     }
                 </CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
                 <div className="text-sm text-center text-muted-foreground">
                    {!file.is_password_protected && "If you used the link provided, the key should have been applied automatically."}
                 </div>
                 <div className="space-y-2">
                    {file.is_password_protected ? (
                        <>
                            <Input 
                                type="password"
                                placeholder="Enter password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && attemptUnlockWithPassword()}
                            />
                            <Button className="w-full" onClick={attemptUnlockWithPassword}>
                                Unlock File
                            </Button>
                        </>
                    ) : (
                        <>
                            <Input 
                                placeholder="Paste decryption key here (if missing)" 
                                value={manualKey}
                                onChange={(e) => setManualKey(e.target.value)}
                            />
                            <Button className="w-full" onClick={() => attemptDecryptMetadata(manualKey)}>
                                Unlock File
                            </Button>
                        </>
                    )}
                 </div>
                 {error && (
                     <div className="flex items-center text-sm text-destructive justify-center mt-2">
                         <WarningCircle className="mr-1" /> {error}
                     </div>
                 )}
             </CardContent>
          </Card>
      )
  }

  return (
      <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-300">
          <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                  Ready to Download
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
              {file.download_limit === 1 && !showLimitReachedMessage && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg flex items-center gap-3 text-orange-800 dark:text-orange-200 animate-pulse">
                      <Fire className="w-5 h-5 flex-shrink-0 text-orange-600 dark:text-orange-400" weight="fill" />
                      <p className="text-sm font-medium">
                          Self-destruct mode: File will be permanently deleted after this download.
                      </p>
                  </div>
              )}

              {showLimitReachedMessage && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3 text-amber-900 dark:text-amber-100 animate-in slide-in-from-top-2">
                      <WarningCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" weight="fill" />
                      <div>
                          <p className="font-semibold">Last Download</p>
                          <p className="text-sm mt-1">
                              The download limit for this file has been reached. It has now been removed and is no longer accessible.
                          </p>
                      </div>
                  </div>
              )}

              <div className="flex items-center p-4 bg-secondary/50 rounded-xl border border-border/50">
                <FileIcon className="w-10 h-10 text-primary mr-4" weight="duotone" />
                <div className="flex-1 min-w-0">
                   <p className="font-semibold text-foreground truncate">{decryptedName}</p>
                   <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              {decryptedMessage && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-400">
                          <NotePencil weight="fill" className="w-4 h-4" />
                          <span className="text-xs font-semibold uppercase tracking-wider">Secure Note</span>
                      </div>
                      <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">{decryptedMessage}</p>
                  </div>
              )}

              {downloading ? (
                  <div className="space-y-2">
                      <Progress value={progress} className="h-2" />
                      <p className="text-center text-xs text-muted-foreground">
                          {progress < 100 ? 'Downloading & Decrypting...' : 'Finalizing...'}
                      </p>
                  </div>
              ) : (
                  <div className="space-y-4">
                      {error && (
                          <div className="flex items-center text-sm text-destructive justify-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50">
                              <WarningCircle className="mr-2 h-5 w-5 shrink-0" weight="fill" /> 
                              <span>{error}</span>
                          </div>
                      )}
                      <Button className="w-full" size="lg" onClick={handleDownload} disabled={showLimitReachedMessage}>
                          <DownloadSimple className="mr-2 text-xl" weight="bold" /> {showLimitReachedMessage ? "File Removed" : "Download File"}
                      </Button>
                  </div>
              )}
          </CardContent>
          <CardFooter className="justify-center">
              <p className="text-xs text-muted-foreground text-center">
                  Verified by Ciphera. Zero-knowledge encryption.
              </p>
          </CardFooter>
      </Card>
  )
}
