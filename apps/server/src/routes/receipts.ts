import type { FastifyInstance } from "fastify";
import prisma from "../lib/prisma.js";
import { saveImage, deleteImage, imageToBase64, readImageBuffer } from "../services/storage.js";
import { extractReceipt } from "../services/gemini.js";
import { deriveFileName, resolveCollision } from "../services/filename.js";
import { receiptCreateSchema, receiptUpdateSchema, receiptListQuerySchema } from "@recipts/shared";
import type { ReceiptCategory } from "@recipts/shared";

async function processReceipt(receiptId: string, imageBase64: string, mimeType: string, model?: "gemini-2.5-flash" | "gemini-2.5-pro") {
  try {
    let finalResult;
    let usedModel: string;

    if (model) {
      finalResult = await extractReceipt(imageBase64, mimeType, model);
      usedModel = model;
    } else {
      const result = await extractReceipt(imageBase64, mimeType, "gemini-2.5-flash");
      usedModel = "gemini-2.5-flash";
      finalResult = result;

      if (result.confidence < 0.6 || result.total === 0) {
        try {
          const proResult = await extractReceipt(imageBase64, mimeType, "gemini-2.5-pro");
          finalResult = proResult;
          usedModel = "gemini-2.5-pro";
        } catch {
          // keep flash result if pro fails
        }
      }
    }

    const status = finalResult.confidence < 0.6 ? "NEEDS_REVIEW" : "CONFIRMED";

    const receipt = await prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt) return;

    const fileName = deriveFileName({
      capturedAt: receipt.capturedAt,
      merchant: finalResult.merchant,
      category: finalResult.suggestedCategory,
      total: finalResult.total,
      currency: finalResult.currency,
    });

    const allReceipts = await prisma.receipt.findMany({ select: { fileName: true } });
    const ext = receipt.imagePath.split(".").pop() || "jpg";
    const existingNames = allReceipts.filter(r => r.fileName).map(r => r.fileName);
    const resolvedName = fileName; // fileName is already the full name, resolve collision applies at imagePath level

    await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        merchant: finalResult.merchant,
        locationCity: finalResult.locationCity,
        locationAddress: finalResult.locationAddress,
        purchaseDate: finalResult.purchaseDate,
        currency: finalResult.currency,
        subtotal: finalResult.subtotal,
        tax: finalResult.tax,
        tip: finalResult.tip,
        total: finalResult.total,
        category: finalResult.suggestedCategory,
        paymentMethod: finalResult.paymentMethod,
        aiRaw: JSON.stringify(finalResult),
        aiConfidence: finalResult.confidence,
        aiModel: usedModel,
        status,
        fileName: resolvedName,
      },
    });

    if (finalResult.lineItems?.length) {
      await prisma.lineItem.deleteMany({ where: { receiptId } });
      await prisma.lineItem.createMany({
        data: finalResult.lineItems.map((li) => ({
          receiptId,
          description: li.description,
          amount: li.amount,
        })),
      });
    }
  } catch (err) {
    await prisma.receipt.update({
      where: { id: receiptId },
      data: { status: "FAILED" },
    });
  }
}

