// ── Tipos compartilhados de equipe ─────────────────────────────────────────

export type Role = 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP' | 'RES';
export type UserRole = 'leader' | 'member' | 'visitor';

export interface Player {
  name: string;
  role: Role;
  elo: string;
  balance: number;
  isLeader?: boolean;
  userId?: string;
}

export interface Team {
  id: number | string;
  name: string;
  tag: string;
  logoUrl?: string;
  gradientFrom: string;
  gradientTo: string;
  players: Player[];
  pdl: number;
  winrate: number;
  ranking: number;
  wins: number;
  gamesPlayed: number;
  userRole: UserRole;
}

// ── Configuração visual de rotas ───────────────────────────────────────────

export const ROLE_CONFIG: Record<Role, { label: string; img: string; color: string; bg: string }> = {
  TOP: { label: 'TOP', img: '/lanes_brancas/Top_iconB.png',               color: 'text-red-400',    bg: 'bg-red-400/10' },
  JG:  { label: 'JG',  img: '/lanes_brancas/Jungle_iconB.png',            color: 'text-green-400',  bg: 'bg-green-400/10' },
  MID: { label: 'MID', img: '/lanes_brancas/Middle_iconB.png',            color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  ADC: { label: 'ADC', img: '/lanes_brancas/Bottom_iconB.png',            color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  SUP: { label: 'SUP', img: '/lanes_brancas/Support_iconB.png',           color: 'text-amber-500',  bg: 'bg-amber-500/10' },
  RES: { label: 'RES', img: '/lanes_brancas/icon-position-fillB.png',     color: 'text-gray-400',   bg: 'bg-gray-400/10' },
};

// ── Temas de cor (presets neon) ────────────────────────────────────────────

export const COLOR_THEMES = [
  { from: '#FFB700', to: '#FF6600', label: 'M7 Gold' },
  { from: '#0044FF', to: '#00D4FF', label: 'Neon Blue' },
  { from: '#FF3300', to: '#FF9900', label: 'Fire' },
  { from: '#00FF88', to: '#00C3FF', label: 'Toxic' },
  { from: '#7B00FF', to: '#00AAFF', label: 'Storm' },
  { from: '#FFB700', to: '#FF6600', label: 'Gold' },
  { from: '#FF006E', to: '#FF9966', label: 'Rose' },
  { from: '#00FF41', to: '#008F11', label: 'Matrix' },
  { from: '#F953C6', to: '#B91D73', label: 'Candy' },
  { from: '#1CB5E0', to: '#000851', label: 'Ocean' },
  { from: '#FF416C', to: '#FF4B2B', label: 'Infrared' },
  { from: '#11998e', to: '#38ef7d', label: 'Mint' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

export const ROLE_ORDER: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES'];

export const ELO_COLORS: Record<string, string> = {
  Ferro: 'text-gray-500', Bronze: 'text-amber-600', Prata: 'text-gray-300',
  Ouro: 'text-yellow-400', Platina: 'text-cyan-400', Esmeralda: 'text-emerald-400',
  Diamante: 'text-blue-400', Mestre: 'text-amber-500',
  'Grão-Mestre': 'text-red-400', Desafiante: 'text-yellow-300',
};

export const getEloColor = (elo: string) => ELO_COLORS[elo.split(' ')[0]] ?? 'text-white/60';
export const formatBRL   = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const teamPower   = (players: Player[]) => players.reduce((s, p) => s + p.balance, 0);
export const sortPlayers = (players: Player[]) =>
  [...players].sort((a, b) => {
    const oa = ROLE_ORDER.indexOf(a.role);
    const ob = ROLE_ORDER.indexOf(b.role);
    return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
  });
