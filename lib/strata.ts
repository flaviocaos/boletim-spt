import type { CSSProperties } from "react";
import { Camada, Furo, HACHURAS, RochaTrecho, SptLeitura, nSpt } from "./types";

/** Profundidade total a considerar, a partir de todos os dados lançados no furo. */
function profTotalDe(furo: Furo, camadas: Camada[], spt: SptLeitura[], rocha: RochaTrecho[]): number {
  return Math.max(
    furo.profundidade_total || 0,
    1,
    camadas.length ? camadas[camadas.length - 1].prof_final : 0,
    spt.length ? spt[spt.length - 1].profundidade : 0,
    rocha.length ? rocha[rocha.length - 1].prof_ate : 0
  );
}

/** Gera o SVG (como string) só da coluna estratigráfica (hachuras + nível freático). */
export function perfilSvg(
  furo: Furo,
  camadas: Camada[],
  spt: SptLeitura[],
  rocha: RochaTrecho[],
  opts: { width?: number; height?: number } = {}
): string {
  const W = opts.width || 150;
  const H = opts.height || 520;
  const padTop = 20;
  const padBottom = 20;
  const padLeft = 26;
  const profTotal = profTotalDe(furo, camadas, spt, rocha);
  const plotH = H - padTop - padBottom;
  const y = (depth: number) => padTop + (depth / profTotal) * plotH;

  const colW = W - padLeft - 8;
  const colX = padLeft;

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:100%;font-family:var(--font-mono,monospace);" role="img" aria-label="Perfil estratigráfico">`;
  svg += patternDefs();

  const step = profTotal > 16 ? 4 : profTotal > 8 ? 2 : 1;
  for (let d = 0; d <= profTotal + 0.001; d += step) {
    const yy = y(d);
    svg += `<line x1="${colX - 4}" y1="${yy}" x2="${colX + colW}" y2="${yy}" stroke="currentColor" stroke-opacity="0.08"/>`;
    svg += `<text x="2" y="${yy + 3}" font-size="8.5" fill="currentColor" fill-opacity="0.6">${Math.round(d)}</text>`;
  }

  svg += `<rect x="${colX}" y="${padTop}" width="${colW}" height="${plotH}" fill="none" stroke="currentColor" stroke-opacity="0.5"/>`;
  camadas.forEach((c) => {
    const y0 = y(c.prof_inicial);
    const y1 = y(c.prof_final);
    const hac = HACHURAS[c.hachura] || HACHURAS.argila;
    const base = c.cor || hac.base;
    const h = Math.max(y1 - y0, 0.5);
    svg += `<rect x="${colX}" y="${y0}" width="${colW}" height="${h}" fill="${base}"/>`;
    svg += `<rect x="${colX}" y="${y0}" width="${colW}" height="${h}" fill="url(#pat-${hac.pat})"/>`;
    svg += `<line x1="${colX}" y1="${y1}" x2="${colX + colW}" y2="${y1}" stroke="#2a2a25" stroke-width="0.7"/>`;
  });

  if (furo.nivel_freatico_atingido && furo.nivel_freatico_prof != null) {
    const yN = y(furo.nivel_freatico_prof);
    svg += `<g transform="translate(${colX - 2},${yN})" fill="#2e5c8a"><path d="M0 0 L8 0 L4 6 Z"/><line x1="0" y1="0" x2="8" y2="0" stroke="#2e5c8a" stroke-width="1"/></g>`;
  } else {
    svg += `<text x="${colX}" y="${padTop - 6}" font-size="8" fill="#b23a3a" fill-opacity="0.8">N.A. inatingível</text>`;
  }

  rocha.forEach((r) => {
    const y0 = y(r.prof_desde);
    const y1 = y(r.prof_ate);
    svg += `<rect x="${colX + colW - 6}" y="${y0}" width="6" height="${Math.max(y1 - y0, 1)}" fill="#767670" fill-opacity="0.5"/>`;
  });

  svg += `</svg>`;
  return svg;
}

/** Gera o SVG (como string), separado do perfil, do gráfico de N x profundidade,
 * sempre com as etiquetas de profundidade e do número de golpes (N) visíveis. */
