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
  timeAColor?: string;
  timeAId?: string | null;
  timeBNome?: string;
  timeBTag?: string;
  timeBColor?: string;
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
  finalizacaoExpiresAt?: Date;
  vencedor?: 'A' | 'B' | 'empate' | 'cancelada' | null;
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
    timeAColor:   row.time_a_color,
    timeAId:      row.time_a_id ?? null,
    timeBNome:    row.time_b_nome,
    timeBTag:     row.time_b_tag,
    timeBLogo:    row.time_b_logo,
    timeBColor:   row.time_b_color,
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
    finalizacaoExpiresAt:    row.finalizacao_expires_at ? new Date(row.finalizacao_expires_at) : undefined,
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

// ── Buscar salas finalizadas (histórico) ──────────────────────────────────────

export async function carregarSalasFinalizadas(): Promise<Sala[]> {
  const { data, error } = await supabase
    .from('salas')
    .select('*, sala_jogadores(*)')
    .eq('estado', 'encerrada')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error || !data) { console.error('[carregarSalasFinalizadas]', error); return []; }
  return data.map(row => mapSala(row, row.sala_jogadores ?? []));
}

// ── Buscar sala completa por ID ───────────────────────────────────────────────
export async function buscarSalaCompleta(salaId: number): Promise<Sala | null> {
  const { data, error } = await supabase
    .from('salas')
    .select('*, sala_jogadores(*)')
    .eq('id', salaId)
    .single();
  if (error) {
    console.error('[buscarSalaCompleta] Erro ao buscar sala:', error);
    return null;
  }
  if (!data) {
    console.log('[buscarSalaCompleta] Nenhum dado encontrado para sala:', salaId);
    return null;
  }
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
  if (novoEstado === 'finalizacao') {
    updates.finalizacao_expires_at = new Date(Date.now() + 180_000).toISOString(); // 3 minutos
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
  try {
    // 🛡️ SEGURANÇA: Limpar vinculações a salas encerradas antes de validar
    // (evita erro "Você está em outra sala" se partida anterior foi encerrada)
    // Roda em background, não bloqueia
    limparVinculacaosSalasEncerradas(usuario.id).catch(() => {});

    // ✅ OTIMIZADO: Chamar RPC que faz TUDO em 1 transação atômica (12-15 queries → 1)
    const { data, error } = await supabase.rpc('entrar_na_vaga', {
      p_sala_id: salaId,
      p_user_id: usuario.id,
      p_nome: usuario.nome,
      p_tag: usuario.tag || '',
      p_elo: usuario.elo,
      p_avatar: usuario.avatar || null,
      p_role: role,
      p_is_time_a: isTimeA,
      p_modo: modo || '5v5',
    });

    if (error) {
      console.error('[entrarNaVaga] Erro RPC:', error);
      return { sucesso: false, erro: error.message || 'Erro ao entrar na vaga' };
    }

    if (!data || data.sucesso === false) {
      console.warn('[entrarNaVaga] RPC retornou erro:', data?.erro);
      return { sucesso: false, erro: data?.erro || 'Erro desconhecido' };
    }

    console.log('[entrarNaVaga] ✅ Jogador entrou com sucesso (via RPC)');
    return { sucesso: true };
  } catch (err: any) {
    console.error('[entrarNaVaga] Exception:', err?.message);
    return { sucesso: false, erro: 'Erro ao entrar na vaga' };
  }
}

// ── Sair da vaga ──────────────────────────────────────────────────────────────
// ✅ OTIMIZADO: RPC atômica que faz 4-6 queries em 1 transação
export async function sairDaVaga(salaId: number, userId: string): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('sair_da_vaga', {
      p_sala_id: salaId,
      p_user_id: userId,
    });

    if (error) {
      console.error('[sairDaVaga] Erro RPC:', error);
      return;
    }

    if (data?.bloqueado) {
      console.log(`[sairDaVaga] Jogador ${userId} está em partida — bloqueado`);
      return;
    }

    if (!data?.sucesso) {
      console.warn('[sairDaVaga] RPC retornou erro:', data?.erro);
      return;
    }

    console.log('[sairDaVaga] ✅ Jogador saiu com sucesso (via RPC)');
  } catch (err: any) {
    console.error('[sairDaVaga] Exception:', err?.message);
  }
}

