"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MagnifyingGlass, Spinner } from "@phosphor-icons/react";

export function MagicWordInput() {
  const [words, setWords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!words.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Normalize input: lowercase, replace spaces with dashes?
      // The generator produces "word-word-word". User might type "word word word".
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

      router.push(`/d/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <form onSubmit={handleSearch} className="relative flex items-center shadow-lg rounded-xl overflow-hidden ring-1 ring-gray-900/5 transition-shadow focus-within:ring-2 focus-within:ring-primary/50">
        <div className="absolute left-3 text-gray-400">
           <MagnifyingGlass size={20} weight="bold" />
        </div>
        <Input 
          className="pl-10 pr-20 h-14 bg-white border-none text-lg rounded-none focus-visible:ring-0 placeholder:text-gray-400"
          placeholder="Enter magic words (e.g. happy-cat-run)"
          value={words}
          onChange={(e) => setWords(e.target.value)}
          disabled={loading}
        />
        <div className="absolute right-1.5">
            <Button 
                type="submit" 
                size="sm" 
                disabled={loading || !words}
                className="h-11 px-4 font-semibold rounded-lg"
            >
                {loading ? <Spinner className="animate-spin" /> : "Find"}
            </Button>
        </div>
      </form>
      {error && (
        <p className="mt-2 text-sm text-red-500 text-center font-medium animate-in fade-in">
           {error === 'File not found' ? "Oops! We couldn't find a file with those magic words." : error}
        </p>
      )}
    </div>
  );
}

