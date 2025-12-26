"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { HardDrives, Trash, Warning, Broom } from "@phosphor-icons/react";
import { 
  getStorageStats, 
  deleteAllFiles, 
  deleteExpiredFiles 
} from "@/app/settings/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface StorageFormProps {
  user: User;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function StorageForm({ user }: StorageFormProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ fileCount: 0, totalBytes: 0, limit: null as number | null });
  const [actionLoading, setActionLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExpiredDeleteDialogOpen, setIsExpiredDeleteDialogOpen] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await getStorageStats();
      setStats(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load storage stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDeleteAll = async () => {
    setActionLoading(true);
    try {
      const result = await deleteAllFiles();
      toast.success(`Deleted ${result.count} files`);
      setIsDeleteDialogOpen(false);
      fetchStats();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to delete files");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpired = async () => {
    setActionLoading(true);
    try {
      const result = await deleteExpiredFiles();
      if (result.count === 0) {
        toast.info("No expired files to delete");
      } else {
        toast.success(`Deleted ${result.count} expired files`);
      }
      setIsExpiredDeleteDialogOpen(false);
      fetchStats();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to delete expired files");
    } finally {
      setActionLoading(false);
    }
  };

  const limit = stats.limit || 1024 * 1024 * 1024 * 5; // Default 5GB visualization if not set
  const percentage = Math.min((stats.totalBytes / limit) * 100, 100);
  const isLimitReached = stats.totalBytes >= limit;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Storage Management</h2>
        <p className="text-muted-foreground">
          Manage your files and storage usage.
        </p>
      </div>

      <div className="space-y-6 max-w-md">
        
        {/* Usage Section */}
        <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
                <span>Storage Used</span>
                <span>{formatBytes(stats.totalBytes)} / {formatBytes(limit)}</span>
            </div>
            <Progress value={percentage} className="h-2" />
            <div className="flex justify-between items-start">
                <p className="text-xs text-muted-foreground">
                    Total active files: {stats.fileCount}
                </p>
                {isLimitReached && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1">
                        <Warning weight="fill" />
                        Storage Limit Reached
                    </p>
                )}
            </div>
        </div>

        {/* Cleanup Tools */}
        <div className="space-y-4 pt-4">
             <h3 className="text-sm font-medium text-foreground">Cleanup Tools</h3>
             
             {/* Delete Expired */}
             <Dialog open={isExpiredDeleteDialogOpen} onOpenChange={setIsExpiredDeleteDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2" disabled={actionLoading || stats.fileCount === 0}>
                        <Broom className="w-4 h-4" />
                        Delete Expired Files
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete expired files?</DialogTitle>
                        <DialogDescription>
                            This will manually remove files that have passed their expiration date. 
                            The system usually does this automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExpiredDeleteDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleDeleteExpired} disabled={actionLoading}>
                            {actionLoading ? "Deleting..." : "Delete Expired"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>

             {/* Delete All */}
             <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start gap-2" disabled={actionLoading || stats.fileCount === 0}>
                        <Trash className="w-4 h-4" />
                        Delete All Files
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete all files?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete ALL your currently active files. 
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteAll} disabled={actionLoading}>
                            {actionLoading ? "Deleting..." : "Delete All"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>
        </div>

      </div>
    </div>
  );
}

