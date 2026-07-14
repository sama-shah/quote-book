import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CAST = [
  "Jayanti", "Jena", "Sasha", "Mahija", "Shailee", "Saborni", "Sama",
  "Amay", "Lak", "Anshul", "Natalia", "Anush", "Rajvir", "Deepak",
  "Kyle", "Ronit", "Samarth", "Wallace", "Aryan", "Paul", "Ryan",
];

const COLORS = [
  "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400",
  "#16a085", "#7f8c8d", "#2c3e50", "#a04000", "#6c3483",
];

for (let i = 0; i < CAST.length; i++) {
  await prisma.person.upsert({
    where: { name: CAST[i] },
    create: { name: CAST[i], avatarColor: COLORS[i % COLORS.length] },
    update: {},
  });
}

console.log(`Seeded ${CAST.length} people.`);
await prisma.$disconnect();
