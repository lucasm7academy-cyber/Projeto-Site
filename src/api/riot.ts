// src/api/riot.ts
// ✅ VERSÃO OTIMIZADA - Sem CORS, sem logs em produção

const IS_DEV = import.meta.env.DEV;
const RIOT_API_KEY = import.meta.env.VITE_RIOT_API_KEY as string;

const PLATFORM_URL = 'https://br1.api.riotgames.com';
const REGIONAL_URL = 'https://americas.api.riotgames.com';
const DDR_BASE = 'https://ddragon.leagueoflegends.com';

let ddrVersion: string | null = null;
let champCache: Record<number, string> | null = null;
const REQUEST_TIMEOUT = 8000;

function riotHeaders() {
  return { 'X-Riot-Token': RIOT_API_KEY, 'Accept': 'application/json' };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Timeout na requisição');
    throw err;
  }
}

async function riotFetch(url: string): Promise<Response> {
  return fetchWithTimeout(url, { headers: riotHeaders() });
}

function riotError(status: number, riotId?: string): Error {
  if (status === 404) return new Error(riotId ? `Conta "${riotId}" não encontrada` : 'Recurso não encontrado');
  if (status === 403) return new Error('API Key inválida ou sem permissão');
  if (status === 429) return new Error('Limite de requisições atingido. Aguarde um instante.');
  if (status === 503) return new Error('Serviço da Riot temporariamente indisponível');
  return new Error(`Erro ${status}`);
}

// ✅ Versão fixa - SEM CORS
export async function getDDRVersion(): Promise<string> {
  if (ddrVersion) return ddrVersion;
  ddrVersion = '15.8.1';
  return ddrVersion;
}

export function buildProfileIconUrl(iconId: number, version?: string): string {
  const v = version ?? ddrVersion ?? '15.8.1';
  return `${DDR_BASE}/cdn/${v}/img/profileicon/${iconId}.png`;
}

export function buildChampionIconUrl(championKey: string, version?: string): string {
  const v = version ?? ddrVersion ?? '15.8.1';
  return `${DDR_BASE}/cdn/${v}/img/champion/${championKey}.png`;
}

async function getChampionKey(id: number): Promise<string> {
  if (!champCache) {
    try {
      const version = await getDDRVersion();
      const res = await fetchWithTimeout(`${DDR_BASE}/cdn/${version}/data/pt_BR/champion.json`, {}, 5000);
      const data = await res.json();
      champCache = {};
      for (const key of Object.keys(data.data)) {
        champCache[parseInt(data.data[key].key)] = key;
      }
    } catch {
      return 'Unknown';
    }
  }
  return champCache![id] ?? 'Unknown';
}

