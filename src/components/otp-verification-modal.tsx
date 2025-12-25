"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { ShieldCheck, LockKey } from "@phosphor-icons/react";

export function OtpVerificationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [hasSentCode, setHasSentCode] = useState(false);
  const sendingRef = useRef(false);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const sendOtp = async () => {
      if (sendingRef.current) return;
      sendingRef.current = true;
      setResendDisabled(true);
      setHasSentCode(true); // Mark as sent in state too
      
      try {
        const res = await fetch("/api/auth/otp/send", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
  
        toast.success("Verification code sent to your email");
        setResendCountdown(60);
      } catch (error: any) {
        toast.error(error.message);
        setResendDisabled(false); // Re-enable on error
        sendingRef.current = false;
      }
  }

  const handleResend = async () => {
    if (resendDisabled) return;
    await sendOtp();
  };

  useEffect(() => {
    const checkVerificationStatus = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setIsOpen(false);
            return;
          }
    
          const { data: verification, error } = await supabase
            .from("user_verifications")
            .select("is_verified")
            .eq("user_id", user.id)
            .single();
    
          // If already verified, do nothing.
          if (verification?.is_verified) {
            setIsOpen(false);
            return;
          }
    
          // If unverified, open modal.
          setIsOpen(true);
          
          // Auto send if not sent yet and we just opened it
          if (!hasSentCode && !sendingRef.current) {
             await sendOtp();
          }
    
        } catch (e) {
          console.error(e);
        }
    };
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            checkVerificationStatus();
        } else if (event === 'SIGNED_OUT') {
            setIsOpen(false);
            setHasSentCode(false);
            sendingRef.current = false;
        }
    });

    // Also check on mount/pathname change (for when refreshing)
    checkVerificationStatus();

    return () => {
        subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Account verified successfully");
      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && hasSentCode) {
      setResendDisabled(false);
    }
  }, [resendCountdown, hasSentCode]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader className="items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <ShieldCheck size={24} weight="fill" />
          </div>
          <DialogTitle className="text-xl">Verification Required</DialogTitle>
          <DialogDescription className="pt-2">
            To ensure the security of your account, please enter the 6-digit verification code sent to your email.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4">
           <div className="space-y-2">
             <Label htmlFor="otp" className="sr-only">Verification Code</Label>
             <div className="relative">
                <LockKey className="absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="otp"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-9 text-center text-2xl tracking-[0.5em] font-mono h-12"
                  maxLength={6}
                  autoFocus
                />
             </div>
           </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-3">
          <Button onClick={handleVerify} disabled={loading || otp.length < 6} className="w-full h-11 text-base">
            {loading ? "Verifying..." : "Verify Account"}
          </Button>
          
          <div className="flex flex-col items-center gap-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={resendDisabled}
                className="text-sm text-muted-foreground hover:text-foreground"
            >
                {resendCountdown > 0 
                    ? `Resend code in ${resendCountdown}s` 
                    : "Resend Verification Code"}
            </Button>
            
            <Button
                variant="link"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={async () => {
                    await supabase.auth.signOut();
                    setIsOpen(false);
                    router.push("/login");
                    router.refresh();
                }}
            >
                Log out
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

