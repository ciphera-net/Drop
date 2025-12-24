"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, LockKey, Bell } from "@phosphor-icons/react";
import { EncryptionService } from "@/lib/encryption";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createFileRequest } from "@/utils/request-helper";

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
        await createFileRequest({
            name,
            description,
            password,
            notifyEmail: enableNotification ? notifyEmail : undefined,
            supabase
        });

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
            
            <div className="pt-2 border-t border-dashed border-border/60">
                <div className="flex items-center space-x-2 mb-2">
                    <button
                        type="button"
                        onClick={() => setEnableNotification(!enableNotification)}
                        className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            enableNotification ? "bg-primary" : "bg-input"
                        )}
                    >
                        <span className={cn(
                            "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                            enableNotification ? "translate-x-4" : "translate-x-0"
                        )} />
                    </button>
                    <Label 
                        onClick={() => setEnableNotification(!enableNotification)}
                        className="text-xs flex items-center gap-1 cursor-pointer select-none"
                    >
                        <Bell weight="fill" className={cn("w-4 h-4", enableNotification ? "text-primary" : "text-muted-foreground")} />
                        <span>Notify me when files are uploaded</span>
                    </Label>
                </div>
                {enableNotification && (
                    <div className="animate-in slide-in-from-top-1 fade-in duration-200">
                        <Input 
                            type="email" 
                            placeholder="your-email@example.com" 
                            value={notifyEmail}
                            onChange={(e) => setNotifyEmail(e.target.value)}
                            className="h-8 text-xs bg-background"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                            We&apos;ll send you an email when someone uploads files to this request.
                        </p>
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