export async function receiptRoutes(app: FastifyInstance) {
  app.post("/receipts", async (request, reply) => {
    const body = receiptCreateSchema.parse(request.body);
    const { imageBase64, mimeType, tripId } = body;

    const { imagePath, thumbnailPath } = await saveImage(imageBase64, mimeType);

    const receipt = await prisma.receipt.create({
      data: {
        imagePath,
        thumbnailPath,
        tripId: tripId || null,
        status: "PROCESSING",
        fileName: `${new Date().toISOString().split("T")[0]}_Processing.jpg`,
      },
    });

    processReceipt(receipt.id, imageBase64, mimeType).catch((err) => {
      console.error("Receipt processing failed:", err);
    });

    return reply.status(201).send(receipt);
  });

  app.get("/receipts", async (request) => {
    const query = receiptListQuerySchema.parse(request.query);
    const { page, pageSize, category, status, tripId, search, needsReview, startDate, endDate, sortBy, sortOrder } = query;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (tripId) where.tripId = tripId;
    if (needsReview) where.status = "NEEDS_REVIEW";
    if (startDate) where.purchaseDate = { ...(where.purchaseDate as object || {}), gte: startDate };
    if (endDate) where.purchaseDate = { ...(where.purchaseDate as object || {}), lte: endDate };
    if (search) {
      where.OR = [
        { merchant: { contains: search } },
        { locationCity: { contains: search } },
        { locationAddress: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          capturedAt: true,
          thumbnailPath: true,
          merchant: true,
          total: true,
          currency: true,
          category: true,
          status: true,
          tripId: true,
          fileName: true,
        },
      }),
      prisma.receipt.count({ where }),
    ]);

    return { items, total, page, pageSize };
  });

  app.get("/receipts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: { lineItems: true, trip: true },
    });

    if (!receipt) {
      return reply.status(404).send({ error: "Not Found", message: "Receipt not found", statusCode: 404 });
    }

    return receipt;
  });

  app.patch("/receipts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = receiptUpdateSchema.parse(request.body);

    const existing = await prisma.receipt.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Not Found", message: "Receipt not found", statusCode: 404 });
    }

    const updated = await prisma.receipt.update({
      where: { id },
      data: {
        ...body,
        userEdited: true,
        fileName: deriveFileName({
          capturedAt: existing.capturedAt,
          merchant: body.merchant || existing.merchant,
          category: (body.category || existing.category) as ReceiptCategory,
          total: body.total ?? existing.total,
          currency: body.currency || existing.currency,
        }),
      },
    });

    return updated;
  });

  app.post("/receipts/:id/reprocess", async (request, reply) => {
    const { id } = request.params as { id: string };
    const modelParam = (request.query as { model?: string }).model;
    const model = modelParam === "pro" ? "gemini-2.5-pro" as const : "gemini-2.5-flash" as const;

    const receipt = await prisma.receipt.findUnique({ where: { id } });
    if (!receipt) {
      return reply.status(404).send({ error: "Not Found", message: "Receipt not found", statusCode: 404 });
    }

    await prisma.receipt.update({
      where: { id },
      data: { status: "PROCESSING" },
    });

    const imageBuf = await readImageBuffer(receipt.imagePath);
    const mimeType = receipt.imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
    const base64 = imageBuf.toString("base64");

    processReceipt(id, base64, mimeType, model);

    return { status: "PROCESSING" };
  });

  app.delete("/receipts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const receipt = await prisma.receipt.findUnique({ where: { id } });

    if (!receipt) {
      return reply.status(404).send({ error: "Not Found", message: "Receipt not found", statusCode: 404 });
    }

    await deleteImage(receipt.imagePath);
    await deleteImage(receipt.thumbnailPath);
    await prisma.receipt.delete({ where: { id } });

    return reply.status(204).send();
  });

  app.get("/receipts/:id/image", async (request, reply) => {
    const { id } = request.params as { id: string };
    const receipt = await prisma.receipt.findUnique({ where: { id } });

    if (!receipt) {
      return reply.status(404).send({ error: "Not Found", message: "Receipt not found", statusCode: 404 });
    }

    const buffer = await readImageBuffer(receipt.imagePath);
    const mime = receipt.imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
    return reply.type(mime).send(buffer);
  });

  app.get("/receipts/:id/thumbnail", async (request, reply) => {
    const { id } = request.params as { id: string };
    const receipt = await prisma.receipt.findUnique({ where: { id } });

    if (!receipt) {
      return reply.status(404).send({ error: "Not Found", message: "Receipt not found", statusCode: 404 });
    }

    const buffer = await readImageBuffer(receipt.thumbnailPath);
    return reply.type("image/jpeg").send(buffer);
  });
}
