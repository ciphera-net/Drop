import Link from "next/link";
import { cn } from "@/lib/utils";

interface SiteFooterProps {
  className?: string;
  simple?: boolean;
}

export function SiteFooter({ className, simple = false }: SiteFooterProps) {
  return (
    <footer className={cn("py-8 text-center text-sm text-muted-foreground border-t border-border bg-background", className)}>
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <p>© 2025 Ciphera. All rights reserved.</p>
        
        {!simple && (
          <div className="flex gap-4 mt-4 md:mt-0">
             <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
             <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
             <Link href="#" className="hover:text-primary transition-colors">Open Source</Link>
          </div>
        )}
        
        {simple && (
            <p className="mt-2 md:mt-0">Securely powered by Ciphera Drop</p>
        )}
      </div>
    </footer>
  );
}

