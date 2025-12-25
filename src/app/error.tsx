'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <SiteHeader simple />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center mb-6">
           <span className="text-4xl font-bold text-destructive">!</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-4">Something went wrong!</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          An unexpected error occurred. We apologize for the inconvenience.
        </p>
        <div className="flex gap-4">
          <Button
            onClick={() => reset()}
            variant="default"
          >
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
