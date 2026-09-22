# Boletim SPT

App interno para cadastrar sondagens de campo (SPT, camadas de solo, rocha, nível freático, amostras e fotos) e gerar o boletim de sondagem em PDF — substituto do **GEO5 Estratigrafia** (Fine spol. s r.o. / Soluções CAD).

Stack: **Next.js** (React) + **Supabase** (Postgres + Auth + Storage), pronto para publicar no **Vercel** — tudo em planos gratuitos.

## 1. Criar o projeto no Supabase (banco de dados + login + fotos)

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e um novo projeto.
2. Vá em **SQL Editor** → **New query**, cole todo o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e clique em **Run**.
   Isso cria as tabelas (`projetos`, `furos`, `camadas`, `spt_leituras`, `rocha_trechos`, `amostras`, `fotos`), as permissões (RLS) e o bucket de armazenamento `fotos`.
3. Em **Authentication → Providers**, deixe **Email** ativado (é o padrão). Se quiser pular a confirmação por e-mail durante os testes, desative "Confirm email" em **Authentication → Settings**.
4. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public` key

## 2. Rodar localmente

```bash
npm install
cp .env.local.example .env.local
# edite .env.local com a URL e a anon key do Supabase
npm run dev
```

Abra `http://localhost:3000`, crie uma conta (e-mail/senha) na tela de login e comece a cadastrar.

## 3. Publicar no Vercel

1. Suba este repositório para o GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione as mesmas duas variáveis do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**. Pronto — cada push no GitHub gera um novo deploy automático.

## O que já funciona

- Login/cadastro de usuários da equipe (Supabase Auth) — multiusuário real.
- Projetos e furos persistidos em Postgres (Supabase).
- Editor por abas do furo: Parâmetros, Camadas, Tabela SPT (N calculado automaticamente), Tabela de rocha (RQD/recuperação/fraturação/alteração), Nível freático, Amostras e Anexos (fotos enviadas para o Supabase Storage).
- Pré-visualização ao vivo: coluna estratigráfica com hachuras + gráfico de N × profundidade (SVG).
- Validações não-bloqueantes de continuidade das camadas.
- Boletim no layout descrito na especificação original + página de registo fotográfico.
- Exportar PDF (A4 paisagem) via `html2canvas` + `jsPDF`.

## O que falta (próximas fases)

- Ajustar o layout do PDF para bater 1:1 com os boletins que a empresa já usa (logotipo definitivo, cores da marca).
- Papéis/permissões por usuário (hoje qualquer usuário autenticado pode editar qualquer projeto — suficiente para uma equipe pequena, mas sem granularidade).
- Cálculos geotécnicos avançados, seções cruzando vários furos, exportação CAD/BIM (fora do escopo do MVP, conforme a especificação original).

## Estrutura do projeto

```
app/
  layout.tsx                                  → layout raiz
  page.tsx                                    → redireciona para /projetos
  globals.css                                 → estilos
  projetos/page.tsx                           → lista de projetos
  projetos/novo/page.tsx                      → criar projeto
  projetos/[id]/page.tsx                      → lista de furos do projeto
  projetos/[id]/furos/novo/page.tsx           → criar furo
  projetos/[id]/furos/[furoId]/page.tsx       → editor do furo (abas)
  projetos/[id]/furos/[furoId]/boletim/page.tsx → boletim + exportar PDF
components/
  AppShell.tsx                                → barra lateral + tela de login
lib/
  supabaseClient.ts                           → cliente Supabase
  types.ts                                    → tipos e enums (hachuras, W1–W5, F1–F5…)
  strata.ts                                   → geração do SVG (perfil + gráfico N) e validações
supabase/
  schema.sql                                  → tabelas, RLS e bucket de fotos
```
