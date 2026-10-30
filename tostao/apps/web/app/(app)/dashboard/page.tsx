"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import MonthNav from "@/components/month-nav";
import { api, ApiError } from "@/lib/api";
import { brl, currentMonth, dayLabel } from "@/lib/format";

type Row = { id: string; description: string; amount: number; type: "CREDIT" | "DEBIT"; is_bill_payment: boolean; occurred_on: string; category: string | null; emoji: string | null };
type Dash = { income: number; expense: number; byCategory: { name: string; emoji: string; total: number }[]; recent: Row[] };
type Msg = { from: "user" | "ai" | "error"; text: string };

function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    setText("");
    setBusy(true);
    setMsgs((m) => [...m, { from: "user", text: message }]);
    try {
      const r = await api<{ reply: string }>("/api/ai/chat", { method: "POST", body: JSON.stringify({ message }) });
      setMsgs((m) => [...m, { from: "ai", text: r.reply }]);
    } catch (err) {
      const t = err instanceof ApiError && err.status === 503 ? "A IA não está configurada. Defina GEMINI_API_KEY e reinicie a API." : "Não consegui obter a resposta. Tente de novo.";
      setMsgs((m) => [...m, { from: "error", text: t }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Conversa com a IA" className="flex min-h-96 flex-col rounded-lg bg-white p-5">
      <h2 className="font-display text-xl font-semibold">Pergunte sobre o seu mês</h2>
      <div className="my-4 flex flex-1 flex-col gap-2 overflow-y-auto">
        {msgs.length === 0 && <p className="text-sm text-ink/60">Ex.: onde estou gastando mais? Use só dados fictícios no plano gratuito da IA.</p>}
        {msgs.map((m, i) => (
          <p key={i} className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.from === "user" ? "self-end bg-ink text-paper" : m.from === "error" ? "bg-rust/10 text-rust" : "bg-paper"}`}>{m.text}</p>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label="Sua pergunta" placeholder="Escreva sua pergunta"
          className="min-w-0 flex-1 rounded-md border border-ink/20 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-moss" />
        <button disabled={busy} className="rounded-md bg-ink px-4 font-medium text-paper focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-2 disabled:opacity-60">{busy ? "..." : "Enviar"}</button>
      </form>
    </section>
  );
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const [d, setD] = useState<Dash | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    api<Dash>(`/api/dashboard?month=${month}`).then(setD).catch(() => setError(true));
  }, [month]);
  useEffect(load, [load]);

  const max = d ? Math.max(1, ...d.byCategory.map((c) => Number(c.total))) : 1;
  const balance = d ? Number(d.income) - Number(d.expense) : 0;
  const empty = d && d.recent.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Painel</h1>
        <MonthNav month={month} onChange={setMonth} />
      </div>

      {error && <p role="alert" className="rounded-md bg-rust/10 p-3 text-rust">Não consegui carregar seus dados. <button onClick={load} className="underline">Tentar de novo</button></p>}
      {!d && !error && <p className="text-ink/60">Carregando...</p>}

      {empty && (
        <div className="rounded-lg bg-white p-6">
          <p className="font-medium">Nenhum lançamento neste mês.</p>
          <p className="mt-1 text-sm text-ink/70">Adicione uma transação ou importe um CSV para ver seu painel.</p>
          <Link href="/transactions" className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">Ir para transações</Link>
        </div>
      )}

      {d && !empty && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <section aria-label="Resumo do mês" className="grid grid-cols-3 divide-x divide-ink/10 rounded-lg bg-white p-5">
              {[["Receitas", brl(d.income), "text-moss"], ["Despesas", brl(d.expense), "text-rust"], ["Saldo do mês", brl(balance), balance < 0 ? "text-rust" : "text-ink"]].map(([l, v, c]) => (
                <div key={l} className="px-3 first:pl-0">
                  <p className="text-sm text-ink/60">{l}</p>
                  <p className={`tabular font-display text-xl font-semibold sm:text-2xl ${c}`}>{v}</p>
                </div>
              ))}
            </section>

            <section aria-label="Gastos por categoria" className="rounded-lg bg-white p-5">
              <h2 className="font-display text-xl font-semibold">Para onde foi o dinheiro</h2>
              {d.byCategory.length === 0 ? <p className="mt-3 text-sm text-ink/60">Sem despesas neste mês.</p> : (
                <ul className="mt-4 space-y-3">
                  {d.byCategory.map((c) => (
                    <li key={c.name}>
                      <div className="flex justify-between text-sm"><span>{c.emoji} {c.name}</span><span className="tabular">{brl(c.total)}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-paper"><div className="h-2 rounded-full bg-moss" style={{ width: `${(Number(c.total) / max) * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Transações recentes" className="rounded-lg bg-white p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl font-semibold">Últimas transações</h2>
                <Link href="/transactions" className="text-sm underline underline-offset-4">Ver todas</Link>
              </div>
              <ul className="mt-3 divide-y divide-ink/10">
                {d.recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0"><p className="truncate">{t.emoji} {t.description}</p><p className="text-ink/60">{dayLabel(t.occurred_on)} · {t.category ?? "Sem categoria"}</p></div>
                    <span className={`tabular shrink-0 font-medium ${t.type === "CREDIT" && !t.is_bill_payment ? "text-moss" : ""}`}>
                      {t.is_bill_payment ? "" : t.type === "CREDIT" ? "+ " : "- "}{brl(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <div className="lg:col-span-2"><Chat /></div>
        </div>
      )}
      {empty && <Chat />}
    </div>
  );
}
