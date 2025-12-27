"use client";

import { User } from "@supabase/supabase-js";
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import JSZip from "jszip";
import { EncryptionService } from "@/lib/encryption";
import { createClient } from "@/utils/supabase/client";
import { generateMagicWords } from "@/utils/magic-words";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "./ui/dialog";
import { CloudArrowUp, Copy, Check, X, EnvelopeSimple, LockKey, Warning, QrCode, NotePencil, Fire, Infinity as InfinityIcon, Share, CaretDown, CaretUp, Bell, ShieldCheck, Sliders } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";
import { uploadEncryptedFile } from "@/utils/upload-manager";
import { toast } from "sonner";
import { getFileCategory, calculateFileHash } from "@/utils/file-helpers";
import { FileIconDisplay } from "@/components/file-icon-display";
import { Fingerprint } from "@phosphor-icons/react";
import { SimpleLoginButton } from "@/components/simple-login-button";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

import { UserProfile } from "@/types";

export function UploadBox() {
  const [file, setFile] = useState<File | null>(null);
  const [zipping, setZipping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState<{ speed: number; eta: number } | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [expiration, setExpiration] = useState("1h");
  const [maxDownloads, setMaxDownloads] = useState<number | null>(1);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [uploadedFileHash, setUploadedFileHash] = useState<string | null>(null);
  const [showHash, setShowHash] = useState(false);

  const [recipientHasKey, setRecipientHasKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);

  const [notifyOnDownload, setNotifyOnDownload] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      setCanShare(true);
    }
  }, []);

  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user?.email) {
            setSenderEmail(user.email);
        }

        if (user) {
             const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();
             
             if (profile) {
                 setUserProfile(profile);
                 
                 // Apply defaults
                 if (profile.default_expiration) {
                     setExpiration(profile.default_expiration);
                 }
                 
                 if (profile.default_auto_delete) {
                     setMaxDownloads(1);
                 } else if (profile.default_download_limit === 0) {
                     // 0 means Unlimited in new schema
                     setMaxDownloads(null);
                 } else if (profile.default_download_limit !== null && profile.default_download_limit !== undefined) {
                     setMaxDownloads(profile.default_download_limit);
                 } else {
                     // If user has no preferences set (or old default NULL), default to Burn (1).
                     setMaxDownloads(1);
                 }
             }
        }
    };
    fetchUserAndProfile();
  }, [supabase]);

  useEffect(() => {
    // Only enforce guest limit if no user
    if (!user && maxDownloads === null) {
      setMaxDownloads(1);
    }
  }, [user, maxDownloads]);

  useEffect(() => {
    const timer = setTimeout(async () => {
        if (!email || !email.includes('@')) {
            setRecipientHasKey(false);
            return;
        }

        setCheckingKey(true);
        try {
            const res = await fetch('/api/check-wkd', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                const data = await res.json();
                setRecipientHasKey(data.hasKey);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCheckingKey(false);
        }
    }, 600);

    return () => clearTimeout(timer);
  }, [email]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNativeShare = async () => {
    if (!shareLink) return;
    try {
      await navigator.share({
        title: 'Secure File Transfer',
        text: 'Download this file securely:',
        url: shareLink
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
    }
  };

  const handleSendEmail = async () => {
    if (!email || !shareLink) return;
    setSendingEmail(true);
    try {
        const res = await fetch('/api/send-email', {
            method: 'POST',
            body: JSON.stringify({ email, link: shareLink }),
        });
        if (res.ok) {
            toast.success("Email sent successfully!");
            setIsEmailDialogOpen(false);
            setEmail("");
        } else {
             toast.error("Failed to send email.");
        }
    } catch(e) {
        console.error(e);
        toast.error("An error occurred while sending the email.");
    } finally {
        setSendingEmail(false);
    }
  }

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    if (fileList.length === 0) return;

    // Reset state for new upload
    setShareLink(null);
    setPassword("");
    setMessage("");
    setProgress(0);
    setUploading(false);
    setUploadStats(null);

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

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current += 1;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounter.current = 0;
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
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

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        processFiles(e.clipboardData.files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleUpload = async () => {
    if (!file) return;

    if (notifyOnDownload && !senderEmail) {
        toast.error("Please enter your email to receive download notifications.");
        return;
    }

    setUploading(true);
    setProgress(1); // Start
    setUploadStats(null);

    try {
      // 1. Generate Key
      const key = await EncryptionService.generateKey();
      
      // Start Hashing in Parallel
      const hashPromise = calculateFileHash(file);

      // 2. Encrypt Metadata
      const { encrypted: encFilename, iv: filenameIv } = await EncryptionService.encryptText(file.name, key);
      const { encrypted: encMime, iv: mimeIv } = await EncryptionService.encryptText(file.type || 'application/octet-stream', key);

      // Encrypt Message
      let encMessage = null;
      let messageIv = null;
      if (message) {
          const { encrypted, iv } = await EncryptionService.encryptText(message, key);
          encMessage = encrypted;
          messageIv = iv;
      }

      // Handle Password Protection
      let encryptedKey = null;
      let encryptedKeyIv = null;
      let passwordSalt = null;

      if (password) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        passwordSalt = EncryptionService.ivToBase64(salt);
        const passwordKey = await EncryptionService.deriveKeyFromPassword(password, passwordSalt);
        const encryptedKeyData = await EncryptionService.encryptKey(key, passwordKey);
        encryptedKey = encryptedKeyData.encryptedKey;
        encryptedKeyIv = encryptedKeyData.iv;
      }

      // 3. Upload Storage (Chunked & Resumable)
      const fileId = crypto.randomUUID();
      const storagePath = `${fileId}`;

      await uploadEncryptedFile(
          file, 
          key, 
          'drop-files', 
          storagePath, 
          (stats) => {
              setProgress(stats.percent);
              setUploadStats({ speed: stats.speed, eta: stats.eta });
          }
      );

      // Wait for hash to complete
      const fileHash = await hashPromise;
      setUploadedFileHash(fileHash);

      // 4. DB Insert
      const now = new Date();
      let expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1d
      if (expiration === '1h') expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
      if (expiration === '7d') expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (expiration === 'never') expiresAt = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years

      const generatedMagicWords = generateMagicWords();
      const { data: { user } } = await supabase.auth.getUser();

      const fileType = getFileCategory(file);

      const { error: dbError } = await supabase.from('uploads').insert({
        id: fileId,
        user_id: user?.id,
        filename_encrypted: encFilename,
        filename_iv: filenameIv,
        mime_type_encrypted: encMime,
        mime_type_iv: mimeIv,
        file_type: fileType,
        size: file.size, // Original size
        iv: "CHUNKED_PARALLEL_V1", // Marker for parallel chunked file format
        expiration_time: expiresAt.toISOString(),
        is_password_protected: !!password,
        password_salt: passwordSalt,
        encrypted_key: encryptedKey,
        encrypted_key_iv: encryptedKeyIv,
        message_encrypted: encMessage,
        message_iv: messageIv,
        magic_words: generatedMagicWords,
        download_limit: maxDownloads,
        file_hash: fileHash,
        notify_on_download: notifyOnDownload,
        sender_email: notifyOnDownload ? senderEmail : null
      });

      if (dbError) throw dbError;

      setProgress(100);

      // 5. Generate Link
      const keyBase64 = await EncryptionService.exportKey(key);
      const origin = window.location.origin;
      const linkId = generatedMagicWords || fileId;

      if (password) {
        setShareLink(`${origin}/d/${linkId}`);
      } else {
        setShareLink(`${origin}/d/${linkId}#${keyBase64}`);
      }

    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Upload failed. Please check your connection.";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadStats(null);
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success("Link copied to clipboard");
    }
  };

  const reset = () => {
    setFile(null);
    setShareLink(null);
    setUploadedFileHash(null);
    setShowHash(false);
    setPassword("");
    setMessage("");
    
    // Reset defaults based on profile
    if (userProfile) {
         if (userProfile.default_expiration) setExpiration(userProfile.default_expiration);
         else setExpiration("1h");

         if (userProfile.default_auto_delete) {
             setMaxDownloads(1);
         } else if (userProfile.default_download_limit !== null && userProfile.default_download_limit !== undefined) {
             setMaxDownloads(userProfile.default_download_limit);
         } else {
             setMaxDownloads(null);
         }
    } else {
        setExpiration("1h");
        setMaxDownloads(1);
    }
    
    setProgress(0);
    setUploading(false);
    setUploadStats(null);
    setNotifyOnDownload(false);
    // Keep email if it was auto-filled from auth
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user?.email) {
             setSenderEmail("");
        }
    });
  };

  const formatSpeed = (bytesPerSec: number) => {
      if (bytesPerSec === 0) return '0 KB/s';
      const mb = bytesPerSec / (1024 * 1024);
      if (mb >= 1) return `${mb.toFixed(1)} MB/s`;
      return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  };

  const formatTime = (seconds: number) => {
      if (!isFinite(seconds) || seconds < 0) return '...';
      if (seconds < 60) return `${seconds}s`;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
  };

  const overlay = isDragging && typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col items-center justify-center p-12 border-4 border-dashed border-primary rounded-3xl bg-background/50 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="bg-primary/10 p-6 rounded-full mb-6">
           <CloudArrowUp className="w-16 h-16 text-primary animate-bounce" weight="fill" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Drop files anywhere</h2>
        <p className="text-lg text-muted-foreground mt-2">Upload your files securely</p>
      </div>
    </div>,
    document.body
  ) : null;

  if (shareLink) {
    return (
      <>
      {overlay}
      <Card className="w-full max-w-md mx-auto animate-in fade-in zoom-in duration-300">
        <CardHeader>
          <div className="mx-auto bg-green-100 dark:bg-green-900/20 p-3 rounded-full mb-2">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-center text-primary">Ready to Share</CardTitle>
          <CardDescription className="text-center">
            Your file has been encrypted and uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-900 dark:text-amber-100">
            <div className="flex gap-3">
              <Warning className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" weight="fill" />
              <div className="text-sm space-y-1">
                <p className="font-semibold">Save this link immediately!</p>
                <p>For security reasons, this URL is shown only once. You will not be able to see it again after you leave this page.</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Input readOnly value={shareLink} className="font-mono text-xs" />
            <Button size="icon" onClick={copyLink} title="Copy Link">
              <Copy weight="bold" />
            </Button>
            {canShare && (
                <Button size="icon" onClick={handleNativeShare} title="Share">
                  <Share weight="bold" />
                </Button>
            )}
          </div>
          
          {uploadedFileHash && (
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
                            This SHA-256 hash allows the recipient to mathematically verify that the file has not been modified.
                        </p>
                       <code className="text-[10px] text-muted-foreground font-mono break-all block leading-tight bg-muted/50 p-2 rounded">
                          {uploadedFileHash}
                       </code>
                    </div>
                )}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
              <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                      <EnvelopeSimple className="mr-2" /> Email Link
                  </Button>
              </DialogTrigger>
              <DialogContent>
                   <DialogHeader>
                       <DialogTitle>Send via Email</DialogTitle>
                       <DialogDescription>
                           We will send the secure link to the recipient using our transactional API.
                       </DialogDescription>
                   </DialogHeader>
                   <div className="space-y-4 pt-4">
                       <div className="space-y-2">
                          <Label>Recipient Email</Label>
                          <div className="relative">
                            <Input 
                                placeholder="recipient@example.com" 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={recipientHasKey ? "border-green-500 focus-visible:ring-green-500 pr-8" : ""}
                            />
                             {checkingKey && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                             )}
                          </div>
                          
                          {recipientHasKey && (
                              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded-md text-xs animate-in fade-in slide-in-from-top-1">
                                  <ShieldCheck weight="fill" className="w-4 h-4 flex-shrink-0" />
                                  <span className="font-medium">End-to-end encryption enabled (Proton / PGP compatible).</span>
                              </div>
                          )}
                       </div>
                       <DialogFooter>
                           <Button onClick={handleSendEmail} disabled={sendingEmail || !email}>
                               {sendingEmail ? "Sending..." : "Send Email"}
                           </Button>
                       </DialogFooter>
                   </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <QrCode className="mr-2" /> Show QR
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                  <DialogTitle className="text-center">Scan to Download</DialogTitle>
                  <DialogDescription className="text-center">
                    Scan this QR code with your mobile device to download the file.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-6 bg-white dark:bg-neutral-900 rounded-xl border-2 border-primary/10 dark:border-primary/20 shadow-[0_0_15px_rgba(253,94,15,0.1)]">
                  <QRCodeSVG 
                    value={shareLink} 
                    size={180} 
                    level="H" 
                    includeMargin={true} 
                    fgColor="#111827"
                    className="rounded-lg"
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <p className="text-xs text-muted-foreground text-center">
             This link contains the encryption key. Don&apos;t share it publicly.
          </p>
        </CardContent>
        <CardFooter>
           <Button onClick={reset} variant="outline" className="w-full">Send Another</Button>
        </CardFooter>
      </Card>
      </>
    )
  }

  return (
    <>
    {overlay}
    <Card className="w-full max-w-md mx-auto shadow-xl shadow-orange-500/5 dark:shadow-none border-orange-100 dark:border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
           Secure Transfer
        </CardTitle>
        <CardDescription className="text-center">End-to-end encrypted file sharing.</CardDescription>
      </CardHeader>
      <CardContent>
        {zipping ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
             <p className="text-muted-foreground font-medium">Zipping files...</p>
          </div>
        ) : !file ? (
          <div 
            className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-10 text-center cursor-pointer hover:bg-orange-50/50 dark:hover:bg-primary/5 hover:border-orange-200 dark:hover:border-primary/20 transition-all duration-300 group"
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
             <div className="bg-orange-50 dark:bg-primary/10 group-hover:bg-orange-100 dark:group-hover:bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110">
                <CloudArrowUp className="w-8 h-8 text-primary animate-pulse" weight="fill" style={{ animationDuration: '3s' }} />
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
                 <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress < 100 ? 'Uploading & Encrypting...' : 'Finalizing...'}</span>
                    <div className="flex gap-3">
                        {uploadStats && (
                            <>
                                <span className="font-mono text-primary">{formatSpeed(uploadStats.speed)}</span>
                                <span className="text-muted-foreground/70">•</span>
                                <span>{formatTime(uploadStats.eta)} left</span>
                            </>
                        )}
                        {!uploadStats && <span>{progress}%</span>}
                    </div>
                 </div>
               </div>
             )}

             {!uploading && (
               <div className="space-y-4">
                 <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Transfer Settings</span>
                 </div>
                 
                 <div className="space-y-3 p-3 border rounded-lg bg-secondary/20 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">Expires In</Label>
                        <div className="flex space-x-1">
                           {['1h', '1d', '7d', 'never'].map((opt) => (
                             <button 
                               key={opt}
                               onClick={() => setExpiration(opt)}
                               className={cn(
                                 "flex-1 py-1.5 text-xs rounded-md border transition-all duration-200 font-medium capitalize",
                                 expiration === opt 
                                   ? "bg-primary text-white border-primary shadow-sm" 
                                   : "bg-background text-muted-foreground border-border hover:border-primary/30"
                               )}
                             >
                               {opt === 'never' ? 'Never' : opt}
                             </button>
                           ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">Max Downloads</Label>
                        {user ? (
                        <div className="flex space-x-1">
                           {[10, 100, null].map((opt) => {
                             const isInfinite = opt === null;
                             const isLocked = isInfinite && !user;
                             const isBurnMode = maxDownloads === 1;
                             
                             return (
                             <button 
                               key={String(opt)}
                               onClick={() => {
                                 if (isLocked) {
                                   toast.error("Log in to create unlimited download links", {
                                     action: {
                                       label: "Log in",
                                       onClick: () => window.location.href = "/login"
                                     }
                                   });
                                   return;
                                 }
                                 setMaxDownloads(opt);
                               }}
                               disabled={isBurnMode}
                               className={cn(
                                 "flex-1 py-1.5 text-xs rounded-md border transition-all duration-200 font-medium flex items-center justify-center gap-1",
                                 maxDownloads === opt 
                                   ? "bg-primary text-white border-primary shadow-sm" 
                                   : "bg-background text-muted-foreground border-border hover:border-primary/30",
                                 isBurnMode && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground",
                                 isLocked && !isBurnMode && "opacity-60 cursor-not-allowed bg-muted/50 text-muted-foreground"
                               )}
                             >
                               {isInfinite ? <InfinityIcon weight="bold" className="w-4 h-4" /> : opt}
                               {isLocked && <LockKey weight="fill" className="w-3 h-3" />}
                             </button>
                           )})}
                        </div>
                        ) : (
                          <div className="h-8 flex items-center justify-center border border-dashed border-border rounded-md bg-muted/30 text-xs text-muted-foreground gap-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => window.location.href = "/login"}>
                             <LockKey className="w-3 h-3" />
                             <span>Log in to set limit</span>
                          </div>
                        )}
                      </div>
                      <div className="col-span-2">
                        <button
                          onClick={() => {
                            if (maxDownloads === 1) {
                              // If currently 1 (Burn), toggle OFF.
                              // If user is logged in, default to Infinite (null).
                              // If user is NOT logged in, default to 10.
                              setMaxDownloads(user ? null : 10);
                            } else {
                              // If currently NOT 1, toggle ON (set to 1).
                              setMaxDownloads(1);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                            maxDownloads === 1 
                              ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" 
                              : "bg-background border-border hover:border-primary/30"
                          )}
                        >
                           <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-full transition-colors",
                                maxDownloads === 1 ? "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" : "bg-muted text-muted-foreground"
                              )}>
                                 <Fire weight="fill" className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                 <p className={cn("text-xs font-semibold", maxDownloads === 1 ? "text-orange-700 dark:text-orange-300" : "text-foreground")}>Burn after download</p>
                                 <p className="text-[10px] text-muted-foreground">File is deleted immediately after 1 download</p>
                              </div>
                           </div>
                           
                           {/* Custom Switch Implementation */}
                           <div className={cn(
                             "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                             maxDownloads === 1 ? "bg-orange-500" : "bg-input"
                           )}>
                             <span className={cn(
                               "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                               maxDownloads === 1 ? "translate-x-4" : "translate-x-0"
                             )} />
                           </div>
                        </button>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-dashed border-border/60">
                         <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
                         >
                            <div className="flex items-center gap-2">
                                <Sliders weight="fill" className="w-4 h-4" />
                                <span>Advanced Options</span>
                            </div>
                            {showAdvanced ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
                         </button>
                      </div>

                      {showAdvanced && (
                          <div className="col-span-2 space-y-4 animate-in slide-in-from-top-2 pt-1">
                              <div>
                                 <Label className="text-xs mb-1.5 flex items-center gap-1 text-muted-foreground">
                                    <LockKey weight="fill" className="text-orange-500"/> Password Protection (Optional)
                                 </Label>
                                 <Input 
                                    type="password" 
                                    placeholder="Enter a password to encrypt this file" 
                                    className="h-8 text-xs bg-background"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                 />
                                 <PasswordStrengthMeter password={password} className="mt-2" />
                              </div>

                              <div>
                                 <Label className="text-xs mb-1.5 flex items-center gap-1 text-muted-foreground">
                                    <NotePencil weight="fill" className="text-blue-500"/> Encrypted Note (Optional)
                                 </Label>
                                 <Textarea 
                                    placeholder="Add a secure message for the recipient..." 
                                    className="min-h-[60px] text-xs bg-background resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                 />
                              </div>

                              <div>
                                 <div className="flex items-center space-x-2 mb-2">
                                     <button
                                        type="button"
                                        onClick={() => setNotifyOnDownload(!notifyOnDownload)}
                                        className={cn(
                                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                            notifyOnDownload ? "bg-primary" : "bg-input"
                                        )}
                                     >
                                        <span className={cn(
                                            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                                            notifyOnDownload ? "translate-x-4" : "translate-x-0"
                                        )} />
                                     </button>
                                     <Label 
                                        onClick={() => setNotifyOnDownload(!notifyOnDownload)}
                                        className="text-xs flex items-center gap-1 cursor-pointer select-none"
                                     >
                                        <Bell weight="fill" className={cn("w-4 h-4", notifyOnDownload ? "text-primary" : "text-muted-foreground")} />
                                        <span>Notify me when downloaded</span>
                                     </Label>
                                 </div>
                                 
                                 {notifyOnDownload && (
                                     <div className="animate-in slide-in-from-top-1 fade-in duration-200 space-y-2">
                                         <div className="flex gap-2">
                                             <Input 
                                                type="email" 
                                                placeholder="your-email@example.com" 
                                                className="h-8 text-xs bg-background flex-1"
                                                value={senderEmail || ""}
                                                onChange={(e) => setSenderEmail(e.target.value)}
                                             />
                                             <SimpleLoginButton 
                                                onAliasGenerated={setSenderEmail} 
                                                className="h-8 px-2 text-xs"
                                             />
                                         </div>
                                         <p className="text-[10px] text-muted-foreground ml-1">
                                             We&apos;ll send you an email when someone downloads this file.
                                         </p>
                                     </div>
                                 )}
                              </div>
                          </div>
                      )}
                    </div>
                 </div>
               </div>
             )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {file && !uploading && !shareLink && (
           <Button className="w-full font-semibold shadow-orange-200 shadow-md" size="lg" onClick={handleUpload}>
             Create Secure Link
           </Button>
        )}
      </CardFooter>
      </Card>
    </>
  );
}
