"use client";
import { useEffect, useState, useCallback } from "react";
import { EncryptionService } from "@/lib/encryption";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { Progress } from "./ui/progress";
import { LockKey, DownloadSimple, WarningCircle, NotePencil, Fire, Fingerprint, CaretDown, CaretUp, Timer, Eye, X } from "@phosphor-icons/react";
import { FileIconDisplay } from "@/components/file-icon-display";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { FileUpload } from "@/types";

export function DownloadView({ file }: { file: FileUpload }) {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [decryptedName, setDecryptedName] = useState<string | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);
  const [decryptedMimeType, setDecryptedMimeType] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [manualKey, setManualKey] = useState("");
  const [password, setPassword] = useState("");
  const [showLimitReachedMessage, setShowLimitReachedMessage] = useState(false);
  const [showHash, setShowHash] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpiredLocal, setIsExpiredLocal] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expirationDate = new Date(file.expiration_time);
      const now = new Date();
      const difference = expirationDate.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpiredLocal(true);
        setTimeLeft("Expired");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      let formatted = "";
      if (days > 0) formatted += `${days}d `;
      if (hours > 0 || days > 0) formatted += `${hours}h `;
      formatted += `${minutes}m ${seconds}s`;

      setTimeLeft(formatted);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [file.expiration_time]);

  const attemptDecryptMetadata = useCallback(async (base64Key: string) => {
     try {
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
                // console.error("Failed to decrypt message", e);
            }
        }

        // Decrypt mime type if present
        if (file.mime_type_encrypted && file.mime_type_iv) {
            try {
                const mime = await EncryptionService.decryptText(
                    file.mime_type_encrypted,
                    file.mime_type_iv,
                    k
                );
                setDecryptedMimeType(mime);
            } catch (e) {
                // console.error("Failed to decrypt mime type", e);
            }
        }

        setKey(k);
        setDecryptedName(name);
     } catch (e) {
        // console.error("Invalid key", e);
        toast.error("Decryption failed. The key might be invalid.");
     }
  }, [file]);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash && !file.is_password_protected) {
       attemptDecryptMetadata(hash);
    }
  }, [file.is_password_protected, attemptDecryptMetadata]);

  const attemptUnlockWithPassword = async () => {
    try {
        if (!password) return;

        if (!file.password_salt || !file.encrypted_key || !file.encrypted_key_iv) {
             throw new Error("Missing encryption parameters");
        }

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
                // console.error("Failed to decrypt message", e);
            }
        }

        // Decrypt mime type if present
        if (file.mime_type_encrypted && file.mime_type_iv) {
            try {
                const mime = await EncryptionService.decryptText(
                    file.mime_type_encrypted,
                    file.mime_type_iv,
                    k
                );
                setDecryptedMimeType(mime);
            } catch (e) {
                // console.error("Failed to decrypt mime type", e);
            }
        }

        setKey(k);
        setDecryptedName(name);
    } catch (e: unknown) {
        // If it's a crypto operation error, it usually means the password (and thus the key) is wrong.
        // We suppress the console error to avoid alarming developers/users, as this is a handled "business logic" failure.
        if (e instanceof Error && e.name !== 'OperationError') {
             console.error("Unlock failed", e);
        }
        toast.error("Incorrect password. Please try again.");
    }
  };

  const fetchAndDecryptFile = async (): Promise<{ blob: Blob, limitReached: boolean }> => {
       if (!key) throw new Error("No key available");
       
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
       const signedUrls: string[] = incData.signedUrls || [];

       const supabase = createClient();
       let decryptedBlob: Blob;

       if (file.iv === "CHUNKED_V1") {
           // --- Legacy TUS Chunked Download Logic ---
           // We keep this for backward compatibility with the previous implementation
           let downloadUrl = signedUrls.length > 0 ? signedUrls[0] : null;

           if (!downloadUrl) {
                const { data: signedData, error: urlError } = await supabase.storage
                    .from('drop-files')
                    .createSignedUrl(file.id, 60 * 60);
                
                if (urlError) throw urlError;
                if (!signedData?.signedUrl) throw new Error("Failed to get download URL");
                downloadUrl = signedData.signedUrl;
           }

           decryptedBlob = await downloadStream(downloadUrl, file.size, key);

       } else if (file.iv === "CHUNKED_PARALLEL_V1") {
           // --- Parallel Chunked Download Logic ---
           const CHUNK_SIZE = EncryptionService.CHUNK_SIZE;
           const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
           const decryptedChunks: BlobPart[] = [];
           let totalBytesDecrypted = 0;

           // Helper to fetch chunk with fallback
           const fetchChunk = async (path: string, index: number) => {
               try {
                   // Priority 1: Use Signed URL from API if available
                   if (signedUrls[index]) {
                       const res = await fetch(signedUrls[index]);
                       if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
                       return await res.blob();
                   }

                   // Priority 2: Direct Download (will fail if RLS blocks it)
                   const { data, error } = await supabase.storage
                        .from('drop-files')
                        .download(path);
                   
                   if (error) {
                       throw error;
                   }
                   
                   return data;
               } catch (e) {
                   // Priority 3: Client-side Signed URL (Fallback)
                   // Only works if the user has permission (which they might not if limit reached)
                   console.warn(`Direct/Signed download failed for chunk ${index}, trying client-side sign`, e);
                   try {
                       const { data: signed, error: signError } = await supabase.storage
                            .from('drop-files')
                            .createSignedUrl(path, 60);
                       
                       if (signError || !signed?.signedUrl) throw signError || new Error("Sign failed");

                       const res = await fetch(signed.signedUrl);
                       if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
                       return await res.blob();
                   } catch (finalError) {
                       console.error(`Final fallback failed for chunk ${index}`, finalError);
                       throw finalError;
                   }
               }
           };

           // We process chunks sequentially to avoid flooding the network/server
           // but we could parallelize this slightly if needed.
           for (let i = 0; i < totalChunks; i++) {
                const chunkPath = `${file.id}/${i}`;
                const chunkBlob = await fetchChunk(chunkPath, i);
                
                // Decrypt
                const buffer = await chunkBlob.arrayBuffer();
                const decryptedChunk = await EncryptionService.decryptChunk(buffer, key);
                decryptedChunks.push(decryptedChunk);

                totalBytesDecrypted += decryptedChunk.byteLength;
                const percent = Math.round((totalBytesDecrypted / file.size) * 100);
                setProgress(percent);
           }
           
           decryptedBlob = new Blob(decryptedChunks, { type: decryptedMimeType || 'application/octet-stream' });

       } else {
           // --- Legacy Single File Download Logic ---
           setProgress(10);
           
           let fileData: Blob | null = null;
           
           // Priority 1: Signed URL
           if (signedUrls.length > 0) {
                const res = await fetch(signedUrls[0]);
                if (res.ok) {
                    fileData = await res.blob();
                }
           }
           
           if (!fileData) {
               // Priority 2: Direct Download
               const { data, error } = await supabase.storage
                  .from('drop-files')
                  .download(file.id);

               if (error) {
                   // Fallback: Client-side sign
                   const { data: signed, error: signError } = await supabase.storage
                        .from('drop-files')
                        .createSignedUrl(file.id, 60);
                   if (!signError && signed?.signedUrl) {
                        const res = await fetch(signed.signedUrl);
                        if (res.ok) fileData = await res.blob();
                   }
                   
                   if (!fileData) throw error;
               } else {
                   fileData = data;
               }
           }
           
           if (!fileData) throw new Error("Failed to download file data");

           setProgress(60);

           const iv = EncryptionService.base64ToIv(file.iv);
           decryptedBlob = await EncryptionService.decryptFile(fileData, key, iv);
       }
       
       // Force correct mime type on the blob if we have it
       if (decryptedMimeType && decryptedBlob.type !== decryptedMimeType) {
           decryptedBlob = new Blob([decryptedBlob], { type: decryptedMimeType });
       }
       
       setProgress(100);

       if (isLimitReached) {
           setShowLimitReachedMessage(true);
           // Trigger final cleanup to remove storage
           await fetch('/api/cleanup', {
               method: 'POST',
               body: JSON.stringify({ id: file.id }),
               headers: { 'Content-Type': 'application/json' }
           });
       }

       return { blob: decryptedBlob, limitReached: isLimitReached };
  };

  const saveBlob = (blob: Blob, filename: string, limitReached: boolean = false) => {
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = filename;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
       
       // If strict limit is reached, wipe memory to prevent re-saving
       if (limitReached || showLimitReachedMessage) {
           setTimeout(() => {
               setFileBlob(null);
               setPreviewUrl(null);
               toast.success("File saved. Self-destruct complete.");
           }, 1000); // Small delay to allow download to start
       }
  };

  const handleDownload = async () => {
    if (!key) return;
    
    // If we already have the blob (from preview), just save it
    if (fileBlob) {
        saveBlob(fileBlob, decryptedName || 'downloaded-file', showLimitReachedMessage);
        return;
    }

    setDownloading(true);
    setProgress(1);
    
    try {
       const { blob, limitReached } = await fetchAndDecryptFile();
       setFileBlob(blob);
       saveBlob(blob, decryptedName || 'downloaded-file', limitReached);
    } catch (e: unknown) {
       console.error(e);
       const errorMessage = e instanceof Error ? e.message : "Download failed. Please try again.";
       toast.error(errorMessage);
    } finally {
       setDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (!key) return;
    
    // If we already have the blob, just show it
    if (fileBlob) {
        const url = URL.createObjectURL(fileBlob);
        setPreviewUrl(url);
        return;
    }

    setDownloading(true);
    setProgress(1);
    
    try {
        const { blob } = await fetchAndDecryptFile();
        setFileBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
    } catch (e: unknown) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Preview failed. Please try again.";
        toast.error(errorMessage);
    } finally {
        setDownloading(false);
    }
  };
  
  useEffect(() => {
      return () => {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
      };
  }, [previewUrl]);

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

  const isPreviewSupported = decryptedMimeType && (
      decryptedMimeType.startsWith('image/') || 
      decryptedMimeType === 'application/pdf' || 
      decryptedMimeType.startsWith('text/')
  );

  if (isExpiredLocal) {
    return (
        <Card className="w-full max-w-md shadow-xl animate-in fade-in duration-300">
             <CardContent className="pt-6 text-center">
                 <div className="mx-auto bg-muted p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                    <Timer className="w-8 h-8 text-muted-foreground" weight="duotone" />
                 </div>
                 <h1 className="text-2xl font-bold text-foreground mb-2">Time Expired</h1>
                 <p className="text-muted-foreground mb-6">This file has expired and is no longer available.</p>
                 <Button variant="outline" onClick={() => window.location.reload()}>
                    Refresh Page
                 </Button>
             </CardContent>
        </Card>
    )
  }

  if (!key) {
      return (
          <Card className="w-full max-w-md shadow-xl">
             <CardHeader className="text-center">
                 <div className="mx-auto bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full mb-2">
                     <LockKey className="w-8 h-8 text-orange-600 dark:text-orange-400" weight="fill" />
                 </div>
                 <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1">
                        <Timer className="w-3 h-3" weight="bold" />
                        {timeLeft}
                    </span>
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
              <div className="flex justify-center mt-2">
                <div className="flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                    <Timer className="w-3.5 h-3.5" weight="bold" />
                    <span>Expires in: <span className="font-mono">{timeLeft}</span></span>
                </div>
              </div>
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
                <FileIconDisplay category={file.file_type} className="w-10 h-10 text-primary mr-4" weight="duotone" />
                <div className="flex-1 min-w-0">
                   <p className="font-semibold text-foreground truncate">{decryptedName}</p>
                   <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              {file.file_hash && (
                <div className="border border-border rounded-lg overflow-hidden">
                    <button 
                      onClick={() => setShowHash(!showHash)}
                      className="w-full flex items-center justify-between p-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs font-medium text-muted-foreground"
                    >
                       <div className="flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-primary" weight="fill" />
                          <span>Verify File Integrity (Optional)</span>
                       </div>
                       {showHash ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
                    </button>
                    
                    {showHash && (
                        <div className="p-3 bg-card border-t border-border animate-in slide-in-from-top-1">
                            <p className="text-[10px] text-muted-foreground mb-2">
                                Compare this hash with the one provided by the sender to verify the file hasn't been tampered with.
                            </p>
                           <code className="text-[10px] text-muted-foreground font-mono break-all block leading-tight bg-muted/50 p-2 rounded">
                              {file.file_hash}
                           </code>
                        </div>
                    )}
                </div>
              )}

              {decryptedMessage && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-400">
                          <NotePencil weight="fill" className="w-4 h-4" />
                          <span className="text-xs font-semibold uppercase tracking-wider">Secure Note</span>
                      </div>
                      <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">{decryptedMessage}</p>
                  </div>
              )}

              {previewUrl && (
                  <div className="border rounded-xl overflow-hidden bg-background relative animate-in zoom-in-95 duration-200 mb-4">
                      <div className="absolute top-2 right-2 z-10">
                          <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full opacity-70 hover:opacity-100" onClick={() => setPreviewUrl(null)}>
                              <X weight="bold" />
                          </Button>
                      </div>
                      {decryptedMimeType?.startsWith('image/') && (
                          <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[500px] object-contain bg-neutral-100 dark:bg-neutral-900" />
                      )}
                      {decryptedMimeType === 'application/pdf' && (
                          <iframe src={previewUrl} className="w-full h-[500px]" title="PDF Preview" sandbox="allow-scripts"></iframe>
                      )}
                      {decryptedMimeType?.startsWith('text/') && (
                          <iframe src={previewUrl} className="w-full h-[400px] bg-white dark:bg-neutral-900" title="Text Preview" sandbox=""></iframe>
                      )}
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
                  <div className="space-y-3">
                      <div className={isPreviewSupported ? "grid grid-cols-2 gap-3" : "space-y-4"}>
                           {isPreviewSupported && (
                               <Button variant="outline" className="w-full" size="lg" onClick={handlePreview} disabled={showLimitReachedMessage && !fileBlob}>
                                   <Eye className="mr-2 text-lg" weight="bold" /> Preview
                               </Button>
                           )}
                           <Button className={isPreviewSupported && !showLimitReachedMessage ? "w-full" : "w-full"} size="lg" onClick={handleDownload} disabled={showLimitReachedMessage && !fileBlob}>
                               <DownloadSimple className="mr-2 text-xl" weight="bold" /> 
                               {showLimitReachedMessage && !fileBlob ? "File Removed" : (fileBlob ? "Save File" : "Download File")}
                           </Button>
                      </div>
                      
                      {file.download_limit !== null && isPreviewSupported && !showLimitReachedMessage && !fileBlob && (
                          <p className="text-[10px] text-center text-muted-foreground">
                              Previewing counts as a download.
                          </p>
                      )}
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
