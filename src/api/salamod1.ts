// src/api/salamod1.ts
import { supabase } from '../lib/supabase';

export async function buscarsalas(salaId: number) {
    const { data, error } = await supabase
        .from('salas')
        .select('*')
        .eq('id', salaId)
        .single();

    if (error) {
        console.error('Erro ao buscar sala:', error);
        return null;
    }

    return data;
}

export async function buscarJogadores(salaId: number) {
    const { data, error } = await supabase
        .from('sala_jogadores')
        .select('*')
        .eq('sala_id', salaId);

    if (error) {
        console.error('Erro ao buscar jogadores:', error);
        return [];
    }

    return data;
}

export async function entrarNaVaga(
    salaId: number,
    userId: string,
    nome: string,
    tag: string,
    elo: string,
    role: string,
    isTimeA: boolean
) {
    const { error } = await supabase
        .from('sala_jogadores')
        .insert({
            sala_id: salaId,
            user_id: userId,
            nome: nome,
            tag: tag,
            elo: elo,
            role: role,
            is_time_a: isTimeA,
            confirmado: false,
            vinculado: false,
        });

    if (error) {
        console.error('Erro ao entrar na vaga:', error);
        return false;
    }

    return true;
}

export async function confirmarPresenca(salaId: number, userId: string) {
    const { error } = await supabase
        .from('sala_jogadores')
        .update({ confirmado: true })
        .eq('sala_id', salaId)
        .eq('user_id', userId);

    if (error) {
        console.error('Erro ao confirmar presença:', error);
        return false;
    }

    return true;
}

export async function sairDaVaga(salaId: number, userId: string) {
    const { error } = await supabase
        .from('sala_jogadores')
        .delete()
        .eq('sala_id', salaId)
        .eq('user_id', userId);

    if (error) {
        console.error('Erro ao sair da vaga:', error);
        return false;
    }

    return true;
}

// ── VOTAÇÃO ──────────────────────────────────────────

export async function registrarVoto(
    salaId: number,
    userId: string,
    opcao: 'time_a' | 'time_b',
     isTimeA: boolean,
) {
    const { error } = await supabase
        .from('sala_votos')
        .upsert(
            {
                sala_id: salaId,
                user_id: userId,
                fase: 'finalizacao',
                opcao: opcao,
                 is_time_a: isTimeA,
            },
            {
                onConflict: 'sala_id,user_id,fase',
            }
        );

    if (error) {
        console.error('Erro ao registrar voto:', error);
        return false;
    }
    return true;
}

export async function buscarVotos(salaId: number) {
    const { data, error } = await supabase
        .from('sala_votos')
        .select('*')
        .eq('sala_id', salaId)
        .eq('fase', 'finalizacao');

    if (error) {
        console.error('Erro ao buscar votos:', error);
        return [];
    }
    return data || [];
}

export async function encerrarSala(salaId: number, vencedor: 'A' | 'B' | 'empate') {
    const { error } = await supabase
        .from('salas')
        .update({
            estado: 'encerrada',
            vencedor: vencedor,
            updated_at: new Date().toISOString(),
        })
        .eq('id', salaId);

    if (error) {
        console.error('Erro ao encerrar sala:', error);
        return false;
    }
    return true;
}

// ── CRIAR SALA ──────────────────────────────────────
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
) {
    const { data, error } = await supabase
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
            estado: 'aberta',
        })
        .select('*')
        .single();

    if (error || !data) {
        console.error('[criarSala]', error);
        return null;
    }

    return {
        ...data,
        codigo: `#${String(data.id).padStart(6, '0')}`,
        jogadores: [],
        criadorId: data.criador_id,
        criadorNome: data.criador_nome,
        timeANome: data.time_a_nome,
        timeBNome: data.time_b_nome,
        temSenha: data.tem_senha,
        mpoints: data.mpoints,
        modo: data.modo,
        estado: data.estado,
        nome: data.nome,
        descricao: data.descricao || '',
        maxJogadores: data.max_jogadores,
        eloMinimo: data.elo_minimo,
        vencedor: data.vencedor,
        createdAt: new Date(data.created_at),
    };
}

// ============================================================
// TIPOS
// ============================================================

export interface Sala {
  id: number;
  modo: ModoJogo;
  nome: string;
  descricao?: string;
  codigo?: string;
  temSenha: boolean;
  senha?: string;
  estado: string;
  vencedor?: string | null;
  criadorId: string;
  criadorNome: string;
  maxJogadores: number;
  eloMinimo?: string;
  mpoints: number;
  jogadores?: any[];
  timeANome?: string;
  timeBNome?: string;
}

// ============================================================
// CONFIGURAÇÕES CENTRALIZADAS
// ============================================================

// MODOS DE JOGO
export type ModoJogo = '5v5' | 'aram' | '1v1' | 'time_vs_time';

