// Client-side shapes of the API's JSON responses.

export type Person = {
  id: string;
  name: string;
  avatarColor: string;
  photoUrl?: string | null;
  bio?: string | null;
  birthday?: string | null;
  nicknames?: string; // JSON array
};

export function personNicknames(p: Person): string[] {
  try {
    return JSON.parse(p.nicknames ?? "[]");
  } catch {
    return [];
  }
}

export type Location = {
  id: string;
  name: string;
  _count?: { quotes: number };
};

export type Quote = {
  id: string;
  text: string;
  speakerId: string;
  speaker: Person;
  locationId: string | null;
  location: Location | null;
  context: string | null;
  imageUrl: string | null;
  severity: number | null;
  verdict: string | null;
  tags: string; // JSON array
  createdAt: string;
  occurredAt: string;
  witnesses: { personId: string; person: Person }[];
};

export function quoteTags(q: Quote): string[] {
  try {
    return JSON.parse(q.tags);
  } catch {
    return [];
  }
}

export type DeckFilter =
  | { type: "all" }
  | { type: "speaker"; id: string; label: string }
  | { type: "location"; id: string; label: string }
  | { type: "tag"; tag: string; label: string };

export type GameMode = "who-said-this" | "context-only";

export type TurnResult = {
  quoteId: string;
  correct: boolean;
};
