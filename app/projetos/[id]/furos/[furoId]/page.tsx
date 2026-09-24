"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import {
  ALTERACAO,
  Amostra,
  Camada,
  Foto,
  Furo,
  FRATURACAO,
  HACHURAS,
  RochaTrecho,
  SptLeitura,
  TIPOS_SONDAGEM,
  nSpt,
} from "@/lib/types";
import { graficoSptSvg, perfilSvg, validarCamadas } from "@/lib/strata";

const TABS = [
  { id: "parametros", label: "Parâmetros" },
  { id: "camadas", label: "Camadas" },
  { id: "spt", label: "Tabela SPT" },
  { id: "rocha", label: "Tabela rocha" },
  { id: "freatico", label: "Nível freático" },
  { id: "amostras", label: "Moran" },
  { id: "anexos", label: "Anexos" },
];

export default function FuroEditorPage() {
  const params = useParams<{ id: string; furoId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState("parametros");
  const [furo, setFuro] = useState<Furo | null>(null);
  const [camadas, setCamadas] = useState<Camada[]>([]);
  const [spt, setSpt] = useState<SptLeitura[]>([]);
  const [rocha, setRocha] = useState<RochaTrecho[]>([]);
  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [fotos, setFotos] = useState<(Foto & { url: string })[]>([]);

  const reload = useCallback(async () => {
    const [f, c, s, r, a, ph] = await Promise.all([
      supabase.from("furos").select("*").eq("id", params.furoId).single(),
      supabase.from("camadas").select("*").eq("furo_id", params.furoId).order("prof_inicial"),
      supabase.from("spt_leituras").select("*").eq("furo_id", params.furoId).order("profundidade"),
      supabase.from("rocha_trechos").select("*").eq("furo_id", params.furoId).order("prof_desde"),
      supabase.from("amostras").select("*").eq("furo_id", params.furoId).order("profundidade"),
      supabase.from("fotos").select("*").eq("furo_id", params.furoId).order("created_at"),
    ]);
    setFuro(f.data as Furo);
    setCamadas((c.data as Camada[]) || []);
    setSpt((s.data as SptLeitura[]) || []);
    setRocha((r.data as RochaTrecho[]) || []);
    setAmostras((a.data as Amostra[]) || []);
    setFotos(
      ((ph.data as Foto[]) || []).map((p) => ({
        ...p,
        url: supabase.storage.from("fotos").getPublicUrl(p.storage_path).data.publicUrl,
      }))
    );
  }, [params.furoId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function updateFuro(patch: Partial<Furo>) {
    setFuro((prev) => (prev ? { ...prev, ...patch } : prev));
    await supabase.from("furos").update(patch).eq("id", params.furoId);
  }

  async function deleteFuro() {
    if (!furo) return;
    if (!confirm(`Eliminar o furo ${furo.id_ensaio}? Esta ação não pode ser desfeita.`)) return;
    await supabase.from("furos").delete().eq("id", params.furoId);
    router.push(`/projetos/${params.id}`);
  }

  // ---------- camadas ----------
  async function addCamada() {
    const last = camadas[camadas.length - 1];
    const { data } = await supabase
      .from("camadas")
      .insert({
        furo_id: params.furoId,
        numero: camadas.length + 1,
        prof_inicial: last ? last.prof_final : 0,
        prof_final: last ? last.prof_final + 1 : 1,
        hachura: "argila",
      })
      .select()
      .single();
    if (data) setCamadas((prev) => [...prev, data as Camada]);
  }
  async function updateCamada(id: string, patch: Partial<Camada>) {
    setCamadas((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await supabase.from("camadas").update(patch).eq("id", id);
  }
  async function deleteCamada(id: string) {
    setCamadas((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("camadas").delete().eq("id", id);
  }

  // ---------- spt ----------
  async function addSpt() {
    const last = spt[spt.length - 1];
    const { data } = await supabase
      .from("spt_leituras")
      .insert({
        furo_id: params.furoId,
        profundidade: last ? last.profundidade + 1 : 1,
        indice_amostra: `A-${String(spt.length + 1).padStart(2, "0")}`,
      })
      .select()
      .single();
    if (data) setSpt((prev) => [...prev, data as SptLeitura]);
  }
  async function updateSpt(id: string, patch: Partial<SptLeitura>) {
    setSpt((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await supabase.from("spt_leituras").update(patch).eq("id", id);
  }
  async function deleteSpt(id: string) {
    setSpt((prev) => prev.filter((s) => s.id !== id));
    await supabase.from("spt_leituras").delete().eq("id", id);
  }

  // ---------- rocha ----------
  async function addRocha() {
    const { data } = await supabase
      .from("rocha_trechos")
      .insert({
        furo_id: params.furoId,
        prof_desde: furo?.profundidade_total || 0,
        prof_ate: furo?.profundidade_total || 0,
        fraturacao: "F1",
        alteracao: "W1",
      })
      .select()
      .single();
    if (data) setRocha((prev) => [...prev, data as RochaTrecho]);
  }
  async function updateRocha(id: string, patch: Partial<RochaTrecho>) {
    setRocha((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    await supabase.from("rocha_trechos").update(patch).eq("id", id);
  }
  async function deleteRocha(id: string) {
    setRocha((prev) => prev.filter((r) => r.id !== id));
    await supabase.from("rocha_trechos").delete().eq("id", id);
  }

  // ---------- amostras ----------
  async function addAmostra() {
    const { data } = await supabase
      .from("amostras")
      .insert({ furo_id: params.furoId, identificacao: `A-${String(amostras.length + 1).padStart(2, "0")}` })
      .select()
      .single();
    if (data) setAmostras((prev) => [...prev, data as Amostra]);
  }
  async function updateAmostra(id: string, patch: Partial<Amostra>) {
    setAmostras((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    await supabase.from("amostras").update(patch).eq("id", id);
  }
  async function deleteAmostra(id: string) {
    setAmostras((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("amostras").delete().eq("id", id);
  }

  // ---------- fotos ----------
  async function uploadFotos(files: FileList) {
    for (const file of Array.from(files)) {
      const path = `${params.furoId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("fotos").upload(path, file);
      if (error) {
        alert("Falha ao enviar " + file.name + ": " + error.message);
        continue;
      }
      const { data } = await supabase
        .from("fotos")
        .insert({ furo_id: params.furoId, storage_path: path, legenda: file.name.replace(/\.[a-z0-9]+$/i, "") })
        .select()
        .single();
      if (data) {
        const url = supabase.storage.from("fotos").getPublicUrl(path).data.publicUrl;
        setFotos((prev) => [...prev, { ...(data as Foto), url }]);
      }
    }
  }
  async function updateFoto(id: string, patch: Partial<Foto>) {
    setFotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await supabase.from("fotos").update(patch).eq("id", id);
  }
  async function deleteFoto(id: string, storagePath: string) {
    setFotos((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("fotos").delete().eq("id", id);
    await supabase.storage.from("fotos").remove([storagePath]);
  }

  if (!furo) {
    return (
      <AppShell>
        <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>A carregar…</p>
      </AppShell>
    );
  }

  const avisos = validarCamadas(furo, camadas);

  return (
    <AppShell>
      <div className="crumb">
        <Link href="/projetos">Projetos</Link> / <Link href={`/projetos/${params.id}`}>Furos</Link>
      </div>
      <div className="pagehead">
        <div>
          <h1 className="mono">{furo.id_ensaio}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn danger" onClick={deleteFuro}>
            Eliminar furo
          </button>
          <Link href={`/projetos/${params.id}/furos/${params.furoId}/boletim`} className="btn primary">
            Ver boletim →
          </Link>
        </div>
      </div>

      {avisos.length > 0 && (
        <div className="banner">
          ⚠️ <div>{avisos.map((m, i) => <div key={i}>{m}</div>)}</div>
        </div>
      )}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={"tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="two-col">
        <div>
          {tab === "parametros" && <ParametrosTab furo={furo} onChange={updateFuro} />}
          {tab === "camadas" && (
            <CamadasTab camadas={camadas} onAdd={addCamada} onUpdate={updateCamada} onDelete={deleteCamada} />
          )}
          {tab === "spt" && <SptTab spt={spt} onAdd={addSpt} onUpdate={updateSpt} onDelete={deleteSpt} />}
          {tab === "rocha" && <RochaTab rocha={rocha} onAdd={addRocha} onUpdate={updateRocha} onDelete={deleteRocha} />}
          {tab === "freatico" && <FreaticoTab furo={furo} onChange={updateFuro} />}
          {tab === "amostras" && (
            <AmostrasTab amostras={amostras} onAdd={addAmostra} onUpdate={updateAmostra} onDelete={deleteAmostra} />
          )}
          {tab === "anexos" && <AnexosTab fotos={fotos} onUpload={uploadFotos} onUpdate={updateFoto} onDelete={deleteFoto} />}
        </div>
        <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="preview-box" style={{ position: "static" }}>
            <h3>Pré-visualização — estratigrafia</h3>
            <div
              dangerouslySetInnerHTML={{
                __html: perfilSvg(furo, camadas, spt, rocha, { width: 170, height: 480 }),
              }}
            />
          </div>
          <div className="preview-box" style={{ position: "static" }}>
            <h3>Pré-visualização — gráfico N × profundidade</h3>
            <div
              dangerouslySetInnerHTML={{
                __html: graficoSptSvg(furo, camadas, spt, rocha, { width: 300, height: 480 }),
              }}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  options,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  options?: string[];
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {options ? (
        <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function ParametrosTab({ furo, onChange }: { furo: Furo; onChange: (p: Partial<Furo>) => void }) {
  return (
    <>
      <fieldset>
        <legend>Identificação</legend>
        <div className="field-grid">
          <Field label="ID do ensaio" value={furo.id_ensaio} onChange={(v) => onChange({ id_ensaio: v })} />
          <Field label="Revisão" value={furo.revisao} onChange={(v) => onChange({ revisao: v })} />
          <Field
            label="Tipo de sondagem"
            value={furo.tipo_sondagem}
            onChange={(v) => onChange({ tipo_sondagem: v })}
            options={TIPOS_SONDAGEM}
          />
          <Field label="Método de perfuração" value={furo.metodo_perfuracao} onChange={(v) => onChange({ metodo_perfuracao: v })} />
          <Field label="Equipamento" value={furo.equipamento} onChange={(v) => onChange({ equipamento: v })} />
          <Field label="Broca (tipo/tamanho)" value={furo.broca_tipo_tamanho} onChange={(v) => onChange({ broca_tipo_tamanho: v })} />
        </div>
      </fieldset>
      <fieldset>
        <legend>Geometria</legend>
        <div className="field-grid">
          <Field label="Coordenada X (m)" value={furo.coordenada_x} onChange={(v) => onChange({ coordenada_x: v ? parseFloat(v) : null })} />
          <Field label="Coordenada Y (m)" value={furo.coordenada_y} onChange={(v) => onChange({ coordenada_y: v ? parseFloat(v) : null })} />
          <Field label="Cota Z (m)" value={furo.cota_z} onChange={(v) => onChange({ cota_z: v ? parseFloat(v) : null })} />
          <Field
            label="Profundidade total (m)"
            type="number"
            value={furo.profundidade_total}
            onChange={(v) => onChange({ profundidade_total: v ? parseFloat(v) : null })}
          />
          <Field label="Inclinação (º)" type="number" value={furo.inclinacao} onChange={(v) => onChange({ inclinacao: v ? parseFloat(v) : null })} />
        </div>
      </fieldset>
      <fieldset>
        <legend>Datas &amp; responsáveis</legend>
        <div className="field-grid">
          <Field label="Data de início" type="date" value={furo.data_inicio} onChange={(v) => onChange({ data_inicio: v || null })} />
          <Field label="Data de conclusão" type="date" value={furo.data_conclusao} onChange={(v) => onChange({ data_conclusao: v || null })} />
          <Field label="Elaborado por" value={furo.elaborado_por} onChange={(v) => onChange({ elaborado_por: v })} />
          <Field label="Verificado por" value={furo.verificado_por} onChange={(v) => onChange({ verificado_por: v })} />
        </div>
      </fieldset>
    </>
  );
}

function CamadasTab({
  camadas,
  onAdd,
  onUpdate,
  onDelete,
}: {
  camadas: Camada[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Camada>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="datatable">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Prof. ini. (m)</th>
              <th>Prof. fim (m)</th>
              <th>Solo</th>
              <th>Descrição tátil-visual</th>
              <th>Hachura</th>
              <th>Cor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {camadas.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 16, color: "var(--ink-soft)", textAlign: "center" }}>
                  Nenhuma camada. Adicione a primeira abaixo.
                </td>
              </tr>
            )}
            {camadas.map((c, i) => (
              <tr key={c.id}>
                <td className="mono" style={{ textAlign: "center" }}>
                  {i + 1}
                </td>
                <td>
                  <input type="number" step="0.01" defaultValue={c.prof_inicial} onBlur={(e) => onUpdate(c.id, { prof_inicial: parseFloat(e.target.value) || 0 })} />
                </td>
                <td>
                  <input type="number" step="0.01" defaultValue={c.prof_final} onBlur={(e) => onUpdate(c.id, { prof_final: parseFloat(e.target.value) || 0 })} />
                </td>
                <td>
                  <input defaultValue={c.nome_solo || ""} onBlur={(e) => onUpdate(c.id, { nome_solo: e.target.value })} />
                </td>
                <td>
                  <input defaultValue={c.descricao || ""} onBlur={(e) => onUpdate(c.id, { descricao: e.target.value })} />
                </td>
                <td>
                  <select value={c.hachura} onChange={(e) => onUpdate(c.id, { hachura: e.target.value })}>
                    {Object.entries(HACHURAS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="color"
                    style={{ width: 34, height: 26, padding: 0, border: "1px solid var(--line)", borderRadius: 5, background: "none" }}
                    defaultValue={c.cor || HACHURAS[c.hachura]?.base || "#9c7c5c"}
                    onChange={(e) => onUpdate(c.id, { cor: e.target.value })}
                    title="Cor da hachura desta camada"
                  />
                </td>
                <td className="rowdel">
                  <button className="btn sm danger" onClick={() => onDelete(c.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="addrow-bar">
        <button className="btn sm" onClick={onAdd}>
          + Adicionar camada
        </button>
      </div>
    </div>
  );
}

function SptTab({
  spt,
  onAdd,
  onUpdate,
  onDelete,
}: {
  spt: SptLeitura[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<SptLeitura>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="datatable">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Prof. (m)</th>
              <th>1ª fase</th>
              <th>2ª fase</th>
              <th>3ª fase</th>
              <th>N (2ª+3ª)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {spt.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: "var(--ink-soft)", textAlign: "center" }}>
                  Nenhum ensaio SPT lançado.
                </td>
              </tr>
            )}
            {spt.map((s) => (
              <tr key={s.id}>
                <td>
                  <input type="number" step="0.01" defaultValue={s.profundidade} onBlur={(e) => onUpdate(s.id, { profundidade: parseFloat(e.target.value) || 0 })} />
                </td>
                <td>
                  <input type="number" defaultValue={s.golpes_1a ?? ""} onBlur={(e) => onUpdate(s.id, { golpes_1a: e.target.value ? parseInt(e.target.value) : null })} />
                </td>
                <td>
                  <input type="number" defaultValue={s.golpes_2a ?? ""} onBlur={(e) => onUpdate(s.id, { golpes_2a: e.target.value ? parseInt(e.target.value) : null })} />
                </td>
                <td>
                  <input type="number" defaultValue={s.golpes_3a ?? ""} onBlur={(e) => onUpdate(s.id, { golpes_3a: e.target.value ? parseInt(e.target.value) : null })} />
                </td>
                <td className="n-final">{nSpt(s)}</td>
                <td className="rowdel">
                  <button className="btn sm danger" onClick={() => onDelete(s.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="addrow-bar">
        <button className="btn sm" onClick={onAdd}>
          + Adicionar leitura SPT
        </button>
      </div>
    </div>
  );
}

function RochaTab({
  rocha,
  onAdd,
  onUpdate,
  onDelete,
}: {
  rocha: RochaTrecho[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<RochaTrecho>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="datatable">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Desde (m)</th>
              <th>Até (m)</th>
              <th>Recup. (%)</th>
              <th>RQD (%)</th>
              <th>Fraturação</th>
              <th>Alteração</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rocha.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 16, color: "var(--ink-soft)", textAlign: "center" }}>
                  Sem trechos rochosos.
                </td>
              </tr>
            )}
            {rocha.map((r) => (
              <tr key={r.id}>
                <td>
                  <input type="number" step="0.01" defaultValue={r.prof_desde} onBlur={(e) => onUpdate(r.id, { prof_desde: parseFloat(e.target.value) || 0 })} />
                </td>
                <td>
                  <input type="number" step="0.01" defaultValue={r.prof_ate} onBlur={(e) => onUpdate(r.id, { prof_ate: parseFloat(e.target.value) || 0 })} />
                </td>
                <td>
                  <input type="number" defaultValue={r.recuperacao ?? ""} onBlur={(e) => onUpdate(r.id, { recuperacao: e.target.value ? parseFloat(e.target.value) : null })} />
                </td>
                <td>
                  <input type="number" defaultValue={r.rqd ?? ""} onBlur={(e) => onUpdate(r.id, { rqd: e.target.value ? parseFloat(e.target.value) : null })} />
                </td>
                <td>
                  <select value={r.fraturacao || "F1"} onChange={(e) => onUpdate(r.id, { fraturacao: e.target.value })}>
                    {FRATURACAO.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select value={r.alteracao || "W1"} onChange={(e) => onUpdate(r.id, { alteracao: e.target.value })}>
                    {ALTERACAO.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="rowdel">
                  <button className="btn sm danger" onClick={() => onDelete(r.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="addrow-bar">
        <button className="btn sm" onClick={onAdd}>
          + Adicionar trecho de rocha
        </button>
      </div>
    </div>
  );
}

function FreaticoTab({ furo, onChange }: { furo: Furo; onChange: (p: Partial<Furo>) => void }) {
  return (
    <fieldset>
      <legend>Nível freático</legend>
      <div className="field-grid">
        <div className="field">
          <label>Situação</label>
          <select
            value={furo.nivel_freatico_atingido ? "1" : "0"}
            onChange={(e) => onChange({ nivel_freatico_atingido: e.target.value === "1" })}
          >
            <option value="1">Atingido</option>
            <option value="0">Inatingível</option>
          </select>
        </div>
        <Field
          label="Profundidade (m)"
          type="number"
          value={furo.nivel_freatico_prof}
          onChange={(v) => onChange({ nivel_freatico_prof: v ? parseFloat(v) : null })}
        />
        <Field
          label="Data da medição"
          type="date"
          value={furo.nivel_freatico_data}
          onChange={(v) => onChange({ nivel_freatico_data: v || null })}
        />
      </div>
    </fieldset>
  );
}

function AmostrasTab({
  amostras,
  onAdd,
  onUpdate,
  onDelete,
}: {
  amostras: Amostra[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Amostra>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="datatable">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Profundidade (m)</th>
              <th>Tipo</th>
              <th>Identificação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {amostras.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, color: "var(--ink-soft)", textAlign: "center" }}>
                  Nenhuma amostra registada.
                </td>
              </tr>
            )}
            {amostras.map((a) => (
              <tr key={a.id}>
                <td>
                  <input type="number" step="0.01" defaultValue={a.profundidade ?? ""} onBlur={(e) => onUpdate(a.id, { profundidade: e.target.value ? parseFloat(e.target.value) : null })} />
                </td>
                <td>
                  <select value={a.tipo} onChange={(e) => onUpdate(a.id, { tipo: e.target.value })}>
                    <option>Deformada</option>
                    <option>Indeformada</option>
                  </select>
                </td>
                <td>
                  <input defaultValue={a.identificacao || ""} onBlur={(e) => onUpdate(a.id, { identificacao: e.target.value })} />
                </td>
                <td className="rowdel">
                  <button className="btn sm danger" onClick={() => onDelete(a.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="addrow-bar">
        <button className="btn sm" onClick={onAdd}>
          + Adicionar amostra
        </button>
      </div>
    </div>
  );
}

function AnexosTab({
  fotos,
  onUpload,
  onUpdate,
  onDelete,
}: {
  fotos: (Foto & { url: string })[];
  onUpload: (files: FileList) => void;
  onUpdate: (id: string, patch: Partial<Foto>) => void;
  onDelete: (id: string, storagePath: string) => void;
}) {
  return (
    <div className="photo-grid">
      {fotos.map((ph) => (
        <div className="photo-card" key={ph.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ph.url} alt="" />
          <div className="pc-body">
            <input defaultValue={ph.legenda || ""} placeholder="Legenda" onBlur={(e) => onUpdate(ph.id, { legenda: e.target.value })} />
            <select
              style={{ marginTop: 4, width: "100%", fontSize: 11 }}
              value={ph.tipo}
              onChange={(e) => onUpdate(ph.id, { tipo: e.target.value })}
            >
              <option>Execução</option>
              <option>Caixa de amostras</option>
              <option>Outro</option>
            </select>
            <button className="btn sm danger" style={{ marginTop: 6, width: "100%" }} onClick={() => onDelete(ph.id, ph.storage_path)}>
              Remover
            </button>
          </div>
        </div>
      ))}
      <label className="upload-tile">
        📷<span>Adicionar foto</span>
        <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => e.target.files && onUpload(e.target.files)} />
      </label>
    </div>
  );
}
