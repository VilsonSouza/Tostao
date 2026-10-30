"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type Me } from "@/lib/api";

// Linhas de exemplo (fictícias) que mostram o tipo de leitura que o produto entrega.
const ledger = [
  { label: "Mercado", value: "- 412,90" },
  { label: "Assinaturas", value: "- 89,70" },
  { label: "Salário", value: "+ 4.200,00" },
  { label: "Sobrou no mês", value: "+ 1.063,40" },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { name, email, password };
      await api<Me>(path, { method: "POST", body: JSON.stringify(payload) });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setError("Confira os dados: e-mail válido e senha com 8 caracteres ou mais.");
      else setError(err instanceof ApiError ? err.message : "Não consegui falar com o servidor. A API está rodando?");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-md border border-ink/20 bg-white px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-moss";

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <section className="bg-ink px-8 py-12 text-paper md:px-14 md:py-20">
        <h1 className="font-display text-4xl font-semibold leading-tight md:text-6xl">
          Seu dinheiro,
          <br />
          em linguagem simples.
        </h1>
        <ul className="mt-12 max-w-sm divide-y divide-paper/15 border-y border-paper/15">
          {ledger.map((row) => (
            <li key={row.label} className="flex items-baseline justify-between py-3">
              <span className="text-paper/70">{row.label}</span>
              <span className="tabular font-display text-2xl text-brass">R$ {row.value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-paper/50">Valores de exemplo.</p>
      </section>

      <section className="flex items-center px-8 py-12 md:px-14">
        <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-4">
          <h2 className="font-display text-3xl font-semibold">
            {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
          </h2>
          {mode === "register" && (
            <label className="block">
              <span className="mb-1 block text-sm">Nome</span>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-sm">E-mail</span>
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm">Senha</span>
            <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
          {error && <p role="alert" className="text-sm text-rust">{error}</p>}
          <button disabled={busy} className="w-full rounded-md bg-ink px-4 py-2.5 font-medium text-paper focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-2 disabled:opacity-60">
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
          <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }} className="text-sm underline underline-offset-4">
            {mode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
          </button>
        </form>
      </section>
    </main>
  );
}
