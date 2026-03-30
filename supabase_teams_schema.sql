-- =============================================================================
-- League of Legends Teams System – Supabase Schema
-- Gerado em: 2026-03-29
-- Cole este arquivo inteiro no Supabase SQL Editor e execute.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensão UUID (já vem ativa no Supabase, mas por garantia)
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ===========================================================================
-- 1. TABELA: teams
-- ===========================================================================
create table if not exists public.teams (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  tag            text        not null check (char_length(tag) <= 3),
  logo_url       text,
  gradient_from  text        not null default '#FFB700',
  gradient_to    text        not null default '#FF6600',
  pdl            int         not null default 0,
  winrate        int         not null default 0,
  ranking        int         not null default 999,
  wins           int         not null default 0,
  games_played   int         not null default 0,
  created_at     timestamptz not null default now(),
  created_by     uuid        references auth.users (id) on delete set null
);

-- ---------------------------------------------------------------------------
-- RLS – teams
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;

-- Qualquer usuário autenticado pode ler todos os times
create policy "teams: leitura pública para autenticados"
  on public.teams for select
  to authenticated
  using (true);

-- Só quem criou pode atualizar/deletar
create policy "teams: atualização pelo criador"
  on public.teams for update
  to authenticated
  using (created_by = auth.uid());

create policy "teams: exclusão pelo criador"
  on public.teams for delete
  to authenticated
  using (created_by = auth.uid());

-- Usuário autenticado pode inserir (será criador)
create policy "teams: inserção por autenticado"
  on public.teams for insert
  to authenticated
  with check (created_by = auth.uid());

-- ===========================================================================
-- 2. TABELA: team_members
-- ===========================================================================
create table if not exists public.team_members (
  id          uuid        primary key default gen_random_uuid(),
  team_id     uuid        not null references public.teams (id) on delete cascade,
  user_id     uuid        references auth.users (id) on delete set null,  -- nullable para seeds mock
  riot_id     text        not null,
  role        text        not null check (role in ('TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES')),
  is_leader   boolean     not null default false,
  elo         text        not null default '',
  balance     numeric     not null default 0,
  joined_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS – team_members
-- ---------------------------------------------------------------------------
alter table public.team_members enable row level security;

-- Leitura: autenticados veem todos os membros
create policy "team_members: leitura pública para autenticados"
  on public.team_members for select
  to authenticated
  using (true);

-- Inserção: somente o líder do time (quem criou o time) pode adicionar membros
create policy "team_members: inserção pelo líder"
  on public.team_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.created_by = auth.uid()
    )
  );

-- Atualização: líder do time
create policy "team_members: atualização pelo líder"
  on public.team_members for update
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.created_by = auth.uid()
    )
  );

-- Exclusão: líder do time
create policy "team_members: exclusão pelo líder"
  on public.team_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.created_by = auth.uid()
    )
  );

-- ===========================================================================
-- 3. TABELA: team_invites
-- ===========================================================================
create table if not exists public.team_invites (
  id           uuid        primary key default gen_random_uuid(),
  team_id      uuid        not null references public.teams (id) on delete cascade,
  from_user_id uuid        not null references auth.users (id) on delete cascade,
  to_user_id   uuid        references auth.users (id) on delete cascade,  -- nullable (convite por riot_id)
  riot_id      text,
  role         text        not null check (role in ('TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES')),
  message      text,
  type         text        not null check (type in ('invite', 'request')),
  status       text        not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS – team_invites
-- ---------------------------------------------------------------------------
alter table public.team_invites enable row level security;

-- Leitura: quem enviou OU quem recebeu pode ver o convite
create policy "team_invites: leitura pelo remetente ou destinatário"
  on public.team_invites for select
  to authenticated
  using (
    from_user_id = auth.uid()
    or to_user_id = auth.uid()
    or exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.created_by = auth.uid()
    )
  );

-- Inserção: qualquer autenticado pode criar convite/solicitação (como remetente)
create policy "team_invites: inserção pelo remetente"
  on public.team_invites for insert
  to authenticated
  with check (from_user_id = auth.uid());

