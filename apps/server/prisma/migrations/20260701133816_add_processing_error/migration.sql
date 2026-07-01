-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imagePath" TEXT NOT NULL,
    "thumbnailPath" TEXT NOT NULL,
    "merchant" TEXT NOT NULL DEFAULT '',
    "locationCity" TEXT NOT NULL DEFAULT '',
    "locationAddress" TEXT NOT NULL DEFAULT '',
    "purchaseDate" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "tip" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "paymentMethod" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "aiRaw" TEXT NOT NULL DEFAULT '{}',
    "aiConfidence" REAL NOT NULL DEFAULT 0,
    "aiModel" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "processingError" TEXT NOT NULL DEFAULT '',
    "userEdited" BOOLEAN NOT NULL DEFAULT false,
    "fileName" TEXT NOT NULL DEFAULT '',
    "tripId" TEXT,
    CONSTRAINT "Receipt_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Receipt" ("aiConfidence", "aiModel", "aiRaw", "capturedAt", "category", "createdAt", "currency", "fileName", "id", "imagePath", "locationAddress", "locationCity", "merchant", "notes", "paymentMethod", "purchaseDate", "status", "subtotal", "tax", "thumbnailPath", "tip", "total", "tripId", "userEdited") SELECT "aiConfidence", "aiModel", "aiRaw", "capturedAt", "category", "createdAt", "currency", "fileName", "id", "imagePath", "locationAddress", "locationCity", "merchant", "notes", "paymentMethod", "purchaseDate", "status", "subtotal", "tax", "thumbnailPath", "tip", "total", "tripId", "userEdited" FROM "Receipt";
DROP TABLE "Receipt";
ALTER TABLE "new_Receipt" RENAME TO "Receipt";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
