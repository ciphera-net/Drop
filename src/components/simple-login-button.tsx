"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleLoginService } from "@/lib/simplelogin";
import { toast } from "sonner";
import { MaskHappy, Spinner, Check } from "@phosphor-icons/react";

interface SimpleLoginButtonProps {
  onAliasGenerated: (alias: string) => void;
  className?: string;
}

export function SimpleLoginButton({ onAliasGenerated, className }: SimpleLoginButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const storedKey = SimpleLoginService.getApiKey();
    
    if (!storedKey) {
      setIsOpen(true);
      return;
    }

    await generateAlias(storedKey);
  };

  const generateAlias = async (key: string) => {
    setLoading(true);
    try {
      const alias = await SimpleLoginService.createRandomAlias(key, "Drop File Notification");
      onAliasGenerated(alias);
      toast.success("Hidden email alias generated!");
      setIsOpen(false);
    } catch (error) {
      console.error("SimpleLogin Error:", error);
      toast.error("Failed to generate alias. Check your API key.");
      // If error is 401/403, maybe clear key?
      if (error instanceof Error && error.message.includes("401")) {
          SimpleLoginService.clearApiKey();
          setApiKey(""); // Reset local state
          setIsOpen(true); // Re-open dialog
      }
    } finally {
      setLoading(false);
    }
  };

  const saveAndGenerate = async () => {
    if (!apiKey.trim()) return;
    SimpleLoginService.setApiKey(apiKey.trim());
    await generateAlias(apiKey.trim());
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleGenerate} 
        disabled={loading}
        className={className}
        type="button"
        title="Generate a random alias to hide your real email"
      >
        {loading ? (
            <Spinner className="animate-spin w-4 h-4 mr-2" />
        ) : (
            <MaskHappy className="w-4 h-4 mr-2" />
        )}
        Hide my email
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect SimpleLogin</DialogTitle>
            <DialogDescription>
              Enter your SimpleLogin API Key to generate unlimited privacy-preserving email aliases.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sl-api-key">API Key</Label>
              <Input 
                id="sl-api-key" 
                placeholder="ey..." 
                type="password"
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
              />
              <p className="text-xs text-muted-foreground">
                You can find this in your <a href="https://app.simplelogin.io/dashboard/api_key" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">SimpleLogin Dashboard</a>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={saveAndGenerate} disabled={!apiKey || loading}>
              {loading ? "Generating..." : "Save & Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

