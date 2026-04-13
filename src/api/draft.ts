// src/api/draft.ts
import { supabase } from '../lib/supabase';
import { getTurnOrder, type DraftState } from '../components/draft/draftTypes';

// ============================================================
// BUSCAR DRAFT DA SALA
// ============================================================
export async function buscarDraftDaSala(salaId: number): Promise<DraftState | null> {
  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('sala_id', salaId)
    .order('created_at', { ascending: false })  // ✅ Pega o mais recente
    .limit(1)  // ✅ Limita a 1 resultado
    .maybeSingle();  // ✅ Não quebra se não encontrar

  if (error) {
    console.error('Erro ao buscar draft:', error);
    return null;
  }

  return data as DraftState | null;
}

// ============================================================
// CRIAR NOVO DRAFT
// ============================================================
export async function criarDraft(
  salaId: number,
  fearlessEnabled: boolean = false
): Promise<DraftState | null> {
  // ✅ LIMPAR QUALQUER DRAFT ANTIGO PRIMEIRO (garante reset completo)
  const { error: erroDeleteAntigos } = await supabase
    .from('drafts')
    .delete()
    .eq('sala_id', salaId);

  if (erroDeleteAntigos) {
    console.error('Erro ao deletar drafts antigos:', erroDeleteAntigos);
  } else {
    console.log('[criarDraft] Drafts antigos deletados para sala:', salaId);
  }

  const novoDraft = {
    sala_id: salaId,
    blue_bans: [],
    blue_picks: [],
    red_bans: [],
    red_picks: [],
    current_phase: 'ban',
    current_team: 'blue',
    current_turn: 0,
    timer_end: Date.now() + 30000,
    status: 'ongoing',
    fearless_enabled: fearlessEnabled,
    fearless_pool: [],
  };

  const { data, error } = await supabase
    .from('drafts')
    .insert(novoDraft)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar draft:', error);
    return null;
  }

  // Atualizar sala com o draft_id
  const { error: erroUpdate } = await supabase
    .from('salas')
    .update({ draft_id: data.id })
    .eq('id', salaId);

  if (erroUpdate) {
    console.error('Erro ao atualizar sala com draft_id:', erroUpdate);
  } else {
    console.log('[criarDraft] Novo draft criado com sucesso:', data.id);
  }

  return data as DraftState;
}

// ============================================================
// ATUALIZAR DRAFT (Banir/Pickar)
// ============================================================
export async function atualizarDraft(
  draftId: string,
  updates: Partial<DraftState>
): Promise<boolean> {
  const { error } = await supabase
    .from('drafts')
    .update(updates)
    .eq('id', draftId);

  if (error) {
    console.error('Erro ao atualizar draft:', error);
    return false;
  }

  return true;
}

// ============================================================
// BANIR CAMPEÃO
// ============================================================
export async function banirCampeao(
  draft: DraftState,
  championId: string,
  team: 'blue' | 'red',
  modo: string
): Promise<boolean> {
  const turnOrder = getTurnOrder(modo);
  const bansKey   = team === 'blue' ? 'blue_bans' : 'red_bans';

  // ✅ Se championId for "", é um ban em branco (timeout)
  // Adiciona NULL ao array para registrar que o ban foi feito (mas sem campeão)
  const valorBan = championId || null;
  const novosBans = [...(team === 'blue' ? draft.blue_bans : draft.red_bans), valorBan];

  const nextTurn = draft.current_turn + 1;
  const nextInfo = turnOrder[nextTurn];

  const updates: Partial<DraftState> = {
    [bansKey]:     novosBans,
    current_turn:  nextTurn,
    current_team:  nextInfo?.team  ?? 'blue',
    current_phase: nextInfo?.phase ?? 'pick',
    timer_end:     Date.now() + 30000,
  };

  if (nextTurn >= turnOrder.length) updates.status = 'finished';

  return atualizarDraft(draft.id, updates);
}

// ============================================================
// PICKAR CAMPEÃO
// ============================================================
export async function pickarCampeao(
  draft: DraftState,
  championId: string,
  team: 'blue' | 'red',
  modo: string
): Promise<boolean> {
  const turnOrder  = getTurnOrder(modo);
  const picksKey   = team === 'blue' ? 'blue_picks' : 'red_picks';
  const novosPicks = [...(team === 'blue' ? draft.blue_picks : draft.red_picks), championId];

  const nextTurn = draft.current_turn + 1;
  const nextInfo = turnOrder[nextTurn];

  const updates: Partial<DraftState> = {
    [picksKey]:    novosPicks,
    current_turn:  nextTurn,
    current_team:  nextInfo?.team  ?? 'blue',
    current_phase: nextInfo?.phase ?? 'ban',
    timer_end:     Date.now() + 30000,
  };

  if (nextTurn >= turnOrder.length) updates.status = 'finished';

  return atualizarDraft(draft.id, updates);
}

// ============================================================
// VERIFICAR SE USUÁRIO PODE CONTROLAR DRAFT
// ============================================================
// Role que controla o draft conforme o modo
export async function podeControlarDraft(
  salaId: number,
  userId: string,
  modo: string
): Promise<{ pode: boolean; team: 'blue' | 'red' | null; nome: string }> {
  
  const { data: jogadorSala, error } = await supabase
    .from('sala_jogadores')
    .select('role, is_time_a')
    .eq('sala_id', salaId)
    .eq('user_id', userId)
    .eq('role', modo === '1v1' ? 'MID' : 'JG');

  if (error || !jogadorSala || jogadorSala.length === 0) {
    const { data: sala } = await supabase
      .from('salas')
      .select('criador_id')
      .eq('id', salaId)
      .single();

    if (sala?.criador_id === userId) {
      const nome = await buscarNomeJogador(userId);
      return { pode: true, team: null, nome };
    }

    return { pode: false, team: null, nome: 'Espectador' };
  }

  const nome = await buscarNomeJogador(userId);

  return {
    pode: true,
    team: jogadorSala[0].is_time_a ? 'blue' : 'red',  // ✅ CORRIGIDO
    nome
  };
}

// ============================================================
// FUNÇÃO AUXILIAR: BUSCAR NOME DO JOGADOR
// ============================================================
async function buscarNomeJogador(userId: string): Promise<string> {
  try {
    // Buscar na tabela contas_riot
    const { data: contaRiot } = await supabase
      .from('contas_riot')
      .select('riot_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (contaRiot?.riot_id) {
      // Extrai só o nome antes do #
      return contaRiot.riot_id.split('#')[0];
    }

    // Fallback: buscar no profiles
    const { data: perfil } = await supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (perfil) {
      return perfil.username || perfil.full_name || 'Jogador';
    }

    return 'Jogador';
  } catch (error) {
    console.error('Erro ao buscar nome do jogador:', error);
    return 'Jogador';
  }
}

// ============================================================
// DELETAR DRAFT
// ============================================================
export async function deletarDraft(draftId: string): Promise<boolean> {
  const { error } = await supabase
    .from('drafts')
    .delete()
    .eq('id', draftId);

  if (error) {
    console.error('Erro ao deletar draft:', error);
    return false;
  }

  return true;
}

// ============================================================
// INSCREVER NO REALTIME DO DRAFT
// ============================================================
export function inscreverDraftRealtime(
  salaId: number,
  callback: (draft: DraftState) => void
) {
  return supabase
    .channel(`draft_${salaId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'drafts',
        filter: `sala_id=eq.${salaId}`,
      },
      (payload) => callback(payload.new as DraftState)
    )
    .subscribe();
}