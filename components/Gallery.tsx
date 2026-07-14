"use client";

import { useMemo, useRef, useState } from "react";
import type { Person, Quote } from "@/lib/types";
import { personNicknames, quoteTags } from "@/lib/types";

type Props = {
  people: Person[];
  quotes: Quote[];
  onChanged: () => void;
};

/* Days until the next occurrence of a birthday (0 = today). */
function daysUntilBirthday(birthday: string): number {
  const b = new Date(birthday);
  const now = new Date();
  const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
  if (
    next < new Date(now.getFullYear(), now.getMonth(), now.getDate())
  ) {
    next.setFullYear(now.getFullYear() + 1);
  }
  return Math.round(
    (next.getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86400000
  );
}

export default function Gallery({ people, quotes, onChanged }: Props) {
  const [selected, setSelected] = useState<Person | null>(null);

  // Birthday spotlight: anyone today, else the nearest upcoming birthday.
  const spotlight = useMemo(() => {
    const withBday = people
      .filter((p) => p.birthday)
      .map((p) => ({ person: p, days: daysUntilBirthday(p.birthday!) }))
      .sort((a, b) => a.days - b.days);
    if (withBday.length === 0) return null;
    const today = withBday.filter((x) => x.days === 0);
    return { today, next: today.length > 0 ? null : withBday[0] };
  }, [people]);

  function greatestHits(personId: string): Quote[] {
    return quotes
      .filter((q) => q.speakerId === personId)
      .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
      .slice(0, 3);
  }

  return (
    <div className="space-y-5">
      {/* ------------------------- birthday spotlight ------------------------- */}
      {spotlight && (
        <div className="index-card p-4">
          {spotlight.today.length > 0 ? (
            spotlight.today.map(({ person }) => (
              <div key={person.id}>
                <span className="stamp text-xs">Born on this day</span>
                <p className="mt-2 text-sm">
                  It is <strong>{person.name}</strong>&apos;s birthday. The
                  record will now speak for them.
                </p>
                <div className="mt-2 space-y-2">
                  {greatestHits(person.id).map((q) => (
                    <blockquote
                      key={q.id}
                      className="border-l-2 border-stamp pl-2 text-sm italic"
                    >
                      &ldquo;{q.text}&rdquo;
                      {q.severity && (
                        <span className="not-italic text-xs text-ink-faint">
                          {" "}
                          ({q.severity}/5)
                        </span>
                      )}
                    </blockquote>
                  ))}
                  {greatestHits(person.id).length === 0 && (
                    <p className="text-xs text-ink-faint">
                      No quotes on record. A clean rap sheet — suspicious.
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-ink-faint">
              Next birthday: <strong>{spotlight.next!.person.name}</strong>{" "}
              in {spotlight.next!.days} day
              {spotlight.next!.days === 1 ? "" : "s"} — start collecting
              material.
            </p>
          )}
        </div>
      )}

      {/* ----------------------------- photo grid ----------------------------- */}
      <div className="grid grid-cols-3 gap-3">
        {people.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className="group flex flex-col items-center gap-1.5"
          >
            <span className="index-card flex aspect-square w-full items-center justify-center overflow-hidden rounded-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow-[3px_3px_0_var(--color-stamp)]">
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.photoUrl}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ background: p.avatarColor }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            <span className="text-[10px] uppercase tracking-widest">
              {p.name}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <BiodataModal
          person={selected}
          quotes={quotes}
          onClose={() => setSelected(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

/* ------------------------------ biodata modal ------------------------------ */

function BiodataModal({
  person,
  quotes,
  onClose,
  onChanged,
}: {
  person: Person;
  quotes: Quote[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(person.bio ?? "");
  const [birthday, setBirthday] = useState(
    person.birthday ? person.birthday.slice(0, 10) : ""
  );
  const [nicknames, setNicknames] = useState(
    personNicknames(person).join(", ")
  );
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const said = quotes.filter((q) => q.speakerId === person.id);
  const witnessed = quotes.filter((q) =>
    q.witnesses.some((w) => w.personId === person.id)
  );
  const severities = said
    .map((q) => q.severity)
    .filter((s): s is number => s !== null);
  const avg =
    severities.length > 0
      ? (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)
      : null;
  const worst = [...said].sort(
    (a, b) => (b.severity ?? 0) - (a.severity ?? 0)
  )[0];
  const tagCounts = new Map<string, number>();
  for (const q of said)
    for (const t of quoteTags(q)) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  async function save(photo?: { base64: string; mediaType: string }) {
    setBusy(true);
    try {
      await fetch(`/api/people/${person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          birthday: birthday || null,
          nicknames: nicknames.split(",").map((n) => n.trim()).filter(Boolean),
          ...(photo ? { photo } : {}),
        }),
      });
      onChanged();
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(f: File | undefined) {
    if (!f) return;
    const buf = await f.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    await save({ base64: btoa(binary), mediaType: f.type || "image/jpeg" });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="index-card max-h-[85vh] w-full max-w-md overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <span className="stamp text-xs">Biodata</span>
          <button onClick={onClose} className="text-xl leading-none">
            ×
          </button>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            className="relative shrink-0"
            onClick={() => fileRef.current?.click()}
            title="Upload photo"
          >
            {person.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.photoUrl}
                alt={person.name}
                className="h-24 w-24 border border-ink/25 object-cover"
              />
            ) : (
              <span
                className="flex h-24 w-24 items-center justify-center text-2xl font-bold text-white"
                style={{ background: person.avatarColor }}
              >
                {person.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="absolute -bottom-1 -right-1 bg-ink px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-paper">
              photo
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
          <div>
            <h2 className="text-lg font-bold">{person.name}</h2>
            {personNicknames(person).length > 0 && (
              <p className="text-xs text-ink-faint">
                a.k.a. {personNicknames(person).join(", ")}
              </p>
            )}
            {person.birthday && (
              <p className="text-xs text-ink-faint">
                b.{" "}
                {new Date(person.birthday).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
        </div>

        {person.bio && !editing && <p className="mt-3 text-sm">{person.bio}</p>}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Quotes" value={String(said.length)} />
          <Stat label="Witnessed" value={String(witnessed.length)} />
          <Stat label="Avg severity" value={avg ?? "—"} />
        </div>

        {topTags.length > 0 && (
          <p className="mt-3 text-xs text-ink-faint">
            signature offenses: {topTags.join(", ")}
          </p>
        )}
        {worst && (
          <blockquote className="mt-2 border-l-2 border-stamp pl-2 text-sm italic">
            &ldquo;{worst.text}&rdquo;
            {worst.severity && (
              <span className="not-italic text-xs text-ink-faint">
                {" "}
                ({worst.severity}/5)
              </span>
            )}
          </blockquote>
        )}

        {editing ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-faint mb-1">
                Nicknames (comma-separated)
              </label>
              <input
                className="w-full border border-ink/25 bg-card px-3 py-2 text-sm"
                value={nicknames}
                onChange={(e) => setNicknames(e.target.value)}
                placeholder="the professor, dennys enjoyer"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-faint mb-1">
                Birthday
              </label>
              <input
                type="date"
                className="w-full border border-ink/25 bg-card px-3 py-2 text-sm"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-faint mb-1">
                Bio
              </label>
              <textarea
                className="min-h-20 w-full border border-ink/25 bg-card px-3 py-2 text-sm"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Known associates, habits, priors…"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => save()}
                disabled={busy}
                className="flex-1 bg-ink py-2 text-xs uppercase tracking-widest text-paper disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="border border-ink/25 px-4 text-xs uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="mt-4 w-full border border-ink/25 py-2 text-xs uppercase tracking-widest"
          >
            Edit biodata
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/15 py-2">
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-widest text-ink-faint">
        {label}
      </p>
    </div>
  );
}
