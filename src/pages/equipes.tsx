/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Crown, TrendingUp, Trophy, ChevronRight, X,
  UserPlus, Settings, LogOut, Send, Flame, Plus,
  Wallet, Search, UserX, Check, Paintbrush, Upload, RefreshCw,
} from 'lucide-react';
import { useSound } from '../hooks/useSound';
import { supabase } from '../lib/supabase';
import { buildProfileIconUrl } from '../api/riot';
import {
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
        border: `3px solid ${gradientFrom}`,
        background: 'rgba(13, 13, 13, 1)',
        boxShadow: `0 0 45px -10px ${gradientFrom}60`,
        backdropFilter: 'blur(16px)'
      } : {
        background: 'rgba(13, 13, 13, 1)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(16px)'
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
      className="flex items-center gap-2.5 py-1 px-1 -mx-1"
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
const TimeCard = ({ team, onClick, isLarge = false, appliedSlots = [], flat = false }: {
  team: Team;
  onClick: (t: Team) => void;
  isLarge?: boolean;
  appliedSlots?: string[];
  flat?: boolean;
}) => {
  const { playSound } = useSound();

  const content = (
        <div className="relative z-10 p-5">

          {/* Header: Nome, Tag e Ranking — layout difere entre large e small */}
          {isLarge ? (
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {team.userRole !== 'visitor' && (
                      <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                        <Crown className="w-5 h-5 shrink-0" style={{ color: team.gradientFrom }} />
                      </motion.div>
                    )}
                    <h3 className="text-white font-black text-4xl tracking-tight leading-none truncate">{team.name}</h3>
                    <span className="inline-block text-[20px] font-black px-2 py-0.5 rounded-md tracking-widest shrink-0"
                      style={{ color: team.gradientFrom, background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}40` }}>
                      #{team.tag}
                    </span>
                  </div>
                  <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md tracking-widest w-fit"
                    style={{ color: team.gradientFrom, background: `${team.gradientFrom}10`, border: `1px solid ${team.gradientFrom}30` }}>
                    RANK #{team.ranking}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Small card header: nome + badges (tag e rank) abaixo */
            <div className="flex flex-col gap-1.5 mb-4">
              <div className="flex items-start gap-2 min-w-0">
                {team.userRole !== 'visitor' && (
                  <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="mt-1 shrink-0">
                    <Crown className="w-4 h-4" style={{ color: team.gradientFrom }} />
                  </motion.div>
                )}
                <h3
                  className="text-white font-black text-2xl tracking-tight leading-tight overflow-hidden"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                >{team.name}</h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md tracking-widest"
                  style={{ color: team.gradientFrom, background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}40` }}>
                  #{team.tag}
                </span>
                <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md tracking-widest"
                  style={{ color: team.gradientFrom, background: `${team.gradientFrom}10`, border: `1px solid ${team.gradientFrom}30` }}>
                  RANK #{team.ranking}
                </span>
              </div>
            </div>
          )}

          {/* Logo Mobile - Centralizada em cima (apenas para card grande no mobile) */}
          {isLarge && (
            <div className="flex flex-col items-center mb-5 sm:hidden">
              <div className="w-36 h-36 rounded-2xl flex items-center justify-center relative overflow-hidden"
                style={{
                  border: `2px solid ${team.gradientFrom}`,
                  background: 'black',
                  boxShadow: `0 8px 20px -8px rgba(0,0,0,0.6)`,
                  backdropFilter: 'blur(8px)'
                }}>
                {team.logoUrl
                  ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                  : <span className="font-black text-3xl tracking-widest relative z-10" style={{ color: team.gradientFrom }}>{team.tag}</span>}
              </div>
              <span className="mt-3 inline-block text-[12px] font-black px-3 py-1 rounded-md tracking-widest"
                style={{ color: team.gradientFrom, background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}40` }}>
                #{team.tag}
              </span>
            </div>
          )}

          {/* Conteúdo Principal */}
          {isLarge ? (
            <div className="flex flex-col lg:flex-row gap-8 mb-4 items-start">
              <div className="flex-1 w-full min-w-0">
                {/* Lista de Jogadores */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-2 w-full min-w-0">
                    {['TOP', 'JG', 'MID', 'ADC', 'SUP'].map((roleKey) => {
                      const role = roleKey as Role;
                      const player = team.players.find(p => p.role === role);
                      const isApplied = appliedSlots.includes(`${team.id}-${roleKey}`);
                      return (
                        <div key={roleKey} className="transition-all bg-white/[0.03] border border-white/5 rounded-xl px-3 py-1.5">
                          <RoleRow role={role} player={player} team={team} isApplied={isApplied} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-2 w-full min-w-0">
                    {['RES1', 'RES2'].map((roleKey) => {
                      const resIndex = parseInt(roleKey.slice(3)) - 1;
                      const player = team.players.filter(p => p.role === 'RES')[resIndex];
                      const isApplied = appliedSlots.includes(`${team.id}-${roleKey}`) || appliedSlots.includes(`${team.id}-RES`);
                      return (
                        <div key={roleKey} className="transition-all bg-white/[0.03] border border-white/5 rounded-xl px-3 py-1.5">
                          <RoleRow role="RES" player={player} team={team} isApplied={isApplied} labelOverride={`R${resIndex + 1}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Stats */}
                <div className="relative flex items-center mb-3 pr-8">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {[
                      { icon: <Flame className="w-3 h-3" style={{ color: team.gradientFrom }} />, label: 'PDL', value: team.pdl.toLocaleString('pt-BR'), color: team.gradientFrom },
                      { icon: <TrendingUp className="w-3 h-3 text-green-400" />, label: 'WIN%', value: `${team.winrate}%`, color: '#4ade80' },
                      { icon: <Trophy className="w-3 h-3 text-white/30" />, label: 'W/L', value: `${team.wins}/${team.gamesPlayed - team.wins}`, color: 'white' },
                    ].map(m => (
                      <div key={m.label} className="bg-[rgba(13,13,13,1)] rounded-xl p-2.5 text-center border border-white/[0.04] flex flex-col justify-center h-full">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {m.icon}
                          <span className="text-[9px] text-white/35 uppercase tracking-wider">{m.label}</span>
                        </div>
                        <span className="font-black text-sm" style={{ color: m.color }}>{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Logo Grande no Desktop */}
              <div className="shrink-0 flex flex-col items-center justify-center hidden sm:flex">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="w-64 h-64 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    border: `3px solid ${team.gradientFrom}`,
                    background: 'black',
                    boxShadow: `0 12px 30px -10px rgba(0,0,0,0.7)`,
                    backdropFilter: 'blur(12px)'
                  }}>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-10" />
                  {team.logoUrl
                    ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                    : <span className="font-black text-3xl tracking-widest relative z-10" style={{ color: team.gradientFrom }}>{team.tag}</span>}
                </motion.div>
                <span className="mt-4 inline-block text-[14px] font-black px-4 py-1.5 rounded-lg tracking-widest"
                  style={{ color: team.gradientFrom, background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}40` }}>
                  #{team.tag}
                </span>
              </div>
            </div>
          ) : (
            /* Card pequeno: logo centralizada + rank + stats + link */
            <div className="flex flex-col gap-4">
              {/* Logo centralizada */}
              <div className="flex items-center justify-center py-3">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  className="w-36 h-36 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    border: `2px solid ${team.gradientFrom}`,
                    background: 'black',
                    boxShadow: `0 10px 28px -8px ${team.gradientFrom}70`,
                  }}>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-10" />
                  {team.logoUrl
                    ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                    : <span className="font-black text-3xl tracking-widest relative z-10" style={{ color: team.gradientFrom }}>{team.tag}</span>}
                </motion.div>
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 w-full">
                {[
                  { icon: <Flame className="w-3 h-3" style={{ color: team.gradientFrom }} />, label: 'PDL', value: team.pdl.toLocaleString('pt-BR'), color: team.gradientFrom },
                  { icon: <TrendingUp className="w-3 h-3 text-green-400" />, label: 'WIN%', value: `${team.winrate}%`, color: '#4ade80' },
                  { icon: <Trophy className="w-3 h-3 text-white/30" />, label: 'W/L', value: `${team.wins}/${team.gamesPlayed - team.wins}`, color: 'white' },
                ].map(m => (
                  <div key={m.label} className="bg-[rgba(13,13,13,1)] rounded-xl p-2.5 text-center border border-white/[0.04] flex flex-col justify-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {m.icon}
                      <span className="text-[9px] text-white/35 uppercase tracking-wider">{m.label}</span>
                    </div>
                    <span className="font-black text-sm" style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Ver página do time */}
              <div className="flex items-center gap-1.5 group/card">
                <span className="font-bold text-sm" style={{ color: team.gradientFrom }}>Ver página do time</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover/card:translate-x-1" style={{ color: team.gradientFrom }} />
              </div>
            </div>
          )}
        </div>
  );

  if (flat) return (
    <div
      className="w-full cursor-pointer group/flat"
      onClick={() => { playSound('click'); onClick(team); }}
    >
      {content}
      <div className="mt-4 flex items-center gap-1.5">
        <span className="font-bold text-sm" style={{ color: team.gradientFrom }}>Ver página do time</span>
        <ChevronRight className="w-4 h-4 transition-transform group-hover/flat:translate-x-1" style={{ color: team.gradientFrom }} />
      </div>
    </div>
  );

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => { playSound('click'); onClick(team); }}
      className="rounded-3xl cursor-pointer overflow-hidden group transition-all duration-500 border-[5px] border-transparent"
      style={{
        background: `linear-gradient(rgba(13, 13, 13, 1), rgba(13, 13, 13, 1)) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
        backdropFilter: 'blur(16px)'
      }}
    >
      <div className="rounded-[19px] overflow-hidden relative">
        {content}
      </div>
    </motion.div>
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
  const [erroUnico, setErroUnico] = useState('');
  const [verificando, setVerificando] = useState(false);

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
    if (!name || tag.length < 3 || logoUploading || verificando) return;
    setErroUnico('');
    setVerificando(true);

    const tagNorm = tag.toUpperCase().slice(0, 3);
    const { data: conflito } = await supabase
      .from('times')
      .select('id, nome, tag')
      .or(`nome.ilike.${name},tag.ilike.${tagNorm}`)
      .maybeSingle();

    setVerificando(false);

    if (conflito) {
      const nomeIgual = conflito.nome.toLowerCase() === name.toLowerCase();
      const tagIgual  = conflito.tag.toLowerCase()  === tagNorm.toLowerCase();
      if (nomeIgual && tagIgual) setErroUnico('Já existe um time com esse nome e essa tag.');
      else if (nomeIgual)        setErroUnico('Já existe um time com esse nome.');
      else                       setErroUnico('Já existe um time com essa tag.');
      playSound('click');
      return;
    }

    playSound('success');
    onCreate({
      name,
      tag: tagNorm,
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
          background: 'rgba(13, 13, 13, 1)',
          border: '3px solid transparent',
          backgroundImage: `linear-gradient(rgba(13, 13, 13, 1), rgba(13, 13, 13, 1)) padding-box, linear-gradient(135deg, ${theme.from}, ${theme.to}) border-box`,
          boxShadow: `0 0 35px -10px ${theme.from}70`,
          backdropFilter: 'blur(16px)'
        }}
      >
        <div className="relative z-10">
          <div
            className="px-6 py-4 border-b border-white/8 flex items-center justify-between"
            style={{ background: 'rgba(255, 255, 255, 0.02)' }}
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
                    border: `2px solid ${theme.from}`,
                    background: 'rgba(13, 13, 13, 1)',
                    boxShadow: `0 0 12px -4px ${theme.from}80`,
                    backdropFilter: 'blur(8px)'
                  }}
                >
                {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover relative z-10" />
                  ) : (
                    <Upload className="w-6 h-6 text-white/30 relative z-10" />
                  )}
                </div>
                
                <label className="flex-1 cursor-pointer">
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} />
                  <div
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all cursor-pointer"
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
                    className="relative h-10 rounded-xl overflow-hidden border-2 transition-all"
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
              {erroUnico && (
                <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
                  {erroUnico}
                </div>
              )}
              <button
                onClick={handleCreate}
                disabled={!name || tag.length < 3 || verificando}
                className="w-full py-4 rounded-xl font-black text-white uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                  boxShadow: `0 10px 20px -5px ${theme.from}50`
                }}
              >
                {verificando ? 'Verificando...' : 'Criar Equipe'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalBase>
  );
};

