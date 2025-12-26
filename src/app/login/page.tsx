"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LockKey, Envelope, ArrowLeft, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";
import Link from "next/link";
import { notifyNewUserSignup } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // 2FA State
  const [show2FA, setShow2FA] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");

  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (show2FA) {
         // Verify 2FA
         const { error } = await supabase.auth.mfa.verify({
             factorId,
             challengeId,
             code: mfaCode
         });
         if (error) throw error;
         
         router.push("/");
         router.refresh();
         return;
      }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        
        // Notify Slack about the new signup
        if (data.user?.email) {
          // We don't await this to avoid slowing down the UI response
          void notifyNewUserSignup(data.user.email);
        }

        if (data.session) {
          // Prevent auto-login: Sign out immediately
          await supabase.auth.signOut();
          setIsSignUp(false); // Switch to Sign In mode
          toast.success("Account created! Please sign in.");
          setPassword(""); // Clear password
        } else {
          setMessage("Check your email for the confirmation link.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check 2FA Status
        const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaError) throw mfaError;

        if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
            const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
            if (factorsError) throw factorsError;

            const totpFactor = factors.totp[0];
            
            if (totpFactor) {
                setFactorId(totpFactor.id);
                const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
                if (challengeError) throw challengeError;
                
                setChallengeId(challenge.id);
                setShow2FA(true);
                setLoading(false);
                return;
            }
        }

        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      setMessage(error.message);
      setLoading(false);
    } finally {
        // If we are NOT showing 2FA, we can unset loading. 
        // If we ARE showing 2FA, we unset it inside the block above.
        // But if error occurred, we unset it in catch.
        // If successful login redirect, component unmounts.
        if (!show2FA) {
            // Only strictly needed for SignUp or error cases where we stay on page
            setLoading(false); 
        }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md mb-8 text-center">
         <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ArrowLeft className="mr-1" /> Back to Home
         </Link>
         <div className="flex items-center justify-center gap-2 font-bold text-2xl text-foreground mb-2">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-sm">
               D
             </div>
             <span>Drop</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
             {isSignUp ? "Create your account" : (show2FA ? "Two-Factor Verification" : "Welcome back")}
          </h1>
      </div>

      <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-300">
        <CardHeader>
          <CardTitle>{isSignUp ? "Sign Up" : (show2FA ? "Enter Code" : "Sign In")}</CardTitle>
          <CardDescription>
            {isSignUp 
                ? "Create a Ciphera account to manage your transfers." 
                : (show2FA 
                    ? "Enter the 6-digit code from your authenticator app." 
                    : "Enter your credentials to access your account.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            
            {!show2FA && (
                <>
                <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                    <Envelope className="absolute left-3 top-3 text-muted-foreground" />
                    <Input 
                        id="email" 
                        type="email" 
                        placeholder="you@example.com" 
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                </div>
                <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <LockKey className="absolute left-3 top-3 text-muted-foreground" />
                    <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-9"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                </div>
                </>
            )}

            {show2FA && (
                <div className="space-y-2 animate-in slide-in-from-right-4 duration-300">
                    <Label htmlFor="mfa-code">Authenticator Code</Label>
                    <div className="relative">
                        <ShieldCheck className="absolute left-3 top-3 text-muted-foreground" />
                        <Input 
                            id="mfa-code" 
                            type="text" 
                            placeholder="000 000" 
                            className="pl-9 font-mono tracking-widest text-lg"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            autoFocus
                        />
                    </div>
                </div>
            )}
            
            {message && (
               <div className={`p-3 rounded-md text-sm ${message.includes("Check") ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`}>
                  {message}
               </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : (isSignUp ? "Sign Up" : (show2FA ? "Verify" : "Sign In"))}
            </Button>
          </form>
        </CardContent>
        {!show2FA && (
        <CardFooter className="flex justify-center border-t p-4 bg-secondary/20 rounded-b-2xl">
           <button 
             type="button" 
             onClick={() => setIsSignUp(!isSignUp)}
             className="text-sm text-primary hover:underline font-medium cursor-pointer"
           >
             {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
           </button>
        </CardFooter>
        )}
      </Card>
    </div>
  );
}
