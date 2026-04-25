/**
 * src/api/player.ts
 * 
 * ✅ VERSÃO OTIMIZADA
 * - Sem console.log em produção
 * - Promise.all para operações paralelas
 * - .in() para evitar N+1 queries
 * - Uso do PerfilContext quando disponível
 */

import { supabase } from '../lib/supabase';
import { buscarElo, buscarTopChampions, buscarEstatisticasRecentes, buscarInvocadorPorPUUID } from './riot';

const IS_DEV = import.meta.env.DEV;

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface EloInfo {
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
  winRate: number;
  partidas: number;
  display: string;
}

export interface CampeaoMaestria {
  championKey: string;
  championId: number;
  points: number;
  level: number;
}

export interface PerfilCompleto {
  userId: string;
  riotId: string;
  nome: string;
  puuid: string;
  iconeId: number;
  nivel: number;
  lane: string | null;
  lane2: string | null;
  balance: number;
  soloQ: EloInfo | null;
  flexQ: EloInfo | null;
  topChampions: CampeaoMaestria[];
  timeTag: string | undefined;
  timeColor: string | undefined;
}

export interface StatsCache {
  soloQ: EloInfo | null;
  flexQ: EloInfo | null;
  topChampions: { championName: string; games: number; wins: number; winrate: number }[];
  roles: any[];
  totalGames: number;
}