-- Atualização de status: destinatário ou líder do time
create policy "team_invites: atualização pelo destinatário ou líder"
  on public.team_invites for update
  to authenticated
  using (
    to_user_id = auth.uid()
    or exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.created_by = auth.uid()
    )
  );

-- Exclusão: quem criou o convite pode cancelar
create policy "team_invites: exclusão pelo remetente"
  on public.team_invites for delete
  to authenticated
  using (from_user_id = auth.uid());

-- ===========================================================================
-- 4. SEED – Times e Jogadores (dados mock do front-end)
-- ===========================================================================
-- Usamos UUIDs fixos para referenciar nos inserts de membros
-- sem depender de nenhum usuário real do auth.users.
-- created_by fica NULL (seed anônimo) — ajuste se quiser vincular a um admin.

do $$
declare
  -- UUIDs dos times (fixos para seed repetível)
  t_m7e  uuid := 'a1000000-0000-0000-0000-000000000001';
  t_shb  uuid := 'a2000000-0000-0000-0000-000000000002';
  t_phx  uuid := 'a3000000-0000-0000-0000-000000000003';
  t_icw  uuid := 'a4000000-0000-0000-0000-000000000004';
  t_stk  uuid := 'a5000000-0000-0000-0000-000000000005';
  t_grs  uuid := 'a6000000-0000-0000-0000-000000000006';
