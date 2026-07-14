import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyQuote } from "@/lib/classify";
import { saveImage } from "@/lib/storage";

const quoteInclude = {
  speaker: true,
  location: true,
  witnesses: { include: { person: true } },
} as const;

export async function GET() {
  const quotes = await prisma.quote.findMany({
    orderBy: { occurredAt: "desc" },
    include: quoteInclude,
  });
  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    text,
    speakerName,
    locationName,
    context,
    witnessNames = [],
    occurredAt,
    image, // { base64, mediaType } | undefined
  } = body;

  if (!text?.trim() || !speakerName?.trim()) {
    return NextResponse.json(
      { error: "text and speakerName required" },
      { status: 400 }
    );
  }

  // Upsert speaker, witnesses, location.
  const speaker = await upsertPerson(speakerName);
  const witnesses = await Promise.all(
    (witnessNames as string[])
      .filter((n) => n.trim() && n.trim() !== speakerName.trim())
      .map(upsertPerson)
  );
  const location = locationName?.trim()
    ? await prisma.location.upsert({
        where: { name: locationName.trim() },
        create: { name: locationName.trim() },
        update: {},
      })
    : null;

  const imageUrl = image?.base64
    ? await saveImage(image.base64, image.mediaType ?? "image/jpeg")
    : null;

  // Gather existing tags so the taxonomy converges instead of exploding.
  const allQuotes = await prisma.quote.findMany({ select: { tags: true } });
  const existingTags = [
    ...new Set(allQuotes.flatMap((q) => JSON.parse(q.tags) as string[])),
  ];

  const classification = await classifyQuote({
    text: text.trim(),
    speaker: speaker.name,
    location: location?.name,
    context: context?.trim() || undefined,
    witnesses: witnesses.map((w) => w.name),
    existingTags,
    image: image?.base64
      ? { base64: image.base64, mediaType: image.mediaType ?? "image/jpeg" }
      : undefined,
  });

  const quote = await prisma.quote.create({
    data: {
      text: text.trim(),
      speakerId: speaker.id,
      locationId: location?.id,
      context: context?.trim() || null,
      imageUrl,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      verdict: classification?.verdict ?? null,
      severity: classification?.severity ?? null,
      tags: JSON.stringify(classification?.tags ?? []),
      witnesses: {
        create: witnesses.map((w) => ({ personId: w.id })),
      },
    },
    include: quoteInclude,
  });

  return NextResponse.json({ quote, classified: classification !== null });
}

const COLORS = [
  "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400",
  "#16a085", "#7f8c8d", "#2c3e50", "#a04000", "#6c3483",
];

// Case-insensitive match on name OR nickname, so "saborni" doesn't create a
// duplicate of "Saborni" and "the professor" resolves to whoever earned it.
async function upsertPerson(name: string) {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const all = await prisma.person.findMany();
  const existing = all.find((p) => {
    if (p.name.toLowerCase() === lower) return true;
    try {
      return (JSON.parse(p.nicknames) as string[]).some(
        (n) => n.toLowerCase() === lower
      );
    } catch {
      return false;
    }
  });
  if (existing) return existing;
  return prisma.person.create({
    data: { name: trimmed, avatarColor: COLORS[all.length % COLORS.length] },
  });
}
