import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const COLORS = [
  "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400",
  "#16a085", "#7f8c8d", "#2c3e50", "#a04000", "#6c3483",
];

export async function GET() {
  const people = await prisma.person.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(people);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const trimmed = name.trim();
  const existing = await prisma.person.findUnique({ where: { name: trimmed } });
  if (existing) return NextResponse.json(existing);
  const count = await prisma.person.count();
  const person = await prisma.person.create({
    data: { name: trimmed, avatarColor: COLORS[count % COLORS.length] },
  });
  return NextResponse.json(person);
}
