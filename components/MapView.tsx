"use client";

import { useMemo, useState } from "react";
import type { Quote } from "@/lib/types";
import { QuoteCard } from "./Timeline";

// Locations as bubbles sized by quote count. Deterministic scatter layout —
// no physics needed for a shelf of crime scenes.
export default function MapView({ quotes }: { quotes: Quote[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const spots = useMemo(() => {
    const byLoc = new Map<string, { name: string; quotes: Quote[] }>();
    for (const q of quotes) {
      const key = q.location?.name ?? "Location unknown";
      if (!byLoc.has(key)) byLoc.set(key, { name: key, quotes: [] });
      byLoc.get(key)!.quotes.push(q);
    }
    return [...byLoc.values()].sort((a, b) => b.quotes.length - a.quotes.length);
  }, [quotes]);

  if (spots.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ink-faint">
        No crime scenes on record yet.
      </p>
    );
  }

  const max = spots[0].quotes.length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-3 py-6">
        {spots.map((s, i) => {
          const scale = 0.5 + 0.5 * (s.quotes.length / max);
          const size = Math.round(72 + 88 * scale * (max > 1 ? 1 : 0.6));
          const isSel = selected === s.name;
          return (
            <button
              key={s.name}
              onClick={() => setSelected(isSel ? null : s.name)}
              className={`flex items-center justify-center rounded-full border-2 p-2 text-center leading-tight transition-transform ${
                isSel
                  ? "border-stamp text-stamp scale-105"
                  : "border-ink/40 text-ink"
              }`}
              style={{
                width: size,
                height: size,
                transform: `rotate(${((i * 37) % 7) - 3}deg)`,
                background: "var(--color-card)",
              }}
            >
              <span>
                <span className="block text-xs font-bold">{s.name}</span>
                <span className="block text-[10px] text-ink-faint">
                  {s.quotes.length} exhibit{s.quotes.length === 1 ? "" : "s"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="space-y-3">
          <h2 className="text-[11px] uppercase tracking-widest text-ink-faint border-b border-ink/20 pb-1">
            On record at {selected}
          </h2>
          {spots
            .find((s) => s.name === selected)!
            .quotes.map((q) => (
              <QuoteCard key={q.id} quote={q} />
            ))}
        </div>
      )}
    </div>
  );
}
