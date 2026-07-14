"use client";

import { useMemo } from "react";
import type { Person, Quote } from "@/lib/types";
import { quoteTags } from "@/lib/types";

type CastEntry = {
  person: Person;
  quoteCount: number;
  witnessCount: number;
  avgSeverity: number | null;
  worst: Quote | null;
  topTag: string | null;
  frequentWitness: string | null;
};

export default function Cast({
  quotes,
  people,
}: {
  quotes: Quote[];
  people: Person[];
}) {
  const entries = useMemo<CastEntry[]>(() => {
    return people
      .map((person) => {
        const said = quotes.filter((q) => q.speakerId === person.id);
        const witnessed = quotes.filter((q) =>
          q.witnesses.some((w) => w.personId === person.id)
        );
        const severities = said
          .map((q) => q.severity)
          .filter((s): s is number => s !== null);
        const tagCounts = new Map<string, number>();
        for (const q of said)
          for (const t of quoteTags(q))
            tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
        const witCounts = new Map<string, number>();
        for (const q of said)
          for (const w of q.witnesses)
            witCounts.set(w.person.name, (witCounts.get(w.person.name) ?? 0) + 1);
        const worst =
          said.length > 0
            ? [...said].sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))[0]
            : null;
        return {
          person,
          quoteCount: said.length,
          witnessCount: witnessed.length,
          avgSeverity:
            severities.length > 0
              ? severities.reduce((a, b) => a + b, 0) / severities.length
              : null,
          worst,
          topTag: top(tagCounts),
          frequentWitness: top(witCounts),
        };
      })
      .sort((a, b) => b.quoteCount - a.quoteCount);
  }, [quotes, people]);

  const superlatives = useMemo(() => {
    const withQuotes = entries.filter((e) => e.quoteCount > 0);
    const out: { title: string; name: string; detail?: string }[] = [];
    if (withQuotes.length > 0) {
      const most = withQuotes[0];
      out.push({
        title: "Most Quoted",
        name: most.person.name,
        detail: `${most.quoteCount} exhibits`,
      });
      const rated = withQuotes.filter((e) => e.avgSeverity !== null);
      if (rated.length > 0) {
        const worst = [...rated].sort(
          (a, b) => b.avgSeverity! - a.avgSeverity!
        )[0];
        out.push({
          title: "Highest Average Severity",
          name: worst.person.name,
          detail: `${worst.avgSeverity!.toFixed(1)}/5 — quality over quantity`,
        });
      }
    }
    const silent = entries
      .filter((e) => e.quoteCount === 0 && e.witnessCount > 0)
      .sort((a, b) => b.witnessCount - a.witnessCount)[0];
    if (silent) {
      out.push({
        title: "Present but Never Quoted",
        name: silent.person.name,
        detail: `witnessed ${silent.witnessCount} and said nothing usable. The Witness.`,
      });
    }
    // Longest streak in one tag across chronological quotes
    const chrono = [...quotes].sort(
      (a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt)
    );
    let best: { name: string; tag: string; len: number } | null = null;
    const streaks = new Map<string, { tag: string; len: number }>();
    for (const q of chrono) {
      const tags = quoteTags(q);
      const prev = streaks.get(q.speaker.name);
      const cont = prev && tags.includes(prev.tag) ? prev.tag : tags[0];
      if (!cont) continue;
      const len = prev && prev.tag === cont ? prev.len + 1 : 1;
      streaks.set(q.speaker.name, { tag: cont, len });
      if (len >= 2 && (!best || len > best.len))
        best = { name: q.speaker.name, tag: cont, len };
    }
    if (best) {
      out.push({
        title: "Longest Streak",
        name: best.name,
        detail: `${best.len} straight rulings of "${best.tag}"`,
      });
    }
    return out;
  }, [entries, quotes]);

  if (people.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ink-faint">
        No suspects identified yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {superlatives.length > 0 && (
        <div className="index-card p-4">
          <h2 className="stamp text-xs">Superlatives</h2>
          <ul className="mt-3 space-y-2">
            {superlatives.map((s) => (
              <li key={s.title} className="text-sm">
                <span className="text-[10px] uppercase tracking-widest text-ink-faint block">
                  {s.title}
                </span>
                <strong>{s.name}</strong>
                {s.detail && (
                  <span className="text-xs text-ink-faint"> — {s.detail}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entries.map((e) => (
        <div key={e.person.id} className="index-card p-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: e.person.avatarColor }}
            >
              {e.person.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-bold">{e.person.name}</p>
              <p className="text-[11px] text-ink-faint">
                {e.quoteCount} quotes · witnessed {e.witnessCount}
                {e.avgSeverity !== null &&
                  ` · avg severity ${e.avgSeverity.toFixed(1)}`}
              </p>
            </div>
          </div>
          {(e.topTag || e.frequentWitness) && (
            <p className="mt-2 text-xs text-ink-faint">
              {e.topTag && (
                <>
                  signature offense: <strong>{e.topTag}</strong>
                </>
              )}
              {e.topTag && e.frequentWitness && " · "}
              {e.frequentWitness && (
                <>
                  usually seen with <strong>{e.frequentWitness}</strong>
                </>
              )}
            </p>
          )}
          {e.worst && (
            <blockquote className="mt-2 border-l-2 border-stamp pl-2 text-xs italic">
              worst offense: &ldquo;{e.worst.text}&rdquo;
              {e.worst.severity && ` (${e.worst.severity}/5)`}
            </blockquote>
          )}
        </div>
      ))}
    </div>
  );
}

function top(counts: Map<string, number>): string | null {
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of counts)
    if (v > n) {
      best = k;
      n = v;
    }
  return best;
}
