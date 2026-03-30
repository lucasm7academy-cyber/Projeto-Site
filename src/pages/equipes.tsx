/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { Team, Player, Role, UserRole, ROLE_CONFIG, COLOR_THEMES, getEloColor, formatBRL, teamPower, sortPlayers } from '../types/team';
import TimeCard from '../components/TimeCard';
import InvitePlayerModal from '../components/equipes/InvitePlayerModal';
import JoinRequestModal from '../components/equipes/JoinRequestModal';
import ModalBase from '../components/equipes/ModalBase';


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
  const path = `${timeId}.${ext}`;
  const { error } = await supabase.storage
    .from('team-logos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return null;
  const { data } = supabase.storage.from('team-logos').getPublicUrl(path);
  return data.publicUrl;
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
const PlayerRow = ({ player, gradientFrom, labelOverride, showBalance = false }: any) => {
  const cfg = ROLE_CONFIG[player.role as Role];
  return (
    <div className="flex items-center gap-2.5 py-1">
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
const RoleRow = ({ role, player, team, isApplied, showBalance = false, labelOverride }: any) => {
  const cfg = ROLE_CONFIG[role as Role];
  const displayLabel = labelOverride || role;
  if (player) {
    let finalLabel = displayLabel;
    if (role === 'RES' && !labelOverride) {
      const resIndex = team.players.filter((pl: any) => pl.role === 'RES').indexOf(player);
      finalLabel = `R${resIndex + 1}`;
    }
    return <PlayerRow player={player} gradientFrom={team.gradientFrom} labelOverride={finalLabel} showBalance={showBalance} />;
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

// ── TeamDetailModal ────────────────────────────────────────────────────────
const TeamDetailModal = ({
  team,
  onClose,
  onInvite,
  onEdit,
  onManageLineup,
  onApply,
  appliedSlots = [],
  alreadyInTeam = false,
}: {
  team: Team;
  onClose: () => void;
  onInvite?: () => void;
  onEdit?: () => void;
  onManageLineup?: () => void;
  onApply?: () => void;
  appliedSlots?: string[];
  alreadyInTeam?: boolean;
}) => {
  const { playSound } = useSound();
  const financial = teamPower(team.players);
  const [notCapMsg, setNotCapMsg] = useState(false);

  const handleLineupClick = () => {
    playSound('click');
    if (team.userRole === 'leader') {
      onManageLineup?.();
    } else {
      setNotCapMsg(true);
      setTimeout(() => setNotCapMsg(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="w-full max-w-xl rounded-2xl overflow-hidden relative"
        style={{
          border: '3px solid transparent',
          background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
          boxShadow: `0 0 45px -10px ${team.gradientFrom}80`
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Glows de fundo no modal */}
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-[100px] opacity-25 pointer-events-none" style={{ background: team.gradientFrom }} />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ background: team.gradientTo || team.gradientFrom }} />

        <div
          className="rounded-[13px] overflow-hidden relative z-10"
          style={{ maxHeight: '92vh', overflowY: 'auto' }}
        >
          {/* BG radial removido a pedido do usuário */}

          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-white/[0.07] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden"
                style={{
                  border: '2px solid transparent',
                  background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
                  boxShadow: `0 0 12px -4px ${team.gradientFrom}80`,
                }}
              >
                {/* Glow interno sutil */}
                <div 
                  className="absolute inset-0 opacity-15 blur-lg pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${team.gradientFrom}, transparent)` }}
                />
                
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" />
                ) : (
                  <span className="font-black text-xl tracking-widest relative z-10" style={{ color: team.gradientFrom }}>{team.tag}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {team.userRole === 'leader' && <Crown className="w-4 h-4" style={{ color: team.gradientFrom }} />}
                  <h2 className="text-white font-black text-2xl leading-none">{team.name}</h2>
                </div>
                <span
                  className="text-sm font-black px-2.5 py-0.5 rounded-full tracking-widest"
                  style={{ color: team.gradientFrom, background: `${team.gradientFrom}20` }}
                >
                  #{team.tag}
                </span>
              </div>
            </div>
            <button
              onClick={() => { playSound('click'); onClose(); }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { label: 'Ranking',  value: `#${team.ranking}`,               accent: false },
                { label: 'PDL',      value: team.pdl.toLocaleString('pt-BR'), accent: true  },
                { label: 'Win Rate', value: `${team.winrate}%`,               green: true   },
                { label: 'Vitórias', value: `${team.wins}`, sub: `/${team.gamesPlayed}`, accent: false },
              ].map((s: any, i) => (
                <div key={i} className="bg-black/50 rounded-xl p-3 text-center border border-white/[0.05]">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1.5">{s.label}</p>
                  <p
                    className={`font-black text-xl leading-none ${s.green ? 'text-green-400' : s.accent ? '' : 'text-white'}`}
                    style={s.accent ? { color: team.gradientFrom } : undefined}
                  >
                    {s.value}
                  </p>
                  {s.sub && <p className="text-white/20 text-[10px] mt-0.5">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Financial */}
            <div
              className="flex items-center justify-between p-4 rounded-2xl border"
              style={{ background: `${team.gradientFrom}0e`, borderColor: `${team.gradientFrom}35` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${team.gradientFrom}20` }}>
                  <Wallet className="w-5 h-5" style={{ color: team.gradientFrom }} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Poder Financeiro</p>
                  <p className="text-white/35 text-xs">Saldo combinado dos jogadores</p>
                </div>
              </div>
              <p className="font-black text-xl" style={{ color: team.gradientFrom }}>{formatBRL(financial)}</p>
            </div>

            {/* Roster */}
            <div>
              <p className="text-white/30 text-[11px] uppercase tracking-widest font-semibold mb-3">Lineup</p>
              <div className="space-y-2">
                {['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES1', 'RES2'].map((roleKey) => {
                  const isRes = roleKey.startsWith('RES');
                  const role = isRes ? 'RES' : roleKey as Role;
                  const resIndex = isRes ? parseInt(roleKey.slice(3)) - 1 : -1;
                  
                  const player = isRes 
                    ? team.players.filter(p => p.role === 'RES')[resIndex]
                    : team.players.find(p => p.role === role);
                    
                  const isApplied = appliedSlots.includes(`${team.id}-${roleKey}`) || (isRes && appliedSlots.includes(`${team.id}-RES`));
                  
                  return (
                    <div key={roleKey} className="bg-black/35 rounded-xl p-3 border border-white/[0.04]">
                      <RoleRow 
                        role={role} 
                        player={player} 
                        team={team} 
                        isApplied={isApplied}
                        showBalance={true}
                        labelOverride={isRes ? `R${resIndex + 1}` : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Histórico */}
            <div className="bg-black/20 rounded-xl p-4 border border-white/[0.04]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-white/20" />
                <span className="text-white/25 text-sm font-medium">Histórico de Campeonatos</span>
                <span className="text-xs text-white/20 bg-white/5 px-2 py-0.5 rounded-full">Em breve</span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-3 pt-1">
              {(team.userRole === 'leader' || team.userRole === 'member') && (
                <>
                  <button onClick={() => { playSound('click'); onInvite?.(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                    style={{ background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}50`, color: team.gradientFrom }}>
                    <UserPlus className="w-4 h-4" /> Convidar
                  </button>
                  <button onClick={() => { playSound('click'); onEdit?.(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all">
                    <Settings className="w-4 h-4" /> Editar
                  </button>
                  <button onClick={handleLineupClick}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all">
                    <Users className="w-4 h-4" /> Lineup
                  </button>
                  {notCapMsg && (
                    <div className="w-full col-span-3 text-center text-[11px] text-yellow-400/80 font-semibold py-1">
                      Apenas o capitão pode gerenciar o lineup
                    </div>
                  )}
                  {team.userRole === 'member' && (
                    <button onClick={() => playSound('click')}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all">
                      <LogOut className="w-4 h-4" /> Sair do Time
                    </button>
                  )}
                </>
              )}
              {team.userRole === 'visitor' && (
                alreadyInTeam ? (
                  <div className="flex-1 text-center py-3 text-yellow-400/70 text-xs font-semibold">
                    Você já está em um time. Saia antes de solicitar entrada em outro.
                  </div>
                ) : (
                  <button onClick={() => { playSound('click'); onApply?.(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                    style={{ background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}50`, color: team.gradientFrom }}>
                    <Send className="w-4 h-4" /> Solicitar Entrada
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
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
        carregarTimesDoSupabase(uidRef.current).then(loaded => setTeams(loaded));
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

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerBannerUrl, setHeaderBannerUrl] = useState<string | null>(null);
  const [appliedSlots] = useState<string[]>([]);

  const handleHeaderBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      playSound('click');
      const localUrl = URL.createObjectURL(file);
      setHeaderBannerUrl(localUrl);
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
      console.error('Erro ao salvar time:', error);
      return;
    }

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
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/8 p-6 group"
          style={{ background: 'linear-gradient(135deg, #2a1a00 0%, #0a0a0a 60%)' }}
        >
          {headerBannerUrl && (
            <div className="absolute inset-0 z-0">
              <img 
                src={headerBannerUrl} 
                alt="" 
                className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
            </div>
          )}

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5" style={{ color: '#FFB700' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#FFB700' }}>Arena de Times</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Equipes</h1>
              <p className="text-white/50 text-sm max-w-lg">
                Gerencie seu time, analise os rivais e descubra quais equipes dominam a plataforma.
              </p>
            </div>

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

          {!headerBannerUrl && (
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-20"
              style={{ background: 'radial-gradient(circle, #FFB700, transparent)' }} />
          )}
        </motion.div>

        {/* Minha Equipe */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-white/50" />
              <h2 className="text-white font-bold text-lg">Minha Equipe</h2>
            </div>
            {!myTeam && (
              <button onClick={() => { playSound('click'); setModalCriar(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10 transition-all">
                <Plus className="w-4 h-4" /> Criar Equipe
              </button>
            )}
          </div>

          {myTeam ? (
            <div className="space-y-4">
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

        {/* Ranking Global */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="text-white font-black text-xl tracking-tight">Ranking Global</h2>
              <span className="text-white/25 text-xs bg-white/5 px-2.5 py-0.5 rounded-full font-bold">{filteredTeams.length} Equipes</span>
            </div>

            <div className="flex items-center gap-3">
              {!myTeam && (
                <button onClick={() => { playSound('click'); setModalCriar(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10 transition-all">
                  <Plus className="w-4 h-4" /> Criar Equipe
                </button>
              )}
              
              <div className="flex items-center gap-2">
                <AnimatePresence mode="wait">
                  {isSearchOpen ? (
                    <motion.div
                      key="search-input"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="relative flex items-center"
                    >
                      <Search className="absolute left-3 w-4 h-4 text-white/30" />
                      <input
                        autoFocus
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar time ou tag..."
                        className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 w-full md:w-64 transition-all"
                      />
                      <button
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          playSound('click');
                        }}
                        className="absolute right-2 p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="search-button"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={() => {
                        setIsSearchOpen(true);
                        playSound('click');
                      }}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Search className="w-5 h-5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

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
            <TeamDetailModal
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
