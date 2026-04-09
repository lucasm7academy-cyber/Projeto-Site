// src/components/partidas/salaConfig.ts
// Configurações centralizadas para o sistema de salas

// ============================================
// MODOS DE JOGO
// ============================================

export type ModoJogo = '5v5' | 'aram' | '1v1' | 'torneio';

export const MODOS_JOGO: Record<ModoJogo, {
  nome: string;
  icone: string;
  descricao: string;
  maxJogadores: number;
  jogadoresPorTime: number;
  cor: string;
}> = {
  '5v5': {
    nome: '5v5',
    icone: '🏆',
    descricao: 'Summoners Rift - Clássico',
    maxJogadores: 10,
    jogadoresPorTime: 5,
    cor: '#4ade80'
  },
  'aram': {
    nome: 'ARAM',
    icone: '🌉',
    descricao: 'Bridge of Progress - Caos total',
    maxJogadores: 10,
    jogadoresPorTime: 2,
    cor: '#fbbf24'
  },
  '1v1': {
    nome: '1v1',
    icone: '⚔️',
    descricao: 'Howling Abyss - Duelo',
    maxJogadores: 2,
    jogadoresPorTime: 1,
    cor: '#3b82f6'
  },
  'torneio': {
    nome: 'Torneio',
    icone: '🏅',
    descricao: 'Modo competitivo organizado',
    maxJogadores: 10,
    jogadoresPorTime: 5,
    cor: '#a855f7'
  }
};

// ============================================
// M POINTS — Sistema de apostas entre jogadores
// ============================================

export interface OpcaoMPoints {
  valor: number;
  label: string;
  cor: string;
}

export const OPCOES_MPOINTS: OpcaoMPoints[] = [
  { valor: 0,    label: 'Casual — sem aposta', cor: '#6b7280' },
  { valor: 100,  label: '100 MP',              cor: '#4ade80' },
  { valor: 200,  label: '200 MP',              cor: '#22d3ee' },
  { valor: 500,  label: '500 MP',              cor: '#a78bfa' },
  { valor: 1000, label: '1.000 MP',            cor: '#fbbf24' },
  { valor: 2000, label: '2.000 MP',            cor: '#f87171' },
];

export const getMPointsInfo = (valor: number): OpcaoMPoints =>
  OPCOES_MPOINTS.find(o => o.valor === valor) ?? OPCOES_MPOINTS[0];

// ============================================
// OPÇÕES DE ELO MÍNIMO
// ============================================

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

// ============================================
// ROLES
// ============================================

export type Role = 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP' | 'RES';

export const ROLE_CONFIG: Record<Role, { label: string; img: string; color: string; bg: string }> = {
  TOP: { label: 'TOP', img: '/lanes_brancas/Top_iconB.png',           color: 'text-red-400',    bg: 'bg-red-400/10' },
  JG:  { label: 'JG',  img: '/lanes_brancas/Jungle_iconB.png',        color: 'text-green-400',  bg: 'bg-green-400/10' },
  MID: { label: 'MID', img: '/lanes_brancas/Middle_iconB.png',        color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  ADC: { label: 'ADC', img: '/lanes_brancas/Bottom_iconB.png',        color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  SUP: { label: 'SUP', img: '/lanes_brancas/Support_iconB.png',       color: 'text-amber-500',  bg: 'bg-amber-500/10' },
  RES: { label: 'RES', img: '/lanes_brancas/icon-position-fillB.png', color: 'text-gray-400',   bg: 'bg-gray-400/10' },
};

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

export const getMaxJogadoresPorModo = (modo: ModoJogo): number =>
  MODOS_JOGO[modo]?.maxJogadores || 10;

export const getJogadoresPorTime = (modo: ModoJogo): number =>
  MODOS_JOGO[modo]?.jogadoresPorTime || 5;

export const getModoInfo = (modo: ModoJogo | string) =>
  MODOS_JOGO[modo as ModoJogo] ?? MODOS_JOGO['5v5'];
