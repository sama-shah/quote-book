-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL,
    "photoUrl" TEXT,
    "bio" TEXT,
    "birthday" DATETIME,
    "nicknames" TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO "new_Person" ("avatarColor", "id", "name") SELECT "avatarColor", "id", "name" FROM "Person";
DROP TABLE "Person";
ALTER TABLE "new_Person" RENAME TO "Person";
CREATE UNIQUE INDEX "Person_name_key" ON "Person"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
