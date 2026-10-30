"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Me } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Painel" },
  { href: "/transactions", label: "Transações" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api<Me>("/api/me").then(setMe).catch(() => router.replace("/login"));
  }, [router]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!me) return <main className="p-8">Carregando...</main>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-display text-xl font-semibold">Tostão</span>
            <nav className="flex gap-4 text-sm">
              {links.map((l) => (
                <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}
                  className={path === l.href ? "font-semibold underline decoration-brass decoration-2 underline-offset-8" : "text-ink/70"}>
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-ink/60 sm:inline">{me.name}</span>
            <button onClick={logout} className="underline underline-offset-4">Sair</button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
