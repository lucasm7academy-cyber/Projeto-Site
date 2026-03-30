import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, X, Crown, UserX } from 'lucide-react';
import { useSound } from '../../hooks/useSound';
import { Team, Player, Role, ROLE_CONFIG, getEloColor, sortPlayers } from '../../types/team';
import ModalBase from './ModalBase';

interface ManageLineupModalProps {
  team: Team;
  onClose: () => void;
  onUpdateTeam: (players: Player[]) => void;
}

const ManageLineupModal = ({ team, onClose, onUpdateTeam }: ManageLineupModalProps) => {
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
    const roles = players.map(p => p.role).filter(r => r !== 'RES');
    if (new Set(roles).size !== roles.length) {
      setError('Posições duplicadas');
      playSound('click');
      return;
    }
    if (players.filter(p => p.role === 'RES').length > 2) {
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
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-15 pointer-events-none" style={{ background: team.gradientFrom }} />

        <div className="relative z-10">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between" style={{ background: `${team.gradientFrom}08` }}>
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

export default ManageLineupModal;
