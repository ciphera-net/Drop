import { cn } from "@/lib/utils";

interface Stats {
  filesProtected: number;
}

interface StatusBadgeProps {
  stats?: Stats | null;
  className?: string;
}

export function StatusBadge({ stats, className }: StatusBadgeProps) {
  return (
    <div className={cn("hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-xs font-medium text-muted-foreground animate-in fade-in zoom-in duration-500", className)}>
        <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </div>
        <span className="flex items-center gap-1.5">
            Systems Operational
            {stats && (
                <>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    <span className="text-foreground font-semibold">{stats.filesProtected.toLocaleString()}</span> Files Secured
                </>
            )}
        </span>
    </div>
  );
}
