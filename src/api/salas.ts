// src/api/salas.ts
// Camada de dados para o sistema de salas/partidas

import { supabase } from '../lib/supabase';

// ── Código visual da partida ──────────────────────────────────────────────────
export const formatarCodigo = (id: number | string) =>
  `#${String(id).padStart(6, '0')}`;

// ── Estados da máquina ────────────────────────────────────────────────────────
export type EstadoSala =
  | 'aberta'            // nenhuma vaga ocupada
  | 'preenchendo'       // 1+ vagas ocupadas, não cheia
  | 'confirmacao'       // sala cheia, aguardando confirmações (timer ativo)
  | 'travada'           // todos confirmaram, jogadores vinculados
  | 'aguardando_inicio' // votação: a partida começou?
  | 'em_partida'        // partida em andamento
  | 'finalizacao'       // votação de resultado
  | 'encerrada';        // sala finalizada

export type OpcaoVotoInicio    = 'iniciou' | 'nao_iniciou';
export type OpcaoVotoResultado = 'time_a' | 'time_b';

// ── Tipos compartilhados ──────────────────────────────────────────────────────
export interface JogadorNaSala {
  id: string;
  nome: string;
  tag: string;
  
  elo: string;
  role: string;
  avatar?: string;
  isLider: boolean;
  isTimeA: boolean;
  confirmado: boolean;
  vinculado: boolean;
}

export interface Voto {
  userId: string;
  fase: 'aguardando_inicio' | 'finalizacao';
  opcao: string;
  isTimeA: boolean;
}

export interface Sala {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
  criadorId: string;
  criadorNome: string;
  timeANome?: string;
  timeATag?: string;
  timeALogo?: string;
  timeAId?: string | null;
  timeBNome?: string;
  timeBTag?: string;
  draft_id?: string | null;
  timeBLogo?: string;
  timeBId?: string | null;
  jogadores: JogadorNaSala[];
  maxJogadores: number;
  temSenha: boolean;
  senha?: string;
  mpoints: number;
  modo: string;
  estado: EstadoSala;
  eloMinimo?: string;
  codigoPartida?: string;
  confirmacaoExpiresAt?: Date;
  aguardandoInicioExpiresAt?: Date;
  vencedor?: 'A' | 'B' | 'empate' | null;
  createdAt: Date;
}

// ── Mapeamento DB → Sala ──────────────────────────────────────────────────────
function mapSala(row: any, jogadoresRows: any[]): Sala {
  return {
    id:           row.id,
    codigo:       formatarCodigo(row.id),
    nome:         row.nome,
    descricao:    row.descricao || '',
    criadorId:    row.criador_id,
    criadorNome:  row.criador_nome,
    timeANome:    row.time_a_nome,
    timeATag:     row.time_a_tag,
    timeALogo:    row.time_a_logo,
    timeAId:      row.time_a_id ?? null,
    timeBNome:    row.time_b_nome,
    timeBTag:     row.time_b_tag,
    timeBLogo:    row.time_b_logo,
    timeBId:      row.time_b_id ?? null,
    maxJogadores: row.max_jogadores,
    temSenha:     row.tem_senha,
    senha:        row.senha,
    mpoints:      row.mpoints ?? 0,
    modo:         row.modo,
    estado:       (row.estado as EstadoSala) ?? 'aberta',
    eloMinimo:    row.elo_minimo,
    draft_id:     row.draft_id ?? null,
    codigoPartida: row.codigo_partida,
    confirmacaoExpiresAt:    row.confirmacao_expires_at ? new Date(row.confirmacao_expires_at) : undefined,
    aguardandoInicioExpiresAt: row.aguardando_inicio_expires_at ? new Date(row.aguardando_inicio_expires_at) : undefined,
    vencedor:     row.vencedor,
    createdAt:    new Date(row.created_at),
    jogadores: jogadoresRows.map(j => ({
      id:         j.user_id,
      nome:       j.nome,
      tag:        j.tag  || '',
      elo:        j.elo  || '',
      role:       j.role || 'RES',
      avatar:     j.avatar || undefined,
      isLider:    j.is_lider,
      isTimeA:    j.is_time_a,
      confirmado: j.confirmado,
      vinculado:  j.vinculado ?? false,
    })),
  };
}

