"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { LockKey, Envelope, ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage("Check your email for the confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md mb-8 text-center">
         <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ArrowLeft className="mr-1" /> Back to Home
         </Link>
         <div className="flex items-center justify-center gap-2 font-bold text-2xl text-gray-900 mb-2">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
               D
             </div>
             <span>Drop</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">
             {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
      </div>

      <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-300">
        <CardHeader>
          <CardTitle>{isSignUp ? "Sign Up" : "Sign In"}</CardTitle>
          <CardDescription>
            {isSignUp ? "Create a Ciphera account to manage your transfers." : "Enter your credentials to access your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
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
            
            {message && (
               <div className={`p-3 rounded-md text-sm ${message.includes("Check") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {message}
               </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Sign In")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4 bg-secondary/20 rounded-b-2xl">
           <button 
             type="button" 
             onClick={() => setIsSignUp(!isSignUp)}
             className="text-sm text-primary hover:underline font-medium cursor-pointer"
           >
             {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
           </button>
        </CardFooter>
      </Card>
    </div>
  );
}

