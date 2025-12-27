"use client";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { User as UserIcon, SignOut, Gear, CaretDown, UserCircle } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

export function UserMenu({ user, displayName: initialDisplayName }: { user: User | null, displayName?: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState<string | null>(initialDisplayName || null);

  // Sync prop changes (e.g. after router.refresh())
  useEffect(() => {
    if (initialDisplayName !== undefined) {
      setDisplayName(initialDisplayName);
    }
  }, [initialDisplayName]);

  useEffect(() => {
    async function getProfile() {
      if (!user) return;
      
      // If we have a display name from props, we rely on it and don't fetch
      if (initialDisplayName !== undefined) return;
      
      const { data } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
        
      if (data?.display_name) {
        setDisplayName(data.display_name);
      }
    }
    
    getProfile();
  }, [user, supabase, initialDisplayName]);

  const handleSignOut = async () => {
     await supabase.auth.signOut();
     router.refresh();
  };

  if (user) {
     return (
        <DropdownMenu>
           <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-muted/50">
                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UserCircle className="w-5 h-5" weight="duotone" />
                 </div>
                 <span className="text-sm font-medium hidden sm:inline-block max-w-[150px] truncate">
                    {displayName || user.email?.split('@')[0]}
                 </span>
                 <CaretDown className="w-4 h-4 text-muted-foreground" />
              </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                 <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName || 'Account'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                     {user.email}
                  </p>
                 </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                 <Link href="/dashboard" className="cursor-pointer w-full flex items-center">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Dashboard
                 </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                 <Link href="/settings" className="cursor-pointer w-full flex items-center">
                    <Gear className="mr-2 h-4 w-4" />
                    Settings
                 </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                 className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer"
                 onClick={handleSignOut}
              >
                 <SignOut className="mr-2 h-4 w-4" />
                 Sign Out
              </DropdownMenuItem>
           </DropdownMenuContent>
        </DropdownMenu>
     )
  }

  return (
      <Link href="/login">
          <Button size="sm" className="font-medium shadow-sm">Sign In</Button>
      </Link>
  )
}
