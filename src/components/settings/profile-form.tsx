"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Desktop } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
  user: User;
  profile: UserProfile | null;
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Profile updated successfully");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Profile Settings</h3>
          <p className="text-sm text-muted-foreground">
            Manage your public profile information.
          </p>
        </div>
        <div className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input type="email" id="email" value={user.email} disabled />
            <p className="text-xs text-muted-foreground">
              Your email address is managed through your login provider.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Appearance</h3>
          <p className="text-sm text-muted-foreground">
            Customize the interface color theme.
          </p>
        </div>
        
        {mounted && (
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className={cn("gap-2", theme === "light" && "border-primary bg-primary/10")}
              onClick={() => setTheme("light")}
            >
              <Sun weight="bold" /> Light
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn("gap-2", theme === "dark" && "border-primary bg-primary/10")}
              onClick={() => setTheme("dark")}
            >
              <Moon weight="bold" /> Dark
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn("gap-2", theme === "system" && "border-primary bg-primary/10")}
              onClick={() => setTheme("system")}
            >
              <Desktop weight="bold" /> System
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

