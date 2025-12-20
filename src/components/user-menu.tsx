"use client";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { User as UserIcon, SignOut } from "@phosphor-icons/react";

export function UserMenu({ user }: { user: User | null }) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
     await supabase.auth.signOut();
     router.refresh();
  };

  if (user) {
     return (
        <div className="flex items-center gap-4">
           <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-primary flex items-center gap-1 transition-colors">
              <UserIcon weight="bold" /> Dashboard
           </Link>
           <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
              <SignOut className="mr-1" weight="bold" /> Sign Out
           </Button>
        </div>
     )
  }

  return (
      <Link href="/login">
          <Button size="sm" className="font-medium shadow-sm">Sign In</Button>
      </Link>
  )
}

