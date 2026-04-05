/**
 * src/api/player.ts
 *
 * Modelo centralizado de perfil completo de um jogador.
 * Combina dados do Supabase (estáticos) + Riot API (ao vivo).
 *
 * Uso:
 *   import { buscarPerfilCompleto, type PerfilCompleto } from '../api/player';
 *   const perfil = await buscarPerfilCompleto(userId);
 */

import { supabase } from '../lib/supabase';
import { buscarElo, buscarTopChampions, buscarEstatisticasRecentes } from './riot';

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface EloInfo {
  tier: string;        // ex: 'GOLD'
  rank: string;        // ex: 'II'
  lp: number;          // League Points
  wins: number;
  losses: number;
  winRate: number;     // 0-100
  partidas: number;    // wins + losses
  display: string;     // ex: 'GOLD II — 75 LP'
}

export interface CampeaoMaestria {
  championKey: string;   // nome interno (ex: 'Jinx')
  championId: number;
  points: number;
  level: number;
}

export interface PerfilCompleto {
  // ── Identidade ─────────────────────────────────────────────────────────────
  userId:    string;
  riotId:    string;         // ex: 'Nome#BR1'
  nome:      string;         // parte antes do #
  puuid:     string;
  iconeId:   number;
  nivel:     number;

  // ── Posições preferidas ────────────────────────────────────────────────────
  lane:      string | null;  // ex: 'Top', 'Jungle'
  lane2:     string | null;

  // ── Financeiro ─────────────────────────────────────────────────────────────
  balance:   number;

  // ── Elos (ao vivo via Riot API) ────────────────────────────────────────────
  soloQ:     EloInfo | null;
  flexQ:     EloInfo | null;

  // ── Campeões mais jogados (ao vivo) ────────────────────────────────────────
  topChampions: CampeaoMaestria[];