export function graficoSptSvg(
  furo: Furo,
  camadas: Camada[],
  spt: SptLeitura[],
  rocha: RochaTrecho[],
  opts: { width?: number; height?: number } = {}
): string {
  const W = opts.width || 220;
  const H = opts.height || 520;
  const padTop = 20;
  const padBottom = 20;
  const padLeft = 22;
  const padRight = 34;
  const profTotal = profTotalDe(furo, camadas, spt, rocha);
  const plotH = H - padTop - padBottom;
  const y = (depth: number) => padTop + (depth / profTotal) * plotH;

  const chartX = padLeft;
  const chartW = W - padLeft - padRight;

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:100%;font-family:var(--font-mono,monospace);" role="img" aria-label="Gráfico de N x profundidade">`;

  const step = profTotal > 16 ? 4 : profTotal > 8 ? 2 : 1;
  for (let d = 0; d <= profTotal + 0.001; d += step) {
    const yy = y(d);
    svg += `<line x1="${chartX}" y1="${yy}" x2="${chartX + chartW}" y2="${yy}" stroke="currentColor" stroke-opacity="0.08"/>`;
    svg += `<text x="2" y="${yy + 3}" font-size="8.5" fill="currentColor" fill-opacity="0.6">${Math.round(d)}</text>`;
  }

  svg += `<rect x="${chartX}" y="${padTop}" width="${chartW}" height="${plotH}" fill="none" stroke="currentColor" stroke-opacity="0.35"/>`;
  [0, 10, 20, 30, 40, 50].forEach((n) => {
    const xx = chartX + (n / 50) * chartW;
    svg += `<line x1="${xx}" y1="${padTop}" x2="${xx}" y2="${padTop + plotH}" stroke="currentColor" stroke-opacity="0.08"/>`;
    svg += `<text x="${xx}" y="${padTop + plotH + 11}" font-size="7.5" text-anchor="middle" fill="currentColor" fill-opacity="0.6">${n}</text>`;
  });
  svg += `<text x="${chartX + chartW / 2}" y="${H - 4}" font-size="8" text-anchor="middle" font-family="var(--font-display,sans-serif)" fill="currentColor" fill-opacity="0.7">N (golpes/0,30m)</text>`;

  const pts = spt
    .filter((s) => s.golpes_2a != null && s.golpes_3a != null)
    .map((s) => {
      const n = nSpt(s);
      return { x: chartX + (Math.min(n, 50) / 50) * chartW, y: y(s.profundidade), n, prof: s.profundidade };
    });
  if (pts.length) {
    const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
    svg += `<polyline points="${poly}" fill="none" stroke="#2e5c8a" stroke-width="1.6"/>`;
    pts.forEach((p) => {
      svg += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#2e5c8a" stroke="#fff" stroke-width="0.8"/>`;
      svg += `<text x="${p.x + 6}" y="${p.y + 3}" font-size="8" fill="currentColor">N=${p.n} · ${fmtNum(p.prof)}m</text>`;
    });
  }

  svg += `</svg>`;
  return svg;
}

function patternDefs(): string {
  let defs = "<defs>";
  const p = (id: string, inner: string) => {
    defs += `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse">${inner}</pattern>`;
  };
  p("pat-linhas", '<line x1="0" y1="8" x2="10" y2="8" stroke="#5a4530" stroke-width="1"/>');
  p(
    "pat-linhas_pontos",
    '<line x1="0" y1="8" x2="6" y2="8" stroke="#5a4530" stroke-width="1"/><circle cx="8" cy="3" r="0.8" fill="#5a4530"/>'
  );
  p(
    "pat-pontos_finos",
    '<circle cx="2" cy="2" r="0.6" fill="#6b5a38"/><circle cx="7" cy="6" r="0.6" fill="#6b5a38"/>'
  );
  p(
    "pat-pontos",
    '<circle cx="2.5" cy="2.5" r="1.1" fill="#6b5a38"/><circle cx="7.5" cy="7.5" r="1.1" fill="#6b5a38"/>'
  );
  p("pat-circulos", '<circle cx="5" cy="5" r="2.1" fill="none" stroke="#55554e" stroke-width="0.9"/>');
  p(
    "pat-hachura_rocha",
    '<path d="M0 10 L10 0" stroke="#454540" stroke-width="1"/><path d="M-2 2 L2 -2" stroke="#454540" stroke-width="1"/><path d="M8 12 L12 8" stroke="#454540" stroke-width="1"/>'
  );
  p(
    "pat-aterro",
    '<line x1="0" y1="9" x2="10" y2="9" stroke="#7a6a45" stroke-width="1" stroke-dasharray="2,2"/><line x1="0" y1="4" x2="10" y2="4" stroke="#7a6a45" stroke-width="1" stroke-dasharray="2,2"/>'
  );
  defs += "</defs>";
  return defs;
}

