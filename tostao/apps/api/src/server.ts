import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { GeminiClient } from "./ai.js";
import { config } from "./config.js";
import { migrate } from "./db.js";
import { routes } from "./routes.js";

const app = Fastify({ logger: true, bodyLimit: 5 * 1024 * 1024 });
app.decorateRequest("userId", "");

await app.register(cors, {
  origin: config.corsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});
await app.register(cookie);

// Defesa extra contra CSRF: requisições que alteram dados só valem se vierem do nosso front.
app.addHook("onRequest", async (req, reply) => {
  const origin = req.headers.origin;
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && origin && origin !== config.corsOrigin) {
    return reply.code(403).send({ message: "Origem não permitida" });
  }
});

app.setErrorHandler((err, req, reply) => {
  if (err instanceof ZodError) return reply.code(400).send({ message: "Dados inválidos. Confira os campos." });
  const code = err.statusCode ?? 500;
  if (code >= 500) req.log.error(err);
  return reply.code(code).send({ message: code === 502 || code === 503 || code < 500 ? err.message : "Erro interno" });
});

await app.register(routes, { llm: new GeminiClient() });
await migrate();
await app.listen({ port: config.port, host: config.host });