export async function buscarContaRiot(riotId: string) {
  const [gameName, tagLine] = riotId.split('#');
  if (!gameName || !tagLine) throw new Error('Formato inválido. Use Nome#TAG');
  const url = `${REGIONAL_URL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const res = await riotFetch(url);
  if (!res.ok) throw riotError(res.status, riotId);
  return await res.json();
}

export async function buscarInvocadorPorPUUID(puuid: string) {
  const res = await riotFetch(`${PLATFORM_URL}/lol/summoner/v4/summoners/by-puuid/${puuid}`);
  if (!res.ok) throw riotError(res.status);
  return await res.json();
}

export async function buscarElo(puuid: string) {
  try {
    const res = await riotFetch(`${PLATFORM_URL}/lol/league/v4/entries/by-puuid/${puuid}`);
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) return [];
    return await res.json();
  } catch (err: any) {
    if (err?.message === 'RATE_LIMIT') throw err;
    return [];
  }
}

export async function buscarTopChampions(puuid: string, count = 3) {
  try {
    const url = `${PLATFORM_URL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`;
    const res = await riotFetch(url);
    if (!res.ok) return [];
    const items: any[] = await res.json();
    return await Promise.all(items.map(async item => ({
      championId: item.championId,
      championKey: await getChampionKey(item.championId),
      championPoints: item.championPoints,
      championLevel: item.championLevel,
      lastPlayTime: item.lastPlayTime,
      chestGranted: item.chestGranted,
    })));
  } catch {
    return [];
  }
}

export async function buscarPontuacaoMaestria(puuid: string): Promise<number> {
  try {
    const res = await riotFetch(`${PLATFORM_URL}/lol/champion-mastery/v4/scores/by-puuid/${puuid}`);
    if (!res.ok) return 0;
    return await res.json();
  } catch {
    return 0;
  }
}

export async function buscarHistoricoPartidas(puuid: string, count = 10, queue?: number): Promise<string[]> {
  try {
    let url = `${REGIONAL_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`;
    if (queue !== undefined) url += `&queue=${queue}`;
    const res = await riotFetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function buscarDetalhesPartida(matchId: string) {
  const res = await riotFetch(`${REGIONAL_URL}/lol/match/v5/matches/${matchId}`);
  if (!res.ok) throw riotError(res.status);
  return await res.json();
}

export async function buscarUltimasPartidas(puuid: string, count = 5, queue?: number) {
  try {
    const ids = await buscarHistoricoPartidas(puuid, count, queue);
    const partidas = await Promise.all(ids.map(id => buscarDetalhesPartida(id).catch(() => null)));
    return partidas.filter(Boolean);
  } catch {
    return [];
  }
}

export async function buscarPartidaAtiva(puuid: string) {
  try {
    const res = await riotFetch(`${PLATFORM_URL}/lol/spectator/v5/active-games/by-summoner/${puuid}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function buscarDesafiosJogador(puuid: string) {
  try {
    const res = await riotFetch(`${PLATFORM_URL}/lol/challenges/v1/player-data/${puuid}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function buscarJogadorCompleto(riotId: string) {
  try {
    if (IS_DEV) console.log(`🔍 Buscando: ${riotId}`);
    const [conta, version] = await Promise.all([buscarContaRiot(riotId), getDDRVersion()]);
    const [invocador, eloData] = await Promise.all([buscarInvocadorPorPUUID(conta.puuid), buscarElo(conta.puuid)]);
    return {
      success: true as const,
      data: {
        riotId: `${conta.gameName}#${conta.tagLine}`,
        puuid: conta.puuid,
        summonerId: invocador.id,
        nivel: invocador.summonerLevel,
        iconeId: invocador.profileIconId,
        iconeUrl: buildProfileIconUrl(invocador.profileIconId, version),
        ranqueadas: eloData,
      },
    };
  } catch (error: any) {
    if (IS_DEV) console.error('❌ Erro:', error.message);
    return { success: false as const, error: error.message };
  }
}

export async function buscarSugestoes(prefixo: string): Promise<Array<{ riotId: string; iconId: number; level: number }>> {
  if (!prefixo || prefixo.length < 2) return [];
  const jogadoresConhecidos = ['Kami#BR1', 'Jhin#BR2', 'Baiano#BR1', 'Mylon#BR1', 'TitaN#BR1', 'Faker#KR1', 'Tyler1#NA1', 'Caps#EUW1'];
  const matches = jogadoresConhecidos.filter(id => id.toLowerCase().startsWith(prefixo.toLowerCase()));
  const resultados = [];
  for (const riotId of matches.slice(0, 5)) {
    try {
      const resultado = await buscarJogadorCompleto(riotId);
      if (resultado.success) {
        resultados.push({ riotId: resultado.data.riotId, iconId: resultado.data.iconeId, level: resultado.data.nivel });
      }
    } catch (e) { if (IS_DEV) console.error(`Erro ao buscar ${riotId}`, e); }
  }
  return resultados;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function buscarEstatisticasRecentes(puuid: string, days = 90) {
  try {
    const startTime = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
    const idsRes = await riotFetch(`${REGIONAL_URL}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=20&startTime=${startTime}`);
    if (!idsRes.ok) return null;
    const ids: string[] = await idsRes.json();
    if (ids.length === 0) return { topChampions: [], roles: [], totalGames: 0 };

    const allResults: any[] = [];
    const BATCH = 5;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(id => riotFetch(`${REGIONAL_URL}/lol/match/v5/matches/${id}`).then(r => r.ok ? r.json() : null).catch(() => null)));
      allResults.push(...results);
      if (i + BATCH < ids.length) await delay(600);
    }

    const matches = allResults.filter(Boolean);
    const champMap: Record<string, { games: number; wins: number }> = {};
    const roleMap: Record<string, number> = {};

    for (const match of matches) {
      const me = match?.info?.participants?.find((p: any) => p.puuid === puuid);
      if (!me) continue;
      const name = me.championName;
      if (!champMap[name]) champMap[name] = { games: 0, wins: 0 };
      champMap[name].games++;
      if (me.win) champMap[name].wins++;
      const pos = me.teamPosition || me.individualPosition || '';
      if (pos) roleMap[pos] = (roleMap[pos] || 0) + 1;
    }

    const totalGames = matches.length;
    const topChampions = Object.entries(champMap).map(([championName, s]) => ({ championName, games: s.games, wins: s.wins, winrate: Math.round((s.wins / s.games) * 100) })).sort((a, b) => b.games - a.games).slice(0, 3);
    const roles = Object.entries(roleMap).map(([role, games]) => ({ role, games, percentage: totalGames > 0 ? Math.round((games / totalGames) * 100) : 0 })).sort((a, b) => b.games - a.games);

    return { topChampions, roles, totalGames };
  } catch {
    return null;
  }
}