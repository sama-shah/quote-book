"use client";

import { useRef, useState } from "react";
import type { Person, Location, Quote } from "@/lib/types";
import { quoteTags } from "@/lib/types";

type Props = {
  people: Person[];
  locations: Location[];
  onSaved: () => void;
};

export default function CaptureForm({ people, locations, onSaved }: Props) {
  const [text, setText] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [locationName, setLocationName] = useState("");
  const [context, setContext] = useState("");
  const [witnesses, setWitnesses] = useState<string[]>([]);
  const [newWitness, setNewWitness] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );
  const [image, setImage] = useState<{ base64: string; mediaType: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ quote: Quote; classified: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleWitness(name: string) {
    setWitnesses((w) =>
      w.includes(name) ? w.filter((x) => x !== name) : [...w, name]
    );
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    const buf = await f.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    setImage({ base64: btoa(binary), mediaType: f.type || "image/jpeg" });
  }

  async function submit() {
    if (!text.trim() || !speaker.trim()) {
      setError("A quote and a speaker. That is the minimum for evidence.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          speakerName: speaker,
          locationName: locationName || undefined,
          context: context || undefined,
          witnessNames: witnesses,
          occurredAt: new Date(occurredAt).toISOString(),
          image: image ?? undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setText("");
      setContext("");
      setImage(null);
      if (fileRef.current) fileRef.current.value = "";
      onSaved();
    } catch {
      setError("Filing failed. The clerk is unreliable. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function retryClassify(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/quotes/${id}/classify`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setResult({ quote: data.quote, classified: true });
        onSaved();
      }
    } finally {
      setBusy(false);
    }
  }

  const label = "block text-[10px] uppercase tracking-widest text-ink-faint mb-1";
  const input =
    "w-full bg-card border border-ink/25 px-3 py-2.5 text-sm focus:outline-none focus:border-stamp";

  return (
    <div className="space-y-4">
      <div className="index-card p-4 space-y-4">
        <div>
          <label className={label}>Exhibit — the quote *</label>
          <textarea
            className={`${input} min-h-20 text-base`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did they say."
          />
        </div>

        <div>
          <label className={label}>Speaker *</label>
          <input
            className={input}
            list="people-list"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            placeholder="Who said it"
          />
          <datalist id="people-list">
            {people.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </div>

        <div>
          <label className={label}>Witnesses</label>
          <div className="flex flex-wrap gap-2">
            {people
              .filter((p) => p.name !== speaker.trim())
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleWitness(p.name)}
                  className={`px-2.5 py-1 text-xs border ${
                    witnesses.includes(p.name)
                      ? "border-stamp text-stamp font-bold"
                      : "border-ink/25 text-ink-faint"
                  }`}
                >
                  {p.name}
                </button>
              ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className={input}
              value={newWitness}
              onChange={(e) => setNewWitness(e.target.value)}
              placeholder="Add someone new"
            />
            <button
              type="button"
              className="shrink-0 border border-ink/25 px-3 text-xs uppercase"
              onClick={() => {
                if (newWitness.trim()) {
                  setWitnesses((w) => [...new Set([...w, newWitness.trim()])]);
                  setNewWitness("");
                }
              }}
            >
              Add
            </button>
          </div>
          {witnesses.filter((w) => !people.some((p) => p.name === w)).length > 0 && (
            <p className="mt-1 text-xs text-ink-faint">
              New: {witnesses.filter((w) => !people.some((p) => p.name === w)).join(", ")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Location</label>
            <input
              className={input}
              list="locations-list"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="The 2am Denny's"
            />
            <datalist id="locations-list">
              {locations.map((l) => (
                <option key={l.id} value={l.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={label}>When</label>
            <input
              type="datetime-local"
              className={input}
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={label}>Context — one line of setup</label>
          <input
            className={input}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Optional but encouraged"
          />
        </div>

        <div>
          <label className={label}>Photo evidence</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="text-xs"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {image && <span className="ml-2 text-xs text-stamp">attached ✓</span>}
        </div>

        <button
          onClick={submit}
          disabled={busy}
          className="w-full bg-ink text-paper py-3 text-sm uppercase tracking-widest disabled:opacity-50"
        >
          {busy ? "Filing…" : "File the evidence"}
        </button>
        {error && <p className="text-xs text-stamp">{error}</p>}
      </div>

      {result && (
        <div className="index-card p-4">
          <span className="stamp text-xs">Filed</span>
          <blockquote className="mt-3 text-sm italic">
            &ldquo;{result.quote.text}&rdquo;
          </blockquote>
          <p className="mt-1 text-xs text-ink-faint">
            — {result.quote.speaker.name}
          </p>
          {result.classified && result.quote.verdict ? (
            <>
              <p className="mt-3 text-sm">{result.quote.verdict}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-stamp font-bold">
                  Severity {result.quote.severity}/5
                </span>
                {quoteTags(result.quote).map((t) => (
                  <span key={t} className="border border-ink/25 px-1.5 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-3">
              <p className="text-xs text-ink-faint">
                Saved, but the archivist declined to rule. (Is ANTHROPIC_API_KEY
                set?)
              </p>
              <button
                onClick={() => retryClassify(result.quote.id)}
                disabled={busy}
                className="mt-2 border border-ink/25 px-3 py-1 text-xs uppercase"
              >
                Request ruling again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
