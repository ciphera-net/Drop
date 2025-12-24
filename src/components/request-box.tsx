"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { LockKey, Bell, Check, Copy, Share, Warning, HandPalm } from "@phosphor-icons/react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createFileRequest } from "@/utils/request-helper";

export function RequestBox() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [enableNotification, setEnableNotification] = useState(false);
  const [expiration, setExpiration] = useState("7d");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      setCanShare(true);
    }
  }, []);

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

    let expirationTime: Date | null = null;
    const now = new Date();
    if (expiration === '1d') expirationTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (expiration === '7d') expirationTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (expiration === '30d') expirationTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    // 'Never' stays null

    try {
        const result = await createFileRequest({
            name,
            description,
            password,
            notifyEmail: enableNotification ? notifyEmail : undefined,
            expirationTime,
            supabase
        });

        const origin = window.location.origin;
        setShareLink(`${origin}/r/${result.id}`);
        toast.success("File Request created successfully!");
        
        // Don't clear inputs yet, as we are in success state
    } catch (e) {
        console.error(e);
        toast.error("Failed to create file request.");
    } finally {
        setLoading(false);
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success("Link copied to clipboard");
    }
  };

  const handleNativeShare = async () => {
    if (!shareLink) return;
    try {
      await navigator.share({
        title: `Upload files to ${name}`,
        text: 'Please upload the requested files securely using this link:',
        url: shareLink
      });
    } catch (err) {
      // Ignore abort errors
    }
  };

  const reset = () => {
    setShareLink(null);
    setName("");
    setDescription("");
    setPassword("");
    setEnableNotification(false);
    setExpiration("7d");
    // Keep email populated
  };

  if (shareLink) {
      return (
        <Card className="w-full max-w-md mx-auto animate-in fade-in zoom-in duration-300">
          <CardHeader>
            <div className="mx-auto bg-green-100 dark:bg-green-900/20 p-3 rounded-full mb-2">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-center text-primary">Request Active</CardTitle>
            <CardDescription className="text-center">
              Your secure file request has been created.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-secondary/30 rounded-lg p-4 text-sm text-muted-foreground text-center">
                <p>Anyone with this link can upload files securely to your account.</p>
                <p className="mt-2 font-medium text-foreground">"{name}"</p>
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
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-900 dark:text-amber-100 text-xs">
              <div className="flex gap-2">
                <Warning className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" weight="fill" />
                <span>
                   Remember your password: <strong className="font-mono ml-1">{password}</strong>
                   <br/>
                   You will need it to unlock received files.
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
             <Button onClick={reset} variant="outline" className="w-full">Create Another</Button>
          </CardFooter>
        </Card>
      );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl shadow-orange-500/5 dark:shadow-none border-orange-100 dark:border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
           Request Files
        </CardTitle>
        <CardDescription className="text-center">Create a secure link to receive files.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label>Request Name</Label>
                <Input placeholder="e.g. Tax Documents 2024" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea 
                    placeholder="Instructions for the uploader..." 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    className="min-h-[80px] resize-none"
                />
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
            
            <div className="space-y-2">
                <Label className="text-xs mb-1.5 block text-muted-foreground">Expires In</Label>
                <div className="flex space-x-1">
                    {['1d', '7d', '30d', 'Never'].map((opt) => (
                        <button 
                            type="button"
                            key={opt}
                            onClick={() => setExpiration(opt)}
                            className={cn(
                                "flex-1 py-1.5 text-xs rounded-md border transition-all duration-200 font-medium",
                                expiration === opt 
                                    ? "bg-primary text-white border-primary shadow-sm" 
                                    : "bg-background text-muted-foreground border-border hover:border-primary/30"
                            )}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
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
                    </div>
                )}
            </div>
      </CardContent>
      <CardFooter>
        <Button 
            className="w-full font-semibold shadow-orange-200 shadow-md" 
            size="lg" 
            onClick={handleCreate} 
            disabled={loading || !name || !password}
        >
            {loading ? "Creating Link..." : "Create Request Link"}
        </Button>
      </CardFooter>
    </Card>
  );
}

