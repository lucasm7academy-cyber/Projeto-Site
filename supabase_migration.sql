-- =============================================================================
-- MIGRATION: Adaptar tabelas existentes ao sistema de equipes
-- Cole no Supabase → SQL Editor e execute
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Adicionar colunas faltantes em: profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists bio             text    default '',
  add column if not exists lane            text    default 'Top',
  add column if not exists lane2           text    default 'Support',
  add column if not exists time_id         uuid    references public.times (id) on delete set null,
  add column if not exists instagram       text    default '',
  add column if not exists twitch          text    default '',
  add column if not exists discord         text    default '',
  add column if not exists chave_pix       text    default '',
  add column if not exists tipo_chave_pix  text    default '',
  add column if not exists nome_pix        text    default '';

-- ---------------------------------------------------------------------------
-- 1. Adicionar colunas faltantes em: times
-- ---------------------------------------------------------------------------
alter table public.times
  add column if not exists gradient_from  text    not null default '#FFB700',
  add column if not exists gradient_to    text    not null default '#FF6600',
  add column if not exists pdl            int     not null default 0,
  add column if not exists winrate        int     not null default 0,
  add column if not exists ranking        int     not null default 999,
  add column if not exists wins           int     not null default 0,
  add column if not exists games_played   int     not null default 0;

-- ---------------------------------------------------------------------------
-- 2. Adicionar colunas faltantes em: time_membros
-- ---------------------------------------------------------------------------
alter table public.time_membros
  add column if not exists riot_id    text    not null default '',
  add column if not exists role       text    not null default 'TOP'
      check (role in ('TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES')),
  add column if not exists is_leader  boolean not null default false,
  add column if not exists elo        text    not null default '',
  add column if not exists balance    numeric not null default 0;

-- ---------------------------------------------------------------------------
-- 3. Criar tabela de convites/solicitações (se não existir)
-- ---------------------------------------------------------------------------
create table if not exists public.time_convites (
  id            uuid        primary key default gen_random_uuid(),
  time_id       uuid        not null references public.times (id) on delete cascade,
  de_user_id    uuid        not null references auth.users (id) on delete cascade,
  para_user_id  uuid        references auth.users (id) on delete cascade,
  riot_id       text,
  role          text        not null check (role in ('TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES')),
  mensagem      text,
  tipo          text        not null check (tipo in ('convite', 'solicitacao')),
  status        text        not null default 'pendente'
                check (status in ('pendente', 'aceito', 'recusado')),
  criado_em     timestamptz not null default now()
);

-- RLS – time_convites
alter table public.time_convites enable row level security;

drop policy if exists "convites: ver os seus"     on public.time_convites;
drop policy if exists "convites: criar"            on public.time_convites;
drop policy if exists "convites: atualizar status" on public.time_convites;
drop policy if exists "convites: cancelar"         on public.time_convites;

create policy "convites: ver os seus"
  on public.time_convites for select to authenticated
  using (
    de_user_id = auth.uid()
    or para_user_id = auth.uid()
    or exists (
      select 1 from public.times t
      where t.id = time_id and t.dono_id = auth.uid()
    )
  );

create policy "convites: criar"
  on public.time_convites for insert to authenticated
  with check (de_user_id = auth.uid());

create policy "convites: atualizar status"
  on public.time_convites for update to authenticated
  using (
    para_user_id = auth.uid()
    or exists (
      select 1 from public.times t
      where t.id = time_id and t.dono_id = auth.uid()
    )
  );

create policy "convites: cancelar"
  on public.time_convites for delete to authenticated
  using (de_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. RLS nas tabelas existentes (caso ainda não tenham)
-- ---------------------------------------------------------------------------

-- times
alter table public.times enable row level security;

drop policy if exists "times: leitura publica" on public.times;
create policy "times: leitura publica"
  on public.times for select to authenticated using (true);

drop policy if exists "times: inserir" on public.times;
create policy "times: inserir"
  on public.times for insert to authenticated
  with check (dono_id = auth.uid());

drop policy if exists "times: editar pelo dono" on public.times;
create policy "times: editar pelo dono"
  on public.times for update to authenticated
  using  (dono_id = auth.uid())
  with check (dono_id is null or dono_id = auth.uid());

drop policy if exists "times: deletar pelo dono" on public.times;
create policy "times: deletar pelo dono"
  on public.times for delete to authenticated
  using (dono_id = auth.uid());

-- contas_riot: permitir busca por qualquer autenticado (para o sistema de convites)
alter table public.contas_riot enable row level security;

drop policy if exists "contas_riot: leitura por autenticados" on public.contas_riot;
create policy "contas_riot: leitura por autenticados"
  on public.contas_riot for select to authenticated
  using (true);

-- time_membros
alter table public.time_membros enable row level security;

drop policy if exists "membros: leitura publica" on public.time_membros;
create policy "membros: leitura publica"
  on public.time_membros for select to authenticated using (true);

drop policy if exists "membros: inserir pelo lider" on public.time_membros;
create policy "membros: inserir pelo lider"
  on public.time_membros for insert to authenticated
  with check (
    exists (
      select 1 from public.times t
      where t.id = time_id and t.dono_id = auth.uid()
    )
  );

drop policy if exists "membros: editar pelo lider" on public.time_membros;
create policy "membros: editar pelo lider"
  on public.time_membros for update to authenticated
  using (
    exists (
      select 1 from public.times t
      where t.id = time_id and t.dono_id = auth.uid()
    )
  );

drop policy if exists "membros: deletar pelo lider" on public.time_membros;
create policy "membros: deletar pelo lider"
  on public.time_membros for delete to authenticated
  using (
    exists (
      select 1 from public.times t
      where t.id = time_id and t.dono_id = auth.uid()
    )
  );

drop policy if exists "membros: sair do time" on public.time_membros;
create policy "membros: sair do time"
  on public.time_membros for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "membros: aceitar convite" on public.time_membros;
create policy "membros: aceitar convite"
  on public.time_membros for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.time_convites c
      where c.time_id    = time_id
        and c.para_user_id = auth.uid()
        and c.tipo       = 'convite'
        and c.status     = 'pendente'
    )
  );

