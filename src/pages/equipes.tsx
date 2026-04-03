/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Crown, TrendingUp, Trophy, ChevronRight, X,
  UserPlus, Settings, LogOut, Send, Flame, Plus,
  Wallet, Search, UserX, Check, Paintbrush, Upload, RefreshCw,
} from 'lucide-react';
import { useSound } from '../hooks/useSound';
import { supabase } from '../lib/supabase';
import {
  TeamCardModal,
  type TeamCardInfo,
  type TeamPlayer,
  type UserRole,
} from '../components/teams/TeamCardModal';

// ── Tipos (aliados aos tipos compartilhados) ─────────────────────────────────
type Role = 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP' | 'RES';
type Player = TeamPlayer;
type Team   = TeamCardInfo;

// ── Configuração visual de rotas ───────────────────────────────────────────
const ROLE_CONFIG: Record<Role, { label: string; img: string; color: string; bg: string }> = {
  TOP: { label: 'TOP', img: '/lanes_brancas/Top_iconB.png',           color: 'text-red-400',    bg: 'bg-red-400/10' },
  JG:  { label: 'JG',  img: '/lanes_brancas/Jungle_iconB.png',        color: 'text-green-400',  bg: 'bg-green-400/10' },
  MID: { label: 'MID', img: '/lanes_brancas/Middle_iconB.png',        color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  ADC: { label: 'ADC', img: '/lanes_brancas/Bottom_iconB.png',        color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  SUP: { label: 'SUP', img: '/lanes_brancas/Support_iconB.png',       color: 'text-amber-500',  bg: 'bg-amber-500/10' },
  RES: { label: 'RES', img: '/lanes_brancas/icon-position-fillB.png', color: 'text-gray-400',   bg: 'bg-gray-400/10' },
};

const COLOR_THEMES = [
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

const ROLE_ORDER: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES'];

const ELO_COLORS: Record<string, string> = {
  Ferro: 'text-gray-500', Bronze: 'text-amber-600', Prata: 'text-gray-300',
  Ouro: 'text-yellow-400', Platina: 'text-cyan-400', Esmeralda: 'text-emerald-400',
  Diamante: 'text-blue-400', Mestre: 'text-amber-500',
  'Grão-Mestre': 'text-red-400', Desafiante: 'text-yellow-300',
};

const getEloColor  = (elo: string) => ELO_COLORS[elo.split(' ')[0]] ?? 'text-white/60';
const formatBRL    = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const teamPower    = (players: Player[]) => players.reduce((s, p) => s + p.balance, 0);
const sortPlayers  = (players: Player[]) =>
  [...players].sort((a, b) => {
    const oa = ROLE_ORDER.indexOf(a.role);
    const ob = ROLE_ORDER.indexOf(b.role);
    return oa !== ob ? oa - ob : a.name.localeCompare(b.name);
  });

// ── ModalBase ──────────────────────────────────────────────────────────────
const ModalBase = ({ onClose, children, gradientFrom, title }: {
  onClose: () => void;
  children: React.ReactNode;
  gradientFrom?: string;
  title?: string;
}) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 20 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="relative w-full max-w-lg rounded-2xl overflow-hidden"
      style={gradientFrom ? {
        border: '3px solid transparent',
        background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${gradientFrom}, ${gradientFrom}80) border-box`,
        boxShadow: `0 0 45px -10px ${gradientFrom}60`
      } : {
        background: '#0d0d0d',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      {title && (
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-white font-black text-lg tracking-tight uppercase">{title}</h2>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="p-6">{children}</div>
    </motion.div>
  </motion.div>
);


// ── Upload de logo para Supabase Storage ───────────────────────────────────
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_DIMENSION = 1080;

function validarImagem(file: File): Promise<string | null> {
  return new Promise(resolve => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      resolve('Apenas PNG ou JPEG são aceitos.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        resolve(`Imagem muito grande (${img.width}×${img.height}px). Máximo: ${MAX_DIMENSION}×${MAX_DIMENSION}px.`);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve('Erro ao ler a imagem.'); };
    img.src = url;
  });
}

async function uploadLogoTime(file: File, timeId: string): Promise<string | null> {
  const ext  = file.type === 'image/png' ? 'png' : 'jpg';

  // nome único pra evitar cache
  const path = `${timeId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('team-logos')
    .upload(path, file, {
      upsert: true,
      contentType: file.type
    });

  if (error) {
    console.error('[uploadLogoTime] erro:', error);
    return null;
  }

  const { data } = supabase.storage
    .from('team-logos')
    .getPublicUrl(path);

  // força atualização no navegador
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ── Mock Data ──────────────────────────────────────────────────────────────
const INITIAL_TEAMS: Team[] = [
  {
    id: 1, name: 'M7 Esports', tag: 'M7E',
    logoUrl: 'https://ais-pre-3jqt6pjyfyajpdpj3cp2zf-550229797587.us-east1.run.app/input_file_0.png',
    gradientFrom: '#FFB700', gradientTo: '#FF6600',
    players: [
      { name: 'ShadowKing#BR1', role: 'TOP', elo: 'Diamante IV',  balance: 850.00,  isLeader: true },
      { name: 'JungleGod#BR1',  role: 'JG',  elo: 'Mestre',       balance: 1200.00 },
      { name: 'MidLaner7#BR1',  role: 'MID', elo: 'Grão-Mestre',  balance: 320.50  },
      { name: 'CarryADC#BR1',   role: 'ADC', elo: 'Diamante II',  balance: 475.00  },
      { name: 'SupportGG#BR1',  role: 'SUP', elo: 'Platina I',    balance: 154.00  },
      { name: 'Reserva1#BR1',   role: 'RES', elo: 'Diamante III', balance: 210.00  },
      { name: 'Reserva2#BR1',   role: 'RES', elo: 'Platina II',   balance: 180.00  },
    ],
    pdl: 3240, winrate: 72, ranking: 3, wins: 36, gamesPlayed: 50, userRole: 'leader',
  },
  {
    id: 2, name: 'Shadow Blades', tag: 'SHB',
    gradientFrom: '#0044FF', gradientTo: '#00D4FF',
    players: [
      { name: 'DarkTop#KR1',   role: 'TOP', elo: 'Mestre',      balance: 2100.00, isLeader: true },
      { name: 'BladeJG#EUW',   role: 'JG',  elo: 'Grão-Mestre', balance: 1800.00 },
      { name: 'ShadowMid#BR1', role: 'MID', elo: 'Desafiante',  balance: 3400.00 },
      { name: 'PurpleADC#BR1', role: 'ADC', elo: 'Mestre',      balance: 920.00  },
      { name: 'VoidSup#BR1',   role: 'SUP', elo: 'Diamante I',  balance: 680.00  },
      { name: 'Reserva3#KR1',   role: 'RES', elo: 'Mestre',      balance: 450.00  },
      { name: 'Reserva4#EUW',   role: 'RES', elo: 'Diamante I',  balance: 380.00  },
    ],
    pdl: 4180, winrate: 78, ranking: 1, wins: 42, gamesPlayed: 54, userRole: 'visitor',
  },
  {
    id: 3, name: 'Phoenix Rising', tag: 'PHX',
    gradientFrom: '#FF3300', gradientTo: '#FF9900',
    players: [
      { name: 'FireTop#BR1',   role: 'TOP', elo: 'Diamante I',   balance: 600.00,  isLeader: true },
      { name: 'AshJungle#BR1', role: 'JG',  elo: 'Mestre',       balance: 1100.00 },
      { name: 'FlameMid#BR1',  role: 'MID', elo: 'Diamante II',  balance: 450.00  },
      { name: 'PhxADC#BR1',    role: 'ADC', elo: 'Diamante III', balance: 320.00  },
      { name: 'EmberSup#BR1',  role: 'SUP', elo: 'Platina II',   balance: 210.00  },
      { name: 'Reserva5#BR1',  role: 'RES', elo: 'Platina I',    balance: 150.00  },
      { name: 'Reserva6#BR1',  role: 'RES', elo: 'Ouro I',       balance: 90.00   },
    ],
    pdl: 3650, winrate: 68, ranking: 2, wins: 34, gamesPlayed: 50, userRole: 'visitor',
  },
  {
    id: 4, name: 'Ice Wolves', tag: 'ICW',
    gradientFrom: '#00C9FF', gradientTo: '#0044FF',
    players: [
      { name: 'FrostTop#BR1',   role: 'TOP', elo: 'Platina I',    balance: 380.00, isLeader: true },
      // JG Vaga
      { name: 'IceMage#BR1',    role: 'MID', elo: 'Diamante III', balance: 510.00 },
      { name: 'ColdADC#BR1',    role: 'ADC', elo: 'Ouro I',       balance: 145.00 },
      { name: 'ArcticSup#BR1',  role: 'SUP', elo: 'Prata I',      balance: 95.00  },
      { name: 'Reserva7#BR1',  role: 'RES', elo: 'Ouro II',       balance: 80.00  },
    ],
    pdl: 2890, winrate: 61, ranking: 4, wins: 28, gamesPlayed: 46, userRole: 'visitor',
  },
  {
    id: 5, name: 'Storm Knights', tag: 'STK',
    gradientFrom: '#7B00FF', gradientTo: '#00AAFF',
    players: [
      { name: 'ThunderTop#BR1', role: 'TOP', elo: 'Diamante III', balance: 490.00, isLeader: true },
      { name: 'LightJG#BR1',    role: 'JG',  elo: 'Platina I',    balance: 320.00 },
      { name: 'StormMid#BR1',   role: 'MID', elo: 'Diamante IV',  balance: 275.00 },
      // ADC Vaga
      // SUP Vaga
    ],
    pdl: 2540, winrate: 58, ranking: 5, wins: 22, gamesPlayed: 38, userRole: 'visitor',
  },
  {
    id: 6, name: 'Gold Rush', tag: 'GRS',
    gradientFrom: '#FFB700', gradientTo: '#FF6600',
    players: [
      { name: 'GoldenTop#BR1', role: 'TOP', elo: 'Ouro I',      balance: 230.00, isLeader: true },
      { name: 'RushJG#BR1',    role: 'JG',  elo: 'Platina IV',  balance: 185.00 },
      { name: 'GoldMid#BR1',   role: 'MID', elo: 'Ouro II',     balance: 120.00 },
      { name: 'TreasADC#BR1',  role: 'ADC', elo: 'Ouro I',      balance: 95.00  },
      { name: 'CoinSup#BR1',   role: 'SUP', elo: 'Prata II',    balance: 45.00  },
      { name: 'Reserva11#BR1',  role: 'RES', elo: 'Prata I',      balance: 35.00  },
      { name: 'Reserva12#BR1',  role: 'RES', elo: 'Ferro I',      balance: 20.00  },
    ],
    pdl: 1980, winrate: 54, ranking: 6, wins: 18, gamesPlayed: 33, userRole: 'visitor',
  },
];

// ── PlayerRow ─────────────────────────────────────────────────────────────
const PlayerRow = ({ player, gradientFrom, labelOverride, showBalance = false, onClick }: any) => {
  const cfg = ROLE_CONFIG[player.role as Role];
  return (
    <div 
      className="flex items-center gap-2.5 py-1 cursor-pointer hover:bg-white/5 rounded-lg transition-colors px-1 -mx-1"
      onClick={() => onClick?.(player)}
    >
      <div className="flex items-center gap-1.5 w-[52px] shrink-0">
        <img src={cfg.img} alt={cfg.label} className="w-4 h-4 object-contain" />
        <span className={`text-[11px] font-bold ${cfg.color}`}>{labelOverride || cfg.label}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-white/85 text-sm font-medium truncate">{player.name}</span>
        {player.isLeader && (
          <span
            className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 border"
            style={{ color: gradientFrom, borderColor: `${gradientFrom}60`, background: `${gradientFrom}18` }}
          >
            CAP
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {showBalance && <span className="text-white/20 text-[10px] font-medium">{formatBRL(player.balance)}</span>}
        <span className={`text-[11px] font-semibold ${getEloColor(player.elo)}`}>{player.elo}</span>
      </div>
    </div>
  );
};

// ── RoleRow ────────────────────────────────────────────────────────────────
const RoleRow = ({ role, player, team, isApplied, showBalance = false, labelOverride, onPlayerClick }: any) => {
  const cfg = ROLE_CONFIG[role as Role];
  const displayLabel = labelOverride || role;
  if (player) {
    let finalLabel = displayLabel;
    if (role === 'RES' && !labelOverride) {
      const resIndex = team.players.filter((pl: any) => pl.role === 'RES').indexOf(player);
      finalLabel = `R${resIndex + 1}`;
    }
    return <PlayerRow player={player} gradientFrom={team.gradientFrom} labelOverride={finalLabel} showBalance={showBalance} onClick={onPlayerClick} />;
  }
  return (
    <div className={`flex items-center gap-2.5 py-1 ${isApplied ? '' : 'opacity-40'}`}>
      <div className="flex items-center gap-1.5 w-[52px] shrink-0">
        <img src={cfg.img} alt={cfg.label} className="w-3.5 h-3.5 object-contain" />
        <span className={`text-[11px] font-bold ${cfg.color}`}>{displayLabel}</span>
      </div>
      <div className="flex-1 flex items-center gap-2">
        <span className={`text-sm font-medium tracking-widest ${isApplied ? 'text-green-400' : 'text-white/20'}`}>
          {isApplied ? 'SOLICITADO' : '—'}
        </span>
      </div>
      <span className={`text-[10px] font-black uppercase tracking-widest ${isApplied ? 'text-green-400' : 'text-white/10'}`}>
        {isApplied ? <Check className="w-3 h-3" /> : 'Vaga'}
      </span>
    </div>
  );
};

// ── TimeCard ──────────────────────────────────────────────────────────────
const TimeCard = ({ team, onClick, isLarge = false, appliedSlots = [] }: {
  team: Team;
  onClick: (t: Team) => void;
  isLarge?: boolean;
  appliedSlots?: string[];
}) => {
  const { playSound } = useSound();
  const financial = teamPower(team.players);
  return (
    <motion.div
      whileHover={{ scale: isLarge ? 1.005 : 1.02, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { playSound('click'); onClick(team); }}
      className="rounded-2xl cursor-pointer overflow-hidden group transition-all duration-500"
      style={{
        border: '3px solid transparent',
        background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
        boxShadow: `0 0 25px -10px ${team.gradientFrom}a0, inset 0 0 20px -15px ${team.gradientFrom}60`,
      }}
    >
      <div className="rounded-[13px] overflow-hidden relative">
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none" style={{ background: team.gradientFrom }} />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-15 pointer-events-none" style={{ background: team.gradientTo || team.gradientFrom }} />
        <div className="relative z-10 p-6">
          
          {/* Header: Nome, Tag e Ranking */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  {team.userRole === 'leader' && (
                    <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                      <Crown className="w-5 h-5 shrink-0" style={{ color: team.gradientFrom }} />
                    </motion.div>
                  )}
                  <h3 className="text-white font-black text-2xl tracking-tight leading-none truncate">{team.name}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md tracking-widest"
                    style={{ color: team.gradientFrom, background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}40` }}>
                    #{team.tag}
                  </span>
                  <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md tracking-widest"
                    style={{ color: team.gradientFrom, background: `${team.gradientFrom}10`, border: `1px solid ${team.gradientFrom}30` }}>
                    #{team.ranking}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Logo pequena - visível APENAS no desktop (NUNCA no mobile) */}
            {!isLarge && (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center relative overflow-hidden hidden sm:flex shrink-0 ml-3"
                style={{
                  border: '2px solid transparent',
                  background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
                  boxShadow: `0 0 10px -4px ${team.gradientFrom}80`,
                }}>
                <div className="absolute inset-0 opacity-15 blur-lg pointer-events-none" style={{ background: `radial-gradient(circle, ${team.gradientFrom}, transparent)` }} />
                {team.logoUrl
                  ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                  : <span className="font-black text-lg tracking-widest relative z-10" style={{ color: team.gradientFrom }}>{team.tag}</span>}
              </div>
            )}
          </div>

          {/* Logo Mobile - Centralizada em cima (aparece apenas no mobile) */}
          <div className="flex justify-center mb-5 sm:hidden">
            <div className="w-36 h-36 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{
                border: '2px solid transparent',
                background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
                boxShadow: `0 0 15px -4px ${team.gradientFrom}80`,
              }}>
              <div className="absolute inset-0 opacity-20 blur-lg pointer-events-none" style={{ background: `radial-gradient(circle, ${team.gradientFrom}, transparent)` }} />
              {team.logoUrl
                ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                : <span className="font-black text-3xl tracking-widest relative z-10" style={{ color: team.gradientFrom }}>{team.tag}</span>}
            </div>
          </div>

          {/* Conteúdo Principal */}
          <div className={isLarge ? 'flex gap-12 mb-4 items-center' : ''}>
            <div className={isLarge ? 'flex-1 min-w-0' : ''}>
              {/* Lista de Jogadores */}
              <div className="bg-black/30 rounded-xl px-3 py-2 mb-4 space-y-0.5 border border-white/[0.04]">
                {['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES1', 'RES2'].map((roleKey) => {
                  const isRes = roleKey.startsWith('RES');
                  const role = isRes ? 'RES' : roleKey as Role;
                  const resIndex = isRes ? parseInt(roleKey.slice(3)) - 1 : -1;
                  const player = isRes ? team.players.filter(p => p.role === 'RES')[resIndex] : team.players.find(p => p.role === role);
                  const isApplied = appliedSlots.includes(`${team.id}-${roleKey}`) || (isRes && appliedSlots.includes(`${team.id}-RES`));
                  return <RoleRow key={roleKey} role={role} player={player} team={team} isApplied={isApplied} labelOverride={isRes ? `R${resIndex + 1}` : undefined} />;
                })}
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { icon: <Flame className="w-3 h-3" style={{ color: team.gradientFrom }} />, label: 'PDL', value: team.pdl.toLocaleString('pt-BR'), color: team.gradientFrom },
                  { icon: <TrendingUp className="w-3 h-3 text-green-400" />, label: 'WIN%', value: `${team.winrate}%`, color: '#4ade80' },
                  { icon: <Trophy className="w-3 h-3 text-white/30" />, label: 'W/L', value: `${team.wins}/${team.gamesPlayed - team.wins}`, color: 'white' },
                ].map(m => (
                  <div key={m.label} className="bg-black/40 rounded-xl p-2.5 text-center border border-white/[0.04]">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {m.icon}
                      <span className="text-[9px] text-white/35 uppercase tracking-wider">{m.label}</span>
                    </div>
                    <span className="font-black text-sm" style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Logo Grande no Desktop (apenas quando isLarge = true) */}
            {isLarge && (
              <div className="shrink-0 flex flex-col justify-center hidden sm:flex">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="w-64 h-64 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    border: '3px solid transparent',
                    background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
                    boxShadow: `0 0 25px -8px ${team.gradientFrom}60`,
                  }}>
                  <div className="absolute inset-0 opacity-20 blur-2xl pointer-events-none" style={{ background: `radial-gradient(circle at center, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}, transparent)` }} />
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-10" />
                  {team.logoUrl
                    ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                    : <span className="font-black text-3xl tracking-widest relative z-10" style={{ color: team.gradientFrom }}>{team.tag}</span>}
                </motion.div>
              </div>
            )}
          </div>

          {/* Footer: Poder Financeiro */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border mt-2"
            style={{ background: `${team.gradientFrom}0d`, borderColor: `${team.gradientFrom}30` }}>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" style={{ color: team.gradientFrom }} />
              <span className="text-xs text-white/50">Poder Financeiro</span>
            </div>
            <span className="font-bold text-sm text-white">{formatBRL(financial)}</span>
          </div>
          
          {/* Ver detalhes */}
          <div className="mt-3 flex items-center justify-end gap-1 text-xs text-white/20">
            <span>Ver detalhes</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── InvitePlayerModal ──────────────────────────────────────────────────────
const InvitePlayerModal = ({ team, onClose }: { team: Team; onClose: () => void }) => {
  const { playSound } = useSound();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ user_id: string; riot_id: string; level?: number; profile_icon_id?: number } | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.length < 2) { setSearchResults([]); setNotFound(false); return; }
    setSearching(true); setNotFound(false);
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('contas_riot').select('user_id, riot_id, profile_icon_id, level').ilike('riot_id', `%${query}%`).limit(5);
      setSearching(false);
      if (!data || data.length === 0) { setNotFound(true); setSearchResults([]); }
      else { setSearchResults(data); setNotFound(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleInvite = async () => {
    if (!selectedPlayer || !selectedRole) return;
    if (selectedRole !== 'RES') {
      if (team.players.some(p => p.role === selectedRole)) { setError('Posição já preenchida no time'); return; }
    } else {
      if (team.players.filter(p => p.role === 'RES').length >= 2) { setError('Máximo de 2 reservas atingido'); return; }
    }
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }
    const { error: insertError } = await supabase.from('time_convites').insert({
      time_id: team.id, de_user_id: user.id, para_user_id: selectedPlayer.user_id,
      riot_id: selectedPlayer.riot_id, role: selectedRole, mensagem: message || null,
      tipo: 'convite', status: 'pendente',
    });
    setSending(false);
    if (insertError) { setError('Erro ao enviar convite. Tente novamente.'); return; }
    playSound('success'); setSent(true); setTimeout(onClose, 1800);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="rounded-2xl overflow-hidden relative" style={{
        background: '#0d0d0d', border: '3px solid transparent',
        backgroundImage: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
        boxShadow: `0 0 35px -10px ${team.gradientFrom}70`
      }}>
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-15 pointer-events-none" style={{ background: team.gradientFrom }} />
        <div className="relative z-10">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between" style={{ background: `${team.gradientFrom}08` }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${team.gradientFrom}25` }}>
                <UserPlus className="w-4 h-4" style={{ color: team.gradientFrom }} />
              </div>
              <h2 className="text-white font-black text-lg">Convidar Jogador</h2>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 space-y-6">
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0"><X className="w-4 h-4 text-red-400" /></div>
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </motion.div>
            )}
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">1. Buscar Player</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input value={query} onChange={e => { setQuery(e.target.value); setSelectedPlayer(null); setError(null); }}
                  placeholder="Buscar por Riot ID (ex: Player#BR1)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30" />
                {searching && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 animate-spin" />}
              </div>
              {query.length >= 2 && !selectedPlayer && !searching && (
                <div className="mt-2">
                  {notFound ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center"><p className="text-white/40 text-xs font-medium">Player não cadastrado na plataforma</p></div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {searchResults.map(p => {
                        const iconUrl = p.profile_icon_id ? `https://ddragon.leagueoflegends.com/cdn/14.19.1/img/profileicon/${p.profile_icon_id}.png` : null;
                        return (
                          <button key={p.user_id} onClick={() => { playSound('click'); setSelectedPlayer(p); }}
                            className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl p-3 border border-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                                {iconUrl ? <img src={iconUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white/60 text-xs font-bold">{p.riot_id.charAt(0).toUpperCase()}</span>}
                              </div>
                              <div className="text-left">
                                <p className="text-white text-sm font-medium">{p.riot_id}</p>
                                {p.level && <p className="text-[10px] text-white/40">Nível {p.level}</p>}
                              </div>
                            </div>
                            <Plus className="w-4 h-4 text-white/20" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {selectedPlayer && (
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style={{ background: `${team.gradientFrom}30` }}>
                      {selectedPlayer.profile_icon_id
                        ? <img src={`https://ddragon.leagueoflegends.com/cdn/14.19.1/img/profileicon/${selectedPlayer.profile_icon_id}.png`} alt="" className="w-full h-full object-cover" />
                        : <Check className="w-4 h-4" style={{ color: team.gradientFrom }} />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">{selectedPlayer.riot_id}</p>
                      {selectedPlayer.level && <p className="text-[10px] text-white/40">Nível {selectedPlayer.level}</p>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedPlayer(null)} className="text-white/30 hover:text-white text-xs underline">Trocar</button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">2. Selecionar Rota</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ROLE_CONFIG) as Role[]).map(role => {
                  const cfg = ROLE_CONFIG[role]; const isSelected = selectedRole === role;
                  return (
                    <button key={role} onClick={() => { playSound('click'); setSelectedRole(role); setError(null); }}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${isSelected ? 'bg-white/10 border-white/40' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                      <img src={cfg.img} alt={cfg.label} className={`w-4 h-4 object-contain ${isSelected ? 'opacity-100' : 'opacity-40'}`} />
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-white/40'}`}>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">3. Mensagem (Opcional)</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Ex: Bora subir de elo? Precisamos de um main..." rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={handleInvite} disabled={!selectedPlayer || !selectedRole || sent || sending}
                className="flex-[1.5] py-3 rounded-xl text-sm font-black transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                style={{ background: team.gradientFrom, color: 'white' }}>
                {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</> : sent ? <><Check className="w-4 h-4" /> Enviado!</> : <><Send className="w-4 h-4" /> Confirmar Convite</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalBase>
  );
};

// ── JoinRequestModal ───────────────────────────────────────────────────────
const JoinRequestModal = ({ team, onClose, alreadyInTeam = false }: { team: Team; onClose: () => void; alreadyInTeam?: boolean }) => {
  const { playSound } = useSound();
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const roles: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES'];

  const handleSubmit = async () => {
    if (!selectedRole || alreadyInTeam) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }
    const { data: riotData } = await supabase.from('contas_riot').select('riot_id').eq('user_id', user.id).maybeSingle();
    await supabase.from('time_convites').insert({
      time_id: team.id, de_user_id: user.id, riot_id: riotData?.riot_id || null,
      role: selectedRole, mensagem: message || null, tipo: 'solicitacao', status: 'pendente',
    });
    setSubmitting(false); playSound('success'); setSent(true); setTimeout(onClose, 2500);
  };

  if (sent) {
    return (
      <ModalBase onClose={onClose} gradientFrom={team.gradientFrom} title="">
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto border border-green-500/30">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <p className="text-white font-black text-lg">Solicitação Enviada!</p>
            <p className="text-white/50 text-sm mt-2">Solicitação enviada para entrar no time <span className="text-white font-bold">{team.name}</span></p>
          </div>
        </div>
      </ModalBase>
    );
  }

  return (
    <ModalBase onClose={onClose} gradientFrom={team.gradientFrom} title="Solicitar Entrada">
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 block">Escolha sua Rota</label>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((role) => {
              const cfg = ROLE_CONFIG[role]; const isSelected = selectedRole === role;
              return (
                <button key={role} onClick={() => { playSound('click'); setSelectedRole(role); }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${isSelected ? 'bg-white/10 border-white/20 scale-[1.02]' : 'bg-black/40 border-white/[0.04] hover:bg-white/5 opacity-50'}`}>
                  <img src={cfg.img} alt={cfg.label} className="w-5 h-5 object-contain" />
                  <span className={`text-[10px] font-black tracking-widest ${isSelected ? cfg.color : 'text-white'}`}>{role}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 block">Mensagem (Opcional)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conte um pouco sobre sua experiência..."
            className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-white/20 transition-all min-h-[100px] resize-none" />
        </div>
        <button onClick={handleSubmit} disabled={!selectedRole || submitting}
          className={`w-full py-4 rounded-xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2 ${selectedRole && !submitting ? 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/10' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}>
          {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</> : 'CONFIRMAR SOLICITAÇÃO'}
        </button>
      </div>
    </ModalBase>
  );
};

// ── Modal: Editar Time ─────────────────────────────────────────────────────
const EditTeamModal = ({
  team, onClose, onSave,
}: {
  team: Team;
  onClose: () => void;
  onSave: (updated: Partial<Team>) => void;
}) => {
  const { playSound } = useSound();
  const [name, setName] = useState(team.name);
  const [tag, setTag] = useState(team.tag);
  const [theme, setTheme] = useState({ from: team.gradientFrom, to: team.gradientTo });
  const [logoPreview, setLogoPreview] = useState(team.logoUrl || '');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    const err = await validarImagem(file);
    if (err) { setLogoError(err); return; }
    setLogoUploading(true);
    setLogoPreview(URL.createObjectURL(file)); // preview imediato
    const url = await uploadLogoTime(file, String(team.id));
    setLogoUploading(false);
    if (url) { playSound('click'); setLogoPreview(url); }
    else setLogoError('Falha no upload. Tente novamente.');
  };

  const handleSave = () => {
    if (logoUploading) return;
    playSound('success');
    console.log('[handleSave] logoPreview ao salvar:', logoPreview);
    onSave({
      name,
      tag: tag.toUpperCase().slice(0, 3),
      gradientFrom: theme.from,
      gradientTo: theme.to,
      logoUrl: logoPreview || undefined,
    });
    onClose();
  };

  return (
    <ModalBase onClose={onClose}>
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ 
          background: '#0d0d0d',
          border: '3px solid transparent',
          backgroundImage: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${theme.from}, ${theme.to}) border-box`,
          boxShadow: `0 0 35px -10px ${theme.from}70`
        }}
      >
        {/* Glows de fundo sutil */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-15 pointer-events-none" style={{ background: theme.from }} />
        
        <div className="relative z-10">
          <div
            className="px-6 py-4 border-b border-white/8 flex items-center justify-between"
            style={{ background: `${theme.from}08` }}
          >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${theme.from}25` }}>
              <Paintbrush className="w-4 h-4" style={{ color: theme.from }} />
            </div>
            <h2 className="text-white font-black text-lg">Editar Time</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-white/40 text-xs uppercase tracking-widest">Nome do Time</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={24}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Tag */}
          <div className="space-y-1.5">
            <label className="text-white/40 text-xs uppercase tracking-widest">Tag (3 letras)</label>
            <input
              value={tag}
              onChange={e => setTag(e.target.value.toUpperCase().slice(0, 3))}
              maxLength={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold tracking-widest focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Upload de Logo */}
          <div className="space-y-1.5">
            <label className="text-white/40 text-xs uppercase tracking-widest">Logo do Time</label>
            <div className="flex items-center gap-3">
              {/* Preview da logo */}
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden bg-white/5 shrink-0"
                style={{
                  border: '2px solid transparent',
                  background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${theme.from}, ${theme.to}) border-box`,
                  boxShadow: `0 0 12px -4px ${theme.from}80`,
                }}
              >
                {/* Glow interno sutil */}
                <div 
                  className="absolute inset-0 opacity-15 blur-lg pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${theme.from}, transparent)` }}
                />
                
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover relative z-10" />
                ) : (
                  <Upload className="w-6 h-6 text-white/30 relative z-10" />
                )}
              </div>
              
              {/* Botão de upload */}
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <div
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all hover:scale-105 cursor-pointer"
                  style={{
                    borderColor: `${theme.from}50`,
                    background: `${theme.from}10`,
                    color: theme.from,
                  }}
                >
                  {logoUploading
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Upload className="w-4 h-4" />}
                  <span className="text-sm font-medium">{logoUploading ? 'Enviando...' : 'Enviar Logo'}</span>
                </div>
              </label>
            </div>
            <p className="text-white/20 text-[10px]">PNG ou JPEG · máx. 1080×1080px</p>
            {logoError && <p className="text-red-400 text-[11px] font-medium">{logoError}</p>}
          </div>

          {/* Tema de cor */}
          <div className="space-y-2">
            <label className="text-white/40 text-xs uppercase tracking-widest">Tema de Cor</label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_THEMES.map(t => (
                <button
                  key={t.label}
                  onClick={() => setTheme({ from: t.from, to: t.to })}
                  className="relative h-10 rounded-xl overflow-hidden border-2 transition-all hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                    borderColor: theme.from === t.from ? 'white' : 'transparent',
                  }}
                  title={t.label}
                >
                  {theme.from === t.from && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div
              className="h-8 rounded-xl mt-1"
              style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl text-sm font-black transition-all hover:scale-105"
              style={{ background: theme.from, color: 'white' }}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  </ModalBase>
  );
};

// ── Modal: Criar Time ──────────────────────────────────────────────────────
const CreateTeamModal = ({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (newTeam: Partial<Team>) => void;
}) => {
  const { playSound } = useSound();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [theme, setTheme] = useState({ from: COLOR_THEMES[0].from, to: COLOR_THEMES[0].to });
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    const err = await validarImagem(file);
    if (err) { setLogoError(err); return; }
    playSound('click');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!name || tag.length < 3 || logoUploading) return;
    playSound('success');
    // O upload real acontece em handleCreateTeam (após ter o ID do time)
    // Passamos o file para o pai lidar
    onCreate({
      name,
      tag: tag.toUpperCase().slice(0, 3),
      gradientFrom: theme.from,
      gradientTo: theme.to,
      logoUrl: logoPreview || undefined,
      _logoFile: logoFile,
    } as any);
    onClose();
  };

  return (
    <ModalBase onClose={onClose}>
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ 
          background: '#0d0d0d',
          border: '3px solid transparent',
          backgroundImage: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${theme.from}, ${theme.to}) border-box`,
          boxShadow: `0 0 35px -10px ${theme.from}70`
        }}
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-15 pointer-events-none" style={{ background: theme.from }} />
        
        <div className="relative z-10">
          <div
            className="px-6 py-4 border-b border-white/8 flex items-center justify-between"
            style={{ background: `${theme.from}08` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${theme.from}25` }}>
                <Plus className="w-4 h-4" style={{ color: theme.from }} />
              </div>
              <h2 className="text-white font-black text-lg">Criar Equipe</h2>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-white/40 text-xs uppercase tracking-widest">Nome do Time</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: M7 Esports"
                maxLength={24}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/40 text-xs uppercase tracking-widest">Tag (3 letras)</label>
              <input
                value={tag}
                onChange={e => setTag(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="Ex: M7E"
                maxLength={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold tracking-widest focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/40 text-xs uppercase tracking-widest">Logo do Time</label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden bg-white/5 shrink-0"
                  style={{
                    border: '2px solid transparent',
                    background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${theme.from}, ${theme.to}) border-box`,
                    boxShadow: `0 0 12px -4px ${theme.from}80`,
                  }}
                >
                  <div className="absolute inset-0 opacity-15 blur-lg pointer-events-none" style={{ background: `radial-gradient(circle, ${theme.from}, transparent)` }} />
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover relative z-10" />
                  ) : (
                    <Upload className="w-6 h-6 text-white/30 relative z-10" />
                  )}
                </div>
                
                <label className="flex-1 cursor-pointer">
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} />
                  <div
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all hover:scale-105 cursor-pointer"
                    style={{ borderColor: `${theme.from}50`, background: `${theme.from}10`, color: theme.from }}
                  >
                    {logoUploading
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <Upload className="w-4 h-4" />}
                    <span className="text-sm font-medium">{logoUploading ? 'Enviando...' : 'Enviar Logo'}</span>
                  </div>
                </label>
              </div>
              <p className="text-white/20 text-[10px]">PNG ou JPEG · máx. 1080×1080px</p>
              {logoError && <p className="text-red-400 text-[11px] font-medium">{logoError}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-white/40 text-xs uppercase tracking-widest">Tema de Cor</label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_THEMES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setTheme({ from: t.from, to: t.to })}
                    className="relative h-10 rounded-xl overflow-hidden border-2 transition-all hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                      borderColor: theme.from === t.from ? 'white' : 'transparent',
                    }}
                    title={t.label}
                  >
                    {theme.from === t.from && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleCreate}
                disabled={!name || tag.length < 3}
                className="w-full py-4 rounded-xl font-black text-white uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-xl"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                  boxShadow: `0 10px 20px -5px ${theme.from}50`
                }}
              >
                Criar Equipe
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalBase>
  );
};

// ── Modal: Gerenciar Lineup ────────────────────────────────────────────────
const ManageLineupModal = ({
  team, onClose, onUpdateTeam,
}: {
  team: Team;
  onClose: () => void;
  onUpdateTeam: (players: Player[]) => void;
}) => {
  const { playSound } = useSound();
  const [players, setPlayers] = useState<Player[]>(sortPlayers(team.players));
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePromote = (name: string) => {
    playSound('click');
    setPlayers(p => p.map(pl => ({ ...pl, isLeader: pl.name === name })));
  };

  const handleRemove = (name: string) => {
    playSound('click');
    setPlayers(p => p.filter(pl => pl.name !== name));
    setConfirmRemove(null);
  };

  const handleRoleChange = (name: string, newRole: Role) => {
    playSound('click');
    setError(null);
    setPlayers(p => sortPlayers(p.map(pl => pl.name === name ? { ...pl, role: newRole } : pl)));
  };

  const handleSave = () => {
    setError(null);

    // 1. Verificar duplicatas (exceto reservas)
    const roles = players.map(p => p.role).filter(r => r !== 'RES');
    const hasDuplicates = new Set(roles).size !== roles.length;
    
    if (hasDuplicates) {
      setError('Posições duplicadas');
      playSound('click');
      return;
    }

    // 2. Verificar limite de reservas (máximo 2)
    const reserves = players.filter(p => p.role === 'RES');
    if (reserves.length > 2) {
      setError('Máximo de 2 reservas');
      playSound('click');
      return;
    }

    playSound('success');
    onUpdateTeam(players);
    onClose();
  };

  return (
    <ModalBase onClose={onClose}>
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ 
          background: '#0d0d0d',
          border: '3px solid transparent',
          backgroundImage: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
          boxShadow: `0 0 35px -10px ${team.gradientFrom}70`
        }}
      >
        {/* Glows de fundo sutil */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-15 pointer-events-none" style={{ background: team.gradientFrom }} />
        
        <div className="relative z-10">
          <div
            className="px-6 py-4 border-b border-white/8 flex items-center justify-between"
            style={{ background: `${team.gradientFrom}08` }}
          >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${team.gradientFrom}25` }}>
              <Users className="w-4 h-4" style={{ color: team.gradientFrom }} />
            </div>
            <h2 className="text-white font-black text-lg">Gerenciar Lineup</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <X className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-red-400 text-xs font-medium">{error}</p>
            </motion.div>
          )}

          {players.map(player => {
            const cfg = ROLE_CONFIG[player.role as Role];
            let labelOverride;
            if (player.role === 'RES') {
              const resIndex = players.filter(pl => pl.role === 'RES').indexOf(player);
              labelOverride = `R${resIndex + 1}`;
            }
            return (
              <div key={player.name} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <img src={cfg.img} alt={cfg.label} className="w-5 h-5 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm truncate">{player.name}</p>
                    {player.isLeader && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border flex-shrink-0"
                        style={{ color: team.gradientFrom, borderColor: `${team.gradientFrom}50`, background: `${team.gradientFrom}18` }}>
                        CAP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-xs ${getEloColor(player.elo)}`}>{player.elo}</p>
                    
                    {/* Select de Rota */}
                    <select
                      value={player.role}
                      onChange={(e) => handleRoleChange(player.name, e.target.value as Role)}
                      className="bg-black/40 text-white/60 text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 focus:outline-none focus:border-white/30 cursor-pointer"
                    >
                      {(Object.keys(ROLE_CONFIG) as Role[]).map(r => (
                        <option key={r} value={r} className="bg-[#0d0d0d]">{ROLE_CONFIG[r].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {confirmRemove === player.name ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/40 text-xs">Confirmar?</span>
                    <button onClick={() => handleRemove(player.name)}
                      className="px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30">
                      Sim
                    </button>
                    <button onClick={() => setConfirmRemove(null)}
                      className="px-2 py-1 bg-white/5 text-white/40 rounded-lg text-xs hover:bg-white/10">
                      Não
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {!player.isLeader && (
                      <>
                        <button onClick={() => handlePromote(player.name)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-yellow-400/20 text-white/30 hover:text-yellow-400 transition-all"
                          title="Promover a Capitão">
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmRemove(player.name)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                          title="Expulsar">
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={handleSave}
            className="w-full mt-2 py-3 rounded-xl font-black text-white text-sm transition-all hover:scale-105"
            style={{ background: team.gradientFrom }}
          >
            Salvar Lineup
          </button>
        </div>
      </div>
    </div>
  </ModalBase>
  );
};

// ── ConfirmLeaveModal ────────────────────────────────────────────────────────
const ConfirmLeaveModal = ({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) => {
  const { playSound } = useSound();
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <LogOut className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-white font-black text-xl mb-2">Sair da Equipe?</h3>
        <p className="text-white/40 text-sm mb-8">Você tem certeza que deseja sair desta equipe? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold hover:bg-white/10 transition-all">
            Cancelar
          </button>
          <button onClick={() => { playSound('click'); onConfirm(); }} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all">
            Sair
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Supabase loader ────────────────────────────────────────────────────────
async function carregarTimesDoSupabase(currentUserId: string | null): Promise<Team[]> {
  const { data: timesRaw, error } = await supabase
    .from('times')
    .select('*, time_membros(*)')
    .order('ranking');

  if (error || !timesRaw || timesRaw.length === 0) return INITIAL_TEAMS;

  return timesRaw.map((t: any) => {
    const members: Player[] = (t.time_membros ?? []).map((m: any) => ({
      name:     m.riot_id || '',
      role:     (m.role || 'TOP') as Role,
      elo:      m.elo || '',
      balance:  Number(m.balance) || 0,
      isLeader: m.is_leader || false,
      userId:   m.user_id,
    }));

    let userRole: UserRole = 'visitor';
    if (currentUserId) {
      if (t.dono_id === currentUserId) userRole = 'leader';
      else if (members.some((m: any) => m.userId === currentUserId)) userRole = 'member';
    }

    return {
      id:           t.id,
      name:         t.nome,
      tag:          t.tag,
      logoUrl:      t.logo_url ?? undefined,
      gradientFrom: t.gradient_from || '#FFB700',
      gradientTo:   t.gradient_to   || '#FF6600',
      players:      members,
      pdl:          t.pdl       || 0,
      winrate:      t.winrate   || 0,
      ranking:      t.ranking   || 999,
      wins:         t.wins      || 0,
      gamesPlayed:  t.games_played || 0,
      userRole,
    };
  });
}

// ── Main App Component ──────────────────────────────────────────────────────
export default function App() {
  const { playSound } = useSound();
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const uidRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id ?? null;
      uidRef.current = uid;
      carregarTimesDoSupabase(uid).then(loaded => {
        setTeams(loaded);
        setLoading(false);
      });
    });

    const channel = supabase
      .channel('equipes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'times' }, () => {
        carregarTimesDoSupabase(uidRef.current).then(loaded => {
          console.log('[Realtime times] logo_url no reload:', loaded.find(t => t.userRole !== 'visitor')?.logoUrl);
          setTeams(loaded);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_membros' }, () => {
        carregarTimesDoSupabase(uidRef.current).then(loaded => setTeams(loaded));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const [notCapSidebar, setNotCapSidebar] = useState(false);
  const handleSidebarLineup = () => {
    playSound('click');
    if (myTeam?.userRole === 'leader') {
      setModalLineup(true);
    } else {
      setNotCapSidebar(true);
      setTimeout(() => setNotCapSidebar(false), 3000);
    }
  };

  // Modais do capitão
  const [modalCriar,     setModalCriar]     = useState(false);
  const [modalConvidar,  setModalConvidar]  = useState(false);
  const [modalEditar,    setModalEditar]    = useState(false);
  const [modalLineup,    setModalLineup]    = useState(false);
  const [modalSair,      setModalSair]      = useState(false);
  const [modalSolicitar, setModalSolicitar] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [headerBannerUrl, setHeaderBannerUrl] = useState<string | null>(null);
  const [myTeamBannerUrl, setMyTeamBannerUrl] = useState<string | null>(null);
  const [appliedSlots] = useState<string[]>([]);

  const handleHeaderBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      playSound('click');
      const localUrl = URL.createObjectURL(file);
      setHeaderBannerUrl(localUrl);
    }
  };

  const handleMyTeamBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      playSound('click');
      const localUrl = URL.createObjectURL(file);
      setMyTeamBannerUrl(localUrl);
    }
  };

  // Ordenar equipes por ranking
  const sortedTeams = [...teams].sort((a, b) => a.ranking - b.ranking);
  const myTeam = teams.find(t => t.userRole !== 'visitor') ?? null;

  const filteredTeams = sortedTeams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTeam = async (newTeamData: Partial<Team>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: novoTime, error } = await supabase
      .from('times')
      .insert({
        nome:          newTeamData.name || 'Nova Equipe',
        tag:           (newTeamData.tag || 'NEW').toUpperCase().slice(0, 3),
        logo_url:      newTeamData.logoUrl ?? null,
        gradient_from: newTeamData.gradientFrom || '#FFB700',
        gradient_to:   newTeamData.gradientTo   || '#FF6600',
        pdl: 0, winrate: 0, ranking: teams.length + 1,
        wins: 0, games_played: 0,
        dono_id: user.id,
      })
      .select()
      .single();

    if (error || !novoTime) { playSound('click'); return; }

    // Upload da logo se um arquivo foi selecionado
    const logoFile = (newTeamData as any)._logoFile as File | null;
    if (logoFile) {
      const logoUrl = await uploadLogoTime(logoFile, novoTime.id);
      if (logoUrl) {
        await supabase.from('times').update({ logo_url: logoUrl }).eq('id', novoTime.id);
      }
    }

    // Adicionar o criador como líder
    const riotData = await supabase
      .from('contas_riot')
      .select('riot_id')
      .eq('user_id', user.id)
      .maybeSingle();

    await supabase.from('time_membros').insert({
      time_id:   novoTime.id,
      user_id:   user.id,
      riot_id:   riotData.data?.riot_id || user.email?.split('@')[0] || 'Jogador',
      cargo:     'lider',
      role:      'TOP',
      is_leader: true,
      elo:       '',
      balance:   0,
    });

    // Recarregar
    const loaded = await carregarTimesDoSupabase(user.id);
    setTeams(loaded);
    playSound('success');
  };

  const handleUpdateTeam = async (updated: Partial<Team>) => {
    if (!myTeam) return;
    console.log('[handleUpdateTeam] logo_url sendo enviado ao DB:', updated.logoUrl);
    const { error } = await supabase
      .from('times')
      .update({
        nome:          updated.name,
        tag:           updated.tag,
        gradient_from: updated.gradientFrom,
        gradient_to:   updated.gradientTo,
        logo_url:      updated.logoUrl ?? null,
      })
      .eq('id', myTeam.id);

    if (error) {
      console.error('[handleUpdateTeam] Erro ao salvar time:', error);
      return;
    }
    console.log('[handleUpdateTeam] Salvo com sucesso no DB');

    setTeams(prev => prev.map(t =>
      t.id === myTeam.id ? { ...t, ...updated } : t
    ));
  };

  const handleUpdatePlayers = async (players: Player[]) => {
    if (!myTeam) return;

    // Deletar membros atuais e reinserir (estratégia simples)
    await supabase.from('time_membros').delete().eq('time_id', myTeam.id);
    if (players.length > 0) {
      await supabase.from('time_membros').insert(
        players.map(p => ({
          time_id:   myTeam.id,
          user_id:   (p as any).userId ?? null,
          riot_id:   p.name,
          cargo:     p.isLeader ? 'lider' : 'jogador',
          role:      p.role,
          is_leader: p.isLeader || false,
          elo:       p.elo,
          balance:   p.balance,
        }))
      );
    }

    setTeams(prev => prev.map(t =>
      t.id === myTeam.id ? { ...t, players } : t
    ));
  };

  const handleSairTime = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !myTeam) return;

    // 1. Consulta todos os membros ANTES de deletar (enquanto ainda tem permissão)
    const { data: todosMembros, error: errQuery } = await supabase
      .from('time_membros')
      .select('user_id, is_leader')
      .eq('time_id', myTeam.id);

    if (errQuery) {
      console.error('Erro ao consultar membros:', errQuery);
      return;
    }

    const restantes = (todosMembros || []).filter(m => m.user_id !== user.id);

    if (restantes.length === 0) {
      // Último membro → deleta o time inteiro (ainda é membro, tem permissão)
      await supabase.from('time_membros').delete().eq('time_id', myTeam.id);
      await supabase.from('times').delete().eq('id', myTeam.id);
    } else {
      // 2. Se era capitão, transfere ANTES de deletar a própria row
      //    (enquanto ainda está em time_membros, o WITH CHECK da RLS passa)
      if (myTeam.userRole === 'leader') {
        const novoCapitao = restantes[0];
        await supabase
          .from('time_membros')
          .update({ is_leader: true, cargo: 'lider' })
          .eq('time_id', myTeam.id)
          .eq('user_id', novoCapitao.user_id);
        await supabase
          .from('times')
          .update({ dono_id: novoCapitao.user_id })
          .eq('id', myTeam.id);
      }

      // 3. Agora sim deleta a própria row
      const { error: errMembro } = await supabase
        .from('time_membros')
        .delete()
        .eq('time_id', myTeam.id)
        .eq('user_id', user.id);

      if (errMembro) {
        console.error('Erro ao sair do time:', errMembro);
        return;
      }
    }

    // 4. Recarrega do banco para garantir estado consistente
    const loaded = await carregarTimesDoSupabase(user.id);
    setTeams(loaded);
    setModalSair(false);
    setSelectedTeam(null);
    playSound('click');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Minha Equipe Section */}
        <div className="space-y-6">
          {/* Minha Equipe Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl p-6 group transition-all duration-500"
            style={{
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 60%)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            {myTeamBannerUrl && (
              <div className="absolute inset-0 z-0">
                <img 
                  src={myTeamBannerUrl} 
                  alt="" 
                  className="w-full h-full object-cover opacity-80 group-hover:scale-103 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/10 via-black/3 to-white/0" />
              </div>
            )}

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-white/60" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Minha Equipe
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
                  Minha Equipe
                </h1>

                <p className="text-white/50 text-sm max-w-lg">
                  Gerencie sua equipe e lidere seus companheiros rumo à vitória.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!myTeam && (
                  <button onClick={() => { playSound('click'); setModalCriar(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-sm hover:bg-white/20 transition-all backdrop-blur-md">
                    <Plus className="w-4 h-4" /> Criar Equipe
                  </button>
                )}
                <label className="shrink-0 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMyTeamBannerUpload}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-bold text-xs transition-all backdrop-blur-md">
                    <Upload className="w-3.5 h-3.5" />
                    {myTeamBannerUrl ? 'Trocar Fundo' : 'Adicionar Fundo'}
                  </div>
                </label>
              </div>
            </div>

            {!myTeamBannerUrl && (
              <div 
                className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-10"
                style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }}
              />
            )}
          </motion.div>

          {/* Minha Equipe Content */}
          {myTeam ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <TimeCard 
                  team={myTeam} 
                  onClick={setSelectedTeam} 
                  isLarge={true} 
                  appliedSlots={appliedSlots}
                />
              </motion.div>

              {/* Sidebar de ações */}
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                className="bg-white/[0.04] border border-white/8 rounded-2xl p-5 lg:w-56 space-y-2"
              >
                {(myTeam.userRole === 'leader' || myTeam.userRole === 'member') && (
                  <>
                    <p className="text-white/30 text-[11px] uppercase tracking-widest font-semibold mb-3">Gerenciar</p>
                    {[
                      { icon: UserPlus,    label: 'Convidar Jogador', action: () => { playSound('click'); setModalConvidar(true); } },
                      { icon: Paintbrush, label: 'Editar Time',       action: () => { playSound('click'); setModalEditar(true); }   },
                      { icon: Users,      label: 'Gerenciar Lineup',  action: handleSidebarLineup },
                    ].map(({ icon: Icon, label, action }) => (
                      <button
                        key={label} onClick={action}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-white/60 hover:text-white text-sm font-medium transition-all group"
                      >
                        <Icon className="w-4 h-4 group-hover:scale-110 transition-transform"
                          style={{ color: myTeam.gradientFrom }} />
                        {label}
                      </button>
                    ))}
                    {notCapSidebar && (
                      <p className="text-yellow-400/80 text-[11px] font-semibold text-center py-1">
                        Apenas o capitão pode gerenciar o lineup
                      </p>
                    )}
                    <div className="pt-2 mt-2 border-t border-white/5" />
                  </>
                )}

                <button
                  onClick={() => { playSound('click'); setModalSair(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 hover:border-red-500/30 text-red-400/70 hover:text-red-400 text-sm font-medium transition-all group"
                >
                  <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Sair da Equipe
                </button>
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white/[0.03] border border-dashed border-white/10 rounded-2xl p-12 text-center"
            >
              <Users className="w-14 h-14 text-white/10 mx-auto mb-4" />
              <p className="text-white/35 font-semibold mb-1">Você não está em nenhuma equipe</p>
              <p className="text-white/20 text-sm mb-5">Crie sua equipe ou solicite entrada em um time abaixo.</p>
              <button onClick={() => { playSound('click'); setModalCriar(true); }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 font-bold text-sm hover:bg-white/10 transition-all">
                <Plus className="w-4 h-4" /> Criar Equipe
              </button>
            </motion.div>
          )}
        </div>

        {/* Arena de Times Section (Replacing Ranking Global) */}
        <div className="space-y-6">
          {/* Arena de Times Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-white/8 p-6 group"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 60%)' }}
          >
            {headerBannerUrl && (
              <div className="absolute inset-0 z-0">
                <img 
                  src={headerBannerUrl} 
                  alt="" 
                  className="w-full h-full object-cover opacity-80 group-hover:scale-103 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/10 via-black/3 to-white/0" />
              </div>
            )}

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5" style={{ color: '#FFB700' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#FFB700' }}>
                    Arena de Times
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-2xl md:text-3xl font-black text-white">
                    Equipes
                  </h1>
                  <span className="text-white/25 text-xs bg-white/10 px-2.5 py-0.5 rounded-full font-bold self-center">
                    {filteredTeams.length} Equipes
                  </span>
                </div>

                <p className="text-white/50 text-sm max-w-lg">
                  Analise os rivais e descubra quais equipes dominam a plataforma.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="shrink-0 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleHeaderBannerUpload}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-bold text-xs transition-all backdrop-blur-md">
                    <Upload className="w-3.5 h-3.5" />
                    {headerBannerUrl ? 'Trocar Fundo' : 'Adicionar Fundo'}
                  </div>
                </label>
              </div>
            </div>

            {!headerBannerUrl && (
              <div 
                className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-20"
                style={{ background: 'radial-gradient(circle, #FFB700, transparent)' }}
              />
            )}
          </motion.div>

          {/* Barra de Pesquisa */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-black border border-white/10 rounded-xl flex items-center px-4 py-2.5 gap-3"
          >
            <Search className="w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar times..."
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/20"
            />
          </motion.div>

          {/* Ranking List */}
          {filteredTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTeams.map((team, index) => (
                <motion.div 
                  key={team.id} 
                  layout
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.05 * index }}
                >
                  <TimeCard 
                    team={team} 
                    onClick={setSelectedTeam} 
                    isLarge={false}
                    appliedSlots={appliedSlots}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/[0.02] border border-dashed border-white/5 rounded-2xl p-16 text-center"
            >
              <Search className="w-14 h-14 text-white/5 mx-auto mb-4" />
              <p className="text-white/30 font-medium text-lg">Nenhum time encontrado para "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-xs font-bold uppercase tracking-widest text-[#FFB700] hover:underline"
              >
                Limpar busca
              </button>
            </motion.div>
          )}
        </div>

        {/* Modais */}
        <AnimatePresence>
          {selectedTeam && !modalSolicitar && !modalConvidar && !modalEditar && !modalLineup && !modalSair && (
            <TeamCardModal
              team={selectedTeam}
              onClose={() => setSelectedTeam(null)}
              onInvite={() => setModalConvidar(true)}
              onEdit={() => setModalEditar(true)}
              onManageLineup={() => setModalLineup(true)}
              onApply={() => setModalSolicitar(true)}
              appliedSlots={appliedSlots}
              alreadyInTeam={myTeam !== null}
            />
          )}
          {selectedTeam && modalSolicitar && (
            <JoinRequestModal
              team={selectedTeam}
              onClose={() => setModalSolicitar(false)}
              alreadyInTeam={myTeam !== null}
            />
          )}
          {modalCriar && (
            <CreateTeamModal onClose={() => setModalCriar(false)} onCreate={handleCreateTeam} />
          )}
          {myTeam && modalConvidar && <InvitePlayerModal team={myTeam} onClose={() => setModalConvidar(false)} />}
          {myTeam && modalEditar && (
            <EditTeamModal team={myTeam} onClose={() => setModalEditar(false)} onSave={handleUpdateTeam} />
          )}
          {myTeam && modalLineup && (
            <ManageLineupModal team={myTeam} onClose={() => setModalLineup(false)} onUpdateTeam={handleUpdatePlayers} />
          )}
          {myTeam && modalSair && (
            <ConfirmLeaveModal onClose={() => setModalSair(false)} onConfirm={handleSairTime} />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
