"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import {
  Amostra,
  Camada,
  Foto,
  Furo,
  Projeto,
  RochaTrecho,
  SptLeitura,
  ALTERACAO,
  ALTERACAO_LBL,
  FRATURACAO,
  FRATURACAO_LBL,
  nSpt,
} from "@/lib/types";
import { fmtDate, fmtNum, hachuraCss } from "@/lib/strata";

export default function BoletimPage() {
  const params = useParams<{ id: string; furoId: string }>();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [furo, setFuro] = useState<Furo | null>(null);
  const [camadas, setCamadas] = useState<Camada[]>([]);
  const [spt, setSpt] = useState<SptLeitura[]>([]);
  const [rocha, setRocha] = useState<RochaTrecho[]>([]);
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [fotos, setFotos] = useState<(Foto & { url: string })[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, f, c, s, r, am, ph] = await Promise.all([
        supabase.from("projetos").select("*").eq("id", params.id).single(),
        supabase.from("furos").select("*").eq("id", params.furoId).single(),
        supabase.from("camadas").select("*").eq("furo_id", params.furoId).order("prof_inicial"),
        supabase.from("spt_leituras").select("*").eq("furo_id", params.furoId).order("profundidade"),
        supabase.from("rocha_trechos").select("*").eq("furo_id", params.furoId).order("prof_desde"),
        supabase.from("amostras").select("*").eq("furo_id", params.furoId).order("profundidade"),
        supabase.from("fotos").select("*").eq("furo_id", params.furoId).order("created_at"),
      ]);
      setProjeto(p.data as Projeto);
      setFuro(f.data as Furo);
      setCamadas((c.data as Camada[]) || []);
      setSpt((s.data as SptLeitura[]) || []);
      setRocha((r.data as RochaTrecho[]) || []);
      setAmostras((am.data as Amostra[]) || []);
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
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff" });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const ratio = Math.min(pw / canvas.width, ph / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        if (i > 0) doc.addPage("a4", "portrait");
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

  const camsSorted = [...camadas].sort((a, b) => a.prof_inicial - b.prof_inicial);
  const sptSorted = [...spt].sort((a, b) => a.profundidade - b.profundidade);

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
                <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>hubgeo</div>
                <div style={{ fontSize: 10, color: "#5b6b68" }}>Estudos e Projectos</div>
              </div>
            </div>
            <div className="bt-idbox">
              <div style={{ fontSize: 9, color: "#5b6b68" }}>SONDAGEM Nº</div>
              <div className="big">{furo.id_ensaio}</div>
              <div style={{ fontSize: 11, color: "#5b6b68" }}>REVISÃO: {furo.revisao || "00"}</div>
            </div>
          </div>

          <div className="bt-metablock2">
            <MetaRow label="Cliente" value={projeto.nome_cliente} />
            <MetaRow label="Cota" value={fmtNum(furo.cota_z) + " m"} />
            <MetaRow label="Projecto" value={projeto.nome_projeto} />
            <MetaRow label="Comprimento" value={fmtNum(furo.profundidade_total) + " m"} />
            <MetaRow label="Localização" value={projeto.localizacao} />
            <MetaRow label="Inclinação" value={fmtNum(furo.inclinacao) + "º"} />
            <MetaRow label="Tipo de sondagem" value={furo.tipo_sondagem} />
            <MetaRow label="Coordenadas" value={`M:${fmtNum(furo.coordenada_x)}  P:${fmtNum(furo.coordenada_y)}`} />
            <MetaRow label="Diâmetro" value={furo.broca_tipo_tamanho} />
            <MetaRow label="Data inicial" value={fmtDate(furo.data_inicio)} />
            <MetaRow label="Equipamento" value={furo.equipamento} />
            <MetaRow label="Data final" value={fmtDate(furo.data_conclusao)} />
          </div>

          <BoletimGrid furo={furo} camadas={camsSorted} spt={sptSorted} rocha={rocha} amostras={amostras} />

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
                  Grau de fracturação
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
          <div className="bt-pagefoot">
            <span>Boletim de sondagem SPT — hubgeo</span>
            <span>pág. 1</span>
          </div>
        </div>

        {fotos.length > 0 && (
          <div className="boletim-page bt-photopage">
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
            <div className="bt-pagefoot" style={{ position: "static", marginTop: 20 }}>
              <span>Boletim de sondagem SPT — hubgeo</span>
              <span>pág. 2</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="mr">
      <span>{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}

/* ============ grade principal do boletim (réplica das colunas do GEO5) ============ */

const COLS = [
  { key: "na", label: "", width: 18 },
  { key: "comprimento", label: "COMPRIMENTO", width: 32 },
  { key: "f1", label: "1ª FASE", width: 24 },
  { key: "f2", label: "2ª FASE", width: 24 },
  { key: "f3", label: "3ª FASE", width: 24 },
  { key: "grafico", label: "GRÁFICO", width: 96 },
  { key: "profundidade", label: "PROFUNDIDADE", width: 38 },
  { key: "simbologia", label: "SIMBOLOGIA", width: 30 },
  { key: "descricao", label: "DESCRIÇÃO TÁTIL-VISUAL", width: "flex" as const },
  { key: "amostra", label: "AMOSTRA INTACTA", width: 44 },
  { key: "recuperacao", label: "RECUP.", width: 30 },
  { key: "rqd", label: "RQD", width: 26 },
  { key: "fraturacao", label: "FRATUR.", width: 34 },
  { key: "alteracao", label: "ALTER.", width: 34 },
];

function gridTemplateColumns() {
  return COLS.map((c) => (c.width === "flex" ? "minmax(100px,1fr)" : `${c.width}px`)).join(" ");
}

function BoletimGrid({
  furo,
  camadas,
  spt,
  rocha,
  amostras,
}: {
  furo: Furo;
  camadas: Camada[];
  spt: SptLeitura[];
  rocha: RochaTrecho[];
  amostras: Amostra[];
}) {
  const profTotal = Math.max(
    furo.profundidade_total || 0,
    1,
    camadas.length ? camadas[camadas.length - 1].prof_final : 0,
    spt.length ? spt[spt.length - 1].profundidade : 0,
    rocha.length ? rocha[rocha.length - 1].prof_ate : 0
  );
  const H = Math.max(420, Math.min(980, Math.round(profTotal * 30) + 10));
  const y = (d: number) => (d / profTotal) * H;

  const gridCols = gridTemplateColumns();

  const boundaryDepths = Array.from(
    new Set<number>([0, ...camadas.map((c) => c.prof_inicial), ...camadas.map((c) => c.prof_final), profTotal])
  ).sort((a, b) => a - b);

  const amostrasIntactas = amostras.filter((a) => a.tipo === "Indeformada" && a.profundidade != null);

  return (
    <div className="bt-grid-wrap">
      {/* cabeçalho */}
      <div
        className="bt-grid-header"
        style={{ display: "grid", gridTemplateColumns: gridCols, gridTemplateRows: "22px 22px" }}
      >
        <HeaderCell label="N.A." colStart={1} colSpan={1} rowSpan={2} />
        <HeaderCell label="ENSAIO SPT" colStart={2} colSpan={5} rowSpan={1} />
        <HeaderCell label="PROFUNDIDADE" colStart={7} colSpan={1} rowSpan={2} />
        <HeaderCell label="SIMBOLOGIA" colStart={8} colSpan={1} rowSpan={2} />
        <HeaderCell label="DESCRIÇÃO TÁTIL-VISUAL" colStart={9} colSpan={1} rowSpan={2} align="left" />
        <HeaderCell label="AMOSTRA INTACTA" colStart={10} colSpan={1} rowSpan={2} />
        <HeaderCell label="CLASSIFICAÇÃO — ROCHA" colStart={11} colSpan={4} rowSpan={1} />

        <HeaderCell label="COMPRIMENTO" colStart={2} colSpan={1} rowSpan={1} row={2} small />
        <HeaderCell label="1ª FASE" colStart={3} colSpan={1} rowSpan={1} row={2} small />
        <HeaderCell label="2ª FASE" colStart={4} colSpan={1} rowSpan={1} row={2} small />
        <HeaderCell label="3ª FASE" colStart={5} colSpan={1} rowSpan={1} row={2} small />
        <HeaderCell label="N (2ª+3ª)" colStart={6} colSpan={1} rowSpan={1} row={2} small />
        <HeaderCell label="RECUP." colStart={11} colSpan={1} rowSpan={1} row={2} small />
        <HeaderCell label="RQD" colStart={12} colSpan={1} rowSpan={1} row={2} small />
        <HeaderCell label="FRATUR." colStart={13} colSpan={1} rowSpan={1} row={2} small />
        <HeaderCell label="ALTER." colStart={14} colSpan={1} rowSpan={1} row={2} small />
      </div>

      {/* corpo */}
      <div className="bt-grid-body" style={{ display: "grid", gridTemplateColumns: gridCols, height: H }}>
        {/* nível freático */}
        <div className="bt-gcol" style={{ position: "relative" }}>
          {furo.nivel_freatico_atingido && furo.nivel_freatico_prof != null ? (
            <>
              <div
                className="bt-hline"
                style={{ top: y(furo.nivel_freatico_prof) }}
                title={`N.A. a ${fmtNum(furo.nivel_freatico_prof)} m`}
              />
              <div
                style={{
                  position: "absolute",
                  top: y(furo.nivel_freatico_prof) - 6,
                  left: 4,
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "7px solid #2e5c8a",
                }}
              />
            </>
          ) : (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%) rotate(-90deg)",
                whiteSpace: "nowrap",
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#b23a3a",
              }}
            >
              INATINGÍVEL
            </div>
          )}
        </div>

        {/* comprimento / 1a / 2a / 3a fase */}
        <div className="bt-gcol">
          {spt.map((s) => (
            <div key={s.id} className="bt-cell-mark mono" style={{ top: y(s.profundidade) }}>
              {fmtNum(s.profundidade)}
            </div>
          ))}
        </div>
        <div className="bt-gcol">
          {spt.map((s) => (
            <div key={s.id} className="bt-cell-mark mono" style={{ top: y(s.profundidade) }}>
              {s.golpes_1a ?? "–"}
            </div>
          ))}
        </div>
        <div className="bt-gcol">
          {spt.map((s) => (
            <div key={s.id} className="bt-cell-mark mono" style={{ top: y(s.profundidade) }}>
              {s.golpes_2a ?? "–"}
            </div>
          ))}
        </div>
        <div className="bt-gcol">
          {spt.map((s) => (
            <div key={s.id} className="bt-cell-mark mono" style={{ top: y(s.profundidade) }}>
              {s.golpes_3a ?? "–"}
            </div>
          ))}
        </div>

        {/* gráfico N x profundidade */}
        <div className="bt-gcol" style={{ position: "relative" }}>
          {spt.map((s) => (
            <div key={s.id} className="bt-hline-faint" style={{ top: y(s.profundidade) }} />
          ))}
          <svg
            viewBox={`0 0 150 ${H}`}
            width="100%"
            height={H}
            style={{ position: "absolute", inset: 0 }}
            preserveAspectRatio="none"
          >
            {[0, 10, 20, 30, 40, 50].map((n) => (
              <g key={n}>
                <line x1={(n / 50) * 150} y1={0} x2={(n / 50) * 150} y2={H} stroke="#d7ddd4" strokeWidth={1} />
                <text x={(n / 50) * 150} y={H - 2} fontSize={7} textAnchor="middle" fill="#5b6b68">
                  {n}
                </text>
              </g>
            ))}
            {spt.length > 0 && (
              <polyline
                fill="none"
                stroke="#2e5c8a"
                strokeWidth={1.4}
                points={spt
                  .filter((s) => s.golpes_2a != null && s.golpes_3a != null)
                  .map((s) => `${(Math.min(nSpt(s), 50) / 50) * 150},${y(s.profundidade)}`)
                  .join(" ")}
              />
            )}
            {spt
              .filter((s) => s.golpes_2a != null && s.golpes_3a != null)
              .map((s) => (
                <g key={s.id}>
                  <circle cx={(Math.min(nSpt(s), 50) / 50) * 150} cy={y(s.profundidade)} r={2.6} fill="#2e5c8a" />
                  <text x={(Math.min(nSpt(s), 50) / 50) * 150 + 5} y={y(s.profundidade) + 3} fontSize={8} fill="#17201f">
                    {nSpt(s)}
                  </text>
                </g>
              ))}
          </svg>
        </div>

        {/* profundidade (marcos das camadas) */}
        <div className="bt-gcol">
          {boundaryDepths.map((d, i) => (
            <div key={i} className="bt-cell-mark mono" style={{ top: y(d) }}>
              {fmtNum(d)}
            </div>
          ))}
        </div>

        {/* simbologia */}
        <div className="bt-gcol" style={{ position: "relative" }}>
          {camadas.map((c) => (
            <div
              key={c.id}
              style={{
                position: "absolute",
                top: y(c.prof_inicial),
                height: Math.max(y(c.prof_final) - y(c.prof_inicial), 1),
                left: 0,
                right: 0,
                borderBottom: "1px solid #17201f",
                ...hachuraCss(c.hachura),
              }}
            />
          ))}
        </div>

        {/* descrição tátil-visual */}
        <div className="bt-gcol" style={{ position: "relative" }}>
          {camadas.map((c) => {
            const h = Math.max(y(c.prof_final) - y(c.prof_inicial), 1);
            return (
              <div
                key={c.id}
                style={{
                  position: "absolute",
                  top: y(c.prof_inicial),
                  height: h,
                  left: 0,
                  right: 0,
                  borderBottom: "1px dashed #e2ded2",
                  padding: "3px 8px",
                  fontSize: 9.6,
                  lineHeight: 1.25,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: h > 30 ? "center" : "flex-start",
                }}
              >
                <span>
                  <b>{c.nome_solo}</b>
                  {c.descricao ? `, ${c.descricao}` : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* amostra intacta */}
        <div className="bt-gcol">
          {amostrasIntactas.map((a) => (
            <div key={a.id} className="bt-cell-mark mono" style={{ top: y(a.profundidade as number) }}>
              {fmtNum(a.profundidade)}
            </div>
          ))}
        </div>

        {/* classificação rocha: recuperação / rqd / fraturação / alteração */}
        {(["recuperacao", "rqd", "fraturacao", "alteracao"] as const).map((field) => (
          <div className="bt-gcol" key={field} style={{ position: "relative" }}>
            {rocha.map((r) => {
              const h = Math.max(y(r.prof_ate) - y(r.prof_desde), 1);
              const val =
                field === "recuperacao"
                  ? r.recuperacao != null
                    ? `${r.recuperacao}%`
                    : "—"
                  : field === "rqd"
                  ? r.rqd != null
                    ? `${r.rqd}%`
                    : "—"
                  : field === "fraturacao"
                  ? r.fraturacao || "—"
                  : r.alteracao || "—";
              return (
                <div
                  key={r.id}
                  style={{
                    position: "absolute",
                    top: y(r.prof_desde),
                    height: h,
                    left: 0,
                    right: 0,
                    borderBottom: "1px solid #17201f",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                  }}
                >
                  {val}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeaderCell({
  label,
  colStart,
  colSpan,
  rowSpan,
  row = 1,
  small = false,
  align = "center",
}: {
  label: string;
  colStart: number;
  colSpan: number;
  rowSpan: number;
  row?: number;
  small?: boolean;
  align?: "left" | "center";
}) {
  return (
    <div
      className="bt-th"
      style={{
        gridColumn: `${colStart} / span ${colSpan}`,
        gridRow: `${row} / span ${rowSpan}`,
        fontSize: small ? 7 : 7.6,
        textAlign: align,
        justifyContent: align === "left" ? "flex-start" : "center",
      }}
    >
      {label}
    </div>
  );
}
