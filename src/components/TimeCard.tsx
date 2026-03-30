import React from 'react';
import { motion } from 'motion/react';
import { Crown, TrendingUp, Trophy, ChevronRight, Wallet, Flame, Check } from 'lucide-react';
import { useSound } from '../hooks/useSound';
import { Team, Role, ROLE_CONFIG, getEloColor, formatBRL, teamPower } from '../types/team';

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

// ── RoleRow ───────────────────────────────────────────────────────────────
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

// ── TimeCard ──────────────────────────────────────────────────────────────
interface TimeCardProps {
  team: Team;
  onClick: (t: Team) => void;
  isLarge?: boolean;
  appliedSlots?: string[];
}

export default function TimeCard({ team, onClick, isLarge = false, appliedSlots = [] }: TimeCardProps) {
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

        <div className="relative z-10 p-5">

          {/* Header: nome + ranking */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1.5">
                {team.userRole === 'leader' && (
                  <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                    <Crown className="w-4 h-4 shrink-0" style={{ color: team.gradientFrom }} />
                  </motion.div>
                )}
                <h3 className="text-white font-black text-xl tracking-tight leading-none truncate">{team.name}</h3>
              </div>
              <span
                className="inline-block text-[13px] font-black px-3 py-1 rounded-lg tracking-widest"
                style={{ color: team.gradientFrom, background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}40` }}
              >
                #{team.tag}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5 shrink-0">
              {!isLarge && (
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    border: '2px solid transparent',
                    background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
                    boxShadow: `0 0 10px -4px ${team.gradientFrom}80`,
                  }}
                >
                  <div className="absolute inset-0 opacity-15 blur-lg pointer-events-none" style={{ background: `radial-gradient(circle, ${team.gradientFrom}, transparent)` }} />
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="font-black text-base tracking-widest relative z-10" style={{ color: team.gradientFrom }}>{team.tag}</span>
                  )}
                </div>
              )}
              <span className="text-lg font-black" style={{ color: team.gradientFrom }}>#{team.ranking}</span>
            </div>
          </div>

          {/* Layout condicional: lista + logo grande (isLarge) */}
          <div className={isLarge ? 'flex gap-12 mb-4 items-center' : ''}>
            <div className={isLarge ? 'flex-1 min-w-0' : ''}>
              {/* Slots de rota */}
              <div className="bg-black/30 rounded-xl px-3 py-2 mb-4 space-y-0.5 border border-white/[0.04]">
                {['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES1', 'RES2'].map((roleKey) => {
                  const isRes = roleKey.startsWith('RES');
                  const role = isRes ? 'RES' : roleKey as Role;
                  const resIndex = isRes ? parseInt(roleKey.slice(3)) - 1 : -1;
                  const player = isRes
                    ? team.players.filter(p => p.role === 'RES')[resIndex]
                    : team.players.find(p => p.role === role);
                  const isApplied = appliedSlots.includes(`${team.id}-${roleKey}`) || (isRes && appliedSlots.includes(`${team.id}-RES`));
                  return (
                    <RoleRow
                      key={roleKey}
                      role={role}
                      player={player}
                      team={team}
                      isApplied={isApplied}
                      labelOverride={isRes ? `R${resIndex + 1}` : undefined}
                    />
                  );
                })}
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { icon: <Flame className="w-3 h-3" style={{ color: team.gradientFrom }} />, label: 'PDL',  value: team.pdl.toLocaleString('pt-BR'),            color: team.gradientFrom },
                  { icon: <TrendingUp className="w-3 h-3 text-green-400" />,                  label: 'WIN%', value: `${team.winrate}%`,                          color: '#4ade80' },
                  { icon: <Trophy className="w-3 h-3 text-white/30" />,                       label: 'W/L',  value: `${team.wins}/${team.gamesPlayed - team.wins}`, color: 'white' },
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

            {/* Logo grande lateral (só no isLarge) */}
            {isLarge && (
              <div className="shrink-0 flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-64 h-64 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    border: '3px solid transparent',
                    background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
                    boxShadow: `0 0 25px -8px ${team.gradientFrom}60`,
                  }}
                >
                  <div className="absolute inset-0 opacity-20 blur-2xl pointer-events-none" style={{ background: `radial-gradient(circle at center, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}, transparent)` }} />
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-10" />
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full relative z-10">
                      <span className="font-black text-3xl tracking-widest" style={{ color: team.gradientFrom }}>{team.tag}</span>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </div>

          {/* Poder financeiro */}
          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
            style={{ background: `${team.gradientFrom}0d`, borderColor: `${team.gradientFrom}30` }}
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" style={{ color: team.gradientFrom }} />
              <span className="text-xs text-white/50">Poder Financeiro</span>
            </div>
            <span className="font-bold text-sm text-white">{formatBRL(financial)}</span>
          </div>

          <div className="mt-3 flex items-center justify-end gap-1 text-xs text-white/20">
            <span>Ver detalhes</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
