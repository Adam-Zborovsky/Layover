import Fastify from "fastify";
import cors from "@fastify/cors";
import { authMiddleware } from "./middleware/auth.js";
import { healthRoutes } from "./routes/health.js";
import { receiptRoutes } from "./routes/receipts.js";
import { tripRoutes } from "./routes/trips.js";
import { exportRoutes } from "./routes/export.js";
import { settingsRoutes } from "./routes/settings.js";
import { config } from "./config.js";

const app = Fastify({ logger: true, bodyLimit: 50 * 1024 * 1024 }); // 50MB for base64 image uploads

await app.register(cors, { origin: true });

app.addHook("onRequest", async (request, reply) => {
  if (request.url === "/health") return;
  await authMiddleware(request, reply);
});

await app.register(healthRoutes);
await app.register(receiptRoutes, { prefix: "/api" });
await app.register(tripRoutes, { prefix: "/api" });
await app.register(exportRoutes, { prefix: "/api" });
await app.register(settingsRoutes, { prefix: "/api" });

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`Server running at http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
