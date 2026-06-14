import type { FastifyInstance } from "fastify";
import prisma from "../lib/prisma.js";
import { settingsSchema } from "@recipts/shared";

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/settings", async () => {
    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return map;
  });

  app.put("/settings", async (request) => {
    const body = settingsSchema.parse(request.body);
    for (const [key, value] of Object.entries(body)) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }
    return { ok: true };
  });
}
