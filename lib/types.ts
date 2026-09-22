export type Projeto = {
  id: string;
  nome_cliente: string;
  nome_projeto: string;
  localizacao: string | null;
  created_at: string;
};

export type Furo = {
  id: string;
  projeto_id: string;
  id_ensaio: string;
  revisao: string | null;
  coordenada_x: number | null;
  coordenada_y: number | null;
  cota_z: number | null;
  deslocamento_dh: number | null;
  profundidade_total: number | null;
  inclinacao: number | null;
  tipo_sondagem: string | null;
  metodo_perfuracao: string | null;
  equipamento: string | null;
  broca_tipo_tamanho: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  encarregado: string | null;
  avaliado_por: string | null;
  indice_energetico_er: number | null;
  correlacao_tensao_cn: string | null;
  elaborado_por: string | null;
  verificado_por: string | null;
  nivel_freatico_atingido: boolean;
  nivel_freatico_prof: number | null;
  nivel_freatico_data: string | null;
  created_at: string;
};

export type Camada = {
  id: string;
  furo_id: string;
  numero: number;
  prof_inicial: number;
  prof_final: number;
  nome_solo: string | null;
  descricao: string | null;
  hachura: string;
  tem_amostra: boolean;
  obs: string | null;
};

export type SptLeitura = {
  id: string;
  furo_id: string;
  profundidade: number;
  golpes_1a: number | null;
  golpes_2a: number | null;
  golpes_3a: number | null;
  golpes_4a: number | null;
  indice_amostra: string | null;
};

export type RochaTrecho = {
  id: string;
  furo_id: string;
  prof_desde: number;
  prof_ate: number;
  recuperacao: number | null;
  rqd: number | null;
  fraturacao: string | null;
  alteracao: string | null;
};

export type Amostra = {
  id: string;
  furo_id: string;
  profundidade: number | null;
  tipo: string;
  identificacao: string | null;
};

export type Foto = {
  id: string;
  furo_id: string;
  storage_path: string;
  legenda: string | null;
  tipo: string;
  created_at: string;
};

export const TIPOS_SONDAGEM = [
  "Simples reconhecimento",
  "Rotativa",
  "Mista",
  "Trado manual",
];

export const HACHURAS: Record<string, { label: string; base: string; pat: string }> = {
  aterro: { label: "Aterro", base: "#cbb98d", pat: "aterro" },
  argila: { label: "Argila", base: "#9c7c5c", pat: "linhas" },
  argila_siltosa: { label: "Argila siltosa", base: "#a9835f", pat: "linhas" },
  argila_arenosa: { label: "Argila arenosa", base: "#b58f61", pat: "linhas_pontos" },
  silte: { label: "Silte", base: "#c2ad82", pat: "pontos_finos" },
  silte_arenoso: { label: "Silte arenoso", base: "#cbb787", pat: "pontos_finos" },
  areia: { label: "Areia", base: "#ddc788", pat: "pontos" },
  areia_siltosa: { label: "Areia siltosa", base: "#d4bd81", pat: "pontos" },
  matacao: { label: "Matacão", base: "#9b9b93", pat: "circulos" },
  rocha: { label: "Rocha", base: "#767670", pat: "hachura_rocha" },
};

export const FRATURACAO = ["F1", "F2", "F3", "F4", "F5"] as const;
export const FRATURACAO_LBL: Record<string, string> = {
  F1: "muito afastadas",
  F2: "afastadas",
  F3: "medianamente afastadas",
  F4: "próximas",
  F5: "muito próximas",
};
export const ALTERACAO = ["W1", "W2", "W3", "W4", "W5"] as const;
export const ALTERACAO_LBL: Record<string, string> = {
  W1: "sã",
  W2: "pouco alterada",
  W3: "medianamente alterada",
  W4: "muito alterada",
  W5: "decomposta",
};

export function nSpt(s: Pick<SptLeitura, "golpes_2a" | "golpes_3a">): number {
  return (s.golpes_2a || 0) + (s.golpes_3a || 0);
}
