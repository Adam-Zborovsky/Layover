import type { FastifyInstance } from "fastify";
import prisma from "../lib/prisma.js";
import { generateZip, generatePdf, generateCsv } from "../services/export.js";
import { exportRequestSchema } from "@recipts/shared";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export async function exportRoutes(app: FastifyInstance) {
  app.post("/export", async (request, reply) => {
    const body = exportRequestSchema.parse(request.body);
    const { receiptIds, formats } = body;

    const receipts = await prisma.receipt.findMany({
      where: { id: { in: receiptIds } },
    });

    if (!receipts.length) {
      return reply.status(400).send({ error: "Bad Request", message: "No receipts found", statusCode: 400 });
    }

    const results: { format: string; path: string }[] = [];

    for (const format of formats) {
      if (format === "zip") {
        const path = await generateZip(receipts);
        results.push({ format: "zip", path });
      } else if (format === "pdf") {
        const path = await generatePdf(receipts);
        results.push({ format: "pdf", path });
      } else if (format === "csv") {
        const path = await generateCsv(receipts);
        results.push({ format: "csv", path });
      }
    }

    for (const result of results) {
      await prisma.exportLog.create({
        data: {
          format: result.format,
          receiptIds: JSON.stringify(receiptIds),
          filePath: result.path,
        },
      });
    }

    return { results };
  });

  app.get("/export/:path", async (request, reply) => {
    const { path } = request.params as { path: string };
    const safePath = path.replace(/\.\./g, "").replace(/[\/\\]/g, "");
    const dataDir = join(process.cwd(), "../../data/exports");
    const fullPath = join(dataDir, safePath);

    if (!existsSync(fullPath)) {
      return reply.status(404).send({ error: "Not Found", message: "Export not found", statusCode: 404 });
    }

    const buffer = readFileSync(fullPath);
    const ext = safePath.split(".").pop();
    const mimeTypes: Record<string, string> = {
      zip: "application/zip",
      pdf: "application/pdf",
      csv: "text/csv",
    };

    return reply.type(mimeTypes[ext || "zip"] || "application/octet-stream").send(buffer);
  });

  app.get("/export/log", async () => {
    return prisma.exportLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  });
}