// ── Carregar lista de salas visíveis ──────────────────────────────────────────
export async function carregarSalas(): Promise<Sala[]> {
  const { data, error } = await supabase
    .from('salas')
    .select('*, sala_jogadores(*)')
    .not('estado', 'in', '("encerrada")')
    .order('created_at', { ascending: false });

  if (error || !data) { console.error('[carregarSalas]', error); return []; }
  return data.map(row => mapSala(row, row.sala_jogadores ?? []));
}

// ── Buscar sala completa por ID ───────────────────────────────────────────────
export async function buscarSalaCompleta(salaId: number): Promise<Sala | null> {
  const { data, error } = await supabase
    .from('salas')
    .select('*, sala_jogadores(*)')
    .eq('id', salaId)
    .single();
  if (error || !data) return null;
  return mapSala(data, data.sala_jogadores ?? []);
}

// ── Criar sala ────────────────────────────────────────────────────────────────
export async function criarSala(
  dados: {
    nome: string; descricao: string; modo: string; mpoints: number;
    temSenha: boolean; senha?: string; maxJogadores: number;
    eloMinimo?: string; timeANome?: string; timeATag?: string; timeALogo?: string;
  },
  usuario: { id: string; nome: string; tag?: string; elo: string; role: string }
): Promise<Sala | null> {
  const { data: sala, error } = await supabase
    .from('salas')
    .insert({
      nome:          dados.nome,
      descricao:     dados.descricao,
      criador_id:    usuario.id,
      criador_nome:  usuario.nome,
      modo:          dados.modo,
      mpoints:       dados.mpoints,
      tem_senha:     dados.temSenha,
      senha:         dados.temSenha ? dados.senha : null,
      max_jogadores: dados.maxJogadores,
      elo_minimo:    dados.eloMinimo || null,
      time_a_nome:   dados.timeANome || null,
      time_a_tag:    dados.timeATag  || null,
      time_a_logo:   dados.timeALogo || null,
      estado:        'aberta',
    })
    .select()
    .single();

  if (error || !sala) { console.error('[criarSala]', error); return null; }
  return mapSala(sala, []);
}

// ── Transição de estado ───────────────────────────────────────────────────────
// Tenta via RPC (atômico, com lock). Se o RPC não existir ainda no banco,
// cai em UPDATE direto para não bloquear o fluxo durante desenvolvimento.
export async function transicionarEstado(
  salaId: number,
  novoEstado: EstadoSala
): Promise<boolean> {
  // Tentativa 1: RPC com lock (produção)
  const { data, error: rpcError } = await supabase.rpc('fn_transicionar_sala', {
    p_sala_id:     salaId,
    p_novo_estado: novoEstado,
  });
  if (!rpcError) return data === true;

  // Tentativa 2: UPDATE direto com timestamps de timer
  const updates: Record<string, any> = {
    estado:     novoEstado,
    updated_at: new Date().toISOString(),
  };
  if (novoEstado === 'confirmacao') {
    updates.confirmacao_expires_at = new Date(Date.now() + 30_000).toISOString();
  }
  if (novoEstado === 'aguardando_inicio') {
    updates.aguardando_inicio_expires_at = new Date(Date.now() + 180_000).toISOString();
  }
  const { error } = await supabase.from('salas').update(updates).eq('id', salaId);
  if (!error) return true;

  // Tentativa 3: UPDATE sem colunas de timer (caso não existam ainda no schema)
  const { error: e2 } = await supabase.from('salas')
    .update({ estado: novoEstado, updated_at: new Date().toISOString() })
    .eq('id', salaId);
  if (e2) { console.error('[transicionarEstado] falhou:', e2); return false; }
  return true;
}