export function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

export function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return (Math.round(v * 100) / 100).toString().replace(".", ",");
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v + "T00:00:00");
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("pt-PT");
}

/** Estilo CSS (background) que aproxima a hachura geotécnica de cada tipo de solo.
 * `corCustom`, quando definida na camada, substitui a cor padrão do material. */
export function hachuraCss(key: string, corCustom?: string | null): CSSProperties {
  const hac = HACHURAS[key] || HACHURAS.argila;
  const base = corCustom || hac.base;
  switch (hac.pat) {
    case "linhas":
      return {
        backgroundColor: base,
        backgroundImage: "repeating-linear-gradient(0deg, #5a4530 0, #5a4530 1px, transparent 1px, transparent 7px)",
      };
    case "linhas_pontos":
      return {
        backgroundColor: base,
        backgroundImage:
          "repeating-linear-gradient(0deg, #5a4530 0, #5a4530 1px, transparent 1px, transparent 7px), radial-gradient(#5a4530 1px, transparent 1.2px)",
        backgroundSize: "auto, 7px 7px",
      };
    case "pontos_finos":
      return {
        backgroundColor: base,
        backgroundImage: "radial-gradient(#6b5a38 0.8px, transparent 1px)",
        backgroundSize: "6px 6px",
      };
    case "pontos":
      return {
        backgroundColor: base,
        backgroundImage: "radial-gradient(#6b5a38 1.1px, transparent 1.4px)",
        backgroundSize: "9px 9px",
      };
    case "circulos":
      return {
        backgroundColor: base,
        backgroundImage: "radial-gradient(circle, transparent 2.6px, #55554e 2.6px, #55554e 3.2px, transparent 3.2px)",
        backgroundSize: "12px 12px",
      };
    case "hachura_rocha":
      return {
        backgroundColor: base,
        backgroundImage: "repeating-linear-gradient(45deg, #454540 0, #454540 1.5px, transparent 1.5px, transparent 7px)",
      };
    case "aterro":
      return {
        backgroundColor: base,
        backgroundImage:
          "repeating-linear-gradient(135deg, #7a6a45 0, #7a6a45 2px, transparent 2px, transparent 6px)",
      };
    default:
      return { backgroundColor: base };
  }
}

/** Validações não-bloqueantes de continuidade das camadas. */
export function validarCamadas(furo: Furo, camadas: Camada[]): string[] {
  const msgs: string[] = [];
  const cams = [...camadas].sort((a, b) => a.prof_inicial - b.prof_inicial);
  for (let i = 1; i < cams.length; i++) {
    if (Math.abs(cams[i].prof_inicial - cams[i - 1].prof_final) > 0.01) {
      msgs.push(
        `Há um vazio/sobreposição entre a camada ${cams[i - 1].numero} e a ${cams[i].numero}.`
      );
    }
  }
  const soma = cams.length ? cams[cams.length - 1].prof_final - cams[0].prof_inicial : 0;
  const total = furo.profundidade_total || 0;
  if (cams.length && total && Math.abs(soma - total) > 0.05) {
    msgs.push(
      `A soma das camadas (${fmtNum(soma)} m) não coincide com a profundidade total do furo (${fmtNum(total)} m).`
    );
  }
  return msgs;
}
