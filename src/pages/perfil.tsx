import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  CheckCircle,
  ChevronRight,
  Link as LinkIcon,
  ChevronDown,
  Pencil,
  Check,
  X,
  Users,
  Tv2,
  Youtube,
  MessageSquare,
  Wallet,
  LogOut,
  ShieldOff,
  ShieldCheck,
  Key,
  Mail
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getDDRVersion, buildProfileIconUrl } from '../api/riot';
import { sincronizarContaRiot } from '../api/player';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { VipLabel } from '../components/VipBadge';

const getImageUrl = (fileName: string) => {
  const { data } = supabase.storage
    .from('public-images')
    .getPublicUrl(fileName);
  return data.publicUrl;
};

const BACKGROUND_URL = getImageUrl('background.png');

const DDR_FALLBACK = '14.24.1';

const ELO_COLORS: Record<string, string> = {
  IRON: '#51484a',
  BRONZE: '#8c513a',
  SILVER: '#80989d',
  GOLD: '#cd8837',
  PLATINUM: '#4e9996',
  EMERALD: '#2eb042',
  DIAMOND: '#576bcc',
  MASTER: '#9d5ca3',
  GRANDMASTER: '#cd4545',
  CHALLENGER: '#f4c874',
};


const getCardStyle = () => ({
  border: '1px solid rgba(255, 255, 255, 0.1)',
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(16px)',
});

const LANES = [
  { id: 'Top',     label: 'Top Laner', file: 'Top_icon.png'           },
  { id: 'Jungle',  label: 'Caçador',   file: 'Jungle_icon.png'        },
  { id: 'Middle',  label: 'Mid Laner', file: 'Middle_icon.png'        },
  { id: 'Bottom',  label: 'Atirador',  file: 'Bottom_icon.png'        },
  { id: 'Support', label: 'Suporte',   file: 'Support_icon.png'       },
  { id: 'Fill',    label: 'Reserva',   file: 'icon-position-fill.png' },
];

const TIPOS_PIX = [
  { value: 'cpf',       label: 'CPF',              placeholder: '000.000.000-00'        },
  { value: 'email',     label: 'E-mail',            placeholder: 'seu@email.com'         },
  { value: 'telefone',  label: 'Telefone',          placeholder: '+55 (11) 99999-9999'   },
  { value: 'aleatoria', label: 'Chave aleatória',   placeholder: 'Cole sua chave aleatória' },
];

// Usando os caminhos do código fornecido pelo usuário
const getEloUrl  = (tier: string) => `/ranks/${tier.toLowerCase()}.png`;
const getLaneUrl = (file: string) => `/lanes/${file}`;
const LABEL_CLASS = 'text-xs text-white/30 font-normal uppercase tracking-widest';

const IgIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

// ---------- Bloco de Elo ----------
function EloBlock({ elo, label, delay = 0 }: { elo: any; label: string; delay?: number }) {
  const wr    = elo ? Math.round((elo.wins / (elo.wins + elo.losses)) * 100) : 0;
  const total = elo ? elo.wins + elo.losses : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-3xl p-8 transition-all border border-white/10 relative overflow-hidden group"
      style={getCardStyle()}
    >
      {/* Subtle Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary/10 transition-colors duration-500" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

        {/* Esquerda: info (4 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <span className={LABEL_CLASS}>{label}</span>
          {elo ? (
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl opacity-50" />
                <img src={getEloUrl(elo.tier)} alt={elo.tier}
                  className="relative w-28 h-28 object-contain z-10"
                  style={{ filter: `drop-shadow(0 0 12px ${ELO_COLORS[elo.tier] || 'rgba(255,255,255,0.2)'})` }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div>
                <p className="font-headline font-black text-3xl uppercase tracking-tight leading-tight text-white">
                  {elo.tier} <span className="text-primary">{elo.rank}</span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-black text-white/40 uppercase tracking-widest">
                    {elo.lp} PDL
                  </div>
                  <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-black text-white/40 uppercase tracking-widest">
                    {total} Partidas
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 flex items-center justify-center flex-shrink-0 bg-white/5 rounded-full border border-white/5">
                <ShieldOff className="w-10 h-10 text-white/10" />
              </div>
              <div>
                <p className="text-white/20 font-black text-xl uppercase tracking-tight">Sem Dados</p>
                <p className="text-white/10 text-xs uppercase tracking-widest mt-1">Nenhuma partida nesta fila</p>
              </div>
            </div>
          )}
        </div>

        {/* Direita: performance (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-center gap-6">
          <div className="flex items-center justify-between">
            <span className={LABEL_CLASS}>Performance Detalhada</span>
            {elo && <span className="text-[10px] font-black text-primary uppercase tracking-widest">{wr}% Win Rate</span>}
          </div>
          
          {elo ? (
            <div className="space-y-6">
              {/* W/L bar */}
              <div className="relative h-10 rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                <motion.div initial={{ width: 0 }} animate={{ width: `${wr}%` }}
                  transition={{ duration: 1, ease: 'circOut' }}
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-blue-400"
                />
                <motion.div initial={{ width: 0 }} animate={{ width: `${100 - wr}%` }}
                  transition={{ duration: 1, ease: 'circOut', delay: 0.1 }}
                  className="absolute right-0 top-0 h-full bg-gradient-to-l from-[#ff0033] to-[#ff4d4d]" />
                
                <div className="absolute inset-0 flex items-center justify-between px-6 z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-black uppercase tracking-widest drop-shadow-md">{elo.wins}V</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-black uppercase tracking-widest drop-shadow-md">{elo.losses}D</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Partidas', val: total, color: 'text-white/70' },
                  { label: 'Vitórias', val: elo.wins, color: 'text-blue-400' },
                  { label: 'Derrotas', val: elo.losses, color: 'text-red-400' },
                  { label: 'Win Rate', val: `${wr}%`, color: wr >= 50 ? 'text-blue-400' : 'text-red-400' }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-4 text-center border border-white/5 hover:bg-white/10 transition-colors">
                    <p className={`font-black text-lg ${item.color}`}>{item.val}</p>
                    <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 opacity-20">
              <div className="w-full h-10 rounded-2xl bg-white/5 border border-white/5" />
              <div className="grid grid-cols-4 gap-3 w-full mt-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-16 bg-white/5 rounded-2xl border border-white/5" />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}

