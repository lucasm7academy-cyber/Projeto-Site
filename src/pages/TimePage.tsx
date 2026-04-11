import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Crown, Trophy, Wallet, Users, Send,
  ChevronRight, ShieldCheck, LogOut, Paintbrush, Settings,
  UserPlus, UserX, Check, Plus, RefreshCw, X, Search, Upload,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { buildProfileIconUrl, buscarElo } from '../api/riot';
import { useSound } from '../hooks/useSound';
import { AnimatePresence as AP } from 'motion/react';
import {
  PlayerDetailModal,
  type Jogador,
  type Role,
  ROLE_CONFIG,
  TIER_MAP,
} from '../components/players/PlayerDetailModal';

// ── tipos ─────────────────────────────────────────────────────────────────────
interface Membro {
  userId:   string;
  riotId:   string;
  role:     Role;
  cargo:    string;
  isLeader: boolean;
  elo:      string;
  balance:  number;
  // enriquecidos após busca
  iconeId?: number;
  nivel?:   number;
  puuid?:   string;
}

interface TimeData {
  id:           string | number;
  nome:         string;
  tag:          string;
  logoUrl?:     string;
  gradientFrom: string;
  gradientTo:   string;
  pdl:          number;
  winrate:      number;
  ranking:      number;
  wins:         number;
  gamesPlayed:  number;
  donoId:       string;
  torneio?:     string;
  membros:      Membro[];
}

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ROLE_ORDER: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES'];

const ELO_COLORS: Record<string, string> = {
  Ferro: 'text-gray-500', Bronze: 'text-amber-600', Prata: 'text-gray-300',
  Ouro: 'text-yellow-400', Platina: 'text-cyan-400', Esmeralda: 'text-emerald-400',
  Diamante: 'text-blue-400', Mestre: 'text-amber-500',
  'Grão-Mestre': 'text-red-400', Desafiante: 'text-yellow-300',
};

const getEloColor = (elo: string) => ELO_COLORS[elo.split(' ')[0]] ?? 'text-white/60';

const sortPlayers = (players: any[]) =>
  [...players].sort((a, b) => {
    const oa = ROLE_ORDER.indexOf(a.role);
    const ob = ROLE_ORDER.indexOf(b.role);
    return oa !== ob ? oa - ob : (a.riotId || a.name || '').localeCompare(b.riotId || b.name || '');
  });

// ── helpers ───────────────────────────────────────────────────────────────────
function eloDisplay(elo: string): string {
  if (!elo) return 'Sem Rank';
  const tier = TIER_MAP[elo.toUpperCase()] ?? elo;
  return tier;
}

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
        background: 'rgba(13, 13, 13, 0.6)',
        boxShadow: `0 0 45px -10px ${gradientFrom}60`,
        backdropFilter: 'blur(16px)'
      } : {
        background: 'rgba(13, 13, 13, 0.6)',
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
async function uploadLogoTime(file: File, timeId: string): Promise<string | null> {
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${timeId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('team-logos')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('[uploadLogoTime] erro:', error);
    return null;
  }

  const { data } = supabase.storage.from('team-logos').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

function validarImagem(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve('O arquivo deve ser uma imagem.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      resolve('A imagem deve ter no máximo 2MB.');
      return;
    }
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width > 1080 || img.height > 1080) {
        resolve('A imagem deve ter no máximo 1080x1080px.');
      } else {
        resolve(null);
      }
    };
  });
}

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