begin

  -- -------------------------------------------------------------------------
  -- Times
  -- -------------------------------------------------------------------------
  insert into public.teams
    (id, name, tag, logo_url, gradient_from, gradient_to, pdl, winrate, ranking, wins, games_played, created_by)
  values
    (
      t_m7e, 'M7 Esports', 'M7E',
      'https://ais-pre-3jqt6pjyfyajpdpj3cp2zf-550229797587.us-east1.run.app/input_file_0.png',
      '#FFB700', '#FF6600',
      3240, 72, 3, 36, 50, null
    ),
    (
      t_shb, 'Shadow Blades', 'SHB',
      null,
      '#0044FF', '#00D4FF',
      4180, 78, 1, 42, 54, null
    ),
    (
      t_phx, 'Phoenix Rising', 'PHX',
      null,
      '#FF3300', '#FF9900',
      3650, 68, 2, 34, 50, null
    ),
    (
      t_icw, 'Ice Wolves', 'ICW',
      null,
      '#00C9FF', '#0044FF',
      2890, 61, 4, 28, 46, null
    ),
    (
      t_stk, 'Storm Knights', 'STK',
      null,
      '#7B00FF', '#00AAFF',
      2540, 58, 5, 22, 38, null
    ),
    (
      t_grs, 'Gold Rush', 'GRS',
      null,
      '#FFB700', '#FF6600',
      1980, 54, 6, 18, 33, null
    )
  on conflict (id) do nothing;

  -- -------------------------------------------------------------------------
  -- Membros – M7 Esports
  -- -------------------------------------------------------------------------
  insert into public.team_members
    (team_id, user_id, riot_id, role, is_leader, elo, balance)
  values
    (t_m7e, null, 'ShadowKing#BR1', 'TOP', true,  'Diamante IV',  850.00),
    (t_m7e, null, 'JungleGod#BR1',  'JG',  false, 'Mestre',       1200.00),
    (t_m7e, null, 'MidLaner7#BR1',  'MID', false, 'Grão-Mestre',  320.50),
    (t_m7e, null, 'CarryADC#BR1',   'ADC', false, 'Diamante II',  475.00),
    (t_m7e, null, 'SupportGG#BR1',  'SUP', false, 'Platina I',    154.00),
    (t_m7e, null, 'Reserva1#BR1',   'RES', false, 'Diamante III', 210.00),
    (t_m7e, null, 'Reserva2#BR1',   'RES', false, 'Platina II',   180.00);

  -- -------------------------------------------------------------------------
  -- Membros – Shadow Blades
  -- -------------------------------------------------------------------------
  insert into public.team_members
    (team_id, user_id, riot_id, role, is_leader, elo, balance)
  values
    (t_shb, null, 'DarkTop#KR1',   'TOP', true,  'Mestre',       2100.00),
    (t_shb, null, 'BladeJG#EUW',   'JG',  false, 'Grão-Mestre',  1800.00),
    (t_shb, null, 'ShadowMid#BR1', 'MID', false, 'Desafiante',   3400.00),
    (t_shb, null, 'PurpleADC#BR1', 'ADC', false, 'Mestre',       920.00),
    (t_shb, null, 'VoidSup#BR1',   'SUP', false, 'Diamante I',   680.00),
    (t_shb, null, 'Reserva3#KR1',  'RES', false, 'Mestre',       450.00),
    (t_shb, null, 'Reserva4#EUW',  'RES', false, 'Diamante I',   380.00);

  -- -------------------------------------------------------------------------
  -- Membros – Phoenix Rising
  -- -------------------------------------------------------------------------
  insert into public.team_members
    (team_id, user_id, riot_id, role, is_leader, elo, balance)
  values
    (t_phx, null, 'FireTop#BR1',   'TOP', true,  'Diamante I',   600.00),
    (t_phx, null, 'AshJungle#BR1', 'JG',  false, 'Mestre',       1100.00),
    (t_phx, null, 'FlameMid#BR1',  'MID', false, 'Diamante II',  450.00),
    (t_phx, null, 'PhxADC#BR1',    'ADC', false, 'Diamante III', 320.00),
    (t_phx, null, 'EmberSup#BR1',  'SUP', false, 'Platina II',   210.00),
    (t_phx, null, 'Reserva5#BR1',  'RES', false, 'Platina I',    150.00),
    (t_phx, null, 'Reserva6#BR1',  'RES', false, 'Ouro I',       90.00);

  -- -------------------------------------------------------------------------
  -- Membros – Ice Wolves (JG está vaga no mock)
  -- -------------------------------------------------------------------------
  insert into public.team_members
    (team_id, user_id, riot_id, role, is_leader, elo, balance)
  values
    (t_icw, null, 'FrostTop#BR1',  'TOP', true,  'Platina I',    380.00),
    (t_icw, null, 'IceMage#BR1',   'MID', false, 'Diamante III', 510.00),
    (t_icw, null, 'ColdADC#BR1',   'ADC', false, 'Ouro I',       145.00),
    (t_icw, null, 'ArcticSup#BR1', 'SUP', false, 'Prata I',      95.00),
    (t_icw, null, 'Reserva7#BR1',  'RES', false, 'Ouro II',      80.00);

  -- -------------------------------------------------------------------------
  -- Membros – Storm Knights (ADC e SUP estão vagas no mock)
  -- -------------------------------------------------------------------------
  insert into public.team_members
    (team_id, user_id, riot_id, role, is_leader, elo, balance)
  values
    (t_stk, null, 'ThunderTop#BR1', 'TOP', true,  'Diamante III', 490.00),
    (t_stk, null, 'LightJG#BR1',    'JG',  false, 'Platina I',    320.00),
    (t_stk, null, 'StormMid#BR1',   'MID', false, 'Diamante IV',  275.00);

  -- -------------------------------------------------------------------------
  -- Membros – Gold Rush
  -- -------------------------------------------------------------------------
  insert into public.team_members
    (team_id, user_id, riot_id, role, is_leader, elo, balance)
  values
    (t_grs, null, 'GoldenTop#BR1',  'TOP', true,  'Ouro I',      230.00),
    (t_grs, null, 'RushJG#BR1',     'JG',  false, 'Platina IV',  185.00),
    (t_grs, null, 'GoldMid#BR1',    'MID', false, 'Ouro II',     120.00),
    (t_grs, null, 'TreasADC#BR1',   'ADC', false, 'Ouro I',      95.00),
    (t_grs, null, 'CoinSup#BR1',    'SUP', false, 'Prata II',    45.00),
    (t_grs, null, 'Reserva11#BR1',  'RES', false, 'Prata I',     35.00),
    (t_grs, null, 'Reserva12#BR1',  'RES', false, 'Ferro I',     20.00);

end $$;

-- ===========================================================================
-- 5. Verificação rápida pós-seed
-- ===========================================================================
-- Descomente para testar logo após colar:
-- select t.name, t.tag, t.ranking, count(m.id) as members
-- from public.teams t
-- left join public.team_members m on m.team_id = t.id
-- group by t.id, t.name, t.tag, t.ranking
-- order by t.ranking;
