"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Projeto } from "@/lib/types";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    supabase
      .from("projetos")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) setProjetos((data as Projeto[]) || []);
      });
    return () => {
      active = false;
    };
  }, [session, pathname]);

  if (session === undefined) {
    return (
      <div className="login-wrap">
        <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>A carregar…</span>
      </div>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  const activeProjectId = pathname?.split("/projetos/")[1]?.split("/")[0];

  return (
    <div id="app-shell">
      <aside id="sidebar">
        <div className="brand">
          <div className="mark" />
          <div>
            <div className="name">Boletim SPT</div>
            <div className="sub">Sondagens de campo</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", padding: "6px 8px 2px" }}>
          Projetos
        </div>
        {projetos.map((p) => (
          <Link
            key={p.id}
            href={`/projetos/${p.id}`}
            className={"nav-item" + (activeProjectId === p.id ? " active" : "")}
          >
            {p.nome_projeto}
          </Link>
        ))}
        <Link href="/projetos/novo" className="btn sm" style={{ margin: "6px 8px" }}>
          + Novo projeto
        </Link>
        <div className="sidebar-foot">
          {session.user.email}
          <br />
          <button
            className="btn sm ghost"
            style={{ marginTop: 8, border: "none", padding: 0, color: "var(--accent-ink)" }}
            onClick={() => supabase.auth.signOut().then(() => router.push("/"))}
          >
            Sair
          </button>
        </div>
      </aside>
      <main id="main">{children}</main>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setLoading(true);
    const fn =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) setError(error.message);
    else if (mode === "signup") setMsg("Conta criada. Verifique o e-mail para confirmar (se exigido) e entre.");
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div>
          <h1 style={{ fontSize: 18 }}>Boletim SPT</h1>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>
            Acesso da equipa · {mode === "login" ? "entrar" : "criar conta"}
          </p>
        </div>
        <div className="field">
          <label>E-mail</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Senha</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div style={{ color: "var(--bad)", fontSize: 12.5 }}>{error}</div>}
        {msg && <div style={{ color: "var(--good)", fontSize: 12.5 }}>{msg}</div>}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
        <button
          type="button"
          className="btn"
          style={{ border: "none", background: "none", color: "var(--accent-ink)", padding: 0 }}
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
        </button>
      </form>
    </div>
  );
}
