"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, LockKey } from "@phosphor-icons/react";
import { EncryptionService } from "@/lib/encryption";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateRequestDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [enableNotification, setEnableNotification] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  // Pre-fill email from user session
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) {
            setNotifyEmail(user.email);
        }
    });
  }, [supabase]);

  const handleCreate = async () => {
    if (!name || !password) return;
    
    setLoading(true);
    try {
        // 1. Generate RSA Key Pair
        const keyPair = await EncryptionService.generateKeyPair();
        const publicKeyJwk = await EncryptionService.exportPublicKey(keyPair.publicKey);
        const privateKeyJwk = await EncryptionService.exportPrivateKey(keyPair.privateKey);

        // 2. Encrypt Private Key with Password
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const saltBase64 = EncryptionService.ivToBase64(salt);
        
        const wrappingKey = await EncryptionService.deriveKeyFromPassword(password, saltBase64);
        const { encrypted: encryptedPrivateKey, iv: encryptedPrivateKeyIv } = await EncryptionService.encryptText(privateKeyJwk, wrappingKey);

        // 3. Insert into DB
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase.from('file_requests').insert({
            user_id: user.id,
            name,
            description,
            public_key: publicKeyJwk,
            encrypted_private_key: encryptedPrivateKey,
            encrypted_private_key_iv: encryptedPrivateKeyIv,
            salt: saltBase64,
            status: 'active',
            notify_email: enableNotification ? notifyEmail : null
        });

        if (error) throw error;

        toast.success("File Request created successfully!");
        setOpen(false);
        router.refresh();
        setName("");
        setDescription("");
        setPassword("");
        setEnableNotification(false);

    } catch (e) {
        console.error(e);
        toast.error("Failed to create file request.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-orange-500/20 shadow-lg">
            <Plus className="mr-2" weight="bold" /> New Request
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create File Request</DialogTitle>
          <DialogDescription>
            Create a secure link to receive files from others. You need a password to unlock the received files later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Request Name</Label>
                <Input placeholder="e.g. Tax Documents 2024" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea placeholder="Instructions for the uploader..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <LockKey weight="fill" className="text-orange-500" />
                    Access Password
                </Label>
                <Input 
                    type="password" 
                    placeholder="Password to unlock received files" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                />
                <p className="text-[10px] text-muted-foreground">
                    Do not lose this password. We cannot recover it.
                </p>
            </div>
            
            <div className="pt-2 border-t border-dashed">
                <div className="flex items-center space-x-2 mb-2">
                    <input 
                        type="checkbox" 
                        id="notify" 
                        checked={enableNotification}
                        onChange={(e) => setEnableNotification(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <Label htmlFor="notify" className="cursor-pointer font-normal text-sm">Notify me when files are uploaded</Label>
                </div>
                {enableNotification && (
                    <div className="pl-6 animate-in slide-in-from-top-1 fade-in">
                        <Input 
                            type="email" 
                            placeholder="your@email.com" 
                            value={notifyEmail}
                            onChange={(e) => setNotifyEmail(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                )}
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !name || !password}>
                {loading ? "Creating..." : "Create Request"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

