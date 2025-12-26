"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MagicWordInput } from "./magic-word-input";

export function DownloadFileDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Download File</DialogTitle>
        </DialogHeader>
        <div className="py-2">
             <p className="text-center text-muted-foreground mb-6 px-4">
                Enter the magic words shared with you to securely download your files.
             </p>
            <MagicWordInput />
        </div>
      </DialogContent>
    </Dialog>
  );
}