// ── Entrar em uma vaga ────────────────────────────────────────────────────────
// Proteções: usuário só pode estar em 1 vaga, vaga não pode estar ocupada por outro
export async function entrarNaVaga(
  salaId: number,
  usuario: { id: string; nome: string; tag?: string; elo: string; avatar?: string },
  role: string,
  isTimeA: boolean,
  modo?: string
): Promise<{ sucesso: boolean; erro?: string }> {
  // Verifica se vaga está ocupada por outro
  const { data: existente } = await supabase
    .from('sala_jogadores')
    .select('user_id')
    .eq('sala_id', salaId)
    .eq('role', role)
    .eq('is_time_a', isTimeA)
    .maybeSingle();

  if (existente && existente.user_id !== usuario.id) {
    console.warn('[entrarNaVaga] vaga ocupada por outro jogador');
    return { sucesso: false, erro: 'Vaga ocupada' };
  }

  // Verifica se usuário está vinculado a outra sala (bloqueio absoluto)
  const { data: vinculo } = await supabase
    .from('sala_jogadores')
    .select('sala_id, vinculado')
    .eq('user_id', usuario.id)
    .eq('vinculado', true)
    .neq('sala_id', salaId)
    .maybeSingle();

  if (vinculo) {
    console.warn('[entrarNaVaga] jogador vinculado a outra sala');
    return { sucesso: false, erro: 'Você está em outra sala' };
  }

  // ========== VALIDAÇÃO PARA time_vs_time ==========
  if (modo === 'time_vs_time') {
    // Buscar time do usuário
    const { data: membro } = await supabase
      .from('time_membros')
      .select('time_id')
      .eq('user_id', usuario.id)
      .maybeSingle();

    if (!membro || !membro.time_id) {
      console.warn('[entrarNaVaga] usuário sem time tentando entrar em time_vs_time');
      return { sucesso: false, erro: 'Você precisa estar em um time' };
    }

    // Buscar info da sala para verificar time_a_id e time_b_id
    const { data: sala } = await supabase
      .from('salas')
      .select('time_a_id, time_b_id')
      .eq('id', salaId)
      .single();

    if (sala) {
      const timeIdDaSala = isTimeA ? sala.time_a_id : sala.time_b_id;

      // Se já tem time definido naquele lado, verificar se é o mesmo
      if (timeIdDaSala && timeIdDaSala !== membro.time_id) {
        console.warn('[entrarNaVaga] time diferente tentando entrar em vaga ocupada');
        return { sucesso: false, erro: 'Esta vaga é exclusiva para outro time' };
      }
    }
  }
  // ========== FIM VALIDAÇÃO time_vs_time ==========

  // Remove o usuário de qualquer outra sala em que esteja sem vínculo
  // (impede que uma pessoa fique em duas salas ao mesmo tempo)
  await supabase.from('sala_jogadores').delete()
    .eq('user_id', usuario.id)
    .eq('vinculado', false)
    .neq('sala_id', salaId);

  // Buscar info da vaga anterior ANTES de sair (para resetar time_id depois)
  const { data: vagaAnterior } = await supabase
    .from('sala_jogadores')
    .select('is_time_a')
    .eq('sala_id', salaId)
    .eq('user_id', usuario.id)
    .eq('vinculado', false)
    .maybeSingle();

  // Remove vaga anterior (sem passar por sairDaVaga, para evitar race condition)
  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('user_id', usuario.id).eq('vinculado', false);

  // Conta jogadores para definir líder
  const { count } = await supabase.from('sala_jogadores')
    .select('*', { count: 'exact', head: true }).eq('sala_id', salaId);

  const row: Record<string, any> = {
    sala_id:   salaId,
    user_id:   usuario.id,
    nome:      usuario.nome,
    tag:       usuario.tag || '',
    elo:       usuario.elo,
    role,
    is_lider:  (count ?? 0) === 0,
    is_time_a: isTimeA,
    confirmado: false,
    vinculado:  false,
  };
  if (usuario.avatar) row.avatar = usuario.avatar;

  const { error } = await supabase.from('sala_jogadores').insert(row);
  if (error) {
    if (error.code === '23505') {
      console.warn('[entrarNaVaga] conflito de vaga — vaga preenchida por outro jogador no mesmo instante');
      return { sucesso: false, erro: 'Vaga já foi preenchida' };
    } else {
      console.error('[entrarNaVaga]', error);
      return { sucesso: false, erro: 'Erro ao entrar na vaga' };
    }
  }

  // Após INSERT bem-sucedido, limpar time_id do lado anterior (time_vs_time)
  if (vagaAnterior && modo === 'time_vs_time') {
    const { count: contagem } = await supabase
      .from('sala_jogadores')
      .select('*', { count: 'exact', head: true })
      .eq('sala_id', salaId)
      .eq('is_time_a', vagaAnterior.is_time_a)
      .eq('vinculado', false);

    if (contagem === 0) {
      const campoTimeIdAntigo = vagaAnterior.is_time_a ? 'time_a_id' : 'time_b_id';
      try {
        await supabase
          .from('salas')
          .update({ [campoTimeIdAntigo]: null })
          .eq('id', salaId);
      } catch (err: any) {
        console.error(`[entrarNaVaga] Erro ao limpar ${campoTimeIdAntigo}:`, err);
      }
    }
  }

  // ========== REGISTRAR TIME NA SALA (time_vs_time) ==========
  if (modo === 'time_vs_time') {
    const { data: membro } = await supabase
      .from('time_membros')
      .select('time_id')
      .eq('user_id', usuario.id)
      .maybeSingle();

    if (membro?.time_id) {
      // Buscar sala para ver qual time já está definido
      const { data: sala } = await supabase
        .from('salas')
        .select('time_a_id, time_b_id')
        .eq('id', salaId)
        .single();

      // Se esse lado ainda não tem time definido, registrar
      const campoTimeId = isTimeA ? 'time_a_id' : 'time_b_id';
      const timeIdJaDefinido = isTimeA ? sala?.time_a_id : sala?.time_b_id;

      if (!timeIdJaDefinido) {
        const { error: updateError } = await supabase
          .from('salas')
          .update({ [campoTimeId]: membro.time_id })
          .eq('id', salaId);

        if (updateError) {
          console.error(`[entrarNaVaga] Erro ao registrar ${campoTimeId}:`, updateError);
          // Se falhar, retorna erro mas o jogador já entrou (insert funcionou)
          // A UI vai detectar via realtime que time_id não foi registrado
        }
      }
    }
  }
  // ========== FIM REGISTRAR TIME ==========

  return { sucesso: true };
}

