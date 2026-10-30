const env = process.env;

export const config = {
  host: env.HOST ?? "127.0.0.1", // em container/servidor use HOST=0.0.0.0
  port: Number(env.PORT ?? 8080),
  databaseUrl: env.DATABASE_URL ?? "postgres://tostao:tostao_dev@localhost:5432/tostao",
  // SOMENTE desenvolvimento. Em produção defina JWT_SECRET (mín. 32 caracteres).
  jwtSecret: env.JWT_SECRET ?? "dev-only-secret-change-me-please-0123456789",
  jwtTtlSeconds: Number(env.JWT_TTL_MINUTES ?? 120) * 60,
  cookieSecure: env.COOKIE_SECURE === "true",
  corsOrigin: env.CORS_ORIGIN ?? "http://localhost:3000",
  geminiApiKey: env.GEMINI_API_KEY ?? "",
  geminiModel: env.GEMINI_MODEL ?? "gemini-flash-latest",
};

if (env.NODE_ENV === "production" && (config.jwtSecret.startsWith("dev-only") || config.jwtSecret.length < 32)) {
  throw new Error("Defina JWT_SECRET com pelo menos 32 caracteres em produção.");
}
