-- =============================================================================
-- MIGRATION: Pool de Códigos de Partida por Modo (FIFO circular)
-- Cole no Supabase → SQL Editor e execute
-- =============================================================================

-- Coluna na tabela salas (necessária para armazenar o código atribuído)
alter table public.salas
  add column if not exists codigo_partida text;

-- Recria a tabela com a constraint correta (codigo, modo) ao invés de só (codigo)
drop table if exists public.codigos_partida cascade;

-- Tabela principal
create table if not exists public.codigos_partida (
  id               serial primary key,
  codigo           text not null,
  modo             text not null,          -- '5v5' | '1v1' | 'aram' | 'torneio'
  em_uso           boolean not null default false,
  sala_id          bigint references public.salas(id) on delete set null,
  ultima_vez_usado timestamptz,
  unique (codigo, modo)                    -- mesmo código pode existir em modos diferentes
);

-- Índice para busca rápida por modo + disponibilidade
create index if not exists codigos_partida_modo_idx
  on public.codigos_partida (modo, em_uso, ultima_vez_usado asc nulls first);

-- RLS
alter table public.codigos_partida enable row level security;

drop policy if exists "codigos_select" on public.codigos_partida;
drop policy if exists "codigos_update" on public.codigos_partida;

create policy "codigos_select"
  on public.codigos_partida for select
  to authenticated using (true);

create policy "codigos_update"
  on public.codigos_partida for update
  to authenticated using (true) with check (true);

-- =============================================================================
-- CÓDIGOS INICIAIS
-- Para adicionar mais: INSERT INTO public.codigos_partida (codigo, modo) VALUES ('SEU-CODIGO', '5v5');
-- =============================================================================

-- Códigos 5v5
insert into public.codigos_partida (codigo, modo) values
  ('BR04fa2-4611cfe4-f5fd-47da-8497-0b9edb308d83', '5v5'),
  ('BR04fa2-ca5d28f8-28c3-4b03-a212-0ab9dbf237bc', '5v5'),
  ('BR04fa2-8ad0a8b7-4d00-4ce9-9272-46c6a5ec7f53', '5v5'),
  ('BR04fa2-4acc3d6d-923c-49b6-b9d8-2ebbb8acbad3', '5v5')
on conflict (codigo, modo) do nothing;

-- Códigos 1v1
insert into public.codigos_partida (codigo, modo) values
  ('BR04fa2-4611cfe4-f5fd-47da-8497-0b9edb308d83', '1v1'),
  ('BR04fa2-ca5d28f8-28c3-4b03-a212-0ab9dbf237bc', '1v1'),
  ('BR04fa2-8ad0a8b7-4d00-4ce9-9272-46c6a5ec7f53', '1v1'),
  ('BR04fa2-4acc3d6d-923c-49b6-b9d8-2ebbb8acbad3', '1v1')
on conflict (codigo, modo) do nothing;

-- Códigos ARAM (adicione os seus aqui)
-- insert into public.codigos_partida (codigo, modo) values
--   ('SEU-CODIGO-ARAM-001', 'aram')
-- on conflict (codigo, modo) do nothing;

-- =============================================================================
-- FUNÇÕES FIFO
-- =============================================================================

-- Atribui o código disponível mais antigo para o modo da sala
create or replace function public.atribuir_codigo_partida(p_sala_id bigint, p_modo text)
returns text language plpgsql security definer as $$
declare
  v_codigo text;
begin
  select codigo into v_codigo
  from public.codigos_partida
  where em_uso = false
    and modo = p_modo
  order by ultima_vez_usado asc nulls first, id asc
  limit 1
  for update skip locked;

  if v_codigo is null then
    return null; -- sem códigos disponíveis para este modo
  end if;

  update public.codigos_partida
  set em_uso = true, sala_id = p_sala_id, ultima_vez_usado = now()
  where codigo = v_codigo;

  update public.salas
  set codigo_partida = v_codigo
  where id = p_sala_id;

  return v_codigo;
end;
$$;

-- Libera o código quando a partida encerra
create or replace function public.liberar_codigo_partida(p_sala_id bigint)
returns void language plpgsql security definer as $$
begin
  update public.codigos_partida
  set em_uso = false, sala_id = null
  where sala_id = p_sala_id;
end;
$$;
