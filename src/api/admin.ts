/**
 * src/api/admin.ts
 *
 * Funções administrativas para atualizar cache de elo de todos os jogadores
 * Pode ser executada manualmente ou via cron job (Edge Function)
 */

import { supabase } from '../lib/supabase';
import { buscarElo } from './riot';
import { TIER_MAP } from '../components/players/PlayerDetailModal';

export interface AtualizacaoEloResult {
  total: number;
  atualizados: number;
  falhados: number;
  tempoMs: number;
  erros: Array<{ riotId: string; erro: string }>;
}

/**
 * Busca elo de TODOS os jogadores e atualiza o cache em contas_riot
 * Usa parallelismo para não ser lento (3 requisições simultâneas)
 *
 * Uso:
 * - Manual: botão "Atualizar Elos" no admin
 * - Cron: Edge Function a cada 24h
 * - Automático: Ao fazer deploy
 */
export async function atualizarElosTodos(): Promise<AtualizacaoEloResult> {
  const inicio = Date.now();
  const erros: Array<{ riotId: string; erro: string }> = [];
  let atualizados = 0;

  try {
    // 1. Buscar TODOS os jogadores com PUUID
    const { data: contas, error: erroSelect } = await supabase
      .from('contas_riot')
      .select('id, user_id, riot_id, puuid, tier, rank, lp, last_elo_update')
      .not('puuid', 'is', null);

    if (erroSelect) {
      throw new Error(`Erro ao buscar contas: ${erroSelect.message}`);
    }

    if (!contas || contas.length === 0) {
      console.log('[atualizarElosTodos] Nenhuma conta com PUUID encontrada');
      return {
        total: 0,
        atualizados: 0,
        falhados: 0,
        tempoMs: Date.now() - inicio,
        erros: [],
      };
    }

    const total = contas.length;
    console.log(`[atualizarElosTodos] Atualizando ${total} jogadores...`);

    // 2. Buscar elos em PARALELO (throttle de 3 simultâneas)
    const THROTTLE = 3;
    for (let i = 0; i < contas.length; i += THROTTLE) {
      const batch = contas.slice(i, i + THROTTLE);
      console.log(`[atualizarElosTodos] Batch ${Math.floor(i / THROTTLE) + 1}/${Math.ceil(contas.length / THROTTLE)}`);

      await Promise.all(
        batch.map(async (conta) => {
          try {
            // Busca elo da Riot API
            const ranqueadas = await buscarElo(conta.puuid!);
            const soloEntry = ranqueadas.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');

            if (!soloEntry) {
              // Sem ranked = manter como está (ou 'IRON')
              console.log(`[atualizarElosTodos] ${conta.riot_id}: Sem ranked SoloQ`);
              return;
            }

            const novoTier = soloEntry.tier ?? 'IRON';
            const novoRank = soloEntry.rank ?? 'IV';
            const novoLp = soloEntry.leaguePoints ?? 0;

            // 3. Atualizar cache em contas_riot
            const { error: erroUpdate } = await supabase
              .from('contas_riot')
              .update({
                tier: novoTier,
                rank: novoRank,
                lp: novoLp,
                last_elo_update: new Date().toISOString(),
              })
              .eq('id', conta.id);

            if (erroUpdate) {
              throw erroUpdate;
            }

            atualizados++;
            console.log(`[atualizarElosTodos] ✅ ${conta.riot_id}: ${novoTier} ${novoRank} (${novoLp}LP)`);
          } catch (err: any) {
            const mensagem = err?.message || String(err);
            console.error(`[atualizarElosTodos] ❌ ${conta.riot_id}: ${mensagem}`);
            erros.push({
              riotId: conta.riot_id || 'Desconhecido',
              erro: mensagem,
            });
          }
        })
      );

      // Pequeno delay entre batches para respeitar rate limit
      if (i + THROTTLE < contas.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const tempoMs = Date.now() - inicio;
    const falhados = total - atualizados;

    console.log(`[atualizarElosTodos] COMPLETO!`);
    console.log(`  Total: ${total}`);
    console.log(`  Atualizados: ${atualizados}`);
    console.log(`  Falhados: ${falhados}`);
    console.log(`  Tempo: ${(tempoMs / 1000).toFixed(1)}s`);

    return { total, atualizados, falhados, tempoMs, erros };
  } catch (err: any) {
    console.error('[atualizarElosTodos] Erro fatal:', err?.message);
    throw err;
  }
}

/**
 * Versão mais lenta mas segura: atualiza 1 jogador por vez
 * Melhor para não sobrecarregar Riot API
 */
export async function atualizarElosSequencial(): Promise<AtualizacaoEloResult> {
  const inicio = Date.now();
  const erros: Array<{ riotId: string; erro: string }> = [];
  let atualizados = 0;

  try {
    const { data: contas } = await supabase
      .from('contas_riot')
      .select('id, user_id, riot_id, puuid')
      .not('puuid', 'is', null);

    if (!contas || contas.length === 0) {
      return { total: 0, atualizados: 0, falhados: 0, tempoMs: 0, erros: [] };
    }

    const total = contas.length;

    for (const conta of contas) {
      try {
        const ranqueadas = await buscarElo(conta.puuid!);
        const soloEntry = ranqueadas.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');

        if (!soloEntry) continue;

        await supabase
          .from('contas_riot')
          .update({
            tier: soloEntry.tier ?? 'IRON',
            rank: soloEntry.rank ?? 'IV',
            lp: soloEntry.leaguePoints ?? 0,
            last_elo_update: new Date().toISOString(),
          })
          .eq('id', conta.id);

        atualizados++;
        console.log(`[atualizarElosSequencial] ${atualizados}/${total}: ${conta.riot_id}`);

        // Delay entre cada request
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err: any) {
        erros.push({ riotId: conta.riot_id || 'Desconhecido', erro: String(err) });
      }
    }

    return { total, atualizados, falhados: total - atualizados, tempoMs: Date.now() - inicio, erros };
  } catch (err) {
    console.error('[atualizarElosSequencial] Erro:', err);
    throw err;
  }
}

/**
 * Atualizar apenas um jogador (quando ele entra em sua conta)
 */
export async function atualizarEloUnico(userId: string): Promise<boolean> {
  try {
    const { data: conta } = await supabase
      .from('contas_riot')
      .select('id, riot_id, puuid')
      .eq('user_id', userId)
      .maybeSingle();

    if (!conta?.puuid) {
      console.warn(`[atualizarEloUnico] Usuário ${userId} sem PUUID`);
      return false;
    }

    const ranqueadas = await buscarElo(conta.puuid);
    const soloEntry = ranqueadas.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');

    if (!soloEntry) {
      console.warn(`[atualizarEloUnico] ${conta.riot_id} sem ranked SoloQ`);
      return false;
    }

    const { error } = await supabase
      .from('contas_riot')
      .update({
        tier: soloEntry.tier ?? 'IRON',
        rank: soloEntry.rank ?? 'IV',
        lp: soloEntry.leaguePoints ?? 0,
        last_elo_update: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error(`[atualizarEloUnico] ${conta.riot_id}: ${error.message}`);
      return false;
    }

    console.log(`[atualizarEloUnico] ✅ ${conta.riot_id} atualizado`);
    return true;
  } catch (err: any) {
    console.error(`[atualizarEloUnico] Erro:`, err?.message);
    return false;
  }
}
