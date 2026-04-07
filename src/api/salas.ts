// src/api/salas.ts
// Camada de dados para o sistema de salas/partidas

import { supabase } from '../lib/supabase';

// ── Formatação do código da partida ─────────────────────────────────────────
export const formatarCodigo = (id: number | string) =>
  `#${String(id).padStart(6, '0')}`;

// ── Tipos compartilhados ─────────────────────────────────────────────────────
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
}

export interface Sala {
  id: number;
  codigo: string; // ex: #000067
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
  mpoints: number;  // 0 = casual, >0 = aposta em M Points
  modo: string;
  status: 'aberta' | 'cheia' | 'em_andamento';
  statusInterno?: 'aguardando' | 'confirmacao' | 'pre_partida' | 'em_andamento' | 'votacao' | 'finalizada' | 'disputa';
  eloMinimo?: string;
  createdAt: Date;
  // Campos de estado de partida (usados localmente em SalaInterna)
  tempoRestantePartida?: number;
  partidaIniciadaEm?: Date;
  vencedor?: 'A' | 'B' | null;
  votosCapitaes?: { timeA: 'A' | 'B' | null; timeB: 'A' | 'B' | null };
  disputaId?: string;
}

// ── Mapeamento DB → Sala ─────────────────────────────────────────────────────
function mapSala(row: any, jogadoresRows: any[]): Sala {
  return {
    id: row.id,
    codigo: formatarCodigo(row.id),
    nome: row.nome,
    descricao: row.descricao || '',
    criadorId: row.criador_id,
    criadorNome: row.criador_nome,
    timeANome: row.time_a_nome,
    timeATag: row.time_a_tag,
    timeALogo: row.time_a_logo,
    timeBNome: row.time_b_nome,
    timeBTag: row.time_b_tag,
    timeBLogo: row.time_b_logo,
    jogadores: jogadoresRows.map(j => ({
      id: j.user_id,
      nome: j.nome,
      tag: j.tag || '',
      elo: j.elo || '',
      role: j.role || 'RES',
      avatar: j.avatar || undefined,
      isLider: j.is_lider,
      isTimeA: j.is_time_a,
      confirmado: j.confirmado,
    })),
    maxJogadores: row.max_jogadores,
    temSenha: row.tem_senha,
    senha: row.senha,
    mpoints: row.mpoints ?? 0,
    modo: row.modo,
    status: row.status,
    statusInterno: row.status_interno,
    eloMinimo: row.elo_minimo,
    createdAt: new Date(row.created_at),
  };
}

// ── Listar salas abertas ─────────────────────────────────────────────────────
export async function carregarSalas(): Promise<Sala[]> {
  const { data, error } = await supabase
    .from('salas')
    .select('*, sala_jogadores(*)')
    .in('status', ['aberta', 'cheia'])
    .order('created_at', { ascending: false });

  if (error || !data) { console.error('[carregarSalas]', error); return []; }

  return data.map(row => mapSala(row, row.sala_jogadores ?? []));
}

// ── Criar sala ───────────────────────────────────────────────────────────────
export async function criarSala(
  dados: {
    nome: string;
    descricao: string;
    modo: string;
    mpoints: number;
    temSenha: boolean;
    senha?: string;
    maxJogadores: number;
    eloMinimo?: string;
    timeANome?: string;
    timeATag?: string;
    timeALogo?: string;
  },
  usuario: { id: string; nome: string; tag?: string; elo: string; role: string }
): Promise<Sala | null> {
  const { data: sala, error } = await supabase
    .from('salas')
    .insert({
      nome: dados.nome,
      descricao: dados.descricao,
      criador_id: usuario.id,
      criador_nome: usuario.nome,
      modo: dados.modo,
      mpoints: dados.mpoints,
      tem_senha: dados.temSenha,
      senha: dados.temSenha ? dados.senha : null,
      max_jogadores: dados.maxJogadores,
      elo_minimo: dados.eloMinimo || null,
      time_a_nome: dados.timeANome || null,
      time_a_tag: dados.timeATag || null,
      time_a_logo: dados.timeALogo || null,
      status: 'aberta',
    })
    .select()
    .single();

  if (error || !sala) { console.error('[criarSala]', error); return null; }

  // Criador entra só como observador — não adiciona como jogador ainda
  return mapSala(sala, []);
}

