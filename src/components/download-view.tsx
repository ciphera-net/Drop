"use client";
import { useEffect, useState } from "react";
import { EncryptionService } from "@/lib/encryption";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { Progress } from "./ui/progress";
import { LockKey, DownloadSimple, File as FileIcon, WarningCircle } from "@phosphor-icons/react";
import { Input } from "./ui/input";

export function DownloadView({ file }: { file: any }) {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [decryptedName, setDecryptedName] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [password, setPassword] = useState("");
  const [downloadCount, setDownloadCount] = useState(file.download_count);

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
    setProgress(10);
    
    try {
       // Increment download count via API
       const incRes = await fetch('/api/increment', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: file.id })
       });

       const data = await incRes.json();

       if (!incRes.ok) {
           if (incRes.status === 403 && data.error === 'Download limit reached') {
               setDownloadCount(file.download_limit || downloadCount + 1);
               setError(data.error);
               setDownloading(false);
               return;
           }
           throw new Error(data.error || "Failed to start download");
       }

       if (data.new_count) {
           setDownloadCount(data.new_count);
       }

       const supabase = createClient();
       const { data: fileData, error } = await supabase.storage
          .from('drop-files')
          .download(file.id);

       if (error) throw error;
       setProgress(60);

       const iv = EncryptionService.base64ToIv(file.iv);
       const decryptedBlob = await EncryptionService.decryptFile(fileData, key, iv);
       setProgress(90);

       const url = URL.createObjectURL(decryptedBlob);
       const a = document.createElement('a');
       a.href = url;
       a.download = decryptedName || 'downloaded-file';
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
       setProgress(100);

       // Check if this download reached the limit and trigger cleanup
       const currentCount = data.new_count || downloadCount + 1;
       if (file.download_limit !== null && currentCount >= file.download_limit) {
           // We don't await this to avoid blocking the UI, but we trigger it
           fetch('/api/cleanup', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ id: file.id })
           }).catch(err => console.error('Failed to trigger cleanup:', err));
       }

    } catch (e: any) {
       console.error(e);
       setError(e.message || "Download failed. Please try again.");
    } finally {
       setDownloading(false);
    }
  };

  const isLimitReached = file.download_limit !== null && downloadCount >= file.download_limit;

  if (!key) {
      return (
          <Card className="w-full max-w-md shadow-xl">
             <CardHeader className="text-center">
                 <div className="mx-auto bg-orange-100 p-3 rounded-full mb-2">
                     <LockKey className="w-8 h-8 text-orange-600" weight="fill" />
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
              <div className="flex items-center p-4 bg-secondary/50 rounded-xl border border-border/50">
                <FileIcon className="w-10 h-10 text-primary mr-4" weight="duotone" />
                <div className="flex-1 min-w-0">
                   <p className="font-semibold text-gray-900 truncate">{decryptedName}</p>
                   <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              {downloading ? (
                  <div className="space-y-2">
                      <Progress value={progress} className="h-2" />
                      <p className="text-center text-xs text-muted-foreground">
                          {progress < 60 ? 'Downloading encrypted file...' : 'Decrypting locally...'}
                      </p>
                  </div>
              ) : isLimitReached ? (
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">Download Limit Reached</p>
                      <p className="text-xs text-muted-foreground mt-1">This file can no longer be downloaded.</p>
                  </div>
              ) : (
                  <div className="space-y-4">
                      {error && (
                          <div className="flex items-center text-sm text-destructive justify-center p-3 bg-red-50 rounded-lg border border-red-100">
                              <WarningCircle className="mr-2 h-5 w-5 shrink-0" weight="fill" /> 
                              <span>{error}</span>
                          </div>
                      )}
                      <Button className="w-full" size="lg" onClick={handleDownload}>
                          <DownloadSimple className="mr-2 text-xl" weight="bold" /> Download File
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

