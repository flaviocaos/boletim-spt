"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import type { Furo, Projeto } from "@/lib/types";
import { fmtDate } from "@/lib/strata";

export default function ProjetoPage() {
  const params = useParams<{ id: string }>();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [furos, setFuros] = useState<Furo[] | null>(null);

  useEffect(() => {
    supabase.from("projetos").select("*").eq("id", params.id).single().then(({ data }) => setProjeto(data as Projeto));
    supabase
      .from("furos")
      .select("*")
      .eq("projeto_id", params.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setFuros((data as Furo[]) || []));
  }, [params.id]);

  return (
    <AppShell>
      <div className="crumb">
        <Link href="/projetos">Projetos</Link>
      </div>
      <div className="pagehead">
        <div>
          <h1>{projeto?.nome_projeto || "…"}</h1>
          {projeto && (
            <div className="meta" style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 2 }}>
              {projeto.nome_cliente}
              {projeto.localizacao ? ` · ${projeto.localizacao}` : ""}
            </div>
          )}
        </div>
        <Link href={`/projetos/${params.id}/furos/novo`} className="btn primary">
          + Novo furo
        </Link>
      </div>

      {furos && furos.length === 0 && <div className="empty">Este projeto ainda não tem furos cadastrados.</div>}

      {furos && furos.length > 0 && (
        <div className="datatable">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Furo</th>
                  <th>Prof. total</th>
                  <th>Tipo</th>
                  <th>Conclusão</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {furos.map((f) => (
                  <tr key={f.id}>
                    <td className="mono" style={{ padding: 9, fontWeight: 600 }}>
                      <Link href={`/projetos/${params.id}/furos/${f.id}`}>{f.id_ensaio}</Link>
                    </td>
                    <td className="mono" style={{ padding: 9 }}>
                      {f.profundidade_total ?? "—"} m
                    </td>
                    <td style={{ padding: 9 }}>{f.tipo_sondagem || "—"}</td>
                    <td style={{ padding: 9 }}>{fmtDate(f.data_conclusao)}</td>
                    <td style={{ padding: 9, textAlign: "right" }}>
                      <Link href={`/projetos/${params.id}/furos/${f.id}/boletim`} className="btn sm">
                        Boletim →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