// ── Modais ──────────────────────────────────────────────────────────────────
const InvitePlayerModal = ({ team, onClose }: { team: TimeData; onClose: () => void }) => {
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
      if (team.membros.some(m => m.role === selectedRole)) { setError('Posição já preenchida no time'); return; }
    } else {
      if (team.membros.filter(m => m.role === 'RES').length >= 2) { setError('Máximo de 2 reservas atingido'); return; }
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
        background: 'rgba(13, 13, 13, 0.6)',
        border: `3px solid ${team.gradientFrom}`,
        boxShadow: `0 0 35px -10px ${team.gradientFrom}70`,
        backdropFilter: 'blur(16px)'
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
                        const iconUrl = p.profile_icon_id ? buildProfileIconUrl(p.profile_icon_id) : null;
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
                        ? <img src={buildProfileIconUrl(selectedPlayer.profile_icon_id)} alt="" className="w-full h-full object-cover" />
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
                className="flex-[1.5] py-3 rounded-xl text-sm font-black transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
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

const RequestEntryModal = ({ team, onClose }: { team: TimeData; onClose: () => void }) => {
  const { playSound } = useSound();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myRiotAccount, setMyRiotAccount] = useState<any>(null);

  useEffect(() => {
    const fetchMyAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('contas_riot').select('*').eq('user_id', user.id).maybeSingle();
      setMyRiotAccount(data);
    };
    fetchMyAccount();
  }, []);

  const handleRequest = async () => {
    if (!selectedRole) return;
    if (!myRiotAccount) {
      setError('Você precisa vincular uma conta Riot primeiro.');
      return;
    }
    
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const { error: insertError } = await supabase.from('time_convites').insert({
      time_id: team.id,
      de_user_id: user.id,
      para_user_id: team.donoId,
      riot_id: myRiotAccount.riot_id,
      role: selectedRole,
      mensagem: message || null,
      tipo: 'solicitacao',
      status: 'pendente',
    });

    setSending(false);
    if (insertError) {
      console.error(insertError);
      setError('Erro ao enviar solicitação. Tente novamente.');
      return;
    }
    playSound('success');
    setSent(true);
    setTimeout(onClose, 1800);
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="rounded-2xl overflow-hidden relative" style={{
        background: 'rgba(13, 13, 13, 0.6)',
        border: `3px solid ${team.gradientFrom}`,
        boxShadow: `0 0 35px -10px ${team.gradientFrom}70`,
        backdropFilter: 'blur(16px)'
      }}>
        <div className="relative z-10">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between" style={{ background: `${team.gradientFrom}08` }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${team.gradientFrom}25` }}>
                <Send className="w-4 h-4" style={{ color: team.gradientFrom }} />
              </div>
              <h2 className="text-white font-black text-lg">Solicitar Entrada</h2>
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
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">1. Selecionar Rota Desejada</label>
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
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">2. Mensagem (Opcional)</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Conte por que você quer entrar no time..." rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={handleRequest} disabled={!selectedRole || sent || sending}
                className="flex-[1.5] py-3 rounded-xl text-sm font-black transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                style={{ background: team.gradientFrom, color: 'white' }}>
                {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</> : sent ? <><Check className="w-4 h-4" /> Enviado!</> : <><Send className="w-4 h-4" /> Enviar Solicitação</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalBase>
  );
};

const EditTeamModal = ({
  team, onClose, onSave,
}: {
  team: TimeData;
  onClose: () => void;
  onSave: (updated: Partial<TimeData>) => void;
}) => {
  const { playSound } = useSound();
  const [name, setName] = useState(team.nome);
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
    setLogoPreview(URL.createObjectURL(file));
    const url = await uploadLogoTime(file, String(team.id));
    setLogoUploading(false);
    if (url) { playSound('click'); setLogoPreview(url); }
    else setLogoError('Falha no upload. Tente novamente.');
  };

  const handleSave = () => {
    if (logoUploading) return;
    playSound('success');
    onSave({
      nome: name,
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
          background: 'rgba(13, 13, 13, 0.6)',
          border: `3px solid ${theme.from}`,
          boxShadow: `0 0 35px -10px ${theme.from}70`,
          backdropFilter: 'blur(16px)'
        }}
      >
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
          <div className="space-y-1.5">
            <label className="text-white/40 text-xs uppercase tracking-widest">Nome do Time</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={24}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/40 text-xs uppercase tracking-widest">Tag (3 letras)</label>
            <input
              value={tag}
              onChange={e => setTag(e.target.value.toUpperCase().slice(0, 3))}
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
                  background: `linear-gradient(rgba(13, 13, 13, 0.6), rgba(13, 13, 13, 0.6)) padding-box, linear-gradient(135deg, ${theme.from}, ${theme.to}) border-box`,
                  boxShadow: `0 0 12px -4px ${theme.from}80`,
                  backdropFilter: 'blur(8px)'
                }}
              >
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
              
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <div
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all cursor-pointer"
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
            <div
              className="h-8 rounded-xl mt-1"
              style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm font-bold hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl text-sm font-black transition-all"
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

