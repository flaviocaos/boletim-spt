"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";

export default function NovoProjetoPage() {
  const router = useRouter();
  const [nomeCliente, setNomeCliente] = useState("");
  const [nomeProjeto, setNomeProjeto] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("projetos")
      .insert({
        nome_cliente: nomeCliente,
        nome_projeto: nomeProjeto,
        localizacao: localizacao || null,
        created_by: userData.user?.id,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/projetos/${data.id}`);
  }

  return (
    <AppShell>
      <div className="pagehead">
        <h1>Novo projeto</h1>
      </div>
      <form onSubmit={submit} style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label>Cliente</label>
          <input required value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="ex: Sonangol E.P." />
        </div>
        <div className="field">
          <label>Nome do projeto</label>
          <input
            required
            value={nomeProjeto}
            onChange={(e) => setNomeProjeto(e.target.value)}
            placeholder="ex: Terminal Multiuso — Lobito"
          />
        </div>
        <div className="field">
          <label>Localização</label>
          <input value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="ex: Lobito, Benguela" />
        </div>
        {error && <div style={{ color: "var(--bad)", fontSize: 12.5 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "A criar…" : "Criar projeto"}
          </button>
          <button type="button" className="btn" onClick={() => router.back()}>
            Cancelar
          </button>
        </div>
      </form>
    </AppShell>
  );
}
