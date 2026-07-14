"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Person, Location, Quote } from "@/lib/types";
import CaptureForm from "@/components/CaptureForm";
import Timeline from "@/components/Timeline";
import MapView from "@/components/MapView";
import Cast from "@/components/Cast";
import Gallery from "@/components/Gallery";
import Play from "@/components/Play";

const TABS = ["Capture", "Timeline", "Map", "Cast", "Gallery", "Play"] as const;
type Tab = (typeof TABS)[number];

export default function Ledger() {
  const [tab, setTab] = useState<Tab>("Capture");
  const [initialMode, setInitialMode] = useState<"who-said-this" | "context-only">(
    "who-said-this"
  );
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Support /ledger?tab=Play&mode=context-only deep links.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("tab");
    if (wanted && (TABS as readonly string[]).includes(wanted)) {
      setTab(wanted as Tab);
    }
    if (params.get("mode") === "context-only") setInitialMode("context-only");
  }, []);

  const refresh = useCallback(async () => {
    const [q, p, l] = await Promise.all([
      fetch("/api/quotes").then((r) => r.json()),
      fetch("/api/people").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
    ]);
    setQuotes(q);
    setPeople(p);
    setLocations(l);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (tab === "Play") {
    return (
      <Play
        quotes={quotes}
        people={people}
        locations={locations}
        initialMode={initialMode}
        onExit={() => setTab("Capture")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24">
      <header className="pt-6 pb-4 text-center">
        <Link
          href="/"
          className="block text-[10px] uppercase tracking-widest text-ink-faint"
        >
          Jab We Quote
        </Link>
        <h1 className="stamp mt-2 text-2xl">The Ledger</h1>
        <p className="mt-2 text-xs text-ink-faint tracking-widest uppercase">
          Evidence of the things they said · {quotes.length} exhibits
        </p>
      </header>

      <main>
        {tab === "Capture" && (
          <CaptureForm people={people} locations={locations} onSaved={refresh} />
        )}
        {tab === "Timeline" && <Timeline quotes={quotes} />}
        {tab === "Map" && <MapView quotes={quotes} />}
        {tab === "Cast" && <Cast quotes={quotes} people={people} />}
        {tab === "Gallery" && (
          <Gallery people={people} quotes={quotes} onChanged={refresh} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-ink/20 bg-paper-dark">
        <div className="mx-auto flex max-w-lg">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-[10px] uppercase tracking-widest transition-all duration-150 hover:scale-110 ${
                tab === t ? "font-bold text-stamp" : "text-ink-faint"
              } ${t === "Play" ? "bg-ink/10 font-bold text-ink" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