const ManageLineupModal = ({
  team, onClose, onUpdateTeam,
}: {
  team: TimeData;
  onClose: () => void;
  onUpdateTeam: (players: Membro[]) => void;
}) => {
  const { playSound } = useSound();
  const [membros, setMembros] = useState<Membro[]>(sortPlayers(team.membros));
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePromote = (userId: string) => {
    playSound('click');
    setMembros(m => m.map(mb => ({ ...mb, isLeader: mb.userId === userId })));
  };

  const handleRemove = (userId: string) => {
    playSound('click');
    setMembros(m => m.filter(mb => mb.userId !== userId));
    setConfirmRemove(null);
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    playSound('click');
    setError(null);
    setMembros(m => sortPlayers(m.map(mb => mb.userId === userId ? { ...mb, role: newRole } : mb)));
  };

  const handleSave = () => {
    setError(null);
    const roles = membros.map(m => m.role).filter(r => r !== 'RES');
    const hasDuplicates = new Set(roles).size !== roles.length;
    if (hasDuplicates) {
      setError('Posições duplicadas');
      playSound('click');
      return;
    }
    const reserves = membros.filter(m => m.role === 'RES');
    if (reserves.length > 2) {
      setError('Máximo de 2 reservas');
      playSound('click');
      return;
    }
    playSound('success');
    onUpdateTeam(membros);
    onClose();
  };

  return (
    <ModalBase onClose={onClose}>
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ 
          background: 'rgba(13, 13, 13, 0.6)',
          border: '3px solid transparent',
          backgroundImage: `linear-gradient(rgba(13, 13, 13, 0.6), rgba(13, 13, 13, 0.6)) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box`,
          boxShadow: `0 0 35px -10px ${team.gradientFrom}70`,
          backdropFilter: 'blur(16px)'
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
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0"><X className="w-4 h-4 text-red-400" /></div>
              <p className="text-red-400 text-xs font-medium">{error}</p>
            </motion.div>
          )}
          {membros.map(m => {
            const cfg = ROLE_CONFIG[m.role];
            return (
              <div key={m.userId} className="flex items-center gap-3 bg-[rgba(13,13,13,0.6)] rounded-xl p-3 border border-white/10 hover:border-white/20 transition-all">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <img src={cfg.img} alt={cfg.label} className="w-5 h-5 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm truncate">{m.riotId.split('#')[0]}</p>
                    {m.isLeader && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border flex-shrink-0"
                        style={{ color: team.gradientFrom, borderColor: `${team.gradientFrom}50`, background: `${team.gradientFrom}18` }}>
                        CAP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-xs ${getEloColor(m.elo)}`}>{eloDisplay(m.elo)}</p>
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value as Role)}
                      className="bg-black/40 text-white/60 text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 focus:outline-none focus:border-white/30 cursor-pointer"
                    >
                      {(Object.keys(ROLE_CONFIG) as Role[]).map(r => (
                        <option key={r} value={r} className="bg-[#0d0d0d]/90">{ROLE_CONFIG[r].label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {confirmRemove === m.userId ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/40 text-xs">Confirmar?</span>
                    <button onClick={() => handleRemove(m.userId)} className="px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30">Sim</button>
                    <button onClick={() => setConfirmRemove(null)} className="px-2 py-1 bg-white/5 text-white/40 rounded-lg text-xs hover:bg-white/10">Não</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {!m.isLeader && (
                      <>
                        <button onClick={() => handlePromote(m.userId)} className="p-1.5 rounded-lg bg-white/5 hover:bg-yellow-400/20 text-white/30 hover:text-yellow-400 transition-all" title="Promover a Capitão"><Crown className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmRemove(m.userId)} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all" title="Expulsar"><UserX className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={handleSave} className="w-full mt-2 py-3 rounded-xl font-black text-white text-sm transition-all" style={{ background: team.gradientFrom }}>Salvar Lineup</button>
        </div>
      </div>
    </div>
  </ModalBase>
);
};

const ConfirmLeaveModal = ({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) => {
  const { playSound } = useSound();
  return (
    <ModalBase onClose={onClose} title="Sair da Equipe">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
          <LogOut className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <p className="text-white font-black text-xl">Tem certeza?</p>
          <p className="text-white/40 text-sm mt-2">Você perderá acesso ao chat e lineup da equipe.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">Cancelar</button>
          <button onClick={() => { playSound('click'); onConfirm(); }} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-black hover:bg-red-600 transition-all">Sair do Time</button>
        </div>
      </div>
    </ModalBase>
  );
};

// ── componente ────────────────────────────────────────────────────────────────
export default function TimePage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { playSound } = useSound();

  const [time,    setTime]    = useState<TimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'leader' | 'member' | 'visitor'>('visitor');

  const [selectedJogador, setSelectedJogador] = useState<{ jogador: Jogador; puuid?: string } | null>(null);

  const [modalConvidar, setModalConvidar] = useState(false);
  const [modalSolicitar, setModalSolicitar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalLineup, setModalLineup] = useState(false);
  const [modalSair, setModalSair] = useState(false);
  const [notCapSidebar, setNotCapSidebar] = useState(false);

  // ── carregar ────────────────────────────────────────────────────────────────
  const load = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? null;
    setCurrentUserId(uid);

    const { data: t, error } = await supabase
      .from('times')
      .select('*, time_membros(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !t) { setLoading(false); return; }

    // Enriquecer membros com dados da Riot
    const membrosRaw: Membro[] = (t.time_membros ?? []).map((m: any) => ({
      userId:   m.user_id,
      riotId:   m.riot_id || 'Jogador',
      role:     (m.role || 'TOP') as Role,
      cargo:    m.cargo || 'jogador',
      isLeader: m.is_leader || false,
      elo:      m.elo || '',
      balance:  Number(m.balance) || 0,
    }));

    // Buscar dados Riot de todos os membros em paralelo
    const userIds = membrosRaw.map(m => m.userId).filter(Boolean);
    if (userIds.length > 0) {
      const { data: contas } = await supabase
        .from('contas_riot')
        .select('user_id, profile_icon_id, level, puuid')
        .in('user_id', userIds);

      const contaMap: Record<string, any> = {};
      (contas ?? []).forEach((c: any) => { contaMap[c.user_id] = c; });

      membrosRaw.forEach(m => {
        const c = contaMap[m.userId];
        if (c) {
          m.iconeId = c.profile_icon_id ?? 1;
          m.nivel   = c.level ?? 1;
          m.puuid   = c.puuid ?? undefined;
        }
      });
    }

    let role: 'leader' | 'member' | 'visitor' = 'visitor';
    if (uid) {
      if (t.dono_id === uid) role = 'leader';
      else if (membrosRaw.some(m => m.userId === uid)) role = 'member';
    }
    setUserRole(role);

    setTime({
      id:           t.id,
      nome:         t.nome,
      tag:          t.tag,
      logoUrl:      t.logo_url ?? undefined,
      gradientFrom: t.gradient_from || '#FFB700',
      gradientTo:   t.gradient_to   || '#FF6600',
      pdl:          t.pdl           || 0,
      winrate:      t.winrate       || 0,
      ranking:      t.ranking       || 999,
      wins:         t.wins          || 0,
      gamesPlayed:  t.games_played  || 0,
      donoId:       t.dono_id,
      torneio:      t.torneio       ?? undefined,
      membros:      membrosRaw,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  // Busca elo real dos membros em background após carregar o time
  useEffect(() => {
    if (!time || time.membros.length === 0) return;
    let cancelado = false;

    const fetchElos = async () => {
      for (const membro of time.membros) {
        if (cancelado) break;
        if (!membro.puuid) continue;
        let ranqueadas: any[] = [];
        try {
          ranqueadas = await buscarElo(membro.puuid);
        } catch {
          await new Promise(r => setTimeout(r, 3000));
          if (cancelado) break;
          try { ranqueadas = await buscarElo(membro.puuid); } catch { ranqueadas = []; }
        }
        if (cancelado) break;
        const solo = ranqueadas.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');
        const eloStr = solo ? (TIER_MAP[solo.tier] ?? solo.tier) : '';
        setTime((prev: TimeData | null) => {
          if (!prev) return prev;
          return {
            ...prev,
            membros: prev.membros.map((m: Membro) =>
              m.userId === membro.userId ? { ...m, elo: eloStr } : m
            ),
          };
        });
        await new Promise(r => setTimeout(r, 700));
      }
    };

    fetchElos();
    return () => { cancelado = true; };
  }, [time?.id]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleUpdateTeam = async (updated: Partial<TimeData>) => {
    if (!time) return;
    const { error } = await supabase
      .from('times')
      .update({
        nome:          updated.nome,
        tag:           updated.tag,
        gradient_from: updated.gradientFrom,
        gradient_to:   updated.gradientTo,
        logo_url:      updated.logoUrl ?? null,
      })
      .eq('id', time.id);

    if (error) {
      console.error('[handleUpdateTeam] Erro ao salvar time:', error);
      return;
    }
    load();
  };

  const handleUpdatePlayers = async (membros: Membro[]) => {
    if (!time) return;
    await supabase.from('time_membros').delete().eq('time_id', time.id);
    if (membros.length > 0) {
      await supabase.from('time_membros').insert(
        membros.map(m => ({
          time_id:   time.id,
          user_id:   m.userId,
          riot_id:   m.riotId,
          cargo:     m.isLeader ? 'lider' : 'jogador',
          role:      m.role,
          is_leader: m.isLeader || false,
          elo:       m.elo,
          balance:   m.balance,
        }))
      );
    }
    load();
  };

  const handleSairTime = async () => {
    if (!currentUserId || !time) return;
    const { data: todosMembros, error: errQuery } = await supabase
      .from('time_membros')
      .select('user_id, is_leader')
      .eq('time_id', time.id);

    if (errQuery) return;
    const restantes = (todosMembros || []).filter(m => m.user_id !== currentUserId);

    if (restantes.length === 0) {
      await supabase.from('time_membros').delete().eq('time_id', time.id);
      await supabase.from('times').delete().eq('id', time.id);
      navigate('/times');
    } else {
      if (userRole === 'leader') {
        const novoCapitao = restantes[0];
        await supabase
          .from('time_membros')
          .update({ is_leader: true, cargo: 'lider' })
          .eq('time_id', time.id)
          .eq('user_id', novoCapitao.user_id);
        await supabase
          .from('times')
          .update({ dono_id: novoCapitao.user_id })
          .eq('id', time.id);
      }
      await supabase
        .from('time_membros')
        .delete()
        .eq('time_id', time.id)
        .eq('user_id', currentUserId);
      navigate('/times');
    }
  };

  const handleSidebarLineup = () => {
    if (userRole === 'leader') {
      playSound('click');
      setModalLineup(true);
    } else {
      playSound('click');
      setNotCapSidebar(true);
      setTimeout(() => setNotCapSidebar(false), 3000);
    }
  };

  // ── abrir modal de jogador ──────────────────────────────────────────────────
  const handlePlayerClick = (m: Membro) => {
    if (!m.puuid && !m.userId) return;
    playSound('click');
    const jogador: Jogador = {
      id:               m.userId,
      riotId:           m.riotId,
      nome:             m.riotId.split('#')[0],
      nivel:            m.nivel ?? 1,
      elo:              'Ferro',
      iconeId:          m.iconeId ?? 1,
      partidas:         0,
      winRate:          0,
      titulos:          0,
      rolePrincipal:    m.role,
      roleSecundaria:   'RES',
      isVIP:            false,
      isVerified:       true,
      kda:              0,
      csPorMinuto:      0,
      participacaoKill: 0,
      conquistas:       [],
      timeTag:          time?.tag,
      timeColor:        time?.gradientFrom,
      timeLogo:         time?.logoUrl,
      timeId:           time?.id,
    };
    setSelectedJogador({ jogador, puuid: m.puuid });
  };

  // ── loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!time) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/40 font-bold uppercase tracking-widest">Time não encontrado</p>
        <button onClick={() => navigate('/times')} className="text-primary text-sm hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar para Equipes
        </button>
      </div>
    );
  }

  const totalSaldo = time.membros.reduce((s, m) => s + m.balance, 0);
  const lider = time.membros.find(m => m.isLeader);

  return (
    <>
      <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
        {/* Voltar */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/times')}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold">Equipes</span>
        </motion.button>

        {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden mb-6 border border-white/10"
          style={{ background: `linear-gradient(135deg, ${time.gradientFrom}22, #0d0d0d 60%)` }}
        >
          {/* glow de fundo */}
          <div
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full blur-[120px] opacity-30 pointer-events-none"

          />

          <div className="relative z-10 p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Logo */}
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center shrink-0 relative overflow-hidden"
              style={{
                border: `3px solid transparent`,
                background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${time.gradientFrom}, ${time.gradientTo}) border-box`,
                boxShadow: `0 0 40px -10px ${time.gradientFrom}`,
              }}
            >
              {time.logoUrl ? (
                <img src={time.logoUrl} alt={time.nome} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-3xl tracking-widest" style={{ color: time.gradientFrom }}>
                  {time.tag}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
                <h1 className="text-4xl font-black text-white uppercase tracking-tight">{time.nome}</h1>
                {userRole === 'leader' && <Crown className="w-5 h-5 shrink-0" style={{ color: time.gradientFrom }} />}
              </div>
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-4">
                <span
                  className="text-[11px] font-black px-2 py-0.5 rounded-lg tracking-widest"
                  style={{ color: time.gradientFrom, background: `${time.gradientFrom}18`, border: `1px solid ${time.gradientFrom}40` }}
                >
                  #{time.tag}
                </span>
                <span className="text-white/30 text-[11px] font-black">Ranking #{time.ranking}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── GRID: LINEUP + INFO ─────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* LINEUP */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="md:col-span-2 rounded-3xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: time.gradientFrom }} />
              <h2 className="text-white font-black text-sm uppercase tracking-widest">Lineup</h2>
              <span className="ml-auto text-white/30 text-[11px]">{time.membros.length} jogadores</span>
            </div>

            <div className="p-4 space-y-2">
              {ROLE_ORDER.map(role => {
                const membrosRole = time.membros.filter(m => m.role === role);
                const cfg = ROLE_CONFIG[role];

                if (membrosRole.length === 0) {
                  return (
                    <div
                      key={role}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-white/5 opacity-30"
                    >
                      <div className="flex items-center gap-2 w-16 shrink-0">
                        <img src={cfg.img} alt={cfg.label} className="w-5 h-5 object-contain opacity-40" />
                        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <span className="text-white/20 text-sm">Vaga aberta</span>
                    </div>
                  );
                }

                return membrosRole.map((m, idx) => (
                  <motion.div
                    key={m.userId}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handlePlayerClick(m)}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] cursor-pointer transition-all"
                  >
                    {/* Role */}
                    <div className="flex items-center gap-2 w-16 shrink-0">
                      <img src={cfg.img} alt={cfg.label} className="w-5 h-5 object-contain" />
                      <span className={`text-xs font-bold ${cfg.color}`}>
                        {role === 'RES' ? `R${idx + 1}` : cfg.label}
                      </span>
                    </div>

                    {/* Avatar */}
                    {m.iconeId ? (
                      <img
                        src={buildProfileIconUrl(m.iconeId)}
                        alt={m.riotId}
                        className="w-9 h-9 rounded-xl border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 shrink-0 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white/20" />
                      </div>
                    )}

                    {/* Nome + cargo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-sm truncate">{m.riotId.split('#')[0]}</span>
                        {m.isLeader && (
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 border"
                            style={{ color: time.gradientFrom, borderColor: `${time.gradientFrom}60`, background: `${time.gradientFrom}18` }}
                          >
                            CAP
                          </span>
                        )}
                        {m.puuid && <ShieldCheck className="w-3 h-3 text-green-400 shrink-0" />}
                      </div>
                      <span className="text-white/30 text-[11px]">{m.riotId.split('#')[1] ? `#${m.riotId.split('#')[1]}` : ''}</span>
                    </div>

                    {/* Elo */}
                    <span className="text-white/40 text-xs font-semibold shrink-0">{eloDisplay(m.elo)}</span>

                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                  </motion.div>
                ));
              })}
            </div>
          </motion.div>

          {/* COLUNA DIREITA */}
          <div className="md:row-span-2 flex flex-col gap-4">
            {/* Capitão */}
            {lider && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-3xl border border-white/10 p-5 overflow-hidden"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-3">Capitão</p>
                <div
                  className="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer hover:brightness-110 transition-all"
                  style={{ background: `${time.gradientFrom}0e`, borderColor: `${time.gradientFrom}35` }}
                  onClick={() => handlePlayerClick(lider)}
                >
                  {lider.iconeId ? (
                    <img
                      src={buildProfileIconUrl(lider.iconeId)}
                      alt={lider.riotId}
                      className="w-10 h-10 rounded-xl border"
                      style={{ borderColor: `${time.gradientFrom}60` }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                      <Crown className="w-5 h-5" style={{ color: time.gradientFrom }} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-black text-sm truncate">{lider.riotId.split('#')[0]}</p>
                    <p className="text-xs font-bold" style={{ color: time.gradientFrom }}>Capitão</p>
                  </div>
                  <Crown className="w-4 h-4 ml-auto shrink-0" style={{ color: time.gradientFrom }} />
                </div>
              </motion.div>
            )}

            {/* Gerenciar */}
            {(userRole === 'leader' || userRole === 'member') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="rounded-3xl border border-white/10 p-5 overflow-hidden space-y-2"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-3">Gerenciar</p>
                {[
                  { icon: UserPlus,    label: 'Convidar Jogador', action: () => { playSound('click'); setModalConvidar(true); } },
                  { icon: Paintbrush, label: 'Editar Time',       action: () => { playSound('click'); setModalEditar(true); }   },
                  { icon: Users,      label: 'Gerenciar Lineup',  action: handleSidebarLineup },
                ].map(({ icon: Icon, label, action }) => (
                  <button
                    key={label} onClick={action}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-white/60 hover:text-white text-sm font-medium transition-all group"
                  >
                    <Icon className="w-4 h-4 transition-transform"
                      style={{ color: time.gradientFrom }} />
                    {label}
                  </button>
                ))}
                {notCapSidebar && (
                  <p className="text-yellow-400/80 text-[11px] font-semibold text-center py-1">
                    Apenas o capitão pode gerenciar o lineup
                  </p>
                )}
                <div className="pt-2 mt-2 border-t border-white/5" />
                <button
                  onClick={() => { playSound('click'); setModalSair(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 hover:border-red-500/30 text-red-400/70 hover:text-red-400 text-sm font-medium transition-all group"
                >
                  <LogOut className="w-4 h-4 transition-transform" />
                  Sair da Equipe
                </button>
              </motion.div>
            )}

            {/* Histórico */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex-1 rounded-3xl border border-white/10 p-5 flex flex-col"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-white/20" />
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Histórico</p>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center py-4">
                <p className="text-white/20 text-sm">Em breve</p>
                <span className="text-xs text-white/10 bg-white/5 px-2 py-0.5 rounded-full mt-2 inline-block">Campeonatos</span>
              </div>
            </motion.div>

            {/* Solicitar entrada (visitante) */}
            {userRole === 'visitor' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  onClick={() => { playSound('click'); setModalSolicitar(true); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: `${time.gradientFrom}18`,
                    border: `1px solid ${time.gradientFrom}50`,
                    color: time.gradientFrom,
                  }}
                >
                  <Send className="w-4 h-4" /> Solicitar Entrada
                </button>
              </motion.div>
            )}
          </div>

          {/* STATUS DO TIME */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="md:col-span-2 rounded-3xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <Trophy className="w-4 h-4" style={{ color: time.gradientFrom }} />
              <h2 className="text-white font-black text-sm uppercase tracking-widest">Status do Time</h2>
            </div>

            <div className="p-6 grid grid-cols-2 sm:grid-cols-5 gap-6">
              {[
                { label: 'PDL',      val: time.pdl.toLocaleString('pt-BR'), icon: ShieldCheck },
                { label: 'Win Rate', val: `${time.winrate}%`, icon: RefreshCw },
                { label: 'Vitórias', val: `${time.wins}/${time.gamesPlayed}`, icon: Check },
                { label: 'Torneio',  val: time.torneio ?? 'Nenhum', icon: Trophy },
                { label: 'Rating',   val: `#${time.ranking}`, icon: Crown },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center sm:items-start">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className="w-3 h-3 text-white/20" />
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
                  </div>
                  <p className="font-black text-xl text-white leading-none">{s.val}</p>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* Player Detail Modal */}
      <AnimatePresence>
        {selectedJogador && (
          <PlayerDetailModal
            jogador={selectedJogador.jogador}
            puuid={selectedJogador.puuid}
            onClose={() => setSelectedJogador(null)}
          />
        )}
        {modalConvidar && <InvitePlayerModal team={time} onClose={() => setModalConvidar(false)} />}
        {modalSolicitar && <RequestEntryModal team={time} onClose={() => setModalSolicitar(false)} />}
        {modalEditar && (
          <EditTeamModal team={time} onClose={() => setModalEditar(false)} onSave={handleUpdateTeam} />
        )}
        {modalLineup && (
          <ManageLineupModal team={time} onClose={() => setModalLineup(false)} onUpdateTeam={handleUpdatePlayers} />
        )}
        {modalSair && (
          <ConfirmLeaveModal onClose={() => setModalSair(false)} onConfirm={handleSairTime} />
        )}
      </AnimatePresence>
    </>
  );
}
