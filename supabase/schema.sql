-- Boletim SPT — schema do Supabase
-- Rode este arquivo inteiro em: Supabase Dashboard > SQL Editor > New query > Run

create extension if not exists "pgcrypto";

-- ============ PROJETOS ============
create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  nome_cliente text not null,
  nome_projeto text not null,
  localizacao text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ============ FUROS (SONDAGENS) ============
create table if not exists furos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  id_ensaio text not null,
  revisao text default '00',
  coordenada_x numeric,
  coordenada_y numeric,
  cota_z numeric,
  deslocamento_dh numeric,
  profundidade_total numeric,
  inclinacao numeric default 90,
  tipo_sondagem text default 'Simples reconhecimento',
  metodo_perfuracao text,
  equipamento text,
  broca_tipo_tamanho text,
  data_inicio date,
  data_conclusao date,
  encarregado text,
  avaliado_por text,
  indice_energetico_er numeric,
  correlacao_tensao_cn text,
  elaborado_por text,
  verificado_por text,
  nivel_freatico_atingido boolean default false,
  nivel_freatico_prof numeric,
  nivel_freatico_data date,
  created_at timestamptz not null default now()
);

-- ============ CAMADAS (PERFIL ESTRATIGRÁFICO) ============
create table if not exists camadas (
  id uuid primary key default gen_random_uuid(),
  furo_id uuid not null references furos(id) on delete cascade,
  numero int not null default 1,
  prof_inicial numeric not null default 0,
  prof_final numeric not null default 0,
  nome_solo text,
  descricao text,
  hachura text default 'argila',
  tem_amostra boolean default false,
  obs text
);

-- ============ ENSAIOS SPT ============
create table if not exists spt_leituras (
  id uuid primary key default gen_random_uuid(),
  furo_id uuid not null references furos(id) on delete cascade,
  profundidade numeric not null,
  golpes_1a int,
  golpes_2a int,
  golpes_3a int,
  golpes_4a int,
  indice_amostra text
);

-- ============ TABELA ROCHA ============
create table if not exists rocha_trechos (
  id uuid primary key default gen_random_uuid(),
  furo_id uuid not null references furos(id) on delete cascade,
  prof_desde numeric not null,
  prof_ate numeric not null,
  recuperacao numeric,
  rqd numeric,
  fraturacao text,
  alteracao text
);

-- ============ AMOSTRAS ============
create table if not exists amostras (
  id uuid primary key default gen_random_uuid(),
  furo_id uuid not null references furos(id) on delete cascade,
  profundidade numeric,
  tipo text default 'Deformada',
  identificacao text
);

-- ============ FOTOS / ANEXOS ============
create table if not exists fotos (
  id uuid primary key default gen_random_uuid(),
  furo_id uuid not null references furos(id) on delete cascade,
  storage_path text not null,
  legenda text,
  tipo text default 'Execução',
  created_at timestamptz not null default now()
);

-- ============ RLS: qualquer usuário autenticado da empresa pode ler/escrever ============
-- (Fase 1 de multiusuário: sem separação por empresa/permissões — item 12 da spec)
alter table projetos enable row level security;
alter table furos enable row level security;
alter table camadas enable row level security;
alter table spt_leituras enable row level security;
alter table rocha_trechos enable row level security;
alter table amostras enable row level security;
alter table fotos enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['projetos','furos','camadas','spt_leituras','rocha_trechos','amostras','fotos'])
  loop
    execute format('drop policy if exists "auth_all_%1$s" on %1$s;', t);
    execute format(
      'create policy "auth_all_%1$s" on %1$s for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ============ STORAGE: bucket para fotos dos furos ============
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "fotos_auth_read" on storage.objects;
create policy "fotos_auth_read" on storage.objects
  for select to authenticated using (bucket_id = 'fotos');

drop policy if exists "fotos_auth_write" on storage.objects;
create policy "fotos_auth_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

drop policy if exists "fotos_auth_delete" on storage.objects;
create policy "fotos_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');

drop policy if exists "fotos_public_read" on storage.objects;
create policy "fotos_public_read" on storage.objects
  for select to anon using (bucket_id = 'fotos');