// ---------- Seção Performance ----------
const ROLE_INFO: Record<string, { label: string; file: string }> = {
  TOP:     { label: 'Top Laner', file: 'Top_icon.png'            },
  JUNGLE:  { label: 'Caçador',   file: 'Jungle_icon.png'         },
  MIDDLE:  { label: 'Mid Laner', file: 'Middle_icon.png'         },
  BOTTOM:  { label: 'Atirador',  file: 'Bottom_icon.png'         },
  UTILITY: { label: 'Suporte',   file: 'Support_icon.png'        },
};

function PerformanceSection({ stats, ddrVer, delay = 0 }: { stats: any; ddrVer: string; delay?: number }) {
  if (!stats) return null;

  const semDados = stats.topChampions.length === 0 && stats.roles.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-3xl p-8 space-y-8 relative overflow-hidden"
      style={getCardStyle()}
    >
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      
      <div className="flex items-center justify-between relative z-10">
        <span className={LABEL_CLASS}>Análise de Performance</span>
        {stats.totalGames > 0 && (
          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{stats.totalGames} Partidas Analisadas</span>
          </div>
        )}
      </div>

      {semDados ? (
        <div className="flex flex-col items-center justify-center py-12 relative z-10">
          <ShieldOff className="w-12 h-12 text-white/5 mb-4" />
          <p className="text-white/20 text-sm font-black uppercase tracking-widest">Nenhum dado disponível</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-12 relative z-10">
          {/* Top 5 campeões */}
          {stats.topChampions.length > 0 && (
            <div className="space-y-6">
              <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">Campeões de Assinatura (Top 5)</p>
              <div className="grid grid-cols-1 gap-4">
                {stats.topChampions.slice(0, 5).map((champ: any, i: number) => (
                  <motion.div 
                    key={champ.championName} 
                    className="group relative bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="absolute -inset-1 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                          <img
                            src={`https://ddragon.leagueoflegends.com/cdn/${ddrVer}/img/champion/${champ.championName}.png`}
                            alt={champ.championName}
                            className="w-full h-full object-cover transition-transform duration-500"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-lg bg-black border border-white/10 flex items-center justify-center z-10">
                          <span className="text-primary text-[10px] font-black">{i + 1}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white font-black text-lg uppercase tracking-tight truncate">{champ.championName}</p>
                          <span className={`text-xs font-black uppercase tracking-widest ${champ.winrate >= 50 ? 'text-blue-400' : 'text-red-400'}`}>
                            {champ.winrate}% WR
                          </span>
                        </div>
                        
                        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${champ.winrate}%` }}
                            transition={{ duration: 1, ease: 'circOut' }}
                            className={`h-full rounded-full ${champ.winrate >= 50 ? 'bg-blue-500' : 'bg-red-500'}`}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">{champ.games} Jogos</p>
                          <div className="flex gap-3">
                            <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">{champ.wins}V</span>
                            <span className="text-red-400/50 text-[10px] font-black uppercase tracking-widest">{champ.games - champ.wins}D</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Rotas mais jogadas */}
          {stats.roles.length > 0 && (
            <div className="space-y-6">
              <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">Distribuição de Rotas</p>
              <div className="space-y-4">
                {stats.roles.slice(0, 5).map((r: any) => {
                  const info = ROLE_INFO[r.role];
                  if (!info) return null;
                  return (
                    <div key={r.role} className="group bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/10 group-hover:border-primary/30 transition-colors">
                          <img src={getLaneUrl(info.file)} alt={info.label}
                            className="w-6 h-6 object-contain opacity-70 group-hover:opacity-100 transition-all"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-black text-sm uppercase tracking-widest">{info.label}</span>
                            <span className="text-primary font-black text-xs uppercase tracking-widest">{r.percentage}%</span>
                          </div>
                          <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${r.percentage}%` }}
                              transition={{ duration: 1, ease: 'circOut' }}
                              className="h-full rounded-full bg-primary/40"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">
                          {r.games} Partidas Totais
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ---------- Modal Chave Pix ----------
function ModalPix({ aberto, onFechar, onSalvar, inicial }: {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (tipo: string, chave: string, nome: string) => void;
  inicial: { tipo: string; chave: string; nome: string };
}) {
  const [tipo,  setTipo]  = useState(inicial.tipo  || 'cpf');
  const [chave, setChave] = useState(inicial.chave || '');
  const [nome,  setNome]  = useState(inicial.nome  || '');

  useEffect(() => {
    if (aberto) {
      setTipo(inicial.tipo  || 'cpf');
      setChave(inicial.chave || '');
      setNome(inicial.nome  || '');
    }
  }, [aberto]);

  const tipoAtual = TIPOS_PIX.find(t => t.value === tipo) ?? TIPOS_PIX[0];

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onFechar}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 overflow-hidden"
            style={getCardStyle()}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-xl uppercase tracking-tight">Configurar PIX</h3>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Para recebimento de prêmios</p>
                  </div>
                </div>
                <button onClick={onFechar} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/20 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Tipo de chave */}
                <div className="space-y-2">
                  <label className="text-white/20 text-[10px] font-black uppercase tracking-widest ml-1">Tipo de chave</label>
                  <select
                    value={tipo}
                    onChange={e => setTipo(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer font-medium"
                  >
                    {TIPOS_PIX.map(t => (
                      <option key={t.value} value={t.value} className="bg-[#0f0f0f]">{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Valor da chave */}
                <div className="space-y-2">
                  <label className="text-white/20 text-[10px] font-black uppercase tracking-widest ml-1">Chave</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Check className="w-5 h-5 text-primary/40 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={chave}
                      onChange={(e) => setChave(e.target.value)}
                      placeholder={tipoAtual.placeholder}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Nome completo */}
                <div className="space-y-2">
                  <label className="text-white/20 text-[10px] font-black uppercase tracking-widest ml-1">Nome completo do titular</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Como no documento de identidade"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm placeholder:text-white/10 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-primary/70 leading-relaxed font-medium">
                    A conta Pix deve estar no seu nome. Premiações e saques serão enviados exclusivamente para esta chave.
                  </p>
                </div>

                <button
                  onClick={() => { if (chave && nome) onSalvar(tipo, chave, nome); }}
                  disabled={!chave || !nome}
                  className="w-full py-4 bg-primary hover:bg-primary-dark text-black font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Salvar Configurações
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ---------- Página principal ----------
export default function Perfil() {
  const [user,          setUser]          = useState<any>(null);
  const [contaRiot,     setContaRiot]     = useState<any>(null);
  const [eloSolo,       setEloSolo]       = useState<any>(null);
  const [eloFlex,       setEloFlex]       = useState<any>(null);
  const [statsRecentes, setStatsRecentes] = useState<any>(null);
  const [ddrVer,        setDdrVer]        = useState(DDR_FALLBACK);
  const [equipe,        setEquipe]        = useState<any>(null);
  const [membroInfo,    setMembroInfo]    = useState<{ role: string; cargo: string } | null>(null);
  const [capitaoNick,   setCapitaoNick]   = useState<string>('—');
  const [saldo,         setSaldo]         = useState<number>(0);
  const [isVip,         setIsVip]         = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  // Lane
  const [lane,      setLane]      = useState('Top');
  const [laneOpen,  setLaneOpen]  = useState(false);
  const laneRef = useRef<HTMLDivElement>(null);

  const [lane2,     setLane2]     = useState('Support');
  const [lane2Open, setLane2Open] = useState(false);
  const lane2Ref = useRef<HTMLDivElement>(null);

  // Bio
  const [bio,         setBio]         = useState('');
  const [editandoBio, setEditandoBio] = useState(false);
  const [bioTemp,     setBioTemp]     = useState('');

  // Pix
  const [chavePix,      setChavePix]      = useState('');
  const [tipoChavePix,  setTipoChavePix]  = useState('');
  const [nomePix,       setNomePix]       = useState('');
  const [modalPixAberto,setModalPixAberto]= useState(false);

  // Redes sociais
  const [instagram,     setInstagram]     = useState('');
  const [twitch,        setTwitch]        = useState('');
  const [youtube,       setYoutube]       = useState('');
  const [discord,       setDiscord]       = useState('');
  const [editandoRedes, setEditandoRedes] = useState(false);
  const [redesTemp,     setRedesTemp]     = useState({ instagram: '', twitch: '', youtube: '', discord: '' });

  const navigate = useNavigate();

  useEffect(() => { carregarDados(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (laneRef.current && !laneRef.current.contains(e.target as Node))
        setLaneOpen(false);
      if (lane2Ref.current && !lane2Ref.current.contains(e.target as Node))
        setLane2Open(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const [{ data: riotData }, { data: perfilData }, { data: saldoData }] = await Promise.all([
        supabase.from('contas_riot').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('saldos').select('saldo').eq('user_id', user.id).maybeSingle(),
      ]);

      setContaRiot(riotData);
      setSaldo(saldoData?.saldo ?? 0);

      if (perfilData) {
        setIsVip(perfilData.is_vip ?? false);
        setBio(perfilData.bio ?? '');
        setLane(perfilData.lane ?? 'Top');
        setLane2(perfilData.lane2 ?? 'Support');
        setInstagram(perfilData.instagram ?? '');
        setTwitch(perfilData.twitch ?? '');
        setYoutube(perfilData.youtube ?? '');
        setDiscord(perfilData.discord ?? '');
        setChavePix(perfilData.chave_pix ?? '');
        setTipoChavePix(perfilData.tipo_chave_pix ?? '');
        setNomePix(perfilData.nome_pix ?? '');
        // Busca o time via time_membros (fonte de verdade)
        const { data: membro } = await supabase
          .from('time_membros')
          .select('time_id, role, cargo, is_leader')
          .eq('user_id', user.id)
          .maybeSingle();

        if (membro?.time_id) {
          const [{ data: eq }, { data: capMembro }] = await Promise.all([
            supabase.from('times').select('*').eq('id', membro.time_id).maybeSingle(),
            supabase.from('time_membros').select('user_id').eq('time_id', membro.time_id).eq('is_leader', true).maybeSingle()
          ]);

          setEquipe(eq);
          setMembroInfo({
            role:  membro.role  ?? '—',
            cargo: membro.is_leader ? 'Capitão' : (membro.cargo ?? 'Membro'),
          });

            if (capMembro) {
            const { data: capRiot } = await supabase
              .from('contas_riot')
              .select('riot_id')
              .eq('user_id', capMembro.user_id)
              .maybeSingle();
            setCapitaoNick(capRiot?.riot_id ?? '—');
          }
        } else {
          setEquipe(null);
          setMembroInfo(null);
          setCapitaoNick('—');
        }
      }

      // Exibe cache do Supabase imediatamente (sem esperar a Riot API)
      if (riotData?.elo_cache) {
        setEloSolo(riotData.elo_cache.soloQ ?? null);
        setEloFlex(riotData.elo_cache.flexQ ?? null);
      }
      if (riotData?.champions_cache) {
        setStatsRecentes({
          topChampions: riotData.champions_cache.topChampions ?? [],
          roles:        riotData.champions_cache.roles        ?? [],
          totalGames:   riotData.champions_cache.totalGames   ?? 0,
        });
      }
      getDDRVersion().then(v => setDdrVer(v));

      // Sync em background — atualiza ícone, nível, elo e stats da Riot API
      if (riotData?.puuid) {
        setSincronizando(true);
        sincronizarContaRiot(riotData.puuid, user.id)
          .then(fresh => {
            if (!fresh) return;
            setEloSolo(fresh.soloQ);
            setEloFlex(fresh.flexQ);
            setStatsRecentes({
              topChampions: fresh.topChampions,
              roles:        fresh.roles,
              totalGames:   fresh.totalGames,
            });
            // Só atualiza ícone/level se a Riot API retornou valores reais
            setContaRiot((prev: any) => ({
              ...prev,
              ...(fresh.iconeId !== null ? { profile_icon_id: fresh.iconeId } : {}),
              ...(fresh.nivel   !== null ? { level: fresh.nivel }             : {}),
            }));
          })
          .finally(() => setSincronizando(false));
      }
    }

    setLoading(false);
  };

  const salvarCampo = async (campos: Record<string, string>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Usuário não autenticado');
        return;
      }
      const { error } = await supabase.from('profiles').upsert({ id: user.id, ...campos }, { onConflict: 'id' });
      if (error) {
        console.error('Erro ao salvar campos:', error);
        alert('Erro ao salvar: ' + error.message);
      } else {
        console.log('✅ Campos salvos com sucesso:', campos);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar dados');
    }
  };

  const handleLane = async (id: string, isSecondary = false) => {
    if (isSecondary) {
      setLane2(id);
      setLane2Open(false);
      await salvarCampo({ lane2: id });
    } else {
      setLane(id);
      setLaneOpen(false);
      await salvarCampo({ lane: id });
    }
  };

  const handleSalvarBio = async () => {
    setBio(bioTemp);
    setEditandoBio(false);
    await salvarCampo({ bio: bioTemp });
  };

  const handleSalvarPix = async (tipo: string, chave: string, nome: string) => {
    setChavePix(chave);
    setTipoChavePix(tipo);
    setNomePix(nome);
    setModalPixAberto(false);
    await salvarCampo({ chave_pix: chave, tipo_chave_pix: tipo, nome_pix: nome });
  };

  const handleSalvarRedes = async () => {
    // Limpar Twitch: se vier URL, extrai só o nome do canal
    const cleanTwitch = redesTemp.twitch
      .replace('https://www.twitch.tv/', '')
      .replace('https://twitch.tv/', '')
      .replace('http://www.twitch.tv/', '')
      .replace('http://twitch.tv/', '')
      .replace(/^@/, '')
      .trim();

    console.log('[Perfil] Twitch antes:', redesTemp.twitch, 'depois:', cleanTwitch);

    setInstagram(redesTemp.instagram);
    setTwitch(cleanTwitch);
    setYoutube(redesTemp.youtube);
    setDiscord(redesTemp.discord);
    setEditandoRedes(false);
    await salvarCampo({
      instagram: redesTemp.instagram,
      twitch: cleanTwitch,
      youtube: redesTemp.youtube,
      discord: redesTemp.discord
    });
  };

  const handleSair = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const laneAtual = LANES.find(l => l.id === lane);
  const lane2Atual = LANES.find(l => l.id === lane2);
  const tipoLabel = TIPOS_PIX.find(t => t.value === tipoChavePix)?.label ?? '';

  return (
    <div className="relative min-h-screen w-full text-white font-sans overflow-x-hidden">
      {/* Background Layer */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105 pointer-events-none"
        style={{ backgroundImage: `url(${BACKGROUND_URL})` }}
      />
      <div className="fixed inset-0 z-0 bg-black/90 backdrop-blur-[2px] pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-grid-white opacity-10 pointer-events-none" />
      <div className="fixed inset-0 z-0 scanline opacity-5 pointer-events-none" />
      
      {/* Dynamic Glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] translate-y-1/2 pointer-events-none" />

      {/* Floating Particles */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, "-20vh"],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 15,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>

      <ModalPix
        aberto={modalPixAberto}
        onFechar={() => setModalPixAberto(false)}
        onSalvar={handleSalvarPix}
        inicial={{ tipo: tipoChavePix, chave: chavePix, nome: nomePix }}
      />

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-32">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative rounded-3xl p-6 md:p-10 overflow-visible transition-all duration-300 ${laneOpen || lane2Open ? 'z-50' : 'z-10'}`}
          style={getCardStyle()}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          </div>

          <div className="relative flex flex-col gap-8">

            {/* Linha principal */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="flex flex-col sm:flex-row items-center gap-8">

                {/* Avatar do Perfil (API) */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-primary/20 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                    <div
                      className="relative w-32 h-32 rounded-full flex items-center justify-center overflow-hidden bg-black/40 shrink-0 border-2 border-white/10"
                    >
                      {contaRiot?.profile_icon_id ? (
                        <img
                          key={contaRiot.profile_icon_id}
                          src={`${buildProfileIconUrl(contaRiot.profile_icon_id)}?v=${contaRiot.profile_icon_id}`}
                          alt="Avatar" className="w-full h-full object-cover scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <Users className="w-12 h-12 text-white/10" />
                        </div>
                      )}
                    </div>

                    {/* Spinner de sincronização no avatar */}
                    {sincronizando && (
                      <div className="absolute -top-1 -right-1 w-7 h-7 bg-black rounded-full border border-white/10 flex items-center justify-center z-20">
                        <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                      </div>
                    )}

                    {/* Level Badge - Estilo LoL */}
                    {contaRiot?.level && (
                      <div
                        className="absolute -bottom-1 right-2 px-3 py-1 flex items-center justify-center rounded-full border border-primary/30 text-[10px] font-black z-10 bg-black/90 text-primary shadow-xl uppercase tracking-tighter"
                      >
                        LVL {contaRiot.level}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nome + Elo + Bio + Redes */}
                <div className="text-center sm:text-left flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-white uppercase">
                      {contaRiot?.riot_id ?? user?.email?.split('@')[0]}
                    </h1>
                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      {isVip && (
                        <div className="relative">
                          <VipLabel text="VIP" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Elo Escrito */}
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <p className="font-headline font-black text-sm uppercase tracking-[0.2em] text-primary/80">
                      {eloSolo ? `${eloSolo.tier} ${eloSolo.rank}` : eloFlex ? `${eloFlex.tier} ${eloFlex.rank}` : 'UNRANKED'}
                    </p>
                    {/* Botão de atualizar conta */}
                    {contaRiot?.puuid && (
                      <button
                        onClick={() => {
                          if (!user || !contaRiot?.puuid || sincronizando) return;
                          setSincronizando(true);
                          sincronizarContaRiot(contaRiot.puuid, user.id)
                            .then(fresh => {
                              if (!fresh) return;
                              setEloSolo(fresh.soloQ);
                              setEloFlex(fresh.flexQ);
                              setStatsRecentes({ topChampions: fresh.topChampions, roles: fresh.roles, totalGames: fresh.totalGames });
                              setContaRiot((prev: any) => ({
                                ...prev,
                                ...(fresh.iconeId !== null ? { profile_icon_id: fresh.iconeId } : {}),
                                ...(fresh.nivel   !== null ? { level: fresh.nivel }             : {}),
                              }));
                            })
                            .finally(() => setSincronizando(false));
                        }}
                        title="Atualizar dados da conta"
                        className="flex items-center justify-center w-6 h-6 rounded-full border border-white/10 hover:border-primary/40 bg-white/5 hover:bg-primary/10 transition-all"
                      >
                        <RefreshCw className={`w-3 h-3 text-white/30 hover:text-primary transition-colors ${sincronizando ? 'animate-spin text-primary' : ''}`} />
                      </button>
                    )}
                  </div>

                  <div className="mt-4">
                    {/* Bio Compacta */}
                    <div className="max-w-md mx-auto sm:mx-0">
                      {editandoBio ? (
                        <div className="flex items-center gap-2">
                          <input autoFocus type="text" value={bioTemp}
                            onChange={e => setBioTemp(e.target.value)}
                            maxLength={100} placeholder="Sua bio..."
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary transition-all"
                          />
                          <button onClick={handleSalvarBio} className="p-2 bg-primary/10 rounded-xl text-primary hover:bg-primary/20 transition-all"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditandoBio(false)} className="p-2 bg-white/5 rounded-xl text-white/30 hover:bg-white/10 transition-all"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center sm:justify-start gap-2 group cursor-pointer" onClick={() => { setBioTemp(bio); setEditandoBio(true); }}>
                          <p className={`text-sm leading-relaxed ${bio ? 'text-white/60' : 'text-white/20 italic'}`}>
                            {bio || 'Clique para adicionar uma bio...'}
                          </p>
                          <Pencil className="w-3.5 h-3.5 text-white/10 group-hover:text-primary transition-colors shrink-0" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lane selectors */}
              <div className="flex items-center justify-center gap-8">
                {/* Posição Primária */}
                <div className="relative flex flex-col items-center gap-2" ref={laneRef}>
                  <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Primária</p>
                  <button
                    onClick={() => setLaneOpen(v => !v)}
                    className="relative group"
                  >
                    <div className="absolute -inset-2 bg-primary/20 rounded-full blur opacity-0 transition duration-500" />
                    {laneAtual ? (
                      <img src={getLaneUrl(laneAtual.file)} alt={laneAtual.label}
                        className="relative w-16 h-16 object-contain transition-transform duration-500"
                        style={{ filter: `drop-shadow(0 0 12px rgba(255,184,0,0.3))` }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="relative w-16 h-16 flex items-center justify-center bg-white/5 rounded-full border border-white/10">
                        <ChevronDown className="w-6 h-6 text-white/20" />
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {laneOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                      >
                        <div className="p-2 space-y-1">
                          {LANES.map(l => (
                            <button key={l.id} onClick={() => handleLane(l.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${lane === l.id ? 'bg-primary/10 text-primary' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                            >
                              <img src={getLaneUrl(l.file)} alt={l.label} className="w-5 h-5 object-contain"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                              <span className="text-xs font-bold uppercase tracking-wider">{l.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Posição Secundária */}
                <div className="relative flex flex-col items-center gap-2" ref={lane2Ref}>
                  <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Secundária</p>
                  <button
                    onClick={() => setLane2Open(v => !v)}
                    className="relative group"
                  >
                    <div className="absolute -inset-2 bg-primary/20 rounded-full blur opacity-0 transition duration-500" />
                    {lane2Atual ? (
                      <img src={getLaneUrl(lane2Atual.file)} alt={lane2Atual.label}
                        className="relative w-16 h-16 object-contain transition-transform duration-500"
                        style={{ filter: `drop-shadow(0 0 12px rgba(255,184,0,0.3))` }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="relative w-16 h-16 flex items-center justify-center bg-white/5 rounded-full border border-white/10">
                        <ChevronDown className="w-6 h-6 text-white/20" />
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {lane2Open && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                      >
                        <div className="p-2 space-y-1">
                          {LANES.map(l => (
                            <button key={l.id} onClick={() => handleLane(l.id, true)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${lane2 === l.id ? 'bg-primary/10 text-primary' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                            >
                              <img src={getLaneUrl(l.file)} alt={l.label} className="w-5 h-5 object-contain"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                              <span className="text-xs font-bold uppercase tracking-wider">{l.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* EQUIPE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl p-8 border border-white/10 relative overflow-hidden group"
          style={getCardStyle()}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <span className={LABEL_CLASS}>Minha Equipe</span>
            <Users className="w-5 h-5 text-primary/40" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            {equipe ? (
              <div className="flex flex-col gap-6">
                <div
                  className="flex items-center gap-6 bg-white/5 p-6 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-all cursor-pointer hover:bg-white/10"
                  onClick={() => navigate(`/times/${equipe.id}`)}
                >
                  <div className="relative">
                    <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                    {equipe.logo_url ? (
                      <img src={equipe.logo_url} alt={equipe.nome} className="relative w-20 h-20 rounded-2xl object-cover bg-black/40 border border-white/10" />
                    ) : (
                      <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center border border-primary/20 bg-primary/10">
                        <Users className="w-10 h-10 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-xl uppercase tracking-tight truncate">{equipe.nome}</p>
                    {equipe.tag && <p className="text-primary font-black text-[10px] uppercase tracking-[0.3em] mt-1">[{equipe.tag}]</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary/40 shrink-0" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { 
                      label: 'Minha Rota', 
                      val: (
                        <div className="flex flex-col items-center gap-1">
                          {LANES.find(l => l.id.toUpperCase() === (membroInfo?.role ?? '').toUpperCase()) ? (
                            <>
                              <img 
                                src={getLaneUrl(LANES.find(l => l.id.toUpperCase() === (membroInfo?.role ?? '').toUpperCase())!.file)} 
                                alt={membroInfo?.role} 
                                className="w-5 h-5 object-contain brightness-200" 
                              />
                              <span className="text-[9px] font-black uppercase tracking-tighter text-white/60">
                                {LANES.find(l => l.id.toUpperCase() === (membroInfo?.role ?? '').toUpperCase())?.label || membroInfo?.role}
                              </span>
                            </>
                          ) : (
                            <span className="text-white">{membroInfo?.role ?? '—'}</span>
                          )}
                        </div>
                      ), 
                      color: 'text-white' 
                    },
                    { label: 'Torneio', val: equipe.torneio ?? 'Nenhum', color: 'text-primary' },
                    { label: 'Vitórias', val: equipe.wins ?? 0, color: 'text-blue-400' },
                    { label: 'Capitão', val: capitaoNick, color: 'text-white/70' }
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 rounded-2xl p-4 text-center border border-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center min-h-[80px]">
                      <div className={`font-black text-sm ${item.color}`}>{item.val}</div>
                      <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <div className="flex items-center gap-6 opacity-30 bg-white/5 p-6 rounded-2xl border border-white/5">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Users className="w-10 h-10 text-white/40" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-black text-xl uppercase tracking-tight">Sem Equipe</p>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-1">[TAG]</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Cargo', val: '—' },
                    { label: 'Torneios', val: '0' },
                    { label: 'Wins', val: '0' }
                  ].map((item, i) => (
                    <div key={i} className="bg-white/5 rounded-2xl p-4 text-center border border-white/5 hover:bg-white/10 transition-colors">
                      <p className="text-white font-black text-lg">{item.val}</p>
                      <p className="text-white/20 text-[9px] font-black uppercase tracking-widest mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button 
              onClick={() => navigate('/times')}
              className="w-full py-4 bg-primary text-black font-headline font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 transition-all text-[10px] active:scale-[0.98]"
            >
              {equipe ? 'Gerenciar Equipe' : 'Procurar Equipe'}
            </button>
          </div>
        </motion.div>

        {/* GRID — Dados da Conta + Saldo */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* DADOS DA CONTA */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl p-8 border border-white/10 relative overflow-hidden group"
            style={getCardStyle()}
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <span className={LABEL_CLASS}>Dados da Conta</span>
              <ShieldCheck className="w-5 h-5 text-primary/40" />
            </div>

            <div className="space-y-6 relative z-10">
              {/* Email */}
              <div className="group/item">
                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-2">E-mail de Acesso</p>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group-hover/item:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/10">
                      <Mail className="w-5 h-5 text-primary/60" />
                    </div>
                    <span className="text-white/80 font-medium text-sm truncate max-w-[200px]">{user?.email}</span>
                  </div>
                  <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[9px] font-black text-green-400 uppercase tracking-widest">
                    Verificado
                  </div>
                </div>
              </div>

              {/* Chave Pix */}
              <div className="group/item">
                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-2">Chave PIX para Saques</p>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group-hover/item:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/10">
                      <Wallet className="w-5 h-5 text-primary/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 font-medium text-sm truncate">
                        {chavePix ? 'Chave Cadastrada' : 'Não configurada'}
                      </p>
                      {chavePix && <p className="text-white/30 text-[9px] uppercase tracking-wider truncate">{tipoLabel}{nomePix ? ` · ${nomePix}` : ''}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => setModalPixAberto(true)}
                    className="p-2 hover:bg-white/5 rounded-xl transition-colors text-primary hover:text-primary-light"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* SALDO */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-3xl p-8 border border-white/10 relative overflow-hidden group"
            style={getCardStyle()}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <span className={LABEL_CLASS}>Financeiro</span>
              <Wallet className="w-5 h-5 text-primary/40" />
            </div>
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500" />
                  <div className="relative w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Wallet className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-primary text-2xl font-black">MP</span>
                    <p className="font-headline font-black text-5xl text-white tracking-tighter">
                      {Number(saldo).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-2">MPoints disponíveis</p>
                </div>
              </div>
              
              <button className="w-full py-4 bg-white/5 border border-white/10 text-white/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] cursor-not-allowed transition-all group-hover:bg-white/10" disabled>
                Histórico em breve
              </button>
            </div>
          </motion.div>

        </div>

        {/* ELO SOLO/DUO */}
        <EloBlock elo={eloSolo} label="Ranqueada Solo/Duo" delay={0.1} />

        {/* ELO FLEX */}
        <EloBlock elo={eloFlex} label="Ranqueada Flexível" delay={0.2} />

        {/* PERFORMANCE */}
        <PerformanceSection stats={statsRecentes} ddrVer={ddrVer} delay={0.3} />

        {/* GRID — Redes Sociais */}
        <div className="grid md:grid-cols-1 gap-8">
          <motion.div
            className="rounded-3xl p-8 space-y-6 relative overflow-hidden"
            style={getCardStyle()}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
              <span className={LABEL_CLASS}>Conexões Sociais</span>
              {!editandoRedes ? (
                <button onClick={() => { setRedesTemp({ instagram, twitch, youtube, discord }); setEditandoRedes(true); }}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-primary hover:bg-primary/10 transition-all">
                  <Pencil className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditandoRedes(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                  <button onClick={handleSalvarRedes} className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-colors"><Check className="w-4 h-4" /></button>
                </div>
              )}
            </div>

            <div className="space-y-4 relative z-10">
              {[
                { icon: <IgIcon className="w-5 h-5" />, key: 'instagram' as const, label: 'Instagram', placeholder: 'Link do Instagram', value: instagram },
                { icon: <Tv2 className="w-5 h-5" />,    key: 'twitch'    as const, label: 'Twitch',    placeholder: 'Ex: onelucks_ (só o nome do canal)',   value: twitch   },
                { icon: <Youtube className="w-5 h-5" />, key: 'youtube' as const, label: 'YouTube',   placeholder: 'Link do YouTube',  value: youtube  },
                { icon: <MessageSquare className="w-5 h-5" />, key: 'discord' as const, label: 'Discord', placeholder: 'Usuário (ex: nick#0000)', value: discord },
              ].map(({ icon, key, placeholder, value }) => (
                <div key={key} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-white/30 shrink-0">{icon}</span>
                  {editandoRedes ? (
                    <input type="text" value={redesTemp[key]}
                      onChange={e => {
                        let newValue = e.target.value;
                        // Se é Twitch, limpa a URL automaticamente
                        if (key === 'twitch') {
                          newValue = newValue
                            .replace('https://www.twitch.tv/', '')
                            .replace('https://twitch.tv/', '')
                            .replace('http://www.twitch.tv/', '')
                            .replace('http://twitch.tv/', '')
                            .replace(/^@/, '')
                            .trim();
                        }
                        setRedesTemp(p => ({ ...p, [key]: newValue }));
                      }}
                      placeholder={placeholder}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary transition-all"
                    />
                  ) : (
                    <span className={`text-sm font-medium truncate ${value ? 'text-white/80' : 'text-white/20 italic'}`}>
                      {value || 'Não vinculado'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* AÇÕES */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/vincular')}
            className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            <LinkIcon className="w-4 h-4 text-primary" />
            Vincular Nova Conta
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={handleSair}
            className="flex-1 py-4 bg-red-500/5 border border-red-500/20 text-red-400 rounded-2xl hover:bg-red-500/10 transition-all flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            <LogOut className="w-4 h-4" />
            Encerrar Sessão
          </motion.button>
        </div>

      </div>
    </div>
  );
}
