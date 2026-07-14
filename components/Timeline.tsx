"use client";

import type { Quote } from "@/lib/types";
import { quoteTags } from "@/lib/types";

// Quotes grouped by night (the day starts at 5am — a 2am quote belongs to the
// previous evening).
function nightOf(iso: string): string {
  const d = new Date(iso);
  const shifted = new Date(d.getTime() - 5 * 3600 * 1000);
  return shifted.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Timeline({ quotes }: { quotes: Quote[] }) {
  if (quotes.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ink-faint">
        The record is empty. For now.
      </p>
    );
  }

  const groups: { night: string; items: Quote[] }[] = [];
  for (const q of quotes) {
    const night = nightOf(q.occurredAt);
    const last = groups[groups.length - 1];
    if (last && last.night === night) last.items.push(q);
    else groups.push({ night, items: [q] });
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.night}>
          <h2 className="mb-2 text-[11px] uppercase tracking-widest text-ink-faint border-b border-ink/20 pb-1">
            {g.night}
          </h2>
          <div className="space-y-3">
            {g.items.map((q) => (
              <QuoteCard key={q.id} quote={q} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function QuoteCard({ quote }: { quote: Quote }) {
  const sev = quote.severity ?? 1;
  // severity scales the quote type
  const sizes = ["text-sm", "text-sm", "text-base", "text-lg", "text-xl"];
  return (
    <article className="index-card p-3">
      <div className="flex items-start justify-between gap-2">
        <blockquote className={`italic leading-snug ${sizes[sev - 1]}`}>
          &ldquo;{quote.text}&rdquo;
        </blockquote>
        {quote.severity && (
          <span className="stamp shrink-0 text-[10px]">{quote.severity}/5</span>
        )}
      </div>
      <p className="mt-2 text-xs">
        <span
          className="mr-1 inline-block h-2 w-2 rounded-full"
          style={{ background: quote.speaker.avatarColor }}
        />
        <strong>{quote.speaker.name}</strong>
        {quote.location && (
          <span className="text-ink-faint"> · {quote.location.name}</span>
        )}
      </p>
      {quote.context && (
        <p className="mt-1 text-xs text-ink-faint">({quote.context})</p>
      )}
      {quote.verdict && <p className="mt-2 text-xs">{quote.verdict}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {quoteTags(quote).map((t) => (
          <span
            key={t}
            className="border border-ink/20 px-1.5 py-0.5 text-[10px] text-ink-faint"
          >
            {t}
          </span>
        ))}
        {quote.witnesses.length > 0 && (
          <span className="text-[10px] text-ink-faint">
            witnessed by {quote.witnesses.map((w) => w.person.name).join(", ")}
          </span>
        )}
      </div>
      {quote.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={quote.imageUrl}
          alt="evidence"
          className="mt-2 max-h-48 border border-ink/20"
        />
      )}
    </article>
  );
}
