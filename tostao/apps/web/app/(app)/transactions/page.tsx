"use client";

import { useCallback, useEffect, useState } from "react";
import MonthNav from "@/components/month-nav";
import { api } from "@/lib/api";
import { brl, currentMonth, dayLabel } from "@/lib/format";

type Cat = { id: string; name: string; emoji: string };
type Tx = { id: string; description: string; amount: number; type: "CREDIT" | "DEBIT"; is_bill_payment: boolean; occurred_on: string; category_id: string | null };

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const field = "w-full rounded-md border border-ink/20 bg-white px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-moss";

export default function TransactionsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [items, setItems] = useState<Tx[] | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ description: "", amount: "", type: "DEBIT", date: today(), categoryId: "" });

  const load = useCallback(() => { api<Tx[]>(`/api/transactions?month=${month}`).then(setItems).catch(() => setMsg({ ok: false, text: "Não consegui carregar as transações." })); }, [month]);
  useEffect(load, [load]);
  useEffect(() => { api<Cat[]>("/api/categories").then(setCats).catch(() => {}); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount.replace(/\./g, "").replace(",", "."));
    if (!(amount > 0)) return setMsg({ ok: false, text: "Informe um valor maior que zero." });
    try {
      await api("/api/transactions", { method: "POST", body: JSON.stringify({ description: form.description, amount, type: form.type, date: form.date, categoryId: form.categoryId || null }) });
      setForm({ ...form, description: "", amount: "" });
      setMsg({ ok: true, text: "Transação adicionada." });
      load();
    } catch { setMsg({ ok: false, text: "Não consegui salvar. Confira os campos." }); }
  }

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = await api<{ imported: number; skipped: number }>("/api/transactions/import", { method: "POST", headers: { "Content-Type": "text/plain" }, body: await file.text() });
      setMsg({ ok: r.imported > 0, text: `${r.imported} importadas, ${r.skipped} ignoradas.` });
      load();
    } catch { setMsg({ ok: false, text: "Não consegui importar o arquivo." }); }
    e.target.value = "";
  }

  async function setCategory(id: string, categoryId: string) {
    await api(`/api/transactions/${id}/category`, { method: "PATCH", body: JSON.stringify({ categoryId: categoryId || null }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta transação?")) return;
    await api(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Transações</h1>
        <MonthNav month={month} onChange={setMonth} />
      </div>

      {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-moss/10 text-moss" : "bg-rust/10 text-rust"}`}>{msg.text}</p>}

      <form onSubmit={add} className="grid gap-3 rounded-lg bg-white p-5 sm:grid-cols-6">
        <label className="sm:col-span-2"><span className="mb-1 block text-sm">Descrição</span><input className={field} required maxLength={255} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label><span className="mb-1 block text-sm">Valor (R$)</span><input className={field} required inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
        <label><span className="mb-1 block text-sm">Tipo</span><select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="DEBIT">Despesa</option><option value="CREDIT">Receita</option></select></label>
        <label><span className="mb-1 block text-sm">Data</span><input className={field} type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label><span className="mb-1 block text-sm">Categoria</span><select className={field} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Automática</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select></label>
        <button className="rounded-md bg-ink px-4 py-2 font-medium text-paper focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-2 sm:col-span-6 sm:justify-self-start">Adicionar transação</button>
      </form>

      <section className="rounded-lg bg-white p-5">
        <h2 className="font-display text-xl font-semibold">Importar extrato (CSV)</h2>
        <p className="mt-1 text-sm text-ink/70">Três colunas: data; descrição; valor. Valor negativo é despesa. Datas AAAA-MM-DD ou DD/MM/AAAA. Se a descrição tiver vírgula, separe as colunas com ponto e vírgula.</p>
        <input type="file" accept=".csv,.txt" onChange={importFile} aria-label="Escolher arquivo CSV" className="mt-3 text-sm" />
      </section>

      <section aria-label="Lista de transações" className="rounded-lg bg-white p-5">
        {!items ? <p className="text-ink/60">Carregando...</p> : items.length === 0 ? <p className="text-ink/70">Nenhuma transação neste mês.</p> : (
          <ul className="divide-y divide-ink/10">
            {items.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="w-14 text-ink/60">{dayLabel(t.occurred_on)}</span>
                <span className="min-w-0 flex-1 truncate">{t.description}{t.is_bill_payment && <em className="ml-2 text-ink/50">pagamento de fatura</em>}</span>
                <select aria-label="Categoria" value={t.category_id ?? ""} onChange={(e) => setCategory(t.id, e.target.value)} className="rounded-md border border-ink/20 bg-white px-2 py-1">
                  <option value="">Sem categoria</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
                <span className={`tabular w-28 text-right font-medium ${t.type === "CREDIT" && !t.is_bill_payment ? "text-moss" : ""}`}>{t.is_bill_payment ? "" : t.type === "CREDIT" ? "+ " : "- "}{brl(t.amount)}</span>
                <button onClick={() => remove(t.id)} className="text-rust underline underline-offset-4" aria-label={`Excluir ${t.description}`}>Excluir</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
