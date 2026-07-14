# The Ledger

A mobile-first archive of the things people say — and a party game built out of it.

**Capture** a quote with its full metadata (speaker, witnesses, location, time, context, photo). Claude reads each submission and returns a one-line **verdict**, a **severity** rating (1–5), and freeform **tags** it invents as the archive grows. Browse the record as a **Timeline** (grouped by night), a **Map** (locations sized by quote count), or the **Cast** (per-person rap sheets with live superlatives).

Then put the phone on your forehead. **Who Said This** is Heads Up with your own group's quotes: the room reads the quote aloud, the holder guesses who said it. Tilt down = correct, tilt up = pass (tap zones work everywhere). **Context Only** mode shows just the setup line and the room has to guess the quote itself. Cross-game stats name the most unmistakable person and the biggest chameleon.

## Setup

```bash
npm install
cp .env.example .env        # add your ANTHROPIC_API_KEY
npx prisma migrate dev      # creates prisma/dev.db
npm run dev
```

Open http://localhost:3000 — on your phone, use your machine's LAN IP (e.g. `http://192.168.1.x:3000`) so the game works in hand.

Quotes still save if the API key is missing or a classification fails; a "Request ruling again" button retries.

## Stack

- Next.js (App Router, TypeScript) + Tailwind
- SQLite via Prisma (`prisma/schema.prisma`)
- Anthropic API (`claude-sonnet-4-6`) called server-side from route handlers — the key never reaches the client
- Photos are stored in `public/uploads/` behind a single module (`lib/storage.ts`) so it can be swapped for blob storage

## Notes for the demo

- **Tilt controls**: iOS requires a permission prompt, which fires on the Start tap. If denied (or on desktop), tap the bottom half for correct and the top half for pass — always active.
- **Play mode** is full black/white with huge type; everything else is the evidence room.
- The tag taxonomy is emergent: existing tags are passed back to Claude on every classification so it reuses them when they fit and only invents new ones when nothing does.
