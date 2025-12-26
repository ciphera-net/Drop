"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";
import { updatePGPKey, deleteAccount } from "@/app/settings/actions";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { SessionsList } from "./sessions-list";

interface SecurityFormProps {
  user: User;
}

export function SecurityForm({ user }: SecurityFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [pgpKey, setPgpKey] = useState("");
  const [pgpLoading, setPgpLoading] = useState(false);

  const [mfaStatus, setMfaStatus] = useState<"enabled" | "disabled" | "loading">("loading");
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [setupError, setSetupError] = useState("");

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Fetch PGP Key
    const fetchProfile = async () => {
        const { data } = await supabase
            .from('user_profiles')
            .select('pgp_public_key')
            .eq('id', user.id)
            .single();
        if (data?.pgp_public_key) {
            setPgpKey(data.pgp_public_key);
        }
    };
    fetchProfile();

    // Fetch MFA Status
    checkMfaStatus();
  }, [supabase, user.id]);

  const checkMfaStatus = async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data) {
           if (data.currentLevel === 'aal2') {
               setMfaStatus('enabled');
           } else {
               const { data: factors } = await supabase.auth.mfa.listFactors();
               // Only consider VERIFIED factors as enabled
               if (factors && factors.totp.some(f => f.status === 'verified')) {
                   setMfaStatus('enabled');
               } else {
                   setMfaStatus('disabled');
               }
           }
      }
  };


  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Failed to update password";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePgpUpdate = async () => {
      setPgpLoading(true);
      try {
          await updatePGPKey(pgpKey);
          toast.success("PGP Key updated successfully");
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Failed to update PGP Key";
          toast.error(message);
      } finally {
          setPgpLoading(false);
      }
  };

  const handleDeleteAccount = async () => {
      if (deleteConfirm !== "DELETE") {
          toast.error("Please type DELETE to confirm");
          return;
      }
      setDeleteLoading(true);
      try {
          await deleteAccount();
          toast.success("Account deleted");
          window.location.href = "/"; // Redirect to home
      } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Failed to delete account";
          toast.error(message);
          setDeleteLoading(false);
      }
  };

  const onEnable2FA = async () => {
    setLoading(true);
    setSetupError("");
    try {
        // Aggressively clean up any conflicting factors before enrollment
        const { data: factors } = await supabase.auth.mfa.listFactors();
        if (factors && factors.totp) {
             for (const factor of factors.totp) {
                 // Delete any unverified factor, OR any factor explicitly named "Ciphera Drop" 
                 // (since we are in Setup mode, we shouldn't have valid ones blocking us)
                 if ((factor.status as string) === 'unverified' || factor.friendly_name === 'Ciphera Drop') {
                      await supabase.auth.mfa.unenroll({ factorId: factor.id });
                 }
             }
        }

        // Add a small random suffix if we still have collisions, or just to be safe if multiple devices setup same time
        const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: 'Ciphera Drop'
        });

        if (error) {
            // Retry with unique name if duplicate name error persists
            if (error.message.includes('already exists')) {
                 const { data: retryData, error: retryError } = await supabase.auth.mfa.enroll({
                    factorType: 'totp',
                    friendlyName: `Ciphera Drop (${new Date().getSeconds()})`
                });
                if (retryError) throw retryError;
                setFactorId(retryData.id);
                setQrCode(retryData.totp.uri || retryData.totp.qr_code);
                setIsSetupOpen(true);
                return;
            }
            throw error;
        }
        
        setFactorId(data.id);
        
        if (data.totp.uri) {
             setQrCode(data.totp.uri);
        } else {
             setQrCode(data.totp.qr_code); 
        }

        setIsSetupOpen(true);
    } catch (e: any) {
        toast.error(e.message);
    } finally {
        setLoading(false);
    }
  };

  const onVerifySetup = async () => {
    setLoading(true);
    setSetupError("");
    try {
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) throw challengeError;

        const { data: verify, error: verifyError } = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challenge.id,
            code: verifyCode
        });
        if (verifyError) throw verifyError;

        toast.success("2FA Enabled Successfully");
        setIsSetupOpen(false);
        setMfaStatus("enabled");
        setVerifyCode("");
    } catch (e: any) {
        setSetupError(e.message);
    } finally {
        setLoading(false);
    }
  };

  const onDisable2FA = async () => {
      if (!confirm("Are you sure you want to disable 2FA? This will make your account less secure.")) return;
      
      setLoading(true);
      try {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          if (factors && factors.totp.length > 0) {
              for (const factor of factors.totp) {
                   await supabase.auth.mfa.unenroll({ factorId: factor.id });
              }
          }
          setMfaStatus("disabled");
          toast.success("2FA Disabled");
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Update your password to keep your account secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button type="submit" disabled={loading || !password}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>

    <Card>
        <CardHeader>
            <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
            <CardDescription>
                Add an extra layer of security to your account.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {mfaStatus === 'loading' ? (
                        <div className="h-5 w-20 bg-muted animate-pulse rounded"></div>
                    ) : mfaStatus === 'enabled' ? (
                        <>
                            <CheckCircle weight="fill" className="w-6 h-6 text-green-500" />
                            <span className="font-medium text-green-600 dark:text-green-400">Enabled</span>
                        </>
                    ) : (
                        <>
                            <XCircle weight="fill" className="w-6 h-6 text-muted-foreground" />
                            <span className="text-muted-foreground">Not enabled</span>
                        </>
                    )}
                </div>
                
                {mfaStatus !== 'loading' && (
                    mfaStatus === 'enabled' ? (
                        <Button variant="outline" onClick={onDisable2FA} disabled={loading}>Disable 2FA</Button>
                    ) : (
                        <Button onClick={onEnable2FA} disabled={loading}>Setup 2FA</Button>
                    )
                )}
            </div>

            <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            Scan the QR code below with your authenticator app (like Google Authenticator or Authy).
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex flex-col items-center justify-center py-6 space-y-6">
                        <div className="p-4 bg-white rounded-xl border-2 border-primary/10 shadow-[0_0_15px_rgba(253,94,15,0.1)]">
                             {qrCode && (
                                qrCode.startsWith('otpauth://') ? (
                                    <QRCodeSVG value={qrCode} size={180} />
                                ) : (
                                    // If it's a data URI image
                                    <img src={qrCode} alt="QR Code" width={180} height={180} />
                                )
                             )}
                        </div>
                        
                        <div className="w-full space-y-3">
                             <Label className="text-center block text-muted-foreground font-medium">Verification Code</Label>
                             <div className="flex justify-center">
                                 <Input 
                                    placeholder="000000"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-48 text-center text-2xl tracking-[0.5em] font-mono h-14 bg-secondary/30 border-2 focus-visible:ring-0 focus-visible:border-primary transition-all rounded-xl"
                                 />
                             </div>
                             <p className="text-xs text-center text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
                        </div>

                        {setupError && (
                            <p className="text-sm text-destructive font-medium bg-destructive/10 px-3 py-1 rounded-full animate-in fade-in slide-in-from-top-1">{setupError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSetupOpen(false)}>Cancel</Button>
                        <Button onClick={onVerifySetup} disabled={loading || verifyCode.length !== 6}>
                            {loading ? "Verifying..." : "Verify & Enable"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardContent>
    </Card>

    <SessionsList />

    <Card>
        <CardHeader>
            <CardTitle>PGP Public Key</CardTitle>
            <CardDescription>
                Add your PGP public key to receive encrypted email notifications.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Public Key</Label>
                    <Textarea 
                        placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..."
                        className="font-mono text-xs min-h-[150px]"
                        value={pgpKey || ""}
                        onChange={(e) => setPgpKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Must start with <code>-----BEGIN PGP PUBLIC KEY BLOCK-----</code>.
                    </p>
                </div>
                <Button onClick={handlePgpUpdate} disabled={pgpLoading}>
                    {pgpLoading ? "Saving..." : "Save Public Key"}
                </Button>
            </div>
        </CardContent>
    </Card>

    <Card className="border-red-200 dark:border-red-900/30">
        <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
            <CardDescription>
                Irreversible actions for your account.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete your account? This action cannot be undone.
                            All your files and data will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Type "DELETE" to confirm</Label>
                            <Input 
                                value={deleteConfirm}
                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                placeholder="DELETE"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading || deleteConfirm !== "DELETE"}
                        >
                            {deleteLoading ? "Deleting..." : "Delete Permanently"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardContent>
    </Card>
    </div>
  );
}
