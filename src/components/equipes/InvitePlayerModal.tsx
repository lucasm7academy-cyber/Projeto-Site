import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, X, Search, RefreshCw, Plus, Check, Send } from 'lucide-react';
import { useSound } from '../../hooks/useSound';
import { supabase } from '../../lib/supabase';
import { Team, Role, ROLE_CONFIG } from '../../types/team';
import ModalBase from './ModalBase';

interface InvitePlayerModalProps {
  team: Team;
  onClose: () => void;
}

const InvitePlayerModal = ({ team, onClose }: InvitePlayerModalProps) => {
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
    if (query.length < 2) {
      setSearchResults([]);
      setNotFound(false);
      return;
    }
    setSearching(true);
    setNotFound(false);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('contas_riot')
        .select('user_id, riot_id, profile_icon_id, level')
        .ilike('riot_id', `%${query}%`)
        .limit(5);
      setSearching(false);
      if (!data || data.length === 0) {
        setNotFound(true);
        setSearchResults([]);
      } else {
        setSearchResults(data);
        setNotFound(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleInvite = async () => {
    if (!selectedPlayer || !selectedRole) return;

    if (selectedRole !== 'RES') {
      const alreadyTaken = team.players.some(p => p.role === selectedRole);
      if (alreadyTaken) {
        setError('Posição já preenchida no time');
        return;
      }
    } else {
      const reserves = team.players.filter(p => p.role === 'RES');
      if (reserves.length >= 2) {
        setError('Máximo de 2 reservas atingido');
        return;
      }
    }

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const { error: insertError } = await supabase.from('time_convites').insert({
      time_id:      team.id,
      de_user_id:   user.id,
      para_user_id: selectedPlayer.user_id,
      riot_id:      selectedPlayer.riot_id,
      role:         selectedRole,
      mensagem:     message || null,
      tipo:         'convite',
      status:       'pendente',
    });

    setSending(false);
    if (insertError) {
      setError('Erro ao enviar convite. Tente novamente.');
      return;
    }
    playSound('success');
    setSent(true);
    setTimeout(onClose, 1800);
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
          <div
            className="px-6 py-4 border-b border-white/8 flex items-center justify-between"
            style={{ background: `${team.gradientFrom}08` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${team.gradientFrom}25` }}>
                <UserPlus className="w-4 h-4" style={{ color: team.gradientFrom }} />
              </div>
              <h2 className="text-white font-black text-lg">Convidar Jogador</h2>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
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

            {/* 1. Buscar Player */}
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">1. Buscar Player</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setSelectedPlayer(null);
                    setError(null);
                  }}
                  placeholder="Buscar por Riot ID (ex: Player#BR1)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30"
                />
                {searching && (
                  <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 animate-spin" />
                )}
              </div>

              {query.length >= 2 && !selectedPlayer && !searching && (
                <div className="mt-2">
                  {notFound ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <p className="text-white/40 text-xs font-medium">Player não cadastrado na plataforma</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {searchResults.map(p => {
                        const iconUrl = p.profile_icon_id
                          ? `https://ddragon.leagueoflegends.com/cdn/14.19.1/img/profileicon/${p.profile_icon_id}.png`
                          : null;
                        return (
                          <button
                            key={p.user_id}
                            onClick={() => { playSound('click'); setSelectedPlayer(p); }}
                            className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl p-3 border border-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                                {iconUrl
                                  ? <img src={iconUrl} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-white/60 text-xs font-bold">{p.riot_id.charAt(0).toUpperCase()}</span>
                                }
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
                        : <Check className="w-4 h-4" style={{ color: team.gradientFrom }} />
                      }
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

            {/* 2. Selecionar Rota */}
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">2. Selecionar Rota</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ROLE_CONFIG) as Role[]).map(role => {
                  const cfg = ROLE_CONFIG[role];
                  const isSelected = selectedRole === role;
                  return (
                    <button
                      key={role}
                      onClick={() => { playSound('click'); setSelectedRole(role); setError(null); }}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                        isSelected ? 'bg-white/10 border-white/40' : 'bg-white/5 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <img src={cfg.img} alt={cfg.label} className={`w-4 h-4 object-contain ${isSelected ? 'opacity-100' : 'opacity-40'}`} />
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-white/40'}`}>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Mensagem (Opcional) */}
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">3. Mensagem (Opcional)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ex: Bora subir de elo? Precisamos de um main..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none"
              />
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvite}
                disabled={!selectedPlayer || !selectedRole || sent || sending}
                className="flex-[1.5] py-3 rounded-xl text-sm font-black transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                style={{ background: team.gradientFrom, color: 'white' }}
              >
                {sending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</>
                ) : sent ? (
                  <><Check className="w-4 h-4" /> Enviado!</>
                ) : (
                  <><Send className="w-4 h-4" /> Confirmar Convite</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalBase>
  );
};

export default InvitePlayerModal;
