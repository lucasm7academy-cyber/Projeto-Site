import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  CheckCircle,
  Link as LinkIcon,
  ChevronDown,
  Pencil,
  Check,
  X,
  Users,
  Tv2,
  MessageSquare,
  Wallet,
  LogOut,
  ShieldOff,
  Key,
  Mail
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { buscarJogadorCompleto, buscarEstatisticasRecentes, getDDRVersion } from '../api/riot';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

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
  border: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(0, 0, 0, 0.4)',
});

const LANES = [
  { id: 'Top',     label: 'Top Laner', file: 'Top_icon.png'           },
  { id: 'Jungle',  label: 'Jungler',   file: 'Jungle_icon.png'        },
  { id: 'Middle',  label: 'Mid Laner', file: 'Middle_icon.png'        },
  { id: 'Bottom',  label: 'AD Carry',  file: 'Bottom_icon.png'        },
  { id: 'Support', label: 'Suporte',   file: 'Support_icon.png'       },
  { id: 'Fill',    label: 'Preencher', file: 'icon-position-fill.png' },
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
function EloBlock({ elo, label }: { elo: any; label: string }) {
  const wr    = elo ? Math.round((elo.wins / (elo.wins + elo.losses)) * 100) : 0;
  const total = elo ? elo.wins + elo.losses : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="backdrop-blur-xl rounded-2xl p-6 transition-all border border-white/10"
      style={getCardStyle()}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Esquerda: info */}
        <div className="flex flex-col gap-4">
          <span className={LABEL_CLASS}>{label}</span>
          {elo ? (
            <div className="flex items-center gap-4">
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <img src={getEloUrl(elo.tier)} alt={elo.tier}
                  className="relative w-28 h-28 object-contain"
                  style={{ filter: `drop-shadow(0 0 8px ${ELO_COLORS[elo.tier] || 'rgba(255,255,255,0.2)'})` }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div>
                <p className="font-headline font-black text-2xl uppercase tracking-wider leading-tight text-primary">
                  {elo.tier} {elo.rank}
                </p>
                <p className="text-white/60 text-sm mt-1">{elo.leaguePoints} PDL</p>
                <p className="text-white/30 text-xs mt-0.5">{total} partidas</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 flex items-center justify-center flex-shrink-0">
                <ShieldOff className="w-10 h-10 text-white/10" />
              </div>
              <p className="text-white/20 text-sm">Sem dados de {label}</p>
            </div>
          )}
        </div>

        {/* Direita: performance */}
        <div className="flex flex-col justify-center gap-4">
          <span className={LABEL_CLASS}>Performance</span>
          {elo ? (
            <>
              {/* W/L bar */}
              <div className="relative h-9 rounded-xl overflow-hidden bg-white/5 border border-white/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${wr}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute left-0 top-0 h-full bg-blue-600"
                />
                <motion.div initial={{ width: 0 }} animate={{ width: `${100 - wr}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.05 }}
                  className="absolute right-0 top-0 h-full bg-[#ff0033]" />
                <div className="absolute inset-0 flex items-center justify-between px-3 z-10">
                  <span className="text-white text-xs font-bold drop-shadow">{elo.wins}V</span>
                  <span className="text-white/80 text-xs font-bold drop-shadow">{wr}% WR</span>
                  <span className="text-white text-xs font-bold drop-shadow">{elo.losses}D</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                  <p className="text-white/70 font-bold text-sm">{total}</p>
                  <p className="text-white/20 text-xs">Partidas</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                  <p className="font-bold text-sm text-blue-500">{elo.wins}</p>
                  <p className="text-white/20 text-xs">Vitórias</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                  <p className="font-bold text-sm text-red-500">{elo.losses}</p>
                  <p className="text-white/20 text-xs">Derrotas</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                  <p className={`font-bold text-sm ${wr >= 50 ? 'text-blue-400' : 'text-red-400'}`}>{wr}%</p>
                  <p className="text-white/20 text-xs">Win Rate</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 opacity-20">
              <div className="w-full h-9 rounded-xl bg-white/5" />
              <p className="text-white/20 text-xs mt-3">Nenhuma partida ranqueada</p>
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
  JUNGLE:  { label: 'Jungler',   file: 'Jungle_icon.png'         },
  MIDDLE:  { label: 'Mid Laner', file: 'Middle_icon.png'         },
  BOTTOM:  { label: 'AD Carry',  file: 'Bottom_icon.png'         },
  UTILITY: { label: 'Suporte',   file: 'Support_icon.png'        },
};

function PerformanceSection({ stats, ddrVer }: { stats: any; ddrVer: string }) {
  if (!stats) return null;

  const semDados = stats.topChampions.length === 0 && stats.roles.length === 0;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="backdrop-blur-xl rounded-2xl p-6 space-y-6"
      style={getCardStyle()}
    >
      <div className="flex items-center justify-between">
        <span className={LABEL_CLASS}>Performance</span>
        {stats.totalGames > 0 && (
          <span className="text-white/20 text-xs">{stats.totalGames} partidas analisadas</span>
        )}
      </div>

      {semDados ? (
        <p className="text-white/20 text-sm text-center py-6">
          Nenhuma partida encontrada
        </p>
      ) : (
        <>
          {/* Top 3 campeões */}
          {stats.topChampions.length > 0 && (
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Campeões Mais Jogados</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {stats.topChampions.map((champ: any, i: number) => (
                  <div key={champ.championName} className="rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative flex-shrink-0">
                        <div 
                          className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-black/40"
                        >
                          <img
                            src={`https://ddragon.leagueoflegends.com/cdn/${ddrVer}/img/champion/${champ.championName}.png`}
                            alt={champ.championName}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                        {i === 0 && (
                          <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full text-black text-[8px] font-black flex items-center justify-center z-10 bg-primary">1</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-bold text-sm truncate">{champ.championName}</p>
                        <p className="text-white/30 text-xs">{champ.games} jogos</p>
                      </div>
                    </div>
                    <div className="relative h-1.5 rounded-full overflow-hidden bg-white/10 mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${champ.winrate}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: champ.winrate >= 50 ? '#2563eb' : '#ff1a1a' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-400 font-medium">{champ.wins}V</span>
                      <span className={`font-bold ${champ.winrate >= 50 ? 'text-blue-400' : 'text-red-400'}`}>{champ.winrate}%</span>
                      <span className="text-red-400/70 font-medium">{champ.games - champ.wins}D</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rotas mais jogadas */}
          {stats.roles.length > 0 && (
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Rotas Mais Jogadas</p>
              <div className="space-y-2.5">
                {stats.roles.slice(0, 5).map((r: any) => {
                  const info = ROLE_INFO[r.role];
                  if (!info) return null;
                  return (
                    <div key={r.role} className="flex items-center gap-3">
                      <img src={getLaneUrl(info.file)} alt={info.label}
                        className="w-5 h-5 object-contain flex-shrink-0 opacity-70"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="text-white/40 text-xs w-20 flex-shrink-0">{info.label}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${r.percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-primary/50"
                        />
                      </div>
                      <span className="text-white/25 text-xs w-24 text-right flex-shrink-0">
                        {r.games} · {r.percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onFechar}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md backdrop-blur-xl rounded-2xl p-6 space-y-5"
            style={getCardStyle()}
            onClick={e => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-primary/20 bg-primary/10">
                  <Key className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-white font-bold text-lg">Chave Pix</h2>
              </div>
              <button onClick={onFechar} className="text-white/30 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tipo de chave */}
            <div className="space-y-1.5">
              <label className="text-white/40 text-xs uppercase tracking-widest">Tipo de chave</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer"
              >
                {TIPOS_PIX.map(t => (
                  <option key={t.value} value={t.value} className="bg-[#0f0f0f]">{t.label}</option>
                ))}
              </select>
            </div>

            {/* Valor da chave */}
            <div className="space-y-1.5">
              <label className="text-white/40 text-xs uppercase tracking-widest">Chave</label>
              <input
                type="text"
                value={chave}
                onChange={e => setChave(e.target.value)}
                placeholder={tipoAtual.placeholder}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Nome completo */}
            <div className="space-y-1.5">
              <label className="text-white/40 text-xs uppercase tracking-widest">Nome completo do titular</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Como no documento de identidade"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
              <span className="text-amber-400 text-sm mt-0.5">⚠</span>
              <p className="text-amber-400/80 text-xs leading-relaxed">
                A conta Pix deve estar no seu nome. Premiações e saques serão enviados exclusivamente para esta chave.
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onFechar}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => { if (chave && nome) onSalvar(tipo, chave, nome); }}
                disabled={!chave || !nome}
                className="flex-1 py-3 text-black font-bold rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary"
              >
                Cadastrar
              </button>
            </div>
          </motion.div>
        </motion.div>
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
  const [saldo,         setSaldo]         = useState<number>(0);
  const [loading,       setLoading]       = useState(true);

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
  const [discord,       setDiscord]       = useState('');
  const [editandoRedes, setEditandoRedes] = useState(false);
  const [redesTemp,     setRedesTemp]     = useState({ instagram: '', twitch: '', discord: '' });

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
        setBio(perfilData.bio ?? '');
        setLane(perfilData.lane ?? 'Top');
        setLane2(perfilData.lane2 ?? 'Support');
        setInstagram(perfilData.instagram ?? '');
        setTwitch(perfilData.twitch ?? '');
        setDiscord(perfilData.discord ?? '');
        setChavePix(perfilData.chave_pix ?? '');
        setTipoChavePix(perfilData.tipo_chave_pix ?? '');
        setNomePix(perfilData.nome_pix ?? '');
        if (perfilData.time_id) {
          const { data: eq } = await supabase
            .from('times').select('*').eq('id', perfilData.time_id).maybeSingle();
          setEquipe(eq);
        }
      }

      if (riotData?.riot_id) {
        const resultado = await buscarJogadorCompleto(riotData.riot_id);
        if (resultado.success) {
          setEloSolo(resultado.data.ranqueadas?.find((r: any) => r.queueType === 'RANKED_SOLO_5x5') ?? null);
          setEloFlex(resultado.data.ranqueadas?.find((r: any) => r.queueType === 'RANKED_FLEX_SR') ?? null);
        }
      }

      if (riotData?.puuid) {
        const [stats, version] = await Promise.all([
          buscarEstatisticasRecentes(riotData.puuid),
          getDDRVersion(),
        ]);
        setStatsRecentes(stats);
        setDdrVer(version);
      }
    }

    setLoading(false);
  };

  const salvarCampo = async (campos: Record<string, string>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({ id: user.id, ...campos }, { onConflict: 'id' });
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
    setInstagram(redesTemp.instagram);
    setTwitch(redesTemp.twitch);
    setDiscord(redesTemp.discord);
    setEditandoRedes(false);
    await salvarCampo({ instagram: redesTemp.instagram, twitch: redesTemp.twitch, discord: redesTemp.discord });
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
    <div 
      className="min-h-screen text-white"
    >
      <ModalPix
        aberto={modalPixAberto}
        onFechar={() => setModalPixAberto(false)}
        onSalvar={handleSalvarPix}
        inicial={{ tipo: tipoChavePix, chave: chavePix, nome: nomePix }}
      />

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative backdrop-blur-xl rounded-2xl p-6 md:p-8 overflow-visible z-10"
          style={getCardStyle()}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div className="absolute inset-0 opacity-20 bg-radial-at-tl from-white/5 to-transparent" />
          </div>

          <div className="relative flex flex-col gap-6">

            {/* Linha principal */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">

                {/* Avatar do Perfil (API) */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div
                      className="w-28 h-28 rounded-full flex items-center justify-center overflow-hidden bg-white/5 shrink-0 border-2 border-primary/30"
                    >
                      {contaRiot?.profile_icon_id ? (
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${ddrVer}/img/profileicon/${contaRiot.profile_icon_id}.png`}
                          alt="Avatar" className="w-full h-full object-cover scale-110 border border-white/20 rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <Users className="w-10 h-10 text-white/10" />
                        </div>
                      )}
                    </div>
                    
                    {/* Level Badge - Estilo LoL */}
                    {contaRiot?.level && (
                      <div 
                        className="absolute bottom-0 right-0 w-8 h-8 flex items-center justify-center rounded-full border-[3px] text-[11px] font-bold z-10 bg-[#1a1a1a] border-primary text-primary shadow-lg"
                      >
                        {contaRiot.level}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nome + Elo + Bio + Redes */}
                <div className="text-center sm:text-left flex-1">
                  <h1 className="text-2xl md:text-3xl font-headline font-black tracking-tight text-white">
                    {contaRiot?.riot_id ?? user?.email?.split('@')[0]}
                  </h1>
                  
                  {/* Elo Escrito */}
                  <p className="font-bold text-sm uppercase tracking-widest mt-1 text-primary">
                    {eloSolo ? `${eloSolo.tier} ${eloSolo.rank}` : eloFlex ? `${eloFlex.tier} ${eloFlex.rank}` : 'Sem Rank'}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
                    {/* Bio Compacta */}
                    <div className="flex-1 min-w-0 max-w-[150px] sm:max-w-[200px] md:max-w-xs lg:max-w-md">
                      {editandoBio ? (
                        <div className="flex items-center gap-2">
                          <input autoFocus type="text" value={bioTemp}
                            onChange={e => setBioTemp(e.target.value)}
                            maxLength={100} placeholder="Sua bio..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-white text-xs focus:outline-none focus:border-primary"
                          />
                          <button onClick={handleSalvarBio} className="p-1 text-primary"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditandoBio(false)} className="p-1 text-white/30"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setBioTemp(bio); setEditandoBio(true); }}>
                          <p className={`text-xs truncate ${bio ? 'text-white/60' : 'text-white/20 italic'}`}>
                            {bio || 'Adicionar bio...'}
                          </p>
                          <Pencil className="w-3 h-3 text-white/10 group-hover:text-primary transition-colors" />
                        </div>
                      )}
                    </div>

                    {/* Ícones de Redes Sociais */}
                    <div className="flex items-center gap-2 shrink-0">
                      <a 
                        href={instagram ? `https://instagram.com/${instagram.replace('@', '')}` : '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`p-1.5 rounded-sm border transition-all ${instagram ? 'border-primary/80 text-primary hover:scale-110' : 'border-white/10 text-white/10 pointer-events-none'}`}
                        style={instagram ? { filter: 'drop-shadow(0 0 2px rgba(255,184,0,0.6))' } : {}}
                      >
                        <IgIcon className="w-3.5 h-3.5" />
                      </a>
                      <a 
                        href={twitch ? `https://twitch.tv/${twitch}` : '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`p-1.5 rounded-sm border transition-all ${twitch ? 'border-primary/80 text-primary hover:scale-110' : 'border-white/10 text-white/10 pointer-events-none'}`}
                        style={twitch ? { filter: 'drop-shadow(0 0 2px rgba(255,184,0,0.6))' } : {}}
                      >
                        <Tv2 className="w-3.5 h-3.5" />
                      </a>
                      <div 
                        className={`p-1.5 rounded-sm border transition-all ${discord ? 'border-primary/80 text-primary' : 'border-white/10 text-white/10'}`}
                        style={discord ? { filter: 'drop-shadow(0 0 2px rgba(255,184,0,0.6))' } : {}}
                        title={discord || 'Não informado'}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lane selectors */}
              <div className="flex items-center gap-6">
                {/* Posição Primária */}
                <div className="relative flex flex-col items-center gap-1" ref={laneRef}>
                  <p className="text-white/20 text-xs">Posição primária</p>
                  <button
                    onClick={() => setLaneOpen(v => !v)}
                    className="flex items-center gap-1 hover:scale-110 transition-transform"
                  >
                    {laneAtual ? (
                      <img src={getLaneUrl(laneAtual.file)} alt={laneAtual.label}
                        className="w-14 h-14 object-contain"
                        style={{ filter: `drop-shadow(0 0 8px rgba(255,184,0,0.5))` }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-14 h-14 flex items-center justify-center opacity-30">
                        <ChevronDown className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {laneOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 bg-black/95 border border-white/10 rounded-xl overflow-hidden z-[100] shadow-2xl"
                      >
                        {LANES.map(l => (
                          <button key={l.id} onClick={() => handleLane(l.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-all ${lane === l.id ? 'text-primary' : 'text-white/70'}`}
                          >
                            <img src={getLaneUrl(l.file)} alt={l.label} className="w-5 h-5 object-contain"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                            <span className="text-sm">{l.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Posição Secundária */}
                <div className="relative flex flex-col items-center gap-1" ref={lane2Ref}>
                  <p className="text-white/20 text-xs">Posição secundária</p>
                  <button
                    onClick={() => setLane2Open(v => !v)}
                    className="flex items-center gap-1 hover:scale-110 transition-transform"
                  >
                    {lane2Atual ? (
                      <img src={getLaneUrl(lane2Atual.file)} alt={lane2Atual.label}
                        className="w-14 h-14 object-contain"
                        style={{ filter: `drop-shadow(0 0 8px rgba(255,184,0,0.5))` }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-14 h-14 flex items-center justify-center opacity-30">
                        <ChevronDown className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </button>

                  <AnimatePresence>
                    {lane2Open && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 bg-black/95 border border-white/10 rounded-xl overflow-hidden z-[100] shadow-2xl"
                      >
                        {LANES.map(l => (
                          <button key={l.id} onClick={() => handleLane(l.id, true)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-all ${lane2 === l.id ? 'text-primary' : 'text-white/70'}`}
                          >
                            <img src={getLaneUrl(l.file)} alt={l.label} className="w-5 h-5 object-contain"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                            <span className="text-sm">{l.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* GRID — Dados da Conta + Saldo */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* DADOS DA CONTA */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="backdrop-blur-xl rounded-2xl p-6 space-y-4"
            style={getCardStyle()}
          >
            <span className={LABEL_CLASS}>Dados da Conta</span>

            {/* Email verificado */}
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white/30 text-xs mb-0.5">E-mail</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-white/70 text-sm truncate">{user?.email}</p>
                  <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                </div>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Chave Pix */}
            <div className="flex items-center gap-3">
              <Key className={`w-4 h-4 flex-shrink-0 ${chavePix ? 'text-green-400' : 'text-white/20'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-white/30 text-xs mb-0.5">Chave Pix</p>
                {chavePix ? (
                  <div>
                    <p className="text-green-400 text-sm font-medium">Cadastrada</p>
                    <p className="text-white/30 text-xs">{tipoLabel}{nomePix ? ` · ${nomePix}` : ''}</p>
                  </div>
                ) : (
                  <p className="text-white/20 text-sm italic">Não cadastrada</p>
                )}
              </div>
              <button
                onClick={() => setModalPixAberto(true)}
                className="text-white/20 hover:text-primary transition-colors flex-shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>

          {/* SALDO */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="backdrop-blur-xl rounded-2xl p-6 space-y-4"
            style={getCardStyle()}
          >
            <span className={LABEL_CLASS}>Saldo</span>
            <div className="flex items-center gap-4">
              <div>
                <p className="font-headline font-black text-3xl text-primary">
                  R$ {Number(saldo).toFixed(2).replace('.', ',')}
                </p>
                <p className="text-white/30 text-xs mt-0.5">MPoints disponíveis</p>
              </div>
            </div>
            <button className="w-full py-3 bg-white/5 border border-white/10 text-white/30 rounded-xl text-sm cursor-not-allowed" disabled>
              Histórico de transações (em breve)
            </button>
          </motion.div>

        </div>

        {/* ELO SOLO/DUO */}
        <EloBlock elo={eloSolo} label="Elo Solo/Duo" />

        {/* ELO FLEX */}
        <EloBlock elo={eloFlex} label="Elo Flex" />

        {/* PERFORMANCE */}
        <PerformanceSection stats={statsRecentes} ddrVer={ddrVer} />

        {/* GRID — Redes Sociais + Equipe */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* REDES SOCIAIS */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="backdrop-blur-xl rounded-2xl p-6 space-y-4"
            style={getCardStyle()}
          >
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Redes Sociais</span>
              {!editandoRedes ? (
                <button onClick={() => { setRedesTemp({ instagram, twitch, discord }); setEditandoRedes(true); }}
                  className="text-white/30 hover:text-primary transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditandoRedes(false)} className="p-1.5 text-white/30 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                  <button onClick={handleSalvarRedes} className="p-1.5 text-primary transition-colors"><Check className="w-4 h-4" /></button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {[
                { icon: <IgIcon className="w-4 h-4" />, key: 'instagram' as const, label: 'Instagram', placeholder: '@usuario', value: instagram },
                { icon: <Tv2 className="w-4 h-4" />,    key: 'twitch'    as const, label: 'Twitch',    placeholder: 'usuario',   value: twitch   },
                { icon: <MessageSquare className="w-4 h-4" />, key: 'discord' as const, label: 'Discord', placeholder: 'usuario#0000', value: discord },
              ].map(({ icon, key, placeholder, value }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-white/30 flex-shrink-0">{icon}</span>
                  {editandoRedes ? (
                    <input type="text" value={redesTemp[key]}
                      onChange={e => setRedesTemp(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <span className={`text-sm ${value ? 'text-white/70' : 'text-white/20 italic'}`}>
                      {value || 'Não informado'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* EQUIPE */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="backdrop-blur-xl rounded-2xl p-6 space-y-4"
            style={getCardStyle()}
          >
            <span className={LABEL_CLASS}>Equipe</span>
            {equipe ? (
              <div className="flex items-center gap-4">
                {equipe.logo_url ? (
                  <img src={equipe.logo_url} alt={equipe.nome} className="w-14 h-14 rounded-xl object-contain bg-white/5 border border-white/10 p-1" />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-primary/20 bg-primary/10">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white font-bold">{equipe.nome}</p>
                  {equipe.tag && <p className="text-white/40 text-xs">[{equipe.tag}]</p>}
                </div>
                <button onClick={() => navigate(`/time/${equipe.id}`)}
                  className="px-4 py-2 border border-primary/30 bg-primary/10 text-primary text-sm font-medium rounded-xl hover:brightness-110 transition-all"
                >
                  Ver Time
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 opacity-30">
                  <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-7 h-7 text-white/40" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">Nome do Time</p>
                    <p className="text-white/40 text-xs">[TAG]</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 opacity-20">
                  {[['Cargo', '—'], ['Campeonatos', '0'], ['Vitórias', '0']].map(([label, val]) => (
                    <div key={label} className="bg-white/5 rounded-xl p-2 text-center">
                      <p className="text-white font-bold text-sm">{val}</p>
                      <p className="text-white/40 text-xs">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-white/20 text-xs text-center">Você não pertence a nenhuma equipe</p>
              </div>
            )}
          </motion.div>

        </div>

        {/* AÇÕES */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => navigate('/vincular')}
            className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm font-medium">
            <LinkIcon className="w-4 h-4 text-primary" />
            Vincular outra conta Riot
          </button>
          <button onClick={handleSair}
            className="flex-1 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 text-sm font-medium">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

      </div>
    </div>
  );
}