  // ── Time ───────────────────────────────────────────────────────────────────
  timeTag:   string | undefined;
  timeColor: string | undefined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEloInfo(entry: any): EloInfo | null {
  if (!entry) return null;
  const partidas = (entry.wins ?? 0) + (entry.losses ?? 0);
  const winRate  = partidas > 0 ? Math.round((entry.wins / partidas) * 100) : 0;
  return {
    tier:     entry.tier     ?? '',
    rank:     entry.rank     ?? '',
    lp:       entry.leaguePoints ?? 0,
    wins:     entry.wins     ?? 0,
    losses:   entry.losses   ?? 0,
    winRate,
    partidas,
    display:  entry.tier ? `${entry.tier} ${entry.rank} — ${entry.leaguePoints} LP` : 'Sem Rank',
  };
}

// ── Função principal ──────────────────────────────────────────────────────────

/**
 * Busca o perfil completo de um jogador combinando Supabase + Riot API.
 * Retorna null se o jogador não tiver conta Riot vinculada.
 */
export async function buscarPerfilCompleto(userId: string): Promise<PerfilCompleto | null> {
  // 1. Supabase — dados estáticos (vinculados ao cadastro)
  const [{ data: conta }, { data: perfil }, { data: membro }] = await Promise.all([
    supabase.from('contas_riot').select('riot_id, puuid, profile_icon_id, level').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('lane, lane2, balance').eq('id', userId).maybeSingle(),
    supabase.from('time_membros').select('time_id').eq('user_id', userId).maybeSingle(),
  ]);

  if (!conta?.puuid) return null;

  // 2. Time (se membro)
  let timeTag: string | undefined;
  let timeColor: string | undefined;
  if (membro?.time_id) {
    const { data: time } = await supabase
      .from('times')
      .select('tag, gradient_from')
      .eq('id', membro.time_id)
      .maybeSingle();
    timeTag   = time?.tag ?? undefined;
    timeColor = time?.gradient_from ?? undefined;
  }

  // 3. Riot API — dados ao vivo (elo + campeões)
  const [ranqueadas, topChampionsRaw] = await Promise.all([
    buscarElo(conta.puuid),
    buscarTopChampions(conta.puuid, 3),
  ]);

  const soloEntry = ranqueadas.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');
  const flexEntry = ranqueadas.find((r: any) => r.queueType === 'RANKED_FLEX_SR');

  const topChampions: CampeaoMaestria[] = (topChampionsRaw ?? []).map((c: any) => ({
    championKey: c.championKey ?? 'Unknown',
    championId:  c.championId,
    points:      c.championPoints,
    level:       c.championLevel,
  }));

  return {
    userId,
    riotId:   conta.riot_id   ?? 'Desconhecido',
    nome:     (conta.riot_id ?? 'Desconhecido').split('#')[0],
    puuid:    conta.puuid,
    iconeId:  conta.profile_icon_id ?? 1,
    nivel:    conta.level ?? 1,
    lane:     perfil?.lane  ?? null,
    lane2:    perfil?.lane2 ?? null,
    balance:  perfil?.balance ?? 0,
    soloQ:    buildEloInfo(soloEntry),
    flexQ:    buildEloInfo(flexEntry),
    topChampions,
    timeTag,
    timeColor,
  };
}

/**
 * Busca apenas os elos (SoloQ + FlexQ) de um jogador via Riot API.
 * Útil quando já se tem o puuid e só precisa dos dados de ranqueada.
 */
export async function buscarElosJogador(puuid: string): Promise<{ soloQ: EloInfo | null; flexQ: EloInfo | null }> {
  try {
    const ranqueadas = await buscarElo(puuid);
    return {
      soloQ: buildEloInfo(ranqueadas.find((r: any) => r.queueType === 'RANKED_SOLO_5x5')),
      flexQ: buildEloInfo(ranqueadas.find((r: any) => r.queueType === 'RANKED_FLEX_SR')),
    };
  } catch {
    return { soloQ: null, flexQ: null };
  }
}

// ── Cache TTL ─────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

export interface StatsCache {
  soloQ:        EloInfo | null;
  flexQ:        EloInfo | null;
  topChampions: { championName: string; games: number; wins: number; winrate: number }[];
  roles:        any[];
  totalGames:   number;
}

/**
 * Retorna stats do Supabase se tiver menos de 1 hora (cache).
 * Caso contrário, busca da Riot API, salva no banco e retorna.
 * Garante no máximo 1 ciclo de chamadas à API por hora por jogador.
 */
export async function buscarOuAtualizarStats(puuid: string): Promise<StatsCache> {
  // 1. Checar cache
  const { data } = await supabase
    .from('contas_riot')
    .select('elo_cache, champions_cache, stats_updated_at')
    .eq('puuid', puuid)
    .maybeSingle();

  const updatedAt  = data?.stats_updated_at ? new Date(data.stats_updated_at) : null;
  const isFresh    = !!updatedAt && (Date.now() - updatedAt.getTime()) < CACHE_TTL_MS;

  if (isFresh && data?.elo_cache) {
    return {
      soloQ:        data.elo_cache.soloQ        ?? null,
      flexQ:        data.elo_cache.flexQ         ?? null,
      topChampions: data.champions_cache?.topChampions ?? [],
      roles:        data.champions_cache?.roles        ?? [],
      totalGames:   data.champions_cache?.totalGames   ?? 0,
    };
  }

  // 2. Cache velho/inexistente — busca da Riot API em paralelo
  const [{ soloQ, flexQ }, statsRaw] = await Promise.all([
    buscarElosJogador(puuid),
    buscarEstatisticasRecentes(puuid),
  ]);

  const topChampions = statsRaw?.topChampions ?? [];
  const roles        = statsRaw?.roles        ?? [];
  const totalGames   = statsRaw?.totalGames   ?? 0;

  // 3. Salvar no banco (não bloqueia o retorno)
  supabase
    .from('contas_riot')
    .update({
      elo_cache:        { soloQ, flexQ },
      champions_cache:  { topChampions, roles, totalGames },
      stats_updated_at: new Date().toISOString(),
    })
    .eq('puuid', puuid)
    .then();

  return { soloQ, flexQ, topChampions, roles, totalGames };
}

/**
 * Versão leve: busca apenas os dados do Supabase (sem chamada à Riot API).
 * Útil para listas onde não precisa de elo ao vivo.
 */
export async function buscarPerfilBasico(userId: string): Promise<Omit<PerfilCompleto, 'soloQ' | 'flexQ' | 'topChampions'> | null> {
  const [{ data: conta }, { data: perfil }, { data: membro }] = await Promise.all([
    supabase.from('contas_riot').select('riot_id, puuid, profile_icon_id, level').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('lane, lane2, balance').eq('id', userId).maybeSingle(),
    supabase.from('time_membros').select('time_id').eq('user_id', userId).maybeSingle(),
  ]);

  if (!conta) return null;

  let timeTag: string | undefined;
  let timeColor: string | undefined;
  if (membro?.time_id) {
    const { data: time } = await supabase
      .from('times')
      .select('tag, gradient_from')
      .eq('id', membro.time_id)
      .maybeSingle();
    timeTag   = time?.tag ?? undefined;
    timeColor = time?.gradient_from ?? undefined;
  }

  return {
    userId,
    riotId:   conta.riot_id   ?? 'Desconhecido',
    nome:     (conta.riot_id ?? 'Desconhecido').split('#')[0],
    puuid:    conta.puuid     ?? '',
    iconeId:  conta.profile_icon_id ?? 1,
    nivel:    conta.level ?? 1,
    lane:     perfil?.lane  ?? null,
    lane2:    perfil?.lane2 ?? null,
    balance:  perfil?.balance ?? 0,
    timeTag,
    timeColor,
  };
}
