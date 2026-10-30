import bcrypt from "bcryptjs";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type { LlmClient } from "./ai.js";
import { COOKIE, cookieOpts, requireAuth, signToken } from "./auth.js";
import { guessCategory, isBillPayment } from "./categorize.js";
import { config } from "./config.js";
import { isValidIsoDate, parseCsv } from "./csv.js";
import { pool } from "./db.js";

const DUMMY_HASH = bcrypt.hashSync("dummy-password", 10); // evita revelar se o e-mail existe pelo tempo de resposta
const SYSTEM = `Você é um assistente de finanças pessoais em português do Brasil. Explique de forma simples, ajude a organizar gastos e metas, e não prometa retorno nem recomende ativos específicos. `;

const uuid = z.string().uuid();
const registerBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
});
const loginBody = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(72) });
const txBody = z.object({
  description: z.string().trim().min(1).max(255),
  amount: z.number().positive().max(999999999999),
  type: z.enum(["CREDIT", "DEBIT"]),
  date: z.string().refine(isValidIsoDate),
  categoryId: uuid.nullish(),
});

function range(month?: string) {
  const m = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  const next = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, "0")}-01`;
  return [`${m}-01`, next] as const;
}

async function accountId(u: string): Promise<string> {
  const r = await pool.query("select id from accounts where user_id=$1 order by created_at limit 1", [u]);
  if (r.rows[0]) return r.rows[0].id;
  return (await pool.query("insert into accounts(user_id,name,type) values($1,'Conta principal','CHECKING') returning id", [u])).rows[0].id;
}

let systemCategories: Map<string, string> | undefined;
async function systemCategoryId(name: string): Promise<string> {
  systemCategories ??= new Map((await pool.query("select id,name from categories where user_id is null")).rows.map((r) => [r.name, r.id]));
  return systemCategories.get(name) ?? systemCategories.get("Outros")!;
}

async function insertTx(u: string, acc: string, description: string, amount: number, type: string, date: string, categoryId?: string | null) {
  await pool.query(
    `insert into transactions(user_id,account_id,category_id,description,amount,type,is_bill_payment,occurred_on)
     values($1,$2,$3,$4,$5,$6,$7,$8)`,
    [u, acc, categoryId ?? (await systemCategoryId(guessCategory(description))), description, amount, type, isBillPayment(description), date],
  );
}

async function rows(u: string, month: string | undefined, limit: number) {
  const [from, to] = range(month);
  return (
    await pool.query(
      `select t.id, t.description, t.amount, t.type, t.is_bill_payment, t.occurred_on, t.category_id, c.name as category, c.emoji
       from transactions t left join categories c on c.id = t.category_id
       where t.user_id=$1 and t.occurred_on>=$2 and t.occurred_on<$3
       order by t.occurred_on desc, t.created_at desc limit $4`,
      [u, from, to, limit],
    )
  ).rows;
}

/** Pagamento de fatura é transferência interna: fica fora de receitas e despesas. */
async function dashboard(u: string, month?: string) {
  const [from, to] = range(month);
  const tot = (
    await pool.query(
      `select coalesce(sum(case when type='CREDIT' then amount end),0) as income,
              coalesce(sum(case when type='DEBIT' then amount end),0) as expense
       from transactions where user_id=$1 and occurred_on>=$2 and occurred_on<$3 and not is_bill_payment`,
      [u, from, to],
    )
  ).rows[0];
  const byCategory = (
    await pool.query(
      `select coalesce(c.name,'Outros') as name, coalesce(c.emoji,'') as emoji, sum(t.amount) as total
       from transactions t left join categories c on c.id = t.category_id
       where t.user_id=$1 and t.type='DEBIT' and not t.is_bill_payment and t.occurred_on>=$2 and t.occurred_on<$3
       group by 1,2 order by total desc limit 6`,
      [u, from, to],
    )
  ).rows as { name: string; emoji: string; total: number }[];
  return { income: tot.income as number, expense: tot.expense as number, byCategory, recent: await rows(u, month, 8) };
}

export async function routes(app: FastifyInstance, opts: { llm: LlmClient }) {
  const startSession = (reply: FastifyReply, id: string) =>
    reply.setCookie(COOKIE, signToken(id), { ...cookieOpts, maxAge: config.jwtTtlSeconds });

  app.get("/health", async () => ({ status: "UP" }));

  app.post("/api/auth/register", async (req, reply) => {
    const b = registerBody.parse(req.body);
    try {
      const r = await pool.query("insert into users(email,password_hash,name) values($1,$2,$3) returning id,name,email", [
        b.email,
        await bcrypt.hash(b.password, 10),
        b.name,
      ]);
      startSession(reply, r.rows[0].id);
      return r.rows[0];
    } catch (e) {
      if ((e as { code?: string }).code === "23505") return reply.code(409).send({ message: "E-mail já cadastrado" });
      throw e;
    }
  });

  app.post("/api/auth/login", async (req, reply) => {
    const b = loginBody.parse(req.body);
    const u = (await pool.query("select id,name,email,password_hash from users where email=$1", [b.email])).rows[0];
    const ok = await bcrypt.compare(b.password, u?.password_hash ?? DUMMY_HASH);
    if (!u || !ok) return reply.code(401).send({ message: "E-mail ou senha incorretos" });
    startSession(reply, u.id);
    return { id: u.id, name: u.name, email: u.email };
  });

  app.post("/api/auth/logout", async (_req, reply) => reply.clearCookie(COOKIE, cookieOpts).code(204).send());

  await app.register(async (api) => {
    api.addHook("onRequest", requireAuth);

    api.get("/api/me", async (req, reply) => {
      const u = (await pool.query("select id,name,email from users where id=$1", [req.userId])).rows[0];
      return u ?? reply.code(401).send({ message: "Não autenticado" });
    });

    api.get("/api/categories", async (req) =>
      (await pool.query("select id,name,emoji from categories where user_id is null or user_id=$1 order by name", [req.userId])).rows,
    );

    api.get("/api/transactions", async (req) => rows(req.userId, (req.query as { month?: string }).month, 500));

    api.post("/api/transactions", async (req, reply) => {
      const b = txBody.parse(req.body);
      await insertTx(req.userId, await accountId(req.userId), b.description, b.amount, b.type, b.date, b.categoryId);
      return reply.code(201).send();
    });

    api.patch("/api/transactions/:id/category", async (req, reply) => {
      const id = uuid.parse((req.params as { id: string }).id);
      const { categoryId } = z.object({ categoryId: uuid.nullable() }).parse(req.body);
      await pool.query("update transactions set category_id=$1 where id=$2 and user_id=$3", [categoryId, id, req.userId]);
      return reply.code(200).send();
    });

    api.delete("/api/transactions/:id", async (req, reply) => {
      const id = uuid.parse((req.params as { id: string }).id);
      await pool.query("delete from transactions where id=$1 and user_id=$2", [id, req.userId]);
      return reply.code(204).send();
    });

    // CSV como text/plain: data;descrição;valor (valor negativo = despesa)
    api.post("/api/transactions/import", async (req) => {
      const { rows: parsed, skipped } = parseCsv(z.string().parse(req.body));
      const acc = await accountId(req.userId);
      for (const r of parsed) await insertTx(req.userId, acc, r.description, r.amount, r.type, r.date);
      return { imported: parsed.length, skipped };
    });

    api.get("/api/dashboard", async (req) => dashboard(req.userId, (req.query as { month?: string }).month));

    api.post("/api/ai/chat", async (req) => {
      const { message } = z.object({ message: z.string().trim().min(1).max(2000) }).parse(req.body);
      const d = await dashboard(req.userId);
      const cats = d.byCategory.map((c) => `${c.name} R$ ${c.total}`).join("; ") || "sem lançamentos";
      const ctx = `Dados do mês atual do usuário (use só se for relevante): receitas R$ ${d.income}, despesas R$ ${d.expense}, despesas por categoria: ${cats}.`;
      return { reply: await opts.llm.generate(SYSTEM + ctx, message) };
    });
  });
}