// ── Sair da vaga ──────────────────────────────────────────────────────────────
export async function sairDaVaga(salaId: number, userId: string): Promise<void> {
  // Buscar o jogador para saber qual lado estava (time_a ou time_b)
  const { data: jogador } = await supabase
    .from('sala_jogadores')
    .select('is_time_a')
    .eq('sala_id', salaId)
    .eq('user_id', userId)
    .eq('vinculado', false)
    .maybeSingle();

  // Remove o jogador da vaga
  const { error: deleteError } = await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('user_id', userId).eq('vinculado', false);

  // Se foi deletado e era time_vs_time, verificar se ainda há jogadores naquele lado
  if (!deleteError && jogador) {
    const { count, error: countError } = await supabase
      .from('sala_jogadores')
      .select('*', { count: 'exact', head: true })
      .eq('sala_id', salaId)
      .eq('is_time_a', jogador.is_time_a)
      .eq('vinculado', false);

    // Se nenhum jogador restante naquele lado, limpar o time_id
    // Verificar também que ele é false (não vinculado) para ter certeza
    if (!countError && count === 0) {
      const campoTimeId = jogador.is_time_a ? 'time_a_id' : 'time_b_id';
      try {
        await supabase
          .from('salas')
          .update({ [campoTimeId]: null })
          .eq('id', salaId);
      } catch (err) {
        console.error('[sairDaVaga] Erro ao resetar time_id:', err);
      }
    }
  }
}