export interface SyncResult {
  iconeId: number | null;
  nivel: number | null;
  soloQ: EloInfo | null;
  flexQ: EloInfo | null;
  topChampions: StatsCache['topChampions'];
  roles: any[];
  totalGames: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildEloInfo(entry: any): EloInfo | null {
  if (!entry) return null;
  const partidas = (entry.wins ?? 0) + (entry.losses ?? 0);
  const winRate = partidas > 0 ? Math.round((entry.wins / partidas) * 100) : 0;
  return {
    tier: entry.tier ?? '',
    rank: entry.rank ?? '',
    lp: entry.leaguePoints ?? 0,
    wins: entry.wins ?? 0,
    losses: entry.losses ?? 0,
    winRate,
    partidas,
    display: entry.tier ? `${entry.tier} ${entry.rank} — ${entry.leaguePoints} LP` : 'Sem Rank',
  };
}

// ── Função principal ──────────────────────────────────────────────────────────

export async function buscarPerfilCompleto(userId: string): Promise<PerfilCompleto | null> {
  const [{ data: conta }, { data: perfil }, { data: membro }] = await Promise.all([
    supabase.from('contas_riot').select('riot_id, puuid, profile_icon_id, level').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('lane, lane2, balance').eq('id', userId).maybeSingle(),
    supabase.from('time_membros').select('time_id').eq('user_id', userId).maybeSingle(),
  ]);

  if (!conta?.puuid) return null;

  let timeTag: string | undefined;
  let timeColor: string | undefined;
  if (membro?.time_id) {
    const { data: time } = await supabase
      .from('times')
      .select('tag, gradient_from')
      .eq('id', membro.time_id)
      .maybeSingle();
    timeTag = time?.tag ?? undefined;
    timeColor = time?.gradient_from ?? undefined;
  }

  const [ranqueadas, topChampionsRaw] = await Promise.all([
    buscarElo(conta.puuid),
    buscarTopChampions(conta.puuid, 3),
  ]);

  const soloEntry = ranqueadas.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');
  const flexEntry = ranqueadas.find((r: any) => r.queueType === 'RANKED_FLEX_SR');

  if (soloEntry) {
    supabase
      .from('contas_riot')
      .update({
        tier: soloEntry.tier ?? 'IRON',
        rank: soloEntry.rank ?? 'IV',
        lp: soloEntry.leaguePoints ?? 0,
        last_elo_update: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .then();
  }

  const topChampions: CampeaoMaestria[] = (topChampionsRaw ?? []).map((c: any) => ({
    championKey: c.championKey ?? 'Unknown',
    championId: c.championId,
    points: c.championPoints,
    level: c.championLevel,
  }));

  return {
    userId,
    riotId: conta.riot_id ?? 'Desconhecido',
    nome: (conta.riot_id ?? 'Desconhecido').split('#')[0],
    puuid: conta.puuid,
    iconeId: conta.profile_icon_id ?? 1,
    nivel: conta.level ?? 1,
    lane: perfil?.lane ?? null,
    lane2: perfil?.lane2 ?? null,
    balance: perfil?.balance ?? 0,
    soloQ: buildEloInfo(soloEntry),
    flexQ: buildEloInfo(flexEntry),
    topChampions,
    timeTag,
    timeColor,
  };
}

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

const CACHE_TTL_MS = 60 * 60 * 1000;

export async function buscarOuAtualizarStats(puuid: string): Promise<StatsCache> {
  const { data } = await supabase
    .from('contas_riot')
    .select('elo_cache, champions_cache, stats_updated_at')
    .eq('puuid', puuid)
    .maybeSingle();

  const updatedAt = data?.stats_updated_at ? new Date(data.stats_updated_at) : null;
  const isFresh = !!updatedAt && (Date.now() - updatedAt.getTime()) < CACHE_TTL_MS;

  if (isFresh && data?.elo_cache) {
    return {
      soloQ: data.elo_cache.soloQ ?? null,
      flexQ: data.elo_cache.flexQ ?? null,
      topChampions: data.champions_cache?.topChampions ?? [],
      roles: data.champions_cache?.roles ?? [],
      totalGames: data.champions_cache?.totalGames ?? 0,
    };
  }

  const [{ soloQ, flexQ }, statsRaw] = await Promise.all([
    buscarElosJogador(puuid),
    buscarEstatisticasRecentes(puuid),
  ]);

  const topChampions = statsRaw?.topChampions ?? [];
  const roles = statsRaw?.roles ?? [];
  const totalGames = statsRaw?.totalGames ?? 0;

  supabase
    .from('contas_riot')
    .update({
      elo_cache: { soloQ, flexQ },
      champions_cache: { topChampions, roles, totalGames },
      stats_updated_at: new Date().toISOString(),
    })
    .eq('puuid', puuid)
    .then();

  return { soloQ, flexQ, topChampions, roles, totalGames };
}

// ── Sincronização completa ───────────────────────────────────────────────────

export async function sincronizarContaRiot(puuid: string, userId: string): Promise<SyncResult | null> {
  try {
    const [summoner, { soloQ, flexQ }, statsRaw] = await Promise.all([
      buscarInvocadorPorPUUID(puuid).catch(() => null),
      buscarElosJogador(puuid),
      buscarEstatisticasRecentes(puuid).catch(() => null),
    ]);

    const iconeId = (summoner as any)?.profileIconId ?? null;
    const nivel = (summoner as any)?.summonerLevel ?? null;
    const topChampions = statsRaw?.topChampions ?? [];
    const roles = statsRaw?.roles ?? [];
    const totalGames = statsRaw?.totalGames ?? 0;

    const result: SyncResult = { iconeId, nivel, soloQ, flexQ, topChampions, roles, totalGames };
    const update: Record<string, any> = {
      elo_cache: { soloQ, flexQ },
      champions_cache: { topChampions, roles, totalGames },
      stats_updated_at: new Date().toISOString(),
    };
    if (iconeId !== null) update.profile_icon_id = iconeId;
    if (nivel !== null) update.level = nivel;

    supabase.from('contas_riot').update(update).eq('user_id', userId).then();
    return result;
  } catch {
    return null;
  }
}

// ── Perfil básico (sem Riot API) ─────────────────────────────────────────────

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
    const { data: time } = await supabase.from('times').select('tag, gradient_from').eq('id', membro.time_id).maybeSingle();
    timeTag = time?.tag ?? undefined;
    timeColor = time?.gradient_from ?? undefined;
  }

  return {
    userId,
    riotId: conta.riot_id ?? 'Desconhecido',
    nome: (conta.riot_id ?? 'Desconhecido').split('#')[0],
    puuid: conta.puuid ?? '',
    iconeId: conta.profile_icon_id ?? 1,
    nivel: conta.level ?? 1,
    lane: perfil?.lane ?? null,
    lane2: perfil?.lane2 ?? null,
    balance: perfil?.balance ?? 0,
    timeTag,
    timeColor,
  };
}

// ── Sistema de Ranking (M7 Points) ───────────────────────────────────────────

export interface ResultadoPartida {
  salaId: number;
  modo: string;
  vencedor: 'time_a' | 'time_b' | 'empate';
  jogadores: { userId: string; isTimeA: boolean; nome: string }[];
}

const PONTOS_POR_MODO: Record<string, { vitoria: number; derrota: number }> = {
  '5v5': { vitoria: 15, derrota: 1 },
  'time_vs_time': { vitoria: 20, derrota: 2 },
  'aram': { vitoria: 8, derrota: 1 },
  '1v1': { vitoria: 5, derrota: 1 },
};

export async function atualizarPontosPartida(resultado: ResultadoPartida): Promise<void> {
  const pontos = PONTOS_POR_MODO[resultado.modo] ?? { vitoria: 0, derrota: 0 };
  const userIds = resultado.jogadores.map(j => j.userId);

  // ✅ OTIMIZADO: 1 query para buscar todos os MPs (evita N+1)
  const { data: contasAtuais } = await supabase
    .from('contas_riot')
    .select('user_id, mp, mc')
    .in('user_id', userIds);

  const contasMap: Record<string, any> = {};
  (contasAtuais || []).forEach(c => { contasMap[c.user_id] = c; });

  const updates = resultado.jogadores.map(jogador => {
    const ehVitoria =
      (resultado.vencedor === 'time_a' && jogador.isTimeA) ||
      (resultado.vencedor === 'time_b' && !jogador.isTimeA);
    const mpGanho = ehVitoria ? pontos.vitoria : pontos.derrota;
    const contaAtual = contasMap[jogador.userId];
    const mpAtual = contaAtual?.mp ?? 0;
    const novoMP = Math.max(0, mpAtual + mpGanho);
    const novoMC = contaAtual?.mc ?? 0;

    if (IS_DEV) {
      console.log(`[atualizarPontosPartida] ${jogador.nome}: ${ehVitoria ? '✅ Vitória' : '❌ Derrota'} +${mpGanho} MP`);
    }

    return { userId: jogador.userId, novoMP, novoMC, ehVitoria };
  });

  // ✅ OTIMIZADO: Promise.all paralelo em vez de for...await sequencial
  await Promise.all([
    ...updates.map(u =>
      supabase.from('contas_riot').update({ mp: u.novoMP, mc: u.novoMC }).eq('user_id', u.userId)
    ),
    ...resultado.jogadores.map((jogador, idx) =>
      atualizarStatsPorModo(jogador.userId, resultado.modo, updates[idx].ehVitoria)
    ),
  ]);
}

async function atualizarStatsPorModo(userId: string, modo: string, vitoria: boolean): Promise<void> {
  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('modo', modo)
    .maybeSingle();

  if (!stats) {
    await supabase.from('player_stats').insert({
      user_id: userId,
      modo,
      vitories: vitoria ? 1 : 0,
      defeats: vitoria ? 0 : 1,
      total_games: 1,
      winrate: vitoria ? 100 : 0,
    });
  } else {
    const novasVitorias = stats.vitories + (vitoria ? 1 : 0);
    const novasDerrotas = stats.defeats + (vitoria ? 0 : 1);
    const totalJogos = novasVitorias + novasDerrotas;
    const novoWinrate = totalJogos > 0 ? (novasVitorias / totalJogos) * 100 : 0;

    await supabase
      .from('player_stats')
      .update({
        vitories: novasVitorias,
        defeats: novasDerrotas,
        total_games: totalJogos,
        winrate: novoWinrate,
      })
      .eq('user_id', userId)
      .eq('modo', modo);
  }
}

export async function buscarPontosJogador(userId: string): Promise<{ mp: number; mc: number } | null> {
  const { data } = await supabase.from('contas_riot').select('mp, mc').eq('user_id', userId).maybeSingle();
  return data ? { mp: data.mp ?? 0, mc: data.mc ?? 0 } : null;
}

export async function buscarStatsPorModo(userId: string): Promise<any[]> {
  const { data } = await supabase.from('player_stats').select('*').eq('user_id', userId).order('total_games', { ascending: false });
  return data ?? [];
}

// ── Apostas em M Coins ───────────────────────────────────────────────────────

const TAXA_MC_POR_PARTIDA = 30;

export async function processarApostaPartida(
  resultado: ResultadoPartida,
  apostaValor: number,
  salaId: number
): Promise<void> {
  if (apostaValor <= 0) return;

  if (IS_DEV) {
    console.log(`\n💰 [APOSTA] Iniciando... | Modo: ${resultado.modo} | Aposta: ${apostaValor} MC`);
  }

  const vencedores = resultado.jogadores.filter(j =>
    (resultado.vencedor === 'time_a' && j.isTimeA) ||
    (resultado.vencedor === 'time_b' && !j.isTimeA)
  );
  const perdedores = resultado.jogadores.filter(j =>
    (resultado.vencedor === 'time_a' && !j.isTimeA) ||
    (resultado.vencedor === 'time_b' && j.isTimeA)
  );

  if (vencedores.length === 0 || perdedores.length === 0) return;

  const totalPrêmio = perdedores.length * apostaValor;
  const prêmioLíquido = totalPrêmio - TAXA_MC_POR_PARTIDA;
  const prêmioPorVencedor = Math.floor(prêmioLíquido / vencedores.length);

  if (IS_DEV) {
    console.log(`   Total: ${totalPrêmio} MC | Taxa: ${TAXA_MC_POR_PARTIDA} MC | Por vencedor: ${prêmioPorVencedor} MC`);
  }

  // ✅ OTIMIZADO: Promise.all para débitos em paralelo
  await Promise.all(perdedores.map(j =>
    supabase.rpc('incrementar_saldo', { user_id_param: j.userId, valor_param: -apostaValor })
  ));

  await Promise.all(vencedores.map(j =>
    supabase.rpc('incrementar_saldo', { user_id_param: j.userId, valor_param: prêmioPorVencedor })
  ));

  await supabase.from('ganhos_plataforma').insert({
    sala_id: salaId,
    modo: resultado.modo,
    mc_taxa: TAXA_MC_POR_PARTIDA,
    mc_total_apostado: totalPrêmio,
  });

  if (IS_DEV) console.log(`✅ [APOSTA] Concluído! Taxa: ${TAXA_MC_POR_PARTIDA} MC`);
}