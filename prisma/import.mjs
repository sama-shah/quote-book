// One-time import of the pre-Postgres SQLite export (prisma/export.json).
// Safe to re-run: upserts by id.
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();
const data = JSON.parse(fs.readFileSync("prisma/export.json", "utf8"));

for (const p of data.people) {
  const { id, ...rest } = p;
  await prisma.person.upsert({ where: { id }, create: { id, ...rest }, update: rest });
}
for (const l of data.locations) {
  const { id, ...rest } = l;
  await prisma.location.upsert({ where: { id }, create: { id, ...rest }, update: rest });
}
for (const q of data.quotes) {
  const { id, witnesses, ...rest } = q;
  await prisma.quote.upsert({
    where: { id },
    create: {
      id,
      ...rest,
      witnesses: { create: witnesses.map((w) => ({ personId: w.personId })) },
    },
    update: rest,
  });
}

console.log(
  `imported ${data.people.length} people, ${data.locations.length} locations, ${data.quotes.length} quotes`
);
await prisma.$disconnect();