// ── Entrar em uma vaga específica ────────────────────────────────────────────
// Usa DELETE + INSERT para evitar necessidade de UPDATE policy no RLS
export async function entrarNaVaga(
  salaId: number,
  usuario: { id: string; nome: string; tag?: string; elo: string; avatar?: string },
  role: string,
  isTimeA: boolean
): Promise<boolean> {
  // 1. Verifica se a vaga já está ocupada por outro
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

  // 2. Remove entrada anterior do usuário (se existir) — DELETE é permitido por RLS
  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('user_id', usuario.id);

  // 3. Conta quantos jogadores há para definir se será líder
  const { count } = await supabase.from('sala_jogadores')
    .select('*', { count: 'exact', head: true }).eq('sala_id', salaId);

  // 4. Insere na nova vaga
  const row: any = {
    sala_id: salaId,
    user_id: usuario.id,
    nome: usuario.nome,
    tag: usuario.tag || '',
    elo: usuario.elo,
    role,
    is_lider: (count ?? 0) === 0,
    is_time_a: isTimeA,
    confirmado: false,
  };
  // avatar só é inserido se a coluna existir no banco
  if (usuario.avatar) row.avatar = usuario.avatar;

  const { error } = await supabase.from('sala_jogadores').insert(row);
  if (error) { console.error('[entrarNaVaga]', error); return false; }
  return true;
}

// ── Sair de uma vaga (volta a ser observador) ────────────────────────────────
export async function sairDaVaga(salaId: number, userId: string): Promise<void> {
  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('user_id', userId);
}

// ── Confirmar/desconfirmar presença ──────────────────────────────────────────
// Usa DELETE + INSERT com confirmado=true/false para evitar UPDATE policy
export async function confirmarPresencaDB(salaId: number, userId: string, confirmado: boolean): Promise<void> {
  // Busca dados atuais do jogador
  const { data: atual } = await supabase.from('sala_jogadores')
    .select('*').eq('sala_id', salaId).eq('user_id', userId).maybeSingle();
  if (!atual) return;

  // Delete + reinsere com novo valor de confirmado
  await supabase.from('sala_jogadores').delete()
    .eq('sala_id', salaId).eq('user_id', userId);

  await supabase.from('sala_jogadores').insert({
    ...atual,
    id: undefined, // deixa o serial gerar novo id
    confirmado,
  });
}

// ── Buscar sala completa (para realtime reload) ───────────────────────────────
export async function buscarSalaCompleta(salaId: number): Promise<Sala | null> {
  const { data, error } = await supabase
    .from('salas')
    .select('*, sala_jogadores(*)')
    .eq('id', salaId)
    .single();
  if (error || !data) return null;
  return mapSala(data, data.sala_jogadores ?? []);
}

// ── Deletar sala ─────────────────────────────────────────────────────────────
export async function deletarSala(salaId: number): Promise<void> {
  await supabase.from('salas').delete().eq('id', salaId);
}

// ── Atualizar status ─────────────────────────────────────────────────────────
export async function atualizarStatus(
  salaId: number,
  status: string,
  statusInterno?: string
): Promise<void> {
  await supabase.from('salas').update({
    status,
    ...(statusInterno ? { status_interno: statusInterno } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', salaId);
}

// ── Buscar sala por código (#000067) ─────────────────────────────────────────
export async function buscarSalaPorCodigo(codigo: string): Promise<Sala | null> {
  const num = parseInt(codigo.replace('#', ''), 10);
  if (isNaN(num)) return null;

  const { data, error } = await supabase
    .from('salas')
    .select('*, sala_jogadores(*)')
    .eq('id', num)
    .single();

  if (error || !data) return null;
  return mapSala(data, data.sala_jogadores ?? []);
}
