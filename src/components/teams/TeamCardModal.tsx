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
const formatBRL   = (v: number)  => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const teamPower   = (players: TeamPlayer[]) => players.reduce((s, p) => s + p.balance, 0);

const ROLE_ORDER: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES'];

// ── PlayerRow (interno) ───────────────────────────────────────────────────────
const PlayerRow = ({
  player, gradientFrom, labelOverride, showBalance = false, onClick,
}: {
  player: TeamPlayer;
  gradientFrom: string;
  labelOverride?: string;
  showBalance?: boolean;
  onClick?: (p: TeamPlayer) => void;
}) => {
  const cfg = ROLE_CONFIG[player.role];
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
        {showBalance && (
          <span className="text-white/20 text-[10px] font-medium">{formatBRL(player.balance)}</span>
        )}
        <span className={`text-[11px] font-semibold ${getEloColor(player.elo)}`}>{player.elo}</span>
      </div>
    </div>
  );
};

// ── RoleRow (interno) ─────────────────────────────────────────────────────────
const RoleRow = ({
  role, player, team, isApplied, showBalance = false, labelOverride, onPlayerClick,
}: {
  role: Role;
  player?: TeamPlayer;
  team: TeamCardInfo;
  isApplied?: boolean;
  showBalance?: boolean;
  labelOverride?: string;
  onPlayerClick?: (p: TeamPlayer) => void;
}) => {
  const cfg = ROLE_CONFIG[role];
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
        showBalance={showBalance}
        onClick={onPlayerClick}
      />
    );
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
  const financial = teamPower(team.players);
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
          className="w-full max-w-lg rounded-2xl overflow-hidden relative"
          style={{
            border: '3px solid transparent',
            background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
            boxShadow: `0 0 45px -10px ${team.gradientFrom}80`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glows */}
          <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full blur-[100px] opacity-25 pointer-events-none" style={{ background: team.gradientFrom }} />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ background: team.gradientTo || team.gradientFrom }} />

          <div className="rounded-[13px] overflow-hidden relative z-10" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div className="relative p-5 pb-3 border-b border-white/[0.07] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden"
                  style={{
                    border: '2px solid transparent',
                    background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
                    boxShadow: `0 0 12px -4px ${team.gradientFrom}80`,
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-15 blur-lg pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${team.gradientFrom}, transparent)` }}
                  />
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" />
                  ) : (
                    <span className="font-black text-lg tracking-widest relative z-10" style={{ color: team.gradientFrom }}>{team.tag}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    {team.userRole === 'leader' && <Crown className="w-3.5 h-3.5" style={{ color: team.gradientFrom }} />}
                    <h2 className="text-white font-black text-xl leading-none">{team.name}</h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-widest"
                      style={{ color: team.gradientFrom, background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}40` }}
                    >
                      #{team.tag}
                    </span>
                    <span
                      className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded-md tracking-widest"
                      style={{ color: team.gradientFrom, background: `${team.gradientFrom}10`, border: `1px solid ${team.gradientFrom}30` }}
                    >
                      #{team.ranking}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { playSound('click'); onClose(); }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Ranking',  value: `#${team.ranking}`,                accent: false },
                  { label: 'PDL',      value: team.pdl.toLocaleString('pt-BR'),  accent: true  },
                  { label: 'Win Rate', value: `${team.winrate}%`,                green: true   },
                  { label: 'Vitórias', value: `${team.wins}`, sub: `/${team.gamesPlayed}`, accent: false },
                ].map((s: any, i) => (
                  <div key={i} className="bg-black/50 rounded-xl p-2.5 text-center border border-white/[0.05]">
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">{s.label}</p>
                    <p
                      className={`font-black text-lg leading-none ${s.green ? 'text-green-400' : s.accent ? '' : 'text-white'}`}
                      style={s.accent ? { color: team.gradientFrom } : undefined}
                    >
                      {s.value}
                    </p>
                    {s.sub && <p className="text-white/20 text-[9px] mt-0.5">{s.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Poder financeiro */}
              <div
                className="flex items-center justify-between p-3 rounded-2xl border"
                style={{ background: `${team.gradientFrom}0e`, borderColor: `${team.gradientFrom}35` }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${team.gradientFrom}20` }}>
                    <Wallet className="w-4 h-4" style={{ color: team.gradientFrom }} />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-xs">Poder Financeiro</p>
                    <p className="text-white/35 text-[10px]">Saldo combinado dos jogadores</p>
                  </div>
                </div>
                <p className="font-black text-lg" style={{ color: team.gradientFrom }}>{formatBRL(financial)}</p>
              </div>

              {/* Lineup */}
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-2">Lineup</p>
                <div className="space-y-1.5">
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
                      <div key={roleKey} className="bg-black/35 rounded-xl p-2.5 border border-white/[0.04]">
                        <RoleRow
                          role={role}
                          player={player}
                          team={team}
                          isApplied={isApplied}
                          showBalance={true}
                          labelOverride={isRes ? `R${resIndex + 1}` : undefined}
                          onPlayerClick={handlePlayerClick}
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
                {team.userRole === 'visitor' && (
                  alreadyInTeam ? (
                    <div className="flex-1 text-center py-3 text-yellow-400/70 text-xs font-semibold">
                      Você já está em um time. Saia antes de solicitar entrada em outro.
                    </div>
                  ) : (
                    <button
                      onClick={() => { playSound('click'); onApply?.(); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                      style={{ background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}50`, color: team.gradientFrom }}
                    >
                      <Send className="w-4 h-4" /> Solicitar Entrada
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