export const MODOS_JOGO: Record<ModoJogo, {
  nome: string;
  icone: string;
  descricao: string;
  maxJogadores: number;
  bgImage?: string
  jogadoresPorTime: number;
  tipo: 'individual' | 'time';
  cor: string;
}> = {
  '5v5': {
    nome: '5v5 Clássico',
    icone: '🏆',
    descricao: 'Summoners Rift - Competitivo',
    maxJogadores: 10,
    jogadoresPorTime: 5,
    tipo: 'individual',
    cor: '#fbbf24',
    bgImage: '/images/fundoCard5v5.png',
  },
  'aram': {
    nome: 'ARAM',
    icone: '🌉',
    descricao: 'Howling Abyss - Caos total',
    maxJogadores: 10,
    jogadoresPorTime: 5,
    tipo: 'individual',
    cor: '#3b82f6',
    bgImage: '/images/fundoCardAram.png',
  },
  '1v1': {
    nome: '1v1',
    icone: '⚔️',
    descricao: 'Howling Abyss - Duelo individual',
    maxJogadores: 2,
    jogadoresPorTime: 1,
    tipo: 'individual',
    cor: '#ef4444',
    bgImage: '/images/fundoCard1v1.png',
  },
  'time_vs_time': {
    nome: 'Time vs Time',
    icone: '🏅',
    descricao: 'Desafio entre times - Vale ranking do clã',
    maxJogadores: 10,
    jogadoresPorTime: 5,
    tipo: 'time',
    cor: '#a855f7',
    bgImage: '/images/fundoCardTime.png',
  }
};

// M COINS — Sistema de apostas
export interface OpcaoMPoints {
  valor: number;
  label: string;
  cor: string;
}

export const OPCOES_MPOINTS: OpcaoMPoints[] = [
  { valor: 0,    label: 'Casual — sem aposta', cor: '#6b7280' },
  { valor: 100,  label: '100 MC',              cor: '#4ade80' },
  { valor: 200,  label: '200 MC',              cor: '#22d3ee' },
  { valor: 500,  label: '500 MC',              cor: '#a78bfa' },
  { valor: 1000, label: '1.000 MC',            cor: '#fbbf24' },
  { valor: 2000, label: '2.000 MC',            cor: '#f87171' },
];

export const getMPointsInfo = (valor: number): OpcaoMPoints =>
  OPCOES_MPOINTS.find(o => o.valor === valor) ?? OPCOES_MPOINTS[0];

// OPÇÕES DE ELO MÍNIMO
export const OPCOES_ELO = [
  { valor: '', label: 'Sem restrição' },
  { valor: 'Ferro', label: 'Ferro+' },
  { valor: 'Bronze', label: 'Bronze+' },
  { valor: 'Prata', label: 'Prata+' },
  { valor: 'Ouro', label: 'Ouro+' },
  { valor: 'Platina', label: 'Platina+' },
  { valor: 'Esmeralda', label: 'Esmeralda+' },
  { valor: 'Diamante', label: 'Diamante+' },
  { valor: 'Mestre', label: 'Mestre+' },
  { valor: 'Grão-Mestre', label: 'Grão-Mestre+' },
  { valor: 'Desafiante', label: 'Desafiante+' }
];

// ROLES
export type Role = 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP' | 'RES';

export const ROLE_CONFIG: Record<Role, { label: string; img: string; color: string; bg: string }> = {
  TOP: { label: 'TOP', img: '/lanes_brancas/Top_iconB.png',           color: 'text-red-400',    bg: 'bg-red-400/10' },
  JG:  { label: 'JG',  img: '/lanes_brancas/Jungle_iconB.png',        color: 'text-green-400',  bg: 'bg-green-400/10' },
  MID: { label: 'MID', img: '/lanes_brancas/Middle_iconB.png',        color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  ADC: { label: 'ADC', img: '/lanes_brancas/Bottom_iconB.png',        color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  SUP: { label: 'SUP', img: '/lanes_brancas/Support_iconB.png',       color: 'text-amber-500',  bg: 'bg-amber-500/10' },
  RES: { label: 'RES', img: '/lanes_brancas/icon-position-fillB.png', color: 'text-gray-400',   bg: 'bg-gray-400/10' },
};

// FUNÇÕES UTILITÁRIAS
export const getMaxJogadoresPorModo = (modo: ModoJogo): number =>
  MODOS_JOGO[modo]?.maxJogadores || 10;

export const getJogadoresPorTime = (modo: ModoJogo): number =>
  MODOS_JOGO[modo]?.jogadoresPorTime || 5;

export const getModoInfo = (modo: ModoJogo | string) =>
  MODOS_JOGO[modo as ModoJogo] ?? MODOS_JOGO['5v5'];