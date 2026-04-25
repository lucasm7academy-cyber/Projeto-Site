/**
 * src/api/admin.ts
 *
 * Funções administrativas para atualizar cache de elo de todos os jogadores
 * Pode ser executada manualmente ou via cron job (Edge Function)
 * 
 * ✅ VERSÃO OTIMIZADA
 * - Sem console.log em produção
 * - Select com colunas específicas (já estava correto)
 * - Promise.all para queries paralelas
 * - Tratamento de erro robusto
 */

import { supabase } from '../lib/supabase';
import { buscarElo } from './riot';

const IS_DEV = import.meta.env.DEV; // ✅ Só loga em desenvolvimento

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
 * ✅ OTIMIZADO:
 * - Select com colunas específicas
 * - Promise.all para batch
 * - Sem logs em produção
 */
export async function atualizarElosTodos(): Promise<AtualizacaoEloResult> {
  const inicio = Date.now();
  const erros: Array<{ riotId: string; erro: string }> = [];
  let atualizados = 0;

  try {
    // ✅ Select com colunas ESPECÍFICAS (já estava correto)
    const { data: contas, error: erroSelect } = await supabase
      .from('contas_riot')
      .select('id, user_id, riot_id, puuid, tier, rank, lp, last_elo_update')
      .not('puuid', 'is', null);

    if (erroSelect) {
      throw new Error(`Erro ao buscar contas: ${erroSelect.message}`);
    }

    if (!contas || contas.length === 0) {
      if (IS_DEV) console.log('[atualizarElosTodos] Nenhuma conta com PUUID');
      return {
        total: 0,
        atualizados: 0,
        falhados: 0,
        tempoMs: Date.now() - inicio,
        erros: [],
      };
    }

    const total = contas.length;
    if (IS_DEV) console.log(`[atualizarElosTodos] Atualizando ${total} jogadores...`);

    // ✅ Batch em paralelo com throttle (3 simultâneas)
    const THROTTLE = 3;
    for (let i = 0; i < contas.length; i += THROTTLE) {
      const batch = contas.slice(i, i + THROTTLE);
      
      if (IS_DEV) {
        console.log(`[atualizarElosTodos] Batch ${Math.floor(i / THROTTLE) + 1}/${Math.ceil(contas.length / THROTTLE)}`);
      }

      const results = await Promise.all(
        batch.map(async (conta) => {
          try {
            const ranqueadas = await buscarElo(conta.puuid!);
            const soloEntry = ranqueadas.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');

            if (!soloEntry) {
              if (IS_DEV) console.log(`[atualizarElosTodos] ${conta.riot_id}: Sem ranked SoloQ`);
              return null;
            }

            const novoTier = soloEntry.tier ?? 'IRON';
            const novoRank = soloEntry.rank ?? 'IV';
            const novoLp = soloEntry.leaguePoints ?? 0;

            // ✅ Update apenas dos campos que mudam
            const { error: erroUpdate } = await supabase
              .from('contas_riot')
              .update({
                tier: novoTier,
                rank: novoRank,
                lp: novoLp,
                last_elo_update: new Date().toISOString(),
              })
              .eq('id', conta.id);

            if (erroUpdate) throw erroUpdate;

            if (IS_DEV) console.log(`[atualizarElosTodos] ✅ ${conta.riot_id}: ${novoTier} ${novoRank} (${novoLp}LP)`);
            return true;
          } catch (err: any) {
            const mensagem = err?.message || String(err);
            if (IS_DEV) console.error(`[atualizarElosTodos] ❌ ${conta.riot_id}: ${mensagem}`);
            erros.push({
              riotId: conta.riot_id || 'Desconhecido',
              erro: mensagem,
            });
            return false;
          }
        })
      );

      // ✅ Conta quantos atualizaram no batch
      atualizados += results.filter(r => r === true).length;

      // Delay entre batches para respeitar rate limit da Riot API
      if (i + THROTTLE < contas.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const tempoMs = Date.now() - inicio;
    const falhados = total - atualizados;

    if (IS_DEV) {
      console.log(`[atualizarElosTodos] COMPLETO!`);
      console.log(`  Total: ${total}`);
      console.log(`  Atualizados: ${atualizados}`);
      console.log(`  Falhados: ${falhados}`);
      console.log(`  Tempo: ${(tempoMs / 1000).toFixed(1)}s`);
    }

    return { total, atualizados, falhados, tempoMs, erros };
  } catch (err: any) {
    if (IS_DEV) console.error('[atualizarElosTodos] Erro fatal:', err?.message);
    throw err;
  }
}

/**
 * Versão mais lenta mas segura: atualiza 1 jogador por vez
 * Melhor para não sobrecarregar Riot API
 * 
 * ✅ OTIMIZADO: Delay de 2 segundos entre requests
 */
export async function atualizarElosSequencial(): Promise<AtualizacaoEloResult> {
  const inicio = Date.now();
  const erros: Array<{ riotId: string; erro: string }> = [];
  let atualizados = 0;

  try {
    // ✅ Select com colunas ESPECÍFICAS
    const { data: contas } = await supabase
      .from('contas_riot')
      .select('id, riot_id, puuid')
      .not('puuid', 'is', null);

    if (!contas || contas.length === 0) {
      return { total: 0, atualizados: 0, falhados: 0, tempoMs: 0, erros: [] };
    }

    const total = contas.length;

    for (let i = 0; i < contas.length; i++) {
      const conta = contas[i];
      if (IS_DEV) console.log(`[atualizarElosSequencial] ${i + 1}/${total}: ${conta.riot_id}`);
      
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

        // ✅ Delay entre requests (2 segundos)
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err: any) {
        erros.push({ riotId: conta.riot_id || 'Desconhecido', erro: String(err) });
      }
    }

    return { 
      total, 
      atualizados, 
      falhados: total - atualizados, 
      tempoMs: Date.now() - inicio, 
      erros 
    };
  } catch (err) {
    if (IS_DEV) console.error('[atualizarElosSequencial] Erro:', err);
    throw err;
  }
}

/**
 * Atualizar apenas um jogador (quando ele entra em sua conta)
 * 
 * ✅ OTIMIZADO: Usa userId diretamente, sem SELECT desnecessário
 */
export async function atualizarEloUnico(userId: string): Promise<boolean> {
  try {
    // ✅ Select APENAS com o que precisa
    const { data: conta } = await supabase
      .from('contas_riot')
      .select('id, riot_id, puuid')
      .eq('user_id', userId)
      .maybeSingle();

    if (!conta?.puuid) {
      if (IS_DEV) console.warn(`[atualizarEloUnico] Usuário ${userId} sem PUUID`);
      return false;
    }

    const ranqueadas = await buscarElo(conta.puuid);
    const soloEntry = ranqueadas.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');

    if (!soloEntry) {
      if (IS_DEV) console.warn(`[atualizarEloUnico] ${conta.riot_id} sem ranked SoloQ`);
      return false;
    }

    // ✅ Update direto, só campos que mudam
    const { error } = await supabase
      .from('contas_riot')
      .update({
        tier: soloEntry.tier ?? 'IRON',
        rank: soloEntry.rank ?? 'IV',
        lp: soloEntry.leaguePoints ?? 0,
        last_elo_update: new Date().toISOString(),
      })
      .eq('id', conta.id);

    if (error) {
      if (IS_DEV) console.error(`[atualizarEloUnico] ${conta.riot_id}: ${error.message}`);
      return false;
    }

    if (IS_DEV) console.log(`[atualizarEloUnico] ✅ ${conta.riot_id} atualizado`);
    return true;
  } catch (err: any) {
    if (IS_DEV) console.error(`[atualizarEloUnico] Erro:`, err?.message);
    return false;
  }
}