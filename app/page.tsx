"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Quote } from "@/lib/types";

export default function Home() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    fetch("/api/quotes")
      .then((r) => r.json())
      .then(setQuotes)
      .catch(() => {});
  }, []);

  const latest = quotes[0];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-ink-faint">
        Case file no. 001
      </p>
      <h1 className="stamp mt-4 text-5xl sm:text-6xl leading-tight">
        Jab We Quote
      </h1>
      <p className="mt-4 max-w-xs text-sm text-ink-faint leading-relaxed">
        Everything your friends say is evidence. We keep the record. Then we
        make a game of it.
      </p>

      <Link
        href="/ledger"
        className="mt-10 block w-full max-w-xs bg-ink px-8 py-5 text-lg uppercase tracking-[0.2em] text-paper shadow-[4px_4px_0_var(--color-stamp)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        Open the Ledger
      </Link>

      <Link
        href="/ledger?tab=Play"
        className="mt-4 block w-full max-w-xs border border-ink/30 px-8 py-3 text-sm uppercase tracking-[0.2em] text-ink"
      >
        Straight to the game
      </Link>

      {latest && (
        <figure className="index-card mt-12 w-full max-w-xs p-4 text-left">
          <figcaption className="text-[10px] uppercase tracking-widest text-ink-faint">
            Latest exhibit
          </figcaption>
          <blockquote className="mt-2 text-sm italic">
            &ldquo;{latest.text}&rdquo;
          </blockquote>
          <p className="mt-1 text-xs text-ink-faint">— {latest.speaker.name}</p>
        </figure>
      )}

      <p className="mt-10 text-[10px] uppercase tracking-widest text-ink-faint">
        {quotes.length} exhibits on record
      </p>
    </div>
  );
}