-- ---------------------------------------------------------------------------
-- 5. SEED – 6 times com jogadores
-- ---------------------------------------------------------------------------
do $$
declare
  t1 uuid := 'b1000000-0000-0000-0000-000000000001';
  t2 uuid := 'b2000000-0000-0000-0000-000000000002';
  t3 uuid := 'b3000000-0000-0000-0000-000000000003';
  t4 uuid := 'b4000000-0000-0000-0000-000000000004';
  t5 uuid := 'b5000000-0000-0000-0000-000000000005';
  t6 uuid := 'b6000000-0000-0000-0000-000000000006';
begin

  -- Times
  insert into public.times
    (id, nome, tag, logo_url, gradient_from, gradient_to, pdl, winrate, ranking, wins, games_played, dono_id)
  values
    (t1, 'M7 Esports',     'M7E', null, '#FFB700', '#FF6600', 3240, 72, 3, 36, 50, null),
    (t2, 'Shadow Blades',  'SHB', null, '#0044FF', '#00D4FF', 4180, 78, 1, 42, 54, null),
    (t3, 'Phoenix Rising', 'PHX', null, '#FF3300', '#FF9900', 3650, 68, 2, 34, 50, null),
    (t4, 'Ice Wolves',     'ICW', null, '#00C9FF', '#0044FF', 2890, 61, 4, 28, 46, null),
    (t5, 'Storm Knights',  'STK', null, '#7B00FF', '#00AAFF', 2540, 58, 5, 22, 38, null),
    (t6, 'Gold Rush',      'GRS', null, '#FFB700', '#FF6600', 1980, 54, 6, 18, 33, null)
  on conflict (id) do update set
    gradient_from = excluded.gradient_from,
    gradient_to   = excluded.gradient_to,
    pdl           = excluded.pdl,
    winrate       = excluded.winrate,
    ranking       = excluded.ranking,
    wins          = excluded.wins,
    games_played  = excluded.games_played;

  -- Limpar membros dos times seed (para re-seed limpo)
  delete from public.time_membros where time_id in (t1,t2,t3,t4,t5,t6);

  -- M7 Esports
  insert into public.time_membros (time_id, user_id, riot_id, cargo, role, is_leader, elo, balance)
  values
    (t1, null, 'ShadowKing#BR1', 'jogador', 'TOP', true,  'Diamante IV',  850.00),
    (t1, null, 'JungleGod#BR1',  'jogador', 'JG',  false, 'Mestre',       1200.00),
    (t1, null, 'MidLaner7#BR1',  'jogador', 'MID', false, 'Grão-Mestre',  320.50),
    (t1, null, 'CarryADC#BR1',   'jogador', 'ADC', false, 'Diamante II',  475.00),
    (t1, null, 'SupportGG#BR1',  'jogador', 'SUP', false, 'Platina I',    154.00),
    (t1, null, 'Reserva1#BR1',   'reserva', 'RES', false, 'Diamante III', 210.00),
    (t1, null, 'Reserva2#BR1',   'reserva', 'RES', false, 'Platina II',   180.00);

  -- Shadow Blades
  insert into public.time_membros (time_id, user_id, riot_id, cargo, role, is_leader, elo, balance)
  values
    (t2, null, 'DarkTop#KR1',   'jogador', 'TOP', true,  'Mestre',       2100.00),
    (t2, null, 'BladeJG#EUW',   'jogador', 'JG',  false, 'Grão-Mestre',  1800.00),
    (t2, null, 'ShadowMid#BR1', 'jogador', 'MID', false, 'Desafiante',   3400.00),
    (t2, null, 'PurpleADC#BR1', 'jogador', 'ADC', false, 'Mestre',       920.00),
    (t2, null, 'VoidSup#BR1',   'jogador', 'SUP', false, 'Diamante I',   680.00),
    (t2, null, 'Reserva3#KR1',  'reserva', 'RES', false, 'Mestre',       450.00),
    (t2, null, 'Reserva4#EUW',  'reserva', 'RES', false, 'Diamante I',   380.00);

  -- Phoenix Rising
  insert into public.time_membros (time_id, user_id, riot_id, cargo, role, is_leader, elo, balance)
  values
    (t3, null, 'FireTop#BR1',   'jogador', 'TOP', true,  'Diamante I',   600.00),
    (t3, null, 'AshJungle#BR1', 'jogador', 'JG',  false, 'Mestre',       1100.00),
    (t3, null, 'FlameMid#BR1',  'jogador', 'MID', false, 'Diamante II',  450.00),
    (t3, null, 'PhxADC#BR1',    'jogador', 'ADC', false, 'Diamante III', 320.00),
    (t3, null, 'EmberSup#BR1',  'jogador', 'SUP', false, 'Platina II',   210.00),
    (t3, null, 'Reserva5#BR1',  'reserva', 'RES', false, 'Platina I',    150.00),
    (t3, null, 'Reserva6#BR1',  'reserva', 'RES', false, 'Ouro I',       90.00);

  -- Ice Wolves (JG vaga)
  insert into public.time_membros (time_id, user_id, riot_id, cargo, role, is_leader, elo, balance)
  values
    (t4, null, 'FrostTop#BR1',  'jogador', 'TOP', true,  'Platina I',    380.00),
    (t4, null, 'IceMage#BR1',   'jogador', 'MID', false, 'Diamante III', 510.00),
    (t4, null, 'ColdADC#BR1',   'jogador', 'ADC', false, 'Ouro I',       145.00),
    (t4, null, 'ArcticSup#BR1', 'jogador', 'SUP', false, 'Prata I',      95.00),
    (t4, null, 'Reserva7#BR1',  'reserva', 'RES', false, 'Ouro II',      80.00);

  -- Storm Knights (ADC e SUP vagas)
  insert into public.time_membros (time_id, user_id, riot_id, cargo, role, is_leader, elo, balance)
  values
    (t5, null, 'ThunderTop#BR1', 'jogador', 'TOP', true,  'Diamante III', 490.00),
    (t5, null, 'LightJG#BR1',    'jogador', 'JG',  false, 'Platina I',    320.00),
    (t5, null, 'StormMid#BR1',   'jogador', 'MID', false, 'Diamante IV',  275.00);

  -- Gold Rush
  insert into public.time_membros (time_id, user_id, riot_id, cargo, role, is_leader, elo, balance)
  values
    (t6, null, 'GoldenTop#BR1',  'jogador', 'TOP', true,  'Ouro I',     230.00),
    (t6, null, 'RushJG#BR1',     'jogador', 'JG',  false, 'Platina IV', 185.00),
    (t6, null, 'GoldMid#BR1',    'jogador', 'MID', false, 'Ouro II',    120.00),
    (t6, null, 'TreasADC#BR1',   'jogador', 'ADC', false, 'Ouro I',     95.00),
    (t6, null, 'CoinSup#BR1',    'jogador', 'SUP', false, 'Prata II',   45.00),
    (t6, null, 'Reserva11#BR1',  'reserva', 'RES', false, 'Prata I',    35.00),
    (t6, null, 'Reserva12#BR1',  'reserva', 'RES', false, 'Ferro I',    20.00);

