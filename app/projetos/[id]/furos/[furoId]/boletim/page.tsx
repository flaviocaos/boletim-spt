"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import { Amostra, Camada, Foto, Furo, Projeto, RochaTrecho, SptLeitura, ALTERACAO, ALTERACAO_LBL, FRATURACAO, FRATURACAO_LBL, nSpt } from "@/lib/types";
import { fmtDate, fmtNum, strataSvg } from "@/lib/strata";

export default function BoletimPage() {
  const params = useParams<{ id: string; furoId: string }>();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [furo, setFuro] = useState<Furo | null>(null);
  const [camadas, setCamadas] = useState<Camada[]>([]);
  const [spt, setSpt] = useState<SptLeitura[]>([]);
  const [rocha, setRocha] = useState<RochaTrecho[]>([]);
  const [fotos, setFotos] = useState<(Foto & { url: string })[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, f, c, s, r, ph] = await Promise.all([
        supabase.from("projetos").select("*").eq("id", params.id).single(),
        supabase.from("furos").select("*").eq("id", params.furoId).single(),
        supabase.from("camadas").select("*").eq("furo_id", params.furoId).order("prof_inicial"),
        supabase.from("spt_leituras").select("*").eq("furo_id", params.furoId).order("profundidade"),
        supabase.from("rocha_trechos").select("*").eq("furo_id", params.furoId).order("prof_desde"),
        supabase.from("fotos").select("*").eq("furo_id", params.furoId).order("created_at"),
      ]);
      setProjeto(p.data as Projeto);
      setFuro(f.data as Furo);
      setCamadas((c.data as Camada[]) || []);
      setSpt((s.data as SptLeitura[]) || []);
      setRocha((r.data as RochaTrecho[]) || []);
      setFotos(
        ((ph.data as Foto[]) || []).map((x) => ({
          ...x,
          url: supabase.storage.from("fotos").getPublicUrl(x.storage_path).data.publicUrl,
        }))
      );
    })();
  }, [params.id, params.furoId]);

  async function exportPdf() {
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const pages = document.querySelectorAll<HTMLElement>("#boletimWrap .boletim-page");
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff" });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const ratio = Math.min(pw / canvas.width, ph / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        if (i > 0) doc.addPage("a4", "landscape");
        doc.addImage(img, "JPEG", (pw - w) / 2, (ph - h) / 2, w, h);
      }
      doc.save(`boletim-${(furo?.id_ensaio || "sondagem").replace(/\s+/g, "_")}.pdf`);
    } catch (e: any) {
      alert("Falha ao gerar o PDF: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  if (!furo || !projeto) {
    return (
      <AppShell>
        <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>A carregar…</p>
      </AppShell>
    );
  }

  const nfText = furo.nivel_freatico_atingido && furo.nivel_freatico_prof != null ? `${fmtNum(furo.nivel_freatico_prof)} m` : "INATINGÍVEL";
  const camsSorted = [...camadas].sort((a, b) => a.prof_inicial - b.prof_inicial);
  const totalDepth = Math.max(furo.profundidade_total || 1, 1);
  const bodyHeight = Math.max(340, Math.min(520, Math.round(totalDepth * 24) + 50));

  return (
    <AppShell>
      <div className="crumb">
        <Link href="/projetos">Projetos</Link> / <Link href={`/projetos/${params.id}`}>Furos</Link>
      </div>
      <div className="pagehead">
        <div>
          <h1>Boletim de sondagem</h1>
          <div className="meta" style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 2 }}>
            {furo.id_ensaio}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/projetos/${params.id}/furos/${params.furoId}`} className="btn">
            ← Editar dados
          </Link>
          <button className="btn primary" onClick={exportPdf} disabled={exporting}>
            {exporting ? "A gerar PDF…" : "Exportar PDF"}
          </button>
        </div>
      </div>

      <div id="boletimWrap">
        <div className="boletim-page">
          <div className="bt-head">
            <div className="bt-brand">
              <div className="mark" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{projeto.nome_cliente}</div>
                <div style={{ fontSize: 10.5, color: "#5b6b68" }}>Estudos e Projectos Geotécnicos</div>
              </div>
            </div>
            <div className="bt-idbox">
              <div style={{ fontSize: 9, color: "#5b6b68" }}>SONDAGEM Nº</div>
              <div className="big">{furo.id_ensaio}</div>
              <div style={{ fontSize: 11, color: "#5b6b68" }}>REVISÃO: {furo.revisao || "00"}</div>
            </div>
          </div>

          <div className="bt-metablock">
            <MetaItem label="Cliente" value={projeto.nome_cliente} />
            <MetaItem label="Cota (m)" value={fmtNum(furo.cota_z)} />
            <MetaItem label="Projeto" value={projeto.nome_projeto} />
            <MetaItem label="Comprimento (m)" value={fmtNum(furo.profundidade_total)} />
            <MetaItem label="Localização" value={projeto.localizacao} />
            <MetaItem label="Nível de água" value={nfText} />
            <MetaItem label="Tipo de sondagem" value={furo.tipo_sondagem} />
            <MetaItem label="Coordenadas" value={`${fmtNum(furo.coordenada_x)} / ${fmtNum(furo.coordenada_y)}`} />
            <MetaItem label="Diâmetro / broca" value={furo.broca_tipo_tamanho} />
            <MetaItem label="Data inicial" value={fmtDate(furo.data_inicio)} />
            <MetaItem label="Equipamento" value={furo.equipamento} />
            <MetaItem label="Data final" value={fmtDate(furo.data_conclusao)} />
          </div>

          <div className="bt-body" style={{ minHeight: bodyHeight }}>
            <div className="bt-col">
              <div className="bt-colhead">N.A.</div>
            </div>
            <div className="bt-col" style={{ padding: 0 }}>
              <div
                dangerouslySetInnerHTML={{
                  __html: strataSvg(furo, camsSorted, spt, rocha, { width: 150, height: bodyHeight, mode: "full" }),
                }}
              />
            </div>
            <div className="bt-col" style={{ padding: "6px 10px" }}>
              <div className="bt-colhead" style={{ textAlign: "left" }}>
                Descrição tátil-visual &amp; amostras SPT
              </div>
              {camsSorted.map((c) => {
                const sptHere = spt.filter((s) => s.profundidade >= c.prof_inicial && s.profundidade < c.prof_final + 0.001);
                return (
                  <div key={c.id} style={{ marginBottom: 9 }}>
                    <div style={{ fontWeight: 600, fontSize: 10.5 }}>
                      {fmtNum(c.prof_inicial)}–{fmtNum(c.prof_final)} m · {c.nome_solo}
                    </div>
                    <div style={{ fontSize: 9.8, color: "#3d4a48" }}>{c.descricao}</div>
                    {sptHere.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 9.5,
                          fontFamily: "var(--font-mono)",
                          padding: "1px 0",
                          borderTop: "1px dotted #e2ded2",
                        }}
                      >
                        <span>
                          {fmtNum(s.profundidade)}m · {s.indice_amostra}
                        </span>
                        <span>
                          {s.golpes_1a ?? "–"}/{s.golpes_2a ?? "–"}/{s.golpes_3a ?? "–"} → N={nSpt(s)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="bt-col" style={{ padding: "6px 8px" }}>
              <div className="bt-colhead">Rocha (Recup./RQD/Fratur./Alter.)</div>
              {rocha.length === 0 && <div style={{ fontSize: 10, color: "#8a958f" }}>Sem trecho rochoso.</div>}
              {rocha.map((r) => (
                <div key={r.id} style={{ fontSize: 9.8, borderTop: "1px dotted #e2ded2", padding: "4px 0" }}>
                  <b>
                    {fmtNum(r.prof_desde)}–{fmtNum(r.prof_ate)}m
                  </b>
                  <br />
                  Recup: {r.recuperacao ?? "—"}% · RQD: {r.rqd ?? "—"}%
                  <br />
                  {r.fraturacao} · {r.alteracao}
                </div>
              ))}
            </div>
          </div>

          <div className="bt-foot">
            <div className="legend-tables" style={{ marginTop: 0 }}>
              <table>
                <caption style={{ textAlign: "left", fontSize: 10.5, fontWeight: 600, marginBottom: 2 }}>
                  Estado de alteração
                </caption>
                <tbody>
                  {ALTERACAO.map((k) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{ALTERACAO_LBL[k]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table>
                <caption style={{ textAlign: "left", fontSize: 10.5, fontWeight: 600, marginBottom: 2 }}>
                  Grau de fraturação
                </caption>
                <tbody>
                  {FRATURACAO.map((k) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{FRATURACAO_LBL[k]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bt-sign">
              <div>
                {furo.elaborado_por || "—"}
                <br />
                <span style={{ color: "#8a958f" }}>Elaborado por</span>
              </div>
              <div>
                {furo.verificado_por || "—"}
                <br />
                <span style={{ color: "#8a958f" }}>Verificado por</span>
              </div>
            </div>
          </div>
        </div>

        {fotos.length > 0 && (
          <div className="boletim-page">
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>REGISTO FOTOGRÁFICO — {furo.id_ensaio}</h2>
            <div className="bt-photogrid">
              {fotos.map((ph) => (
                <figure key={ph.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ph.url} alt="" crossOrigin="anonymous" />
                  <figcaption>
                    {ph.legenda} · {ph.tipo}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function MetaItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="mi">
      <span>{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}
