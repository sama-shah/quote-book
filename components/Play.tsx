"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DeckFilter,
  GameMode,
  Location,
  Person,
  Quote,
  TurnResult,
} from "@/lib/types";
import { quoteTags } from "@/lib/types";

type Props = {
  quotes: Quote[];
  people: Person[];
  locations: Location[];
  initialMode?: GameMode;
  onExit: () => void;
};

type Phase = "setup" | "countdown" | "playing" | "recap";

const DURATIONS = [30, 60, 90];

// iOS exposes requestPermission as a static on DeviceOrientationEvent.
type DOEWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export default function Play({
  quotes,
  people,
  locations,
  initialMode = "who-said-this",
  onExit,
}: Props) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [deck, setDeck] = useState<DeckFilter>({ type: "all" });
  const [duration, setDuration] = useState(60);
  const [guesserId, setGuesserId] = useState<string>("");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [order, setOrder] = useState<Quote[]>([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<TurnResult[]>([]);
  const [flash, setFlash] = useState<"correct" | "pass" | null>(null);
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [crossStats, setCrossStats] = useState<{
    unmistakable?: { name: string; rate: number; n: number };
    chameleon?: { name: string; rate: number; n: number };
  }>({});

  const armedSign = useRef<number | null>(null);
  const resultsRef = useRef<TurnResult[]>([]);
  const orderRef = useRef<Quote[]>([]);
  const idxRef = useRef(0);
  const phaseRef = useRef<Phase>("setup");
  phaseRef.current = phase;

  const allTags = useMemo(
    () => [...new Set(quotes.flatMap(quoteTags))].sort(),
    [quotes]
  );

  const deckQuotes = useMemo(() => {
    switch (deck.type) {
      case "all":
        return quotes;
      case "speaker":
        return quotes.filter((q) => q.speakerId === deck.id);
      case "location":
        return quotes.filter((q) => q.locationId === deck.id);
      case "tag":
        return quotes.filter((q) => quoteTags(q).includes(deck.tag));
    }
  }, [quotes, deck]);

  const playable =
    mode === "context-only"
      ? deckQuotes.filter((q) => q.context)
      : deckQuotes;

  const advance = useCallback((correct: boolean) => {
    if (phaseRef.current !== "playing") return;
    const q = orderRef.current[idxRef.current];
    if (!q) return;
    resultsRef.current = [...resultsRef.current, { quoteId: q.id, correct }];
    setResults(resultsRef.current);
    if (navigator.vibrate) navigator.vibrate(correct ? 60 : [80, 40, 80]);
    setFlash(correct ? "correct" : "pass");
    setTimeout(() => setFlash(null), 250);
    const next = idxRef.current + 1;
    if (next >= orderRef.current.length) {
      endGame();
    } else {
      idxRef.current = next;
      setIdx(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endGame = useCallback(() => {
    setPhase("recap");
    const turns = resultsRef.current;
    if (turns.length > 0) {
      fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, deckFilter: deck, guesserId, turns }),
      })
        .then(() => fetch("/api/games"))
        .then((r) => r.json())
        .then(computeCrossStats)
        .then(setCrossStats)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, deck, guesserId]);

  // Countdown → playing
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Game timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      endGame();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, endGame]);

  // Tilt controls: arm while roughly vertical, fire when tipped past the
  // threshold. Same-sign gamma = tilted down (correct), flipped = up (pass).
  useEffect(() => {
    if (phase !== "playing" || !tiltEnabled) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      const g = e.gamma;
      if (g === null) return;
      const abs = Math.abs(g);
      if (abs > 55 && abs < 82) {
        armedSign.current = Math.sign(g);
      } else if (abs < 32 && armedSign.current !== null) {
        const down = Math.sign(g) === armedSign.current;
        armedSign.current = null; // require re-level before next action
        advance(down);
      }
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [phase, tiltEnabled, advance]);

  // Keep the screen awake during play, best-effort.
  useEffect(() => {
    if (phase !== "playing") return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [phase]);

  async function start() {
    // iOS requires the permission request inside a user gesture.
    try {
      const DOE = DeviceOrientationEvent as DOEWithPermission;
      if (typeof DOE?.requestPermission === "function") {
        const res = await DOE.requestPermission();
        setTiltEnabled(res === "granted");
      } else {
        setTiltEnabled("DeviceOrientationEvent" in window);
      }
    } catch {
      setTiltEnabled(false);
    }
    // Best-effort landscape lock.
    try {
      const so = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>;
      };
      await so.lock?.("landscape");
    } catch {}

    const shuffled = [...playable].sort(() => Math.random() - 0.5);
    orderRef.current = shuffled;
    resultsRef.current = [];
    idxRef.current = 0;
    setOrder(shuffled);
    setResults([]);
    setIdx(0);
    setTimeLeft(duration);
    setCountdown(3);
    setPhase("countdown");
  }

  /* ---------------------------------- setup ---------------------------------- */

  if (phase === "setup") {
    const deckBtn = (active: boolean) =>
      `px-2.5 py-1.5 text-xs border ${
        active ? "border-stamp text-stamp font-bold" : "border-ink/25 text-ink-faint"
      }`;
    return (
      <div className="mx-auto max-w-lg px-4 pb-10">
        <header className="pt-6 pb-4 flex items-center justify-between">
          <h1 className="stamp text-xl">Who Said This</h1>
          <button onClick={onExit} className="text-xs uppercase text-ink-faint">
            ← Ledger
          </button>
        </header>

        <div className="index-card p-4 space-y-5">
          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-ink-faint mb-2">
              Mode
            </h2>
            <div className="flex gap-2">
              <button
                className={deckBtn(mode === "who-said-this")}
                onClick={() => setMode("who-said-this")}
              >
                Who said this
              </button>
              <button
                className={deckBtn(mode === "context-only")}
                onClick={() => setMode("context-only")}
              >
                Context only (guess the quote)
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-ink-faint mb-2">
              Deck
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                className={deckBtn(deck.type === "all")}
                onClick={() => setDeck({ type: "all" })}
              >
                Everything ({quotes.length})
              </button>
              {people.map((p) => (
                <button
                  key={p.id}
                  className={deckBtn(deck.type === "speaker" && deck.id === p.id)}
                  onClick={() =>
                    setDeck({ type: "speaker", id: p.id, label: p.name })
                  }
                >
                  {p.name}
                </button>
              ))}
              {locations.map((l) => (
                <button
                  key={l.id}
                  className={deckBtn(deck.type === "location" && deck.id === l.id)}
                  onClick={() =>
                    setDeck({ type: "location", id: l.id, label: l.name })
                  }
                >
                  @ {l.name}
                </button>
              ))}
              {allTags.map((t) => (
                <button
                  key={t}
                  className={deckBtn(deck.type === "tag" && deck.tag === t)}
                  onClick={() => setDeck({ type: "tag", tag: t, label: t })}
                >
                  #{t}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-ink-faint mb-2">
              Duration
            </h2>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  className={deckBtn(duration === d)}
                  onClick={() => setDuration(d)}
                >
                  {d}s
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-ink-faint mb-2">
              Holding the phone
            </h2>
            <div className="flex flex-wrap gap-2">
              {people.map((p) => (
                <button
                  key={p.id}
                  className={deckBtn(guesserId === p.id)}
                  onClick={() => setGuesserId(guesserId === p.id ? "" : p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={start}
            disabled={playable.length === 0}
            className="w-full bg-ink text-paper py-4 text-sm uppercase tracking-widest disabled:opacity-40"
          >
            {playable.length === 0
              ? mode === "context-only"
                ? "No quotes with context in this deck"
                : "Deck is empty"
              : `Start — ${playable.length} cards`}
          </button>
          <p className="text-[11px] text-ink-faint leading-relaxed">
            Phone on the forehead, screen facing the room. Tilt <b>down</b> for
            correct, <b>up</b> to pass — or tap the bottom / top half of the
            screen. Turn the phone sideways.
          </p>
        </div>
      </div>
    );
  }

  /* -------------------------------- countdown -------------------------------- */

  if (phase === "countdown") {
    return (
      <div className="play-mode flex items-center justify-center">
        <span className="text-[30vw] font-bold leading-none">
          {countdown === 0 ? "GO" : countdown}
        </span>
      </div>
    );
  }

  /* --------------------------------- playing --------------------------------- */

  if (phase === "playing") {
    const q = order[idx];
    const display =
      mode === "context-only" ? q?.context ?? "" : q?.text ?? "";
    const len = display.length;
    const sizeClass =
      len < 40
        ? "text-[9vmax]"
        : len < 90
        ? "text-[7vmax]"
        : len < 160
        ? "text-[5.5vmax]"
        : "text-[4.5vmax]";
    return (
      <div
        className={`play-mode flex flex-col ${
          flash === "correct" ? "!bg-green-600" : flash === "pass" ? "!bg-amber-500" : ""
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-3 text-sm text-white/50">
          <span>
            {results.filter((r) => r.correct).length} ✓ · {timeLeft}s
          </span>
          {mode === "context-only" && q?.location && (
            <span>@ {q.location.name}</span>
          )}
          <button onClick={endGame} className="uppercase text-xs">
            end
          </button>
        </div>
        <div className="relative flex flex-1 items-center justify-center px-6 text-center">
          <p className={`${sizeClass} font-bold leading-tight break-words`}>
            {mode === "context-only" ? display : `“${display}”`}
          </p>
          {/* Tap zones — always available, tilt is a bonus */}
          <button
            aria-label="pass"
            className="absolute inset-x-0 top-0 h-1/2"
            onClick={() => advance(false)}
          />
          <button
            aria-label="correct"
            className="absolute inset-x-0 bottom-0 h-1/2"
            onClick={() => advance(true)}
          />
        </div>
        <div className="flex justify-between px-4 pb-3 text-[11px] uppercase tracking-widest text-white/35">
          <span>tap top / tilt up = pass</span>
          <span>tap bottom / tilt down = got it</span>
        </div>
      </div>
    );
  }

  /* ---------------------------------- recap ---------------------------------- */

  const score = results.filter((r) => r.correct).length;
  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <header className="pt-6 pb-4 flex items-center justify-between">
        <h1 className="stamp text-xl">Verdict: {score}/{results.length}</h1>
        <button onClick={onExit} className="text-xs uppercase text-ink-faint">
          ← Ledger
        </button>
      </header>

      <div className="space-y-2">
        {results.map((r, i) => {
          const q = order.find((x) => x.id === r.quoteId);
          if (!q) return null;
          return (
            <div key={i} className="index-card flex items-start gap-3 p-3">
              <span
                className={`mt-0.5 text-lg leading-none ${
                  r.correct ? "text-green-700" : "text-stamp"
                }`}
              >
                {r.correct ? "✓" : "✗"}
              </span>
              <div>
                <p className="text-sm italic">&ldquo;{q.text}&rdquo;</p>
                <p className="text-xs text-ink-faint">— {q.speaker.name}</p>
              </div>
            </div>
          );
        })}
        {results.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-faint">
            Not a single guess. The room has failed the record.
          </p>
        )}
      </div>

      {(crossStats.unmistakable || crossStats.chameleon) && (
        <div className="index-card mt-4 p-4">
          <h2 className="stamp text-xs">Across all games</h2>
          {crossStats.unmistakable && (
            <p className="mt-2 text-sm">
              <span className="text-[10px] uppercase tracking-widest text-ink-faint block">
                Most unmistakable
              </span>
              <strong>{crossStats.unmistakable.name}</strong>{" "}
              <span className="text-xs text-ink-faint">
                — identified {Math.round(crossStats.unmistakable.rate * 100)}% of
                the time ({crossStats.unmistakable.n} cards)
              </span>
            </p>
          )}
          {crossStats.chameleon && (
            <p className="mt-2 text-sm">
              <span className="text-[10px] uppercase tracking-widest text-ink-faint block">
                The chameleon
              </span>
              <strong>{crossStats.chameleon.name}</strong>{" "}
              <span className="text-xs text-ink-faint">
                — only {Math.round(crossStats.chameleon.rate * 100)}% (
                {crossStats.chameleon.n} cards). Could be anyone.
              </span>
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => setPhase("setup")}
        className="mt-4 w-full bg-ink text-paper py-3 text-sm uppercase tracking-widest"
      >
        Play again
      </button>
    </div>
  );
}

type GameWithTurns = {
  turns: { correct: boolean; quote: { speaker: { name: string } } }[];
};

function computeCrossStats(games: GameWithTurns[]) {
  const bySpeaker = new Map<string, { correct: number; total: number }>();
  for (const g of games)
    for (const t of g.turns) {
      const name = t.quote.speaker.name;
      const s = bySpeaker.get(name) ?? { correct: 0, total: 0 };
      s.total += 1;
      if (t.correct) s.correct += 1;
      bySpeaker.set(name, s);
    }
  const eligible = [...bySpeaker.entries()].filter(([, s]) => s.total >= 3);
  if (eligible.length < 2) return {};
  const rated = eligible
    .map(([name, s]) => ({ name, rate: s.correct / s.total, n: s.total }))
    .sort((a, b) => b.rate - a.rate);
  return {
    unmistakable: rated[0],
    chameleon: rated[rated.length - 1],
  };
}
