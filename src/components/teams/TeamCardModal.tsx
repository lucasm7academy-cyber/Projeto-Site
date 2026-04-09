/**
 * TeamCardModal — componente reutilizável de card/detalhe de time
 * Importado por: equipes.tsx, e qualquer outra página que precise mostrar info de um time
 *
 * Gerencia o PlayerDetailModal internamente: clicar num jogador abre o modal
 * do jogador automaticamente, sem precisar de callback no componente pai.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Crown, Wallet, Trophy, Send, Check,
} from 'lucide-react';
import { useSound } from '../../hooks/useSound';
import { supabase } from '../../lib/supabase';
import {
  PlayerDetailModal,
  ROLE_CONFIG,
  type Jogador,
  type Role,
} from '../players/PlayerDetailModal';

// ── Tipos exportados ──────────────────────────────────────────────────────────
export type UserRole = 'leader' | 'member' | 'visitor';

export interface TeamPlayer {
  name: string;
  role: Role;
  elo: string;
  balance: number;
  isLeader?: boolean;
  userId?: string;
}

export interface TeamCardInfo {
  id: number | string;
  name: string;
  tag: string;
  logoUrl?: string;
  gradientFrom: string;
  gradientTo: string;
  players: TeamPlayer[];
  pdl: number;
  winrate: number;
  ranking: number;
  wins: number;
  gamesPlayed: number;
  userRole: UserRole;
}

// ── Utilitários locais ────────────────────────────────────────────────────────
const ELO_COLORS: Record<string, string> = {
  Ferro: 'text-gray-500', Bronze: 'text-amber-600', Prata: 'text-gray-300',
  Ouro: 'text-yellow-400', Platina: 'text-cyan-400', Esmeralda: 'text-emerald-400',
  Diamante: 'text-blue-400', Mestre: 'text-amber-500',
  'Grão-Mestre': 'text-red-400', Desafiante: 'text-yellow-300',
};
const getEloColor = (elo: string) => ELO_COLORS[elo.split(' ')[0]] ?? 'text-white/60';

const ROLE_ORDER: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES'];

const getCardStyle = () => ({
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(16px)',
});

const LABEL_CLASS = 'text-xs text-white/30 font-normal uppercase tracking-widest';

// ── PlayerRow (interno) ───────────────────────────────────────────────────────
const PlayerRow = ({
  player, gradientFrom, labelOverride, onClick,
}: {
  player: TeamPlayer;
  gradientFrom: string;
  labelOverride?: string;
  onClick?: (p: TeamPlayer) => void;
}) => {
  const cfg = ROLE_CONFIG[player.role];
  return (
    <div
      className="flex items-center gap-2.5 py-2.5 px-4 cursor-pointer rounded-xl transition-all border"
      style={{ 
        background: 'rgba(0, 0, 0, 0.25)', 
        borderColor: `${gradientFrom}50`,
        boxShadow: `0 0 15px -5px ${gradientFrom}20`,
      }}
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
        <span className={`text-[11px] font-semibold ${getEloColor(player.elo)}`}>{player.elo}</span>
      </div>
    </div>
  );
};

// ── RoleRow (interno) ─────────────────────────────────────────────────────────
const RoleRow = ({
  role, player, team, isApplied, labelOverride, onPlayerClick,
}: any) => {
  const cfg = ROLE_CONFIG[role as Role];
  const displayLabel = labelOverride || role;
  if (player) {
    let finalLabel = displayLabel;
    if (role === 'RES' && !labelOverride) {
      const resIndex = team.players.filter(pl => pl.role === 'RES').indexOf(player);
      finalLabel = `R${resIndex + 1}`;
    }
    return (
      <PlayerRow
        player={player}
        gradientFrom={team.gradientFrom}
        labelOverride={finalLabel}
        onClick={onPlayerClick}
      />
    );
  }
  return (
    <div 
      className={`flex items-center gap-2.5 py-2.5 px-4 rounded-xl border ${isApplied ? '' : 'opacity-40'}`}
      style={{ 
        background: isApplied ? `${team.gradientFrom}05` : 'rgba(0, 0, 0, 0.1)', 
        borderColor: isApplied ? `${team.gradientFrom}20` : 'rgba(255,255,255,0.05)',
      }}
    >
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

// ── TeamCardModal (exportado) ─────────────────────────────────────────────────
export const TeamCardModal = ({
  team,
  onClose,
  onInvite,
  onEdit,
  onManageLineup,
  onApply,
  appliedSlots = [],
  alreadyInTeam = false,
}: {
  team: TeamCardInfo;
  onClose: () => void;
  onInvite?: () => void;
  onEdit?: () => void;
  onManageLineup?: () => void;
  onApply?: () => void;
  appliedSlots?: string[];
  alreadyInTeam?: boolean;
}) => {
  const { playSound } = useSound();
  const [notCapMsg, setNotCapMsg] = useState(false);

  // Gerenciamento interno do PlayerDetailModal
  const [selectedJogador, setSelectedJogador] = useState<{ jogador: Jogador; puuid?: string } | null>(null);

  const handlePlayerClick = async (p: TeamPlayer) => {
    if (!p.userId) return;
    const { data } = await supabase
      .from('contas_riot')
      .select('riot_id, puuid, profile_icon_id, level')
      .eq('user_id', p.userId)
      .maybeSingle();
    const jogador: Jogador = {
      id:               p.userId,
      riotId:           data?.riot_id ?? p.name,
      nome:             (data?.riot_id ?? p.name).split('#')[0],
      nivel:            data?.level ?? 1,
      elo:              'Ferro',
      iconeId:          data?.profile_icon_id ?? 1,
      partidas:         0,
      winRate:          0,
      titulos:          0,
      rolePrincipal:    p.role,
      roleSecundaria:   'RES',
      isVIP:            false,
      isVerified:       true,
      kda:              0,
      csPorMinuto:      0,
      participacaoKill: 0,
      conquistas:       [],
      timeTag:          team.tag,
      timeColor:        team.gradientFrom,
      timeLogo:         team.logoUrl,
      timeId:           team.id,
    };
    setSelectedJogador({ jogador, puuid: data?.puuid ?? undefined });
  };

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
    <>
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
          className="w-full max-w-lg rounded-[2.5rem] overflow-hidden relative"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(13, 13, 13, 0.8)',
            backgroundImage: `linear-gradient(rgba(13, 13, 13, 0.8), rgba(13, 13, 13, 0.8)) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}40) border-box`,
            boxShadow: `0 0 60px -15px ${team.gradientFrom}40`,
            backdropFilter: 'blur(24px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glows */}
          <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: team.gradientFrom }} />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full blur-[120px] opacity-15 pointer-events-none" style={{ background: team.gradientTo || team.gradientFrom }} />

          <div className="relative z-10" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div className="relative p-8 pb-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    boxShadow: `0 0 20px -5px ${team.gradientFrom}40`,
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-10 blur-lg pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${team.gradientFrom}, transparent)` }}
                  />
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" />
                  ) : (
                    <span className="font-black text-xl tracking-widest relative z-10 uppercase" style={{ color: team.gradientFrom }}>{team.tag}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    {team.userRole === 'leader' && <Crown className="w-4 h-4" style={{ color: team.gradientFrom }} />}
                    <h2 className="text-white font-black text-2xl leading-none uppercase tracking-tight">{team.name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block text-[10px] font-black px-2 py-0.5 rounded-lg tracking-widest uppercase"
                      style={{ color: team.gradientFrom, background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}40` }}
                    >
                      #{team.tag}
                    </span>
                    <span
                      className="inline-block text-[10px] font-black px-2 py-0.5 rounded-lg tracking-widest uppercase"
                      style={{ color: team.gradientFrom, background: `${team.gradientFrom}10`, border: `1px solid ${team.gradientFrom}30` }}
                    >
                      #{team.ranking}º RANKING
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { playSound('click'); onClose(); }}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/20 hover:text-white transition-all border border-white/5"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Ranking',  value: `#${team.ranking}`,                accent: false },
                  { label: 'PDL',      value: team.pdl.toLocaleString('pt-BR'),  accent: true  },
                  { label: 'Win Rate', value: `${team.winrate}%`,                green: true   },
                  { label: 'Vitórias', value: `${team.wins}`, sub: `/${team.gamesPlayed}`, accent: false },
                ].map((s: any, i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1.5">{s.label}</p>
                    <p
                      className={`font-black text-xl leading-none uppercase ${s.green ? 'text-green-400' : s.accent ? '' : 'text-white'}`}
                      style={s.accent ? { color: team.gradientFrom } : undefined}
                    >
                      {s.value}
                    </p>
                    {s.sub && <p className="text-white/20 text-[10px] font-black mt-1 uppercase tracking-widest">{s.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Lineup */}
              <div>
                <p className={LABEL_CLASS + " mb-4"}>Lineup da Equipe</p>
                <div className="bg-black/40 rounded-2xl p-4 space-y-3 border border-white/5">
                  {(['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES1', 'RES2'] as const).map((roleKey) => {
                    const isRes = roleKey.startsWith('RES');
                    const role: Role = isRes ? 'RES' : roleKey as Role;
                    const resIndex = isRes ? parseInt(roleKey.slice(3)) - 1 : -1;
                    const player = isRes
                      ? team.players.filter(p => p.role === 'RES')[resIndex]
                      : team.players.find(p => p.role === role);
                    const isApplied =
                      appliedSlots.includes(`${team.id}-${roleKey}`) ||
                      (isRes && appliedSlots.includes(`${team.id}-RES`));
                    return (
                      <RoleRow
                        key={roleKey}
                        role={role}
                        player={player}
                        team={team}
                        isApplied={isApplied}
                        labelOverride={isRes ? `R${resIndex + 1}` : undefined}
                        onPlayerClick={handlePlayerClick}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Histórico */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-white/20" />
                  <span className="text-white/30 text-sm font-black uppercase tracking-widest">Histórico de Campeonatos</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-3 py-1 rounded-full border border-white/5">Em breve</span>
              </div>

              {/* Ações */}
              <div className="flex gap-4 pt-2">
                {team.userRole === 'visitor' && (
                  alreadyInTeam ? (
                    <div className="flex-1 text-center py-4 text-yellow-400/70 text-[10px] font-black uppercase tracking-widest bg-yellow-400/5 rounded-2xl border border-yellow-400/10">
                      Você já está em um time. Saia antes de solicitar entrada.
                    </div>
                  ) : (
                    <button
                      onClick={() => { playSound('click'); onApply?.(); }}
                      className="flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl"
                      style={{ background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}50`, color: team.gradientFrom }}
                    >
                      <Send className="w-5 h-5" /> Solicitar Entrada
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* PlayerDetailModal — gerenciado internamente */}
      <AnimatePresence>
        {selectedJogador && (
          <PlayerDetailModal
            jogador={selectedJogador.jogador}
            puuid={selectedJogador.puuid}
            onClose={() => setSelectedJogador(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};