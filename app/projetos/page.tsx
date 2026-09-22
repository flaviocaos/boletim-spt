"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import type { Projeto } from "@/lib/types";

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[] | null>(null);

  useEffect(() => {
    supabase
      .from("projetos")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setProjetos((data as Projeto[]) || []));
  }, []);

  return (
    <AppShell>
      <div className="pagehead">
        <div>
          <h1>Projetos</h1>
        </div>
        <Link href="/projetos/novo" className="btn primary">
          + Novo projeto
        </Link>
      </div>

      {projetos === null && <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>A carregar…</p>}

      {projetos && projetos.length === 0 && (
        <div className="empty">Nenhum projeto ainda. Crie o primeiro projeto para começar a cadastrar sondagens.</div>
      )}

      {projetos && projetos.length > 0 && (
        <div className="grid-cards">
          {projetos.map((p) => (
            <Link key={p.id} href={`/projetos/${p.id}`} className="card">
              <div className="title">{p.nome_projeto}</div>
              <div className="meta">
                {p.nome_cliente}
                {p.localizacao ? ` · ${p.localizacao}` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
