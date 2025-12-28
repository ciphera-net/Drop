"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, ShieldCheck } from "@phosphor-icons/react";

interface Stats {
  filesProtected: number;
}

export function StatusBadge() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Failed to load stats", err));
  }, []);

  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 text-xs font-medium text-muted-foreground animate-in fade-in zoom-in duration-500">
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
