"use client";

import { useState, useRef, useCallback } from "react";
import { EncryptionService } from "@/lib/encryption";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "./ui/dialog";
import { CloudArrowUp, File as FileIcon, Copy, Check, X, EnvelopeSimple, LockKey, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function UploadBox() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [expiration, setExpiration] = useState("1h");
  const [downloadLimit, setDownloadLimit] = useState("1");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendEmail = async () => {
    if (!email || !shareLink) return;
    setSendingEmail(true);
    try {
        const res = await fetch('/api/send-email', {
            method: 'POST',
            body: JSON.stringify({ email, link: shareLink }),
        });
        if (res.ok) {
            setEmailSent(true);
            setTimeout(() => setEmailSent(false), 3000); // Reset after 3s
        } else {
             // console.error("Failed to send");
        }
    } catch(e) {
        console.error(e);
    } finally {
        setSendingEmail(false);
    }
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("File size exceeds the 5GB limit.");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.size > MAX_FILE_SIZE) {
        setError("File size exceeds the 5GB limit.");
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(5);

    try {
      // 1. Generate Key
      const key = await EncryptionService.generateKey();
      
      // 2. Encrypt File
      const { encryptedBlob, iv } = await EncryptionService.encryptFile(file, key);
      setProgress(30);

      // 3. Encrypt Metadata
      const { encrypted: encFilename, iv: filenameIv } = await EncryptionService.encryptText(file.name, key);
      const { encrypted: encMime, iv: mimeIv } = await EncryptionService.encryptText(file.type || 'application/octet-stream', key);

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

      // 4. Upload Storage
      const fileId = crypto.randomUUID();
      const storagePath = `${fileId}`;

      const { error: uploadError } = await supabase.storage
        .from('drop-files')
        .upload(storagePath, encryptedBlob, {
          contentType: 'application/octet-stream',
          upsert: false
        });

      if (uploadError) throw uploadError;
      setProgress(70);

      // 5. DB Insert
      const now = new Date();
      let expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1d
      if (expiration === '1h') expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
      if (expiration === '7d') expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: { user } } = await supabase.auth.getUser();

      const { error: dbError } = await supabase.from('uploads').insert({
        id: fileId,
        user_id: user?.id,
        filename_encrypted: encFilename,
        filename_iv: filenameIv,
        mime_type_encrypted: encMime,
        mime_type_iv: mimeIv,
        size: file.size,
        iv: EncryptionService.ivToBase64(iv),
        expiration_time: expiresAt.toISOString(),
        download_limit: parseInt(downloadLimit),
        download_count: 0,
        is_password_protected: !!password,
        password_salt: passwordSalt,
        encrypted_key: encryptedKey,
        encrypted_key_iv: encryptedKeyIv
      });

      if (dbError) throw dbError;

      setProgress(100);

      // 6. Generate Link
      const keyBase64 = await EncryptionService.exportKey(key);
      const origin = window.location.origin;
      
      if (password) {
        setShareLink(`${origin}/d/${fileId}`);
      } else {
        setShareLink(`${origin}/d/${fileId}#${keyBase64}`);
      }

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Upload failed. Please check your connection.");
    } finally {
      setUploading(false);
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setFile(null);
    setShareLink(null);
    setPassword("");
    setProgress(0);
    setUploading(false);
  };

  if (shareLink) {
    return (
      <Card className="w-full max-w-md mx-auto animate-in fade-in zoom-in duration-300">
        <CardHeader>
          <div className="mx-auto bg-green-100 p-3 rounded-full mb-2">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-center text-primary">Ready to Share</CardTitle>
          <CardDescription className="text-center">
            Your file has been encrypted and uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
            <div className="flex gap-3">
              <Warning className="w-5 h-5 flex-shrink-0 text-amber-600" weight="fill" />
              <div className="text-sm space-y-1">
                <p className="font-semibold">Save this link immediately!</p>
                <p>For security reasons, this URL is shown only once. You will not be able to see it again after you leave this page.</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Input readOnly value={shareLink} className="font-mono text-xs" />
            <Button size="icon" onClick={copyLink} className={copied ? "bg-green-600 hover:bg-green-700" : ""}>
              {copied ? <Check weight="bold" /> : <Copy weight="bold" />}
            </Button>
          </div>
          
          <Dialog>
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
                   {!emailSent ? (
                       <div className="space-y-4 pt-4">
                           <div className="space-y-2">
                              <Label>Recipient Email</Label>
                              <Input 
                                  placeholder="recipient@example.com" 
                                  type="email"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                              />
                           </div>
                           <DialogFooter>
                               <Button onClick={handleSendEmail} disabled={sendingEmail || !email}>
                                   {sendingEmail ? "Sending..." : "Send Email"}
                               </Button>
                           </DialogFooter>
                       </div>
                   ) : (
                       <div className="py-6 text-center text-green-600 animate-in zoom-in">
                           <Check className="w-12 h-12 mx-auto mb-2" weight="fill" />
                           <p className="font-medium">Email sent successfully!</p>
                       </div>
                   )}
              </DialogContent>
          </Dialog>

          <p className="text-xs text-muted-foreground text-center">
             This link contains the encryption key. Don't share it publicly.
          </p>
        </CardContent>
        <CardFooter>
           <Button onClick={reset} variant="outline" className="w-full">Send Another</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl shadow-orange-500/5 border-orange-100">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
           Secure Transfer
        </CardTitle>
        <CardDescription className="text-center">End-to-end encrypted file sharing.</CardDescription>
      </CardHeader>
      <CardContent>
        {!file ? (
          <div 
            className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-10 text-center cursor-pointer hover:bg-orange-50/50 hover:border-orange-200 transition-all duration-300 group"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
             <input 
               type="file" 
               className="hidden" 
               ref={fileInputRef} 
               onChange={handleFileSelect} 
             />
             <div className="bg-orange-50 group-hover:bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <CloudArrowUp className="w-8 h-8 text-primary" weight="fill" />
             </div>
             <p className="font-medium text-gray-900">Click to upload or drag and drop</p>
             <p className="text-sm text-muted-foreground mt-1">Up to 5GB</p>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="flex items-center p-3 bg-secondary/50 rounded-lg border border-border/50">
                <FileIcon className="w-8 h-8 text-primary mr-3" weight="duotone" />
                <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium truncate text-gray-900">{file.name}</p>
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
                    <span>{progress < 40 ? 'Encrypting...' : 'Uploading...'}</span>
                    <span>{progress}%</span>
                 </div>
               </div>
             )}

             {!uploading && (
               <div className="space-y-4">
                 <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Transfer Settings</span>
                 </div>
                 
                 <div className="space-y-3 p-3 border rounded-lg bg-secondary/20 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block text-muted-foreground">Expires In</Label>
                        <div className="flex space-x-1">
                           {['1h', '1d', '7d'].map((opt) => (
                             <button 
                               key={opt}
                               onClick={() => setExpiration(opt)}
                               className={cn(
                                 "flex-1 py-1.5 text-xs rounded-md border transition-all duration-200 font-medium",
                                 expiration === opt 
                                   ? "bg-primary text-white border-primary shadow-sm" 
                                   : "bg-background text-gray-600 border-border hover:border-primary/30"
                               )}
                             >
                               {opt}
                             </button>
                           ))}
                        </div>
                      </div>
                      <div>
                         <Label className="text-xs mb-1.5 block text-muted-foreground">Download Limit</Label>
                         <select 
                           className="w-full text-xs h-[28px] rounded-md border border-border px-2 bg-background focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                           value={downloadLimit}
                           onChange={(e) => setDownloadLimit(e.target.value)}
                         >
                            <option value="1">1 Download</option>
                            <option value="10">10 Downloads</option>
                            <option value="100">100 Downloads</option>
                         </select>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-dashed border-border/60">
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
                      </div>
                    </div>
                 </div>
               </div>
             )}
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center animate-in fade-in">
            <X className="mr-2 flex-shrink-0" /> 
            <span>{error}</span>
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
  );
}

