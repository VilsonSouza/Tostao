import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

export const COOKIE = "token";
export const cookieOpts = { httpOnly: true, secure: config.cookieSecure, sameSite: "lax" as const, path: "/" };

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

export const signToken = (userId: string) =>
  jwt.sign({}, config.jwtSecret, { subject: userId, expiresIn: config.jwtTtlSeconds, algorithm: "HS256" });

/** Lança erro se o token for inválido ou estiver expirado. */
export function verifyToken(token: string): string {
  const p = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
  if (!p.sub) throw new Error("token sem subject");
  return p.sub;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    req.userId = verifyToken(req.cookies[COOKIE] ?? "");
  } catch {
    return reply.code(401).send({ message: "Não autenticado" });
  }
}