// ── Confirmar/desconfirmar presença ──────────────────────────────────────────
export async function confirmarPresencaDB(
  salaId: number,
  userId: string,
  confirmado: boolean
): Promise<void> {
  const { error } = await supabase.from('sala_jogadores').update({ confirmado })
    .eq('sala_id', salaId).eq('user_id', userId);
  if (error) console.error(`[confirmarPresencaDB] Erro:`, error);
}

// ── Resetar vagas (reset total — remove todos sem vínculo) ───────────────────
export async function resetarVagas(salaId: number): Promise<void> {
  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('vinculado', false);
  await supabase.from('sala_votos').delete().eq('sala_id', salaId);
}

// ── Reset seletivo de confirmação ─────────────────────────────────────────────
// ✅ OTIMIZADO: RPC elimina fallback de 20+ queries sequenciais
// Comportamento:
//   • Quem NÃO confirmou  → deletado
//   • Quem confirmou      → reseta confirmado para false
export async function resetarConfirmacoes(salaId: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('resetar_confirmacoes', { p_sala_id: salaId });
    if (error) {
      console.error('[resetarConfirmacoes] Erro RPC:', error);
    } else {
      console.log('[resetarConfirmacoes] ✅ Confirmações resetadas (via RPC)');
    }
  } catch (err: any) {
    console.error('[resetarConfirmacoes] Exception:', err?.message);
  }
}

