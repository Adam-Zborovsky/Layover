import type { FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized", message: "Missing or invalid token", statusCode: 401 });
  }

  const token = authHeader.slice(7);
  if (token !== config.authToken) {
    return reply.status(401).send({ error: "Unauthorized", message: "Invalid token", statusCode: 401 });
  }
}
