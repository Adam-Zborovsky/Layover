import type { FastifyInstance } from "fastify";
import prisma from "../lib/prisma.js";
import { tripCreateSchema, tripUpdateSchema } from "@recipts/shared";

export async function tripRoutes(app: FastifyInstance) {
  app.get("/trips", async () => {
    const trips = await prisma.trip.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: { select: { receipts: true } },
      },
    });

    return trips.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate,
      endDate: t.endDate,
      notes: t.notes,
      createdAt: t.createdAt,
      receiptCount: t._count.receipts,
    }));
  });

  app.get("/trips/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        receipts: {
          select: {
            id: true,
            capturedAt: true,
            thumbnailPath: true,
            merchant: true,
            total: true,
            currency: true,
            category: true,
            status: true,
            fileName: true,
          },
        },
      },
    });

    if (!trip) {
      return reply.status(404).send({ error: "Not Found", message: "Trip not found", statusCode: 404 });
    }

    const totals = trip.receipts.reduce(
      (acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + r.total;
        acc._grandTotal += r.total;
        acc._count++;
        return acc;
      },
      { _grandTotal: 0, _count: 0 } as Record<string, number>
    );

    return {
      ...trip,
      totals,
      receiptCount: trip.receipts.length,
    };
  });

  app.post("/trips", async (request, reply) => {
    const body = tripCreateSchema.parse(request.body);
    const trip = await prisma.trip.create({ data: body });
    return reply.status(201).send(trip);
  });

  app.patch("/trips/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = tripUpdateSchema.parse(request.body);
    const trip = await prisma.trip.update({ where: { id }, data: body });
    return trip;
  });

  app.delete("/trips/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.receipt.updateMany({ where: { tripId: id }, data: { tripId: null } });
    await prisma.trip.delete({ where: { id } });
    return reply.status(204).send();
  });
}
