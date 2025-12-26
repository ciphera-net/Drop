import Link from "next/link";
import { cn } from "@/lib/utils";
import { GithubLogo, XLogo } from "@phosphor-icons/react/dist/ssr";

interface SiteFooterProps {
  className?: string;
  simple?: boolean;
}

export function SiteFooter({ className, simple = false }: SiteFooterProps) {
  return (
    <footer className={cn("py-8 text-center text-sm text-muted-foreground border-t border-border bg-background", className)}>
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <p>
            © 2025 <a href="https://ciphera.net" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors font-medium">Ciphera</a>. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
             <a href="https://github.com/Ciphera/Drop" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" aria-label="GitHub">
               <GithubLogo weight="fill" className="w-5 h-5" />
             </a>
             <a href="https://x.com/Ciphera" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" aria-label="X (Twitter)">
               <XLogo weight="fill" className="w-5 h-5" />
             </a>
          </div>
        </div>
        
        {!simple && (
          <div className="flex gap-4 mt-4 md:mt-0">
             <Link href="/why" className="hover:text-primary transition-colors">Why Drop</Link>
             <Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link>
             <Link href="/security" className="hover:text-primary transition-colors">Security</Link>
             <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
             <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          </div>
        )}
        
        {simple && (
            <p className="mt-2 md:mt-0">
              Securely powered by <a href="https://ciphera.net" target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline underline-offset-4">Ciphera</a>
            </p>
        )}
      </div>
    </footer>
  );
}

