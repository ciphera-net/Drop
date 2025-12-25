"use client";

import { useState } from "react";
import Link from "next/link";
import { UploadBox } from "./upload-box";
import { RequestBox } from "./request-box";
import { MagicWordInput } from "./magic-word-input";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import { PaperPlaneTilt, DownloadSimple, LockKey } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";

export function HomeView({ user }: { user: User | null }) {
    const [mode, setMode] = useState<'send' | 'request'>('send');

    return (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
             <div className="flex justify-center mb-8">
                <div className="inline-flex p-1 bg-muted/50 backdrop-blur-sm rounded-xl border border-border/50">
                    <button
                        onClick={() => setMode('send')}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            mode === 'send' 
                                ? "bg-background text-primary shadow-sm ring-1 ring-border" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <PaperPlaneTilt weight={mode === 'send' ? "fill" : "regular"} className="w-4 h-4" />
                        Send File
                    </button>
                    <button
                        onClick={() => setMode('request')}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            mode === 'request' 
                                ? "bg-background text-primary shadow-sm ring-1 ring-border" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <DownloadSimple weight={mode === 'request' ? "fill" : "bold"} className="w-4 h-4" />
                        Request File
                    </button>
                </div>
             </div>

             <div className="relative">
                 {mode === 'send' ? (
                     <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                        <MagicWordInput />
                        <UploadBox />
                     </div>
                 ) : (
                     <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {user ? (
                            <RequestBox />
                        ) : (
                            <Card className="w-full max-w-md mx-auto shadow-xl shadow-orange-500/5 dark:shadow-none border-orange-100 dark:border-border">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-center gap-2">
                                        Request Files
                                    </CardTitle>
                                    <CardDescription className="text-center">
                                        Create a secure link for others to upload files to you.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                    <div className="bg-primary/10 p-4 rounded-full">
                                        <LockKey className="w-12 h-12 text-primary" weight="duotone" />
                                    </div>
                                    <p className="text-muted-foreground">
                                        You need an account to create file requests. This ensures you can securely manage and access the files you receive.
                                    </p>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                    <Link href="/login" className="w-full">
                                        <Button className="w-full">Log In</Button>
                                    </Link>
                                    <p className="text-xs text-muted-foreground">
                                        Don't have an account? <Link href="/login?tab=signup" className="text-primary hover:underline">Sign up</Link>
                                    </p>
                                </CardFooter>
                            </Card>
                        )}
                     </div>
                 )}
             </div>
        </div>
    );
}

