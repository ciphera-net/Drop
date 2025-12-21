"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { MagicWand, ArrowRight, Spinner, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function MagicWordInput() {
  const [words, setWords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!words.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Normalize input: lowercase, replace spaces with dashes
      const normalizedWords = words.trim().toLowerCase().replace(/\s+/g, '-');

      const res = await fetch('/api/resolve-magic-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: normalizedWords }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'File not found');
      }

      router.push(`/d/${normalizedWords}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="relative group">
            <div className={cn(
                "absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-orange-400/30 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500",
                isFocused && "opacity-80"
            )}></div>
            
            <form onSubmit={handleSearch} className="relative flex items-center bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="pl-4 text-primary animate-pulse">
                    <MagicWand size={24} weight="duotone" />
                </div>
                
                <input 
                    type="text"
                    className="w-full h-14 pl-3 pr-14 text-lg bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-400 font-medium"
                    placeholder="Enter magic words (e.g. happy-cat-run)"
                    value={words}
                    onChange={(e) => {
                        setWords(e.target.value);
                        if (error) setError(null);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={loading}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                />

                <div className="absolute right-2">
                    <Button 
                        type="submit" 
                        size="icon"
                        variant="ghost"
                        disabled={loading || !words}
                        className={cn(
                            "h-10 w-10 rounded-lg transition-all duration-200",
                            words ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary" : "text-gray-300 hover:text-gray-400"
                        )}
                    >
                        {loading ? (
                            <Spinner className="animate-spin" size={20} />
                        ) : (
                            <ArrowRight size={20} weight="bold" />
                        )}
                    </Button>
                </div>
            </form>
        </div>

        {error && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-red-500 font-medium animate-in slide-in-from-top-2 fade-in">
                <WarningCircle size={16} weight="fill" />
                <span>
                    {error === 'File not found' ? "No file found with those magic words" : error}
                </span>
            </div>
        )}
    </div>
  );
}
