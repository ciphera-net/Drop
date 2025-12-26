"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useRouter } from "next/navigation";
import { SimpleLoginService } from "@/lib/simplelogin";

interface IntegrationsFormProps {
  user: User;
  profile: UserProfile | null;
}

export function IntegrationsForm({ user, profile }: IntegrationsFormProps) {
  const [apiKey, setApiKey] = useState(profile?.simplelogin_api_key || "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        if (!apiKey.trim()) {
             await SimpleLoginService.clearApiKey();
             toast.success("API Key removed");
        } else {
            await SimpleLoginService.setApiKey(apiKey.trim());
            toast.success("API Key saved");
        }
        router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Manage external service connections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 max-w-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">SimpleLogin</h4>
              <p className="text-xs text-muted-foreground">
                Connect your SimpleLogin account to generate hidden email aliases for file upload notifications.
              </p>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">SimpleLogin API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey || ""}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API Key"
                />
                <p className="text-xs text-muted-foreground">
                  You can find this in your <a href="https://app.simplelogin.io/developer" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">SimpleLogin Developer Settings</a>.
                </p>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save API Key"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

