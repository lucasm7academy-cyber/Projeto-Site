-- =============================================================================
-- MIGRATION: Chat da Sala
-- Cole no Supabase → SQL Editor e execute
-- =============================================================================

create table if not exists public.sala_chat (
  id         uuid primary key default gen_random_uuid(),
  sala_id    bigint not null references public.salas(id) on delete cascade,
  user_id    uuid   not null references auth.users(id) on delete cascade,
  nome       text   not null,
  texto      text   not null,
  created_at timestamptz not null default now()
);

-- Índice para busca por sala + data
create index if not exists sala_chat_sala_id_created_at
  on public.sala_chat (sala_id, created_at);

-- RLS
alter table public.sala_chat enable row level security;

-- Qualquer autenticado pode ler mensagens da sala
create policy "sala_chat_select"
  on public.sala_chat for select
  to authenticated
  using (true);

-- Só pode inserir mensagem com seu próprio user_id
create policy "sala_chat_insert"
  on public.sala_chat for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Habilitar Realtime para esta tabela
alter publication supabase_realtime add table public.sala_chat;

-- Limpeza automática: deletar mensagens com mais de 24h
-- (rode isso como um cron job no Supabase → Database → Extensions → pg_cron)
-- select cron.schedule('limpar-chat-salas', '0 * * * *', $$
--   delete from public.sala_chat where created_at < now() - interval '24 hours';
-- $$);