// ── Confirmar/desconfirmar presença (DELETE+INSERT evita UPDATE policy) ───────
export async function confirmarPresencaDB(
  salaId: number,
  userId: string,
  confirmado: boolean
): Promise<void> {
  const { data: atual } = await supabase.from('sala_jogadores')
    .select('*').eq('sala_id', salaId).eq('user_id', userId).maybeSingle();
  if (!atual) return;

  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('user_id', userId);

  const { id: _id, ...semId } = atual;
  await supabase.from('sala_jogadores').insert({ ...semId, confirmado });
}

// ── Resetar vagas (reset total — remove todos sem vínculo) ───────────────────
export async function resetarVagas(salaId: number): Promise<void> {
  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('vinculado', false);
  await supabase.from('sala_votos').delete().eq('sala_id', salaId);
}

// ── Reset seletivo de confirmação ─────────────────────────────────────────────
// Comportamento ao expirar o timer ou alguém sair durante confirmação:
//   • Quem NÃO confirmou  → removido da vaga (fica como espectador na sala)
//   • Quem confirmou      → permanece na vaga, mas confirmado é resetado para false
// Assim a partida retoma de onde estava: confirmers já nas vagas, 1 vaga aberta.
export async function resetarConfirmacoes(salaId: number): Promise<void> {
  // 1. Remove quem não confirmou (ainda está na vaga)
  await supabase.from('sala_jogadores')
    .delete()
    .eq('sala_id', salaId)
    .eq('confirmado', false)
    .eq('vinculado', false);

  // 2. Reseta o "pronto" de quem confirmou — tenta UPDATE direto
  const { error: errUpdate } = await supabase.from('sala_jogadores')
    .update({ confirmado: false })
    .eq('sala_id', salaId)
    .eq('confirmado', true)
    .eq('vinculado', false);

  if (errUpdate) {
    // Fallback para DELETE+INSERT caso a policy de UPDATE não cubra essa coluna
    const { data: confirmados } = await supabase.from('sala_jogadores')
      .select('*')
      .eq('sala_id', salaId)
      .eq('confirmado', true)
      .eq('vinculado', false);

    if (confirmados) {
      for (const row of confirmados) {
        await supabase.from('sala_jogadores')
          .delete().eq('sala_id', salaId).eq('user_id', row.user_id);
        const { id: _id, ...semId } = row;
        await supabase.from('sala_jogadores').insert({ ...semId, confirmado: false });
      }
    }
  }

  // 3. Limpa votos da rodada anterior
  await supabase.from('sala_votos').delete().eq('sala_id', salaId);
}

// ── Vincular jogadores (confirmacao → travada) ────────────────────────────────
export async function vincularJogadores(salaId: number): Promise<void> {
  // Usa UPDATE — precisa da policy "sj_update" no Supabase
  await supabase.from('sala_jogadores')
    .update({ vinculado: true })
    .eq('sala_id', salaId);
}

// ── Registrar voto ────────────────────────────────────────────────────────────
export async function registrarVoto(
  salaId: number,
  userId: string,
  fase: 'aguardando_inicio' | 'finalizacao',
  opcao: string,
  isTimeA: boolean
): Promise<boolean> {
  // Remove voto anterior na mesma fase (para permitir trocar)
  await supabase.from('sala_votos').delete()
    .eq('sala_id', salaId).eq('user_id', userId).eq('fase', fase);

  const { error } = await supabase.from('sala_votos').insert({
    sala_id:  salaId,
    user_id:  userId,
    fase,
    opcao,
    is_time_a: isTimeA,
  });
  if (error) { console.error('[registrarVoto]', error); return false; }
  return true;
}

