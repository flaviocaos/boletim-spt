"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";

export default function NovoFuroPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [idEnsaio, setIdEnsaio] = useState("");
  const [profundidade, setProfundidade] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from("furos")
      .insert({
        projeto_id: params.id,
        id_ensaio: idEnsaio,
        profundidade_total: profundidade ? parseFloat(profundidade) : null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/projetos/${params.id}/furos/${data.id}`);
  }

  return (
    <AppShell>
      <div className="pagehead">
        <h1>Novo furo</h1>
      </div>
      <form onSubmit={submit} style={{ maxWidth: 380, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field">
          <label>Identificação do ensaio</label>
          <input required value={idEnsaio} onChange={(e) => setIdEnsaio(e.target.value)} placeholder="ex: P5 / BH-05" />
        </div>
        <div className="field">
          <label>Profundidade total prevista (m)</label>
          <input
            type="number"
            step="0.01"
            value={profundidade}
            onChange={(e) => setProfundidade(e.target.value)}
            placeholder="ex: 20.00"
          />
        </div>
        {error && <div style={{ color: "var(--bad)", fontSize: 12.5 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "A criar…" : "Criar furo"}
          </button>
          <button type="button" className="btn" onClick={() => router.back()}>
            Cancelar
          </button>
        </div>
      </form>
    </AppShell>
  );
}