// ── Vincular jogadores (confirmacao → travada) ────────────────────────────────
// ✅ OTIMIZADO: RPC com SECURITY DEFINER elimina dependência de policy
export async function vincularJogadores(salaId: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('vincular_jogadores', { p_sala_id: salaId });
    if (error) {
      console.error('[vincularJogadores] Erro RPC:', error);
    } else {
      console.log('[vincularJogadores] ✅ Jogadores vinculados (via RPC)');
    }
  } catch (err: any) {
    console.error('[vincularJogadores] Exception:', err?.message);
  }
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
  // 1. Atualizar estado da sala para 'encerrada'
  await supabase.from('salas').update({
    estado:    'encerrada',
    vencedor:  vencedor ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', salaId);

  // 2. ✅ DESVINCULAÇÃO: Deletar todos os jogadores para liberar para próximas salas
  await deletarJogadoresDaSala(salaId);
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
  // Ignora salas encerradas ou em finalizacao — jogador pode estar travado/removido por timeout
  if (!sala || sala.estado === 'encerrada' || sala.estado === 'finalizacao') return null;
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

/** Atribui código fixo à sala (rodízio dos códigos disponíveis) */
export async function atribuirCodigoPartida(salaId: number, modo: string): Promise<string | null> {
  try {
    // 1. Busca todos os códigos do modo
    const { data: todosCodigosData, error: allErr } = await supabase
      .from('codigos_partida')
      .select('id, codigo')
      .eq('modo', modo)
      .order('ultima_vez_usado', { ascending: true });

    if (allErr || !todosCodigosData || todosCodigosData.length === 0) {
      console.error('[atribuirCodigoPartida] Nenhum código disponível para modo:', modo);
      return null;
    }

    // 2. Pega o primeiro disponível (menos usado recentemente)
    const codigoSelecionado = todosCodigosData[0];

    // 3. Marca como em_uso e associa à sala
    const agora = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('codigos_partida')
      .update({
        em_uso: true,
        sala_id: salaId,
        ultima_vez_usado: agora
      })
      .eq('id', codigoSelecionado.id);

    if (updateErr) throw updateErr;

    // 4. Salva o código na sala
    const { error: salaErr } = await supabase.from('salas')
      .update({ codigo_partida: codigoSelecionado.codigo })
      .eq('id', salaId);

    if (salaErr) throw salaErr;

    console.log('[atribuirCodigoPartida] ✅ Código atribuído:', codigoSelecionado.codigo, 'para modo:', modo);
    return codigoSelecionado.codigo;
  } catch (err: any) {
    console.error('[atribuirCodigoPartida] Erro:', err?.message);
    return null;
  }
}

/** Libera o código quando a partida encerra (marca como disponível novamente) */
export async function liberarCodigoPartida(salaId: number): Promise<void> {
  try {
    // Busca o código da sala
    const { data: sala } = await supabase
      .from('salas')
      .select('codigo_partida')
      .eq('id', salaId)
      .maybeSingle();

    if (!sala?.codigo_partida) {
      console.log('[liberarCodigoPartida] Sala sem código atribuído');
      return;
    }

    // Marca o código como não em uso
    const { error } = await supabase
      .from('codigos_partida')
      .update({ em_uso: false, sala_id: null })
      .eq('codigo', sala.codigo_partida);

    if (error) throw error;

    console.log('[liberarCodigoPartida] ✅ Código liberado:', sala.codigo_partida);
  } catch (err: any) {
    console.error('[liberarCodigoPartida] Erro:', err?.message);
  }
}

// ── Reset completo de sala (cancela partida, desvincula todos) ────────────────
export async function resetarSalaCompleta(salaId: number): Promise<void> {
  // Remove todos os jogadores (vinculados e não-vinculados) e votos
  await supabase.from('sala_jogadores').delete().eq('sala_id', salaId);
  await supabase.from('sala_votos').delete().eq('sala_id', salaId);
  // Libera o código se havia um atribuído
  await liberarCodigoPartida(salaId);
  // 🔴 RESET COMPLETO: Deletar QUALQUER draft dessa sala (não confiar em draft_id que pode ser stale)
  await supabase.from('drafts').delete().eq('sala_id', salaId);
  // Volta para aberta completamente vazia e limpa
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

// ── DESVINCULA todos os jogadores (set vinculado=false) ──────────────────────
// Usado quando voltando de travada para preenchendo (keeps players in room)
export async function atualizarVinculacao(salaId: number, vinculado: boolean): Promise<void> {
  await supabase.from('sala_jogadores')
    .update({ vinculado })
    .eq('sala_id', salaId);
}

// ── DELETA todos os jogadores da sala (reset completo) ──────────────────────
// Usado ao encerrar partida ou fazer reset total
export async function deletarJogadoresDaSala(salaId: number): Promise<void> {
  await supabase.from('sala_jogadores').delete().eq('sala_id', salaId);
}

// ── DELETA um jogador específico da sala ──────────────────────────────────────
// Usado por timeout durante draft ou remoção individual
export async function desvincularJogador(salaId: number, userId: string): Promise<void> {
  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('user_id', userId);
}

// ── Salvar resultado da partida para auditoria ────────────────────────────────
export async function salvarResultadoPartida(
  salaId: number,
  vencedor: 'time_a' | 'time_b' | 'disputa' | 'cancelada',
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

// ── Resolver partida travada (admin/proprietário) ───────────────────────────
export async function resolverPartidaTravada(
  salaId: number,
  vencedor: 'time_a' | 'time_b' | 'cancelada',
  modo: string,
  jogadores: { id: string; nome: string; isTimeA: boolean; role: string }[]
): Promise<{ sucesso: boolean; erro?: string }> {
  try {
    const vencedorNome = vencedor === 'cancelada' ? 'Cancelado'
      : vencedor === 'time_a' ? 'Time A' : 'Time B';

    // 1. Salvar resultado
    await salvarResultadoPartida(salaId, vencedor, vencedorNome, jogadores);

    // 2. Atualizar pontos (se não foi cancelado)
    if (vencedor !== 'cancelada') {
      const { atualizarPontosPartida } = await import('./player');
      await atualizarPontosPartida({
        salaId,
        modo,
        vencedor,
        jogadores: jogadores.map(j => ({
          userId: j.id,
          isTimeA: j.isTimeA,
          nome: j.nome,
        })),
      }).catch(e => {
        console.warn('[resolverPartidaTravada] erro ao atualizar pontos:', e);
      });
    }

    // 3. Encerrar sala
    await encerrarSala(salaId, vencedor === 'cancelada' ? undefined : (vencedor === 'time_a' ? 'A' : 'B'));

    // 4. Liberar código da partida
    await liberarCodigoPartida(salaId);

    return { sucesso: true };
  } catch (error: any) {
    console.error('[resolverPartidaTravada]', error);
    return { sucesso: false, erro: error?.message || 'Erro ao resolver partida' };
  }
}

// ── Verificação de integridade pós-encerramento (double-check performance) ────
export interface VerificacaoIntegridade {
  valido: boolean;
  avisos: string[];
  acoesTomadas: string[];
}

/**
 * Valida que uma partida encerrada foi completamente finalizada.
 * - Desvincula jogadores que ainda estão ligados
 * - Verifica se resultado foi registrado
 * - Não faz queries pesadas; roda em background
 */
export async function verificarIntegraldadePartidaEncerrada(
  salaId: number
): Promise<VerificacaoIntegridade> {
  const avisos: string[] = [];
  const acoesTomadas: string[] = [];

  try {
    // 1. Buscar sala + jogadores vinculados (índice eficiente)
    const { data: sala, error: errSala } = await supabase
      .from('salas')
      .select('id, estado')
      .eq('id', salaId)
      .single();

    if (errSala || !sala) {
      return { valido: false, avisos: ['Sala não encontrada'], acoesTomadas: [] };
    }

    // Só fazer verificação se sala realmente está encerrada
    if (sala.estado !== 'encerrada') {
      return { valido: true, avisos: [], acoesTomadas: [] };
    }

    // 2. Buscar jogadores ainda vinculados (query leve com índice sala_id + vinculado)
    const { data: jogadoresVinculados } = await supabase
      .from('sala_jogadores')
      .select('user_id, vinculado')
      .eq('sala_id', salaId)
      .eq('vinculado', true);

    if ((jogadoresVinculados?.length ?? 0) > 0) {
      avisos.push(`⚠️ ${jogadoresVinculados?.length} jogadores ainda vinculados`);

      // ✅ Batch update em vez de loop (1 query em vez de N)
      await supabase
        .from('sala_jogadores')
        .update({ vinculado: false })
        .eq('sala_id', salaId)
        .eq('vinculado', true);

      (jogadoresVinculados ?? []).forEach(j => {
        acoesTomadas.push(`✅ Desvinculado: ${j.user_id}`);
      });
    }

    // 3. Verificar se resultado foi registrado (query leve: só count)
    const { count: temResultado } = await supabase
      .from('resultados_partidas')
      .select('*', { count: 'exact', head: true })
      .eq('sala_id', salaId);

    if ((temResultado ?? 0) === 0) {
      avisos.push('⚠️ Resultado da partida não foi registrado');
    }

    console.log(`[IntegridadeSala] ${salaId}: ${avisos.length > 0 ? 'PROBLEMAS ENCONTRADOS' : 'OK'}`);
    if (acoesTomadas.length > 0) {
      console.log(`[IntegridadeSala] Ações de recuperação: ${acoesTomadas.join(' | ')}`);
    }

    return {
      valido: avisos.length === 0,
      avisos,
      acoesTomadas,
    };
  } catch (err: any) {
    console.error('[verificarIntegraldadePartidaEncerrada]', err?.message);
    return {
      valido: false,
      avisos: [`Erro na verificação: ${err?.message}`],
      acoesTomadas: [],
    };
  }
}

/**
 * Limpeza preventiva: se jogador tem vinculação a sala encerrada, remove antes
 * de tentar entrar em nova sala. Evita o erro "Você está em outra sala".
 * (Roda em background, não bloqueia entrarNaVaga)
 */
export async function limparVinculacaosSalasEncerradas(userId: string): Promise<void> {
  try {
    // Buscar vinculações ativas
    const { data: vinculacoes } = await supabase
      .from('sala_jogadores')
      .select('sala_id')
      .eq('user_id', userId)
      .eq('vinculado', true);

    if (!vinculacoes || vinculacoes.length === 0) return;

    // Verificar quais salas estão encerradas
    const salaIds = vinculacoes.map(v => v.sala_id);
    const { data: salasEncerradas } = await supabase
      .from('salas')
      .select('id')
      .in('id', salaIds)
      .eq('estado', 'encerrada');

    if (!salasEncerradas || salasEncerradas.length === 0) return;

    // ✅ Batch update com .in() em vez de loop (1 query em vez de N)
    await supabase
      .from('sala_jogadores')
      .update({ vinculado: false })
      .in('sala_id', salaIds)
      .eq('user_id', userId);

    console.log(`[LimpezaVinculacao] Desvinculado ${userId} de ${salasEncerradas.length} salas encerradas`);
  } catch (err: any) {
    console.warn('[limparVinculacaosSalasEncerradas]', err?.message);
    // Falha silenciosa — não bloqueia fluxo principal
  }
}