end $$;

-- Verificação rápida:
-- select t.nome, t.tag, t.ranking, count(m.id) as membros
-- from public.times t
-- left join public.time_membros m on m.time_id = t.id
-- group by t.id order by t.ranking;

-- ===========================================================================
-- 6. Storage bucket para logos dos times
-- ===========================================================================
-- Cria o bucket público "team-logos" (execute separado se der erro de permissão)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-logos',
  'team-logos',
  true,
  2097152,  -- 2 MB máximo por arquivo
  array['image/png', 'image/jpeg', 'image/jpg']
)
on conflict (id) do nothing;

-- Política: qualquer autenticado pode fazer upload
drop policy if exists "team-logos: upload por autenticado" on storage.objects;
create policy "team-logos: upload por autenticado"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'team-logos');

-- Política: leitura pública (para exibir as logos)
drop policy if exists "team-logos: leitura publica" on storage.objects;
create policy "team-logos: leitura publica"
  on storage.objects for select to public
  using (bucket_id = 'team-logos');

-- Política: dono do arquivo pode deletar/atualizar
drop policy if exists "team-logos: deletar pelo dono" on storage.objects;
create policy "team-logos: deletar pelo dono"
  on storage.objects for delete to authenticated
  using (bucket_id = 'team-logos' and owner = auth.uid());

drop policy if exists "team-logos: atualizar pelo dono" on storage.objects;
create policy "team-logos: atualizar pelo dono"
  on storage.objects for update to authenticated
  using (bucket_id = 'team-logos' and owner = auth.uid());
