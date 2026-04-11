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
export type OpcaoVotoResultado = 'time_a' | 'time_b' | 'empate';

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
  timeBNome?: string;
  timeBTag?: string;
  timeBLogo?: string;
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
    timeBNome:    row.time_b_nome,
    timeBTag:     row.time_b_tag,
    timeBLogo:    row.time_b_logo,
    maxJogadores: row.max_jogadores,
    temSenha:     row.tem_senha,
    senha:        row.senha,
    mpoints:      row.mpoints ?? 0,
    modo:         row.modo,
    estado:       (row.estado as EstadoSala) ?? 'aberta',
    eloMinimo:    row.elo_minimo,
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
    updates.aguardando_inicio_expires_at = new Date(Date.now() + 120_000).toISOString();
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
  isTimeA: boolean
): Promise<boolean> {
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
    return false;
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
    return false;
  }

  // Remove o usuário de qualquer outra sala em que esteja sem vínculo
  // (impede que uma pessoa fique em duas salas ao mesmo tempo)
  await supabase.from('sala_jogadores').delete()
    .eq('user_id', usuario.id)
    .eq('vinculado', false)
    .neq('sala_id', salaId);

  // Remove vaga anterior nesta sala (DELETE é permitido por RLS)
  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('user_id', usuario.id);

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
  if (error) { console.error('[entrarNaVaga]', error); return false; }
  return true;
}

// ── Sair da vaga ──────────────────────────────────────────────────────────────
export async function sairDaVaga(salaId: number, userId: string): Promise<void> {
  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('user_id', userId).eq('vinculado', false);
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

/** Atribui o próximo código disponível à sala para o modo informado (FIFO). */
export async function atribuirCodigoPartida(salaId: number, modo: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('atribuir_codigo_partida', { p_sala_id: salaId, p_modo: modo });
  if (error) { console.error('[atribuirCodigoPartida]', error); return null; }
  return data as string | null;
}

/** Libera o código quando a partida encerra. */
export async function liberarCodigoPartida(salaId: number): Promise<void> {
  await supabase.rpc('liberar_codigo_partida', { p_sala_id: salaId });
}
