import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  user?: User | null;
  displayName?: string | null;
  simple?: boolean; // If true, hides extra navigation/menus, focuses on Logo
  className?: string;
}

export function SiteHeader({ user, displayName, simple = false, className }: SiteHeaderProps) {
  return (
    <header className={cn("w-full py-4 px-4 md:px-8 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50", className)}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl md:text-2xl text-foreground tracking-tight hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg shadow-orange-500/30">
              D
            </div>
            <span className={cn("hidden sm:inline", simple && "inline")}>Drop</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {!simple && <UserMenu user={user ?? null} displayName={displayName} />}
        </div>
      </div>
    </header>
  );
}
