import { createWriteStream, mkdirSync, existsSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import archiver from "archiver";
import PDFDocument from "pdfkit";
import { config } from "../config.js";
import { readImageBuffer } from "./storage.js";
import prisma from "../lib/prisma.js";

// config.dataDir may be absolute (e.g. /app/data in Docker) — join() does NOT
// treat an absolute second arg as an override, so guard with isAbsolute the
// same way storage.ts does. This must be the single source of truth for the
// export directory; the download route imports EXPORT_DIR from here so writes
// and reads can never drift to different paths.
const DATA_DIR = isAbsolute(config.dataDir)
  ? config.dataDir
  : join(process.cwd(), config.dataDir);
export const EXPORT_DIR = join(DATA_DIR, "exports");

function ensureExportDir() {
  if (!existsSync(EXPORT_DIR)) {
    mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

interface ReceiptRow {
  id: string;
  fileName: string;
  imagePath: string;
  merchant: string;
  category: string;
  total: number;
  currency: string;
  purchaseDate: string;
  capturedAt: Date;
  status: string;
}

export async function generateZip(receipts: ReceiptRow[]): Promise<string> {
  ensureExportDir();
  const exportId = randomUUID();
  const zipPath = join(EXPORT_DIR, `${exportId}.zip`);

  const buffers = await Promise.all(
    receipts.map(async (r) => ({
      buffer: await readImageBuffer(r.imagePath),
      name: `${r.fileName}.${r.imagePath.split(".").pop() || "jpg"}`,
    }))
  );

  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(zipPath));
    archive.on("error", reject);

    archive.pipe(output);

    for (const { buffer, name } of buffers) {
      archive.append(buffer, { name });
    }

    archive.finalize();
  });
}

export async function generatePdf(receipts: ReceiptRow[]): Promise<string> {
  ensureExportDir();
  const exportId = randomUUID();
  const pdfPath = join(EXPORT_DIR, `${exportId}.pdf`);

  const imageBuffers: Map<string, Buffer> = new Map();
  for (const r of receipts) {
    try {
      imageBuffers.set(r.id, await readImageBuffer(r.imagePath));
    } catch {
      // image not available
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(20).text("Expense Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toISOString().split("T")[0]}`, {
      align: "center",
    });
    doc.moveDown();

    let grandTotal = 0;

    for (const r of receipts) {
      const y = doc.y;
      if (y > 700) {
        doc.addPage();
      }

      doc
        .fontSize(14)
        .text(`${r.merchant || "Unknown"} — ${r.currency} ${r.total.toFixed(2)}`);
      doc.fontSize(10).text(`Date: ${r.purchaseDate || r.capturedAt.toISOString().split("T")[0]}`);
      doc.text(`Category: ${r.category}`);
      doc.text(`File: ${r.fileName}`);
      doc.moveDown(0.5);

      const imgBuf = imageBuffers.get(r.id);
      if (imgBuf) {
        doc.image(imgBuf, {
          fit: [400, 300],
          align: "center",
        });
      } else {
        doc.fontSize(10).text("[Image not available]", { align: "center" });
      }

      doc.moveDown();
      grandTotal += r.total;
    }

    doc.moveDown();
    doc
      .fontSize(14)
      .text(`Grand Total: ${receipts[0]?.currency || "USD"} ${grandTotal.toFixed(2)}`, {
        align: "right",
      });

    doc.end();

    stream.on("finish", () => resolve(pdfPath));
    doc.on("error", reject);
  });
}

export async function generateCsv(receipts: ReceiptRow[]): Promise<string> {
  ensureExportDir();
  const exportId = randomUUID();
  const csvPath = join(EXPORT_DIR, `${exportId}.csv`);

  const headers = [
    "File",
    "Merchant",
    "Category",
    "Date",
    "Currency",
    "Total",
    "Status",
  ];
  const rows = receipts.map((r) =>
    [
      r.fileName,
      `"${(r.merchant || "").replace(/"/g, '""')}"`,
      r.category,
      r.purchaseDate || r.capturedAt.toISOString().split("T")[0],
      r.currency,
      r.total.toFixed(2),
      r.status,
    ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(csvPath, csv, "utf-8");
  return csvPath;
}
