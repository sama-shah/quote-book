import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyQuote } from "@/lib/classify";

// Retry classification for a quote that was saved unclassified.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      speaker: true,
      location: true,
      witnesses: { include: { person: true } },
    },
  });
  if (!quote) return NextResponse.json({ error: "not found" }, { status: 404 });

  const allQuotes = await prisma.quote.findMany({ select: { tags: true } });
  const existingTags = [
    ...new Set(allQuotes.flatMap((q) => JSON.parse(q.tags) as string[])),
  ];

  const classification = await classifyQuote({
    text: quote.text,
    speaker: quote.speaker.name,
    location: quote.location?.name,
    context: quote.context ?? undefined,
    witnesses: quote.witnesses.map((w) => w.person.name),
    existingTags,
  });

  if (!classification) {
    return NextResponse.json({ error: "classification failed" }, { status: 502 });
  }

  const updated = await prisma.quote.update({
    where: { id },
    data: {
      verdict: classification.verdict,
      severity: classification.severity,
      tags: JSON.stringify(classification.tags),
    },
    include: {
      speaker: true,
      location: true,
      witnesses: { include: { person: true } },
    },
  });
  return NextResponse.json({ quote: updated, classified: true });
}
