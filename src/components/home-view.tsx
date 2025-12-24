"use client";

import { useState } from "react";
import { UploadBox } from "./upload-box";
import { RequestBox } from "./request-box";
import { MagicWordInput } from "./magic-word-input";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import { PaperPlaneTilt, DownloadSimple } from "@phosphor-icons/react";

export function HomeView({ user }: { user: User | null }) {
    const [mode, setMode] = useState<'send' | 'request'>('send');

    if (!user) {
        return (
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                <MagicWordInput />
                <UploadBox />
            </div>
        );
    }

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
                        <RequestBox />
                     </div>
                 )}
             </div>
        </div>
    );
}

