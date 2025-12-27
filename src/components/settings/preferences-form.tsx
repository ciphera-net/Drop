"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Fire, LockKey, Infinity as InfinityIcon } from "@phosphor-icons/react";

interface PreferencesFormProps {
  user: User;
  profile: UserProfile | null;
}

export function PreferencesForm({ user, profile }: PreferencesFormProps) {
  const [defaultExpiration, setDefaultExpiration] = useState(profile?.default_expiration || "1h");
  const [loading, setLoading] = useState(false);
  
  // Initialize maxDownloads state based on profile settings
  // If auto_delete is true, we treat it as 1 (Burn mode)
  // Otherwise we use the download limit (null for infinite)
  const [maxDownloads, setMaxDownloads] = useState<number | null>(() => {
      if (profile?.default_auto_delete) return 1;
      if (profile?.default_download_limit === 0) return null;
      if (profile?.default_download_limit !== undefined && profile?.default_download_limit !== null) return profile.default_download_limit;
      return 1; // Default to 1 (Burn) if not set
  });

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Map UI state back to DB columns
      const isBurnMode = maxDownloads === 1;
      
      const updates = {
        id: user.id,
        default_expiration: defaultExpiration,
        // If burn mode, we can set limit to 1 or null, but auto_delete is the key flag.
        // Let's set limit to 1 if burn mode for consistency, or whatever logic UploadBox uses.
        // UploadBox logic: if maxDownloads is 1, it enables "burn after download".
        // New logic: 0 means Unlimited.
        default_download_limit: isBurnMode ? 1 : (maxDownloads === null ? 0 : maxDownloads), 
        default_auto_delete: isBurnMode,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(updates);

      if (error) throw error;

      toast.success("Preferences updated successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle>Upload Preferences</CardTitle>
          <CardDescription>
            Set default behaviors for your new uploads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 max-w-md">
        
        {/* Expiration Section */}
        <div>
            <Label className="text-base mb-3 block">Default Expiration</Label>
            <div className="flex space-x-2">
                {['1h', '1d', '7d', 'never'].map((opt) => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => setDefaultExpiration(opt)}
                        className={cn(
                            "flex-1 py-2 text-sm rounded-md border transition-all duration-200 font-medium capitalize",
                            defaultExpiration === opt
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-muted-foreground border-input hover:border-primary/30 hover:text-foreground"
                        )}
                    >
                        {opt === 'never' ? 'Never' : opt}
                    </button>
                ))}
            </div>
            <p className="text-[0.8rem] text-muted-foreground mt-2">
                New files will expire after this time by default.
            </p>
        </div>

        {/* Download Limit Section */}
        <div>
            <Label className="text-base mb-3 block">Default Download Limit</Label>
            <div className="space-y-3">
                <div className="flex space-x-2">
                    {[10, 100, null].map((opt) => {
                        const isInfinite = opt === null;
                        const isBurnMode = maxDownloads === 1;

                        return (
                            <button
                                key={String(opt)}
                                type="button"
                                onClick={() => setMaxDownloads(opt)}
                                disabled={isBurnMode}
                                className={cn(
                                    "flex-1 py-2 text-sm rounded-md border transition-all duration-200 font-medium flex items-center justify-center gap-1",
                                    maxDownloads === opt
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-background text-muted-foreground border-input hover:border-primary/30 hover:text-foreground",
                                    isBurnMode && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                                )}
                            >
                                {isInfinite ? <InfinityIcon weight="bold" className="w-4 h-4" /> : opt}
                            </button>
                        );
                    })}
                </div>

                {/* Burn after download toggle */}
                <button
                    type="button"
                    onClick={() => {
                        if (maxDownloads === 1) {
                            // Toggle OFF: Default to Infinite (null) since user is logged in
                            setMaxDownloads(null);
                        } else {
                            // Toggle ON
                            setMaxDownloads(1);
                        }
                    }}
                    className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                        maxDownloads === 1
                            ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800"
                            : "bg-background border-input hover:border-primary/30"
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
                            <p className={cn("text-sm font-semibold", maxDownloads === 1 ? "text-orange-700 dark:text-orange-300" : "text-foreground")}>Burn after download</p>
                            <p className="text-[10px] text-muted-foreground">File is deleted immediately after 1 download</p>
                        </div>
                    </div>

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
             <p className="text-[0.8rem] text-muted-foreground mt-2">
                Set the default maximum number of downloads.
            </p>
        </div>

      </CardContent>
      <CardFooter>
        <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Preferences"}
        </Button>
      </CardFooter>
      </Card>
    </form>
  );
}
