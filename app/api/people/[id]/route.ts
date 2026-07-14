import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveImage } from "@/lib/storage";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data: {
    bio?: string | null;
    birthday?: Date | null;
    nicknames?: string;
    photoUrl?: string;
  } = {};

  if ("bio" in body) data.bio = body.bio?.trim() || null;
  if ("birthday" in body)
    data.birthday = body.birthday ? new Date(body.birthday) : null;
  if ("nicknames" in body && Array.isArray(body.nicknames)) {
    data.nicknames = JSON.stringify(
      body.nicknames.map((n: string) => n.trim()).filter(Boolean)
    );
  }
  if (body.photo?.base64) {
    data.photoUrl = await saveImage(
      body.photo.base64,
      body.photo.mediaType ?? "image/jpeg"
    );
  }

  const person = await prisma.person.update({ where: { id }, data });
  return NextResponse.json(person);
}
