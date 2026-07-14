import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const games = await prisma.game.findMany({
    include: {
      turns: {
        include: { quote: { include: { speaker: true } }, guesser: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(games);
}

export async function POST(req: NextRequest) {
  const { mode, deckFilter, guesserId, turns } = await req.json();
  if (!mode || !Array.isArray(turns)) {
    return NextResponse.json({ error: "mode and turns required" }, { status: 400 });
  }
  const game = await prisma.game.create({
    data: {
      mode,
      deckFilter: JSON.stringify(deckFilter ?? {}),
      guesserId: guesserId || null,
      turns: {
        create: turns.map(
          (t: { quoteId: string; correct: boolean; guessedSpeakerId?: string }) => ({
            quoteId: t.quoteId,
            correct: !!t.correct,
            guesserId: guesserId || null,
            guessedSpeakerId: t.guessedSpeakerId || null,
          })
        ),
      },
    },
    include: { turns: true },
  });
  return NextResponse.json(game);
}