// ── Carregar times do Supabase ────────────────────────────────────────────────
const TEAMS_PAGE = 20;

function mapTimeRaw(t: any, currentUserId: string | null): Team {
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
}

async function carregarTimesDoSupabase(
  currentUserId: string | null,
  offset = 0,
  limit = TEAMS_PAGE,
): Promise<{ teams: Team[]; temMais: boolean }> {
  const { data: timesRaw, error } = await supabase
    .from('times')
    .select('*, time_membros(*)')
    .order('ranking')
    .range(offset, offset + limit - 1);

  if (error || !timesRaw) return { teams: [], temMais: false };
  return {
    teams:   timesRaw.map((t: any) => mapTimeRaw(t, currentUserId)),
    temMais: timesRaw.length === limit,
  };
}

async function carregarMeuTime(userId: string): Promise<Team | null> {
  const { data: membro } = await supabase
    .from('time_membros')
    .select('time_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!membro?.time_id) return null;

  const { data: t } = await supabase
    .from('times')
    .select('*, time_membros(*)')
    .eq('id', membro.time_id)
    .maybeSingle();
  return t ? mapTimeRaw(t, userId) : null;
}

// ── Main App Component ──────────────────────────────────────────────────────
export default function App() {
  const { playSound } = useSound();
  const navigate = useNavigate();
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [arenaTeams, setArenaTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [temMais, setTemMais] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [hasRiot, setHasRiot] = useState(false);
  const uidRef        = useRef<string | null>(null);
  const arenaOffsetRef = useRef(0);
  const sentinelRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data?.user?.id ?? null;
      uidRef.current = uid;

      if (uid) {
        const { data: conta } = await supabase
          .from('contas_riot')
          .select('user_id')
          .eq('user_id', uid)
          .maybeSingle();
        setHasRiot(!!conta);
      }

      const [meuTime, { teams: pagina1, temMais: mais }] = await Promise.all([
        uid ? carregarMeuTime(uid) : Promise.resolve(null),
        carregarTimesDoSupabase(uid, 0, TEAMS_PAGE),
      ]);

      setMyTeam(meuTime);
      setArenaTeams(pagina1);
      setTemMais(mais);
      arenaOffsetRef.current = pagina1.length;
      setLoading(false);
    });

    const recarregarVisivel = () => {
      const uid = uidRef.current;
      const total = arenaOffsetRef.current;
      Promise.all([
        uid ? carregarMeuTime(uid) : Promise.resolve(null),
        carregarTimesDoSupabase(uid, 0, Math.max(total, TEAMS_PAGE)),
      ]).then(([meuTime, { teams: reloaded }]) => {
        setMyTeam(meuTime);
        setArenaTeams(reloaded);
      });
    };

    const channel = supabase
      .channel('equipes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'times' }, recarregarVisivel)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_membros' }, recarregarVisivel)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // IntersectionObserver para arena de times
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || !temMais || carregandoMais) return;
      setCarregandoMais(true);
      carregarTimesDoSupabase(uidRef.current, arenaOffsetRef.current, TEAMS_PAGE)
        .then(({ teams: mais, temMais: ainda }) => {
          setArenaTeams(prev => [...prev, ...mais]);
          setTemMais(ainda);
          arenaOffsetRef.current += mais.length;
          setCarregandoMais(false);
        });
    }, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [temMais, carregandoMais]);

  // Modais do capitão
  const [modalCriar, setModalCriar] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [myTeamBannerUrl, setMyTeamBannerUrl] = useState<string | null>(null);
  const [appliedSlots] = useState<string[]>([]);

  const handleMyTeamBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      playSound('click');
      setMyTeamBannerUrl(URL.createObjectURL(file));
    }
  };

  const filteredTeams = arenaTeams
    .sort((a, b) => a.ranking - b.ranking)
    .filter(team =>
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
        pdl: 0, winrate: 0, ranking: arenaTeams.length + 1,
        wins: 0, games_played: 0,
        dono_id: user.id,
      })
      .select()
      .single();

    if (error || !novoTime) { playSound('click'); return; }

    const logoFile = (newTeamData as any)._logoFile as File | null;
    if (logoFile) {
      const logoUrl = await uploadLogoTime(logoFile, novoTime.id);
      if (logoUrl) {
        await supabase.from('times').update({ logo_url: logoUrl }).eq('id', novoTime.id);
      }
    }

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

    // Recarregar meu time + primeira página da arena
    const [meuTime, { teams: pagina1, temMais: mais }] = await Promise.all([
      carregarMeuTime(user.id),
      carregarTimesDoSupabase(user.id, 0, TEAMS_PAGE),
    ]);
    setMyTeam(meuTime);
    setArenaTeams(pagina1);
    setTemMais(mais);
    arenaOffsetRef.current = pagina1.length;
    playSound('success');
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


        <div 
          className="space-y-0 rounded-3xl overflow-hidden backdrop-blur-xl transition-all duration-500"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: myTeam ? `2px solid ${myTeam.gradientFrom}` : '1px solid rgba(255,255,255,0.1)',
            boxShadow: myTeam ? `0 0 45px -10px ${myTeam.gradientFrom}40` : 'none'
          }}
        >
          {!myTeam && <div className="absolute inset-0 border border-white/10 rounded-3xl pointer-events-none" />}
          {/* Minha Equipe Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden p-6 group transition-all duration-500"
          >
            {/* Imagem FIXA que você escolheu - SEM input */}
            <div className="absolute inset-0 z-0">
              <img 
                src="/images/fundo fanaticaaa.png"
                alt="Fundo League of Legends" 
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/10 via-black/3 to-white/0" />
            </div>


            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-white/60" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Minha Equipe
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">
                  Minha <span className="text-primary">Equipe</span>
                </h1>

                <p className="text-white/50 text-sm max-w-lg">
                  Gerencie sua equipe e lidere seus companheiros rumo à vitória.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!myTeam && (
                  <div className="relative group">
                    <button
                      onClick={() => { if (!hasRiot) return; playSound('click'); setModalCriar(true); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all backdrop-blur-md ${hasRiot ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'}`}
                    >
                      <Plus className="w-4 h-4" /> Criar Equipe
                    </button>
                    {!hasRiot && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 border border-white/10 rounded-lg text-[11px] text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Vincule sua conta Riot para criar uma equipe
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* REMOVIDO: condicional de !myTeamBannerUrl */}
          </motion.div>

          {/* Minha Equipe Content */}
          <div className="p-6 backdrop-blur-md">
            {myTeam ? (
              <div className="flex flex-col gap-5 items-start">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="w-full">
                  <TimeCard
                    team={myTeam}
                    onClick={(team) => navigate(`/times/${team.id}`)}
                    isLarge={true}
                    flat={true}
                    appliedSlots={appliedSlots}
                  />
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
                <div className="relative group inline-block">
                  <button
                    onClick={() => { if (!hasRiot) return; playSound('click'); setModalCriar(true); }}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border font-bold text-sm transition-all ${hasRiot ? 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10' : 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed'}`}
                  >
                    <Plus className="w-4 h-4" /> Criar Equipe
                  </button>
                  {!hasRiot && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 border border-white/10 rounded-lg text-[11px] text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Vincule sua conta Riot para criar uma equipe
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Arena de Times Section (Replacing Ranking Global) */}
        <div 
          className="space-y-0 rounded-3xl overflow-hidden backdrop-blur-xl transition-all duration-500"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {/* Arena de Times Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden p-6 group transition-all duration-500"
          >
            {/* Imagem FIXA */}
            <div className="absolute inset-0 z-0">
              <img 
                src="/images/fundoSKTRYZEAZUL.png"
                alt="Arena de Times" 
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/10 via-black/3 to-white/0" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-white/60" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Arena de Times
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">
                  Arena de <span className="text-[#FFB700]">Times</span>
                </h1>

                <p className="text-white/50 text-sm max-w-lg">
                  Analise os rivais e descubra quais equipes dominarão a plataforma.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-white/40 font-bold text-[10px] uppercase tracking-wider">
                  <span className="text-white font-black">{filteredTeams.length}</span> Equipes
                </span>
              </div>
            </div>
          </motion.div>

          {/* Arena de Times Content (Search + Grid) */}
          <div className="p-6 backdrop-blur-md space-y-6">
            {/* Barra de Pesquisa */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-xl flex items-center px-4 py-2.5 gap-3 transition-all focus-within:border-white/30"
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
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredTeams.map((team: Team, index: number) => (
                    <motion.div
                      key={team.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * Math.min(index, 6) }}
                    >
                      <TimeCard
                        team={team}
                        onClick={(t) => navigate(`/times/${t.id}`)}
                        isLarge={false}
                        appliedSlots={appliedSlots}
                      />
                    </motion.div>
                  ))}
                </div>
                {/* Sentinel + spinner de infinite scroll */}
                <div ref={sentinelRef} className="flex justify-center py-6">
                  {carregandoMais && (
                    <div className="w-8 h-8 border-2 border-[#FFB700] border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </>
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
        </div>

        {/* Modais */}
        <AnimatePresence>
          {modalCriar && (
            <CreateTeamModal onClose={() => setModalCriar(false)} onCreate={handleCreateTeam} />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