// ── Buscar votos de uma sala e fase ──────────────────────────────────────────
export async function buscarVotos(
  salaId: number,
  fase: 'aguardando_inicio' | 'finalizacao'
): Promise<Voto[]> {
  const { data, error } = await supabase.from('sala_votos')
    .select('*').eq('sala_id', salaId).eq('fase', fase);
  if (error || !data) return [];
  return data.map(v => ({
    userId:   v.user_id,
    fase:     v.fase,
    opcao:    v.opcao,
    isTimeA:  v.is_time_a,
  }));
}

// ── Deletar sala ──────────────────────────────────────────────────────────────
export async function deletarSala(salaId: number): Promise<void> {
  await supabase.from('salas').delete().eq('id', salaId);
}

// ── Encerrar sala (estado encerrada + limpeza) ────────────────────────────────
export async function encerrarSala(salaId: number, vencedor?: 'A' | 'B' | 'empate'): Promise<void> {
  await supabase.from('salas').update({
    estado:    'encerrada',
    vencedor:  vencedor ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', salaId);
}

// ── Buscar sala ativa do usuário (qualquer slot, vinculado ou não) ────────────
// Usado em /jogar para redirecionar imediatamente se o jogador já está em uma sala.
export async function buscarSalaAtivaDoUsuario(userId: string): Promise<Sala | null> {
  const { data: slot } = await supabase
    .from('sala_jogadores')
    .select('sala_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!slot) return null;
  const sala = await buscarSalaCompleta(slot.sala_id);
  if (!sala || sala.estado === 'encerrada') return null;
  return sala;
}

// ── Buscar sala à qual o usuário está vinculado ───────────────────────────────
// Usado no carregamento do lobby para redirecionar automaticamente o jogador
// de volta para sua partida ativa em caso de reload ou nova sessão.
export async function buscarSalaVinculadaDoUsuario(userId: string): Promise<Sala | null> {
  const { data: vinculo } = await supabase
    .from('sala_jogadores')
    .select('sala_id')
    .eq('user_id', userId)
    .eq('vinculado', true)
    .maybeSingle();

  if (!vinculo) return null;

  const sala = await buscarSalaCompleta(vinculo.sala_id);
  // Ignora salas encerradas — o vínculo já não é mais relevante
  if (!sala || sala.estado === 'encerrada') return null;
  return sala;
}

// ── Buscar sala por código (#000067) ─────────────────────────────────────────
export async function buscarSalaPorCodigo(codigo: string): Promise<Sala | null> {
  const num = parseInt(codigo.replace('#', ''), 10);
  if (isNaN(num)) return null;
  const { data, error } = await supabase
    .from('salas').select('*, sala_jogadores(*)').eq('id', num).single();
  if (error || !data) return null;
  return mapSala(data, data.sala_jogadores ?? []);
}

// ── Códigos de partida (pool FIFO circular) ───────────────────────────────────

/** Atribui código à sala.
 *  1) Tenta via RPC (pool FIFO, atômico)
 *  2) Se falhar, busca direto da tabela codigos_partida pelo modo
 *  3) Se também falhar (RLS), usa código aleatório de emergência
 */
export async function atribuirCodigoPartida(salaId: number, modo: string): Promise<string | null> {
  // Tentativa 1: RPC com pool de códigos
  const { data: rpcData, error: rpcErr } = await supabase
    .rpc('atribuir_codigo_partida', { p_sala_id: Number(salaId), p_modo: modo });
  if (!rpcErr && rpcData) return rpcData as string;

  console.warn('[atribuirCodigoPartida] RPC falhou:', rpcErr?.message);

  // Tentativa 2: query direta à tabela codigos_partida (sem colunas opcionais)
  const { data: rows, error: rowsErr } = await supabase
    .from('codigos_partida')
    .select('id, codigo')
    .eq('modo', modo)
    .order('id', { ascending: true })
    .limit(1);

  console.warn('[atribuirCodigoPartida] busca direta — modo:', modo, '| rows:', rows, '| erro:', rowsErr?.message);

  if (rows && rows.length > 0) {
    const escolhido = rows[0] as { id: number; codigo: string };

    // Tenta marcar como em uso (coluna pode não existir — ignora erro)
    await supabase.from('codigos_partida')
      .update({ em_uso: true, sala_id: salaId })
      .eq('id', escolhido.id);

    // Salva o código na sala
    const { error: e2 } = await supabase.from('salas')
      .update({ codigo_partida: escolhido.codigo }).eq('id', salaId);
    if (!e2) return escolhido.codigo;
    console.warn('[atribuirCodigoPartida] update sala falhou:', e2.message);
  }

  // Tentativa 3: código aleatório de emergência (RLS não permite acesso à tabela)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codigo = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  await supabase.from('salas').update({ codigo_partida: codigo }).eq('id', salaId);
  console.error('[atribuirCodigoPartida] EMERGÊNCIA — RLS bloqueia codigos_partida ou tabela vazia para modo:', modo);
  return codigo;
}

/** Libera o código quando a partida encerra. */
export async function liberarCodigoPartida(salaId: number): Promise<void> {
  // Tentativa 1: RPC de liberação
  const { error } = await supabase.rpc('liberar_codigo_partida', { p_sala_id: salaId });
  if (!error) return;
  // Tentativa 2: limpa direto no campo
  await supabase.from('salas').update({ codigo_partida: null }).eq('id', salaId);
}

// ── Reset completo de sala (cancela partida, desvincula todos) ────────────────
export async function resetarSalaCompleta(salaId: number): Promise<void> {
  // Remove todos os jogadores (vinculados e não-vinculados) e votos
  await supabase.from('sala_jogadores').delete().eq('sala_id', salaId);
  await supabase.from('sala_votos').delete().eq('sala_id', salaId);
  // Libera o código se havia um atribuído
  await liberarCodigoPartida(salaId);
  // Deleta o draft se houver
  const { data: sala } = await supabase.from('salas').select('draft_id').eq('id', salaId).single();
  if (sala?.draft_id) {
    await supabase.from('drafts').delete().eq('id', sala.draft_id);
  }
  // Volta para aberta
  await supabase.from('salas').update({
    estado: 'aberta',
    codigo_partida: null,
    draft_id: null,
    updated_at: new Date().toISOString(),
  }).eq('id', salaId);
}

// ── Criar requisição para administrador ──────────────────────────────────────
export interface RequisicaoAdmin {
  sala_id:     number;
  reportado_por: string;
  motivo:      string;
  descricao?:  string;
  jogadores:   { id: string; nome: string; isTimeA: boolean }[];
}

export async function criarRequisicaoAdmin(req: RequisicaoAdmin): Promise<void> {
  await supabase.from('requisicoes_admin').insert({
    sala_id:       req.sala_id,
    reportado_por: req.reportado_por,
    motivo:        req.motivo,
    descricao:     req.descricao ?? null,
    jogadores:     req.jogadores,
    status:        'pendente',
    created_at:    new Date().toISOString(),
  });
}

// ── Desvincula todos os jogadores de uma sala (libera para nova partida) ──────
export async function desvincularJogadores(salaId: number): Promise<void> {
  await supabase.from('sala_jogadores').delete().eq('sala_id', salaId);
}

// ── Desvincula um jogador específico (libera para nova partida imediatamente) ─
export async function desvincularJogador(salaId: number, userId: string): Promise<void> {
  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('user_id', userId);
}

// ── Salvar resultado da partida para auditoria ────────────────────────────────
export async function salvarResultadoPartida(
  salaId: number,
  vencedor: 'time_a' | 'time_b' | 'disputa',
  vencedorNome: string,
  jogadores: { id: string; nome: string; isTimeA: boolean; role: string }[]
): Promise<void> {
  const { error } = await supabase.from('resultados_partidas').insert({
    sala_id:       salaId,
    vencedor,
    vencedor_nome: vencedorNome,
    jogadores,
    created_at:    new Date().toISOString(),
  });
  // Falha silenciosa — tabela pode ainda não existir
  if (error) console.warn('[salvarResultadoPartida]', error.message);
}
