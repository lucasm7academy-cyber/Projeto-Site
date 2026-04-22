// src/pages/SalaPage.tsx
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crown, UserPlus, Check, ArrowLeft, ArrowLeftToLine,ArrowLeftFromLine, PanelLeftClose, Lock, Sword, X, Eye, AlertTriangle, Trophy, Copy, Send, Tv2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCachedUser } from '../contexts/AuthContext';
import { buildProfileIconUrl, buildChampionIconUrl, getDDRVersion } from '../api/riot';
import {
  buscarSalaCompleta, buscarSalaVinculadaDoUsuario, deletarSala,
  type Sala, type JogadorNaSala, type OpcaoVotoResultado,
} from '../api/salas';
import { buscarDraftDaSala } from '../api/draft';
import { buscarCargoUsuario } from '../api/users';
import { SalaRegrasProvider, useSalaRegras } from '../contexts/SalaRegras';
import { getModoInfo, getMPointsInfo, ROLE_CONFIG, type Role } from '../components/partidas/salaConfig';
import { type DraftState, type Champion } from '../components/draft/draftTypes';
import { StreamModal } from '../components/StreamModal';
import { StreamerPanel } from '../components/StreamerPanel';

const DraftRoom = lazy(() => import('../components/draft/DraftRoom').then(m => ({ default: m.DraftRoom })));

// ─────────────────────────────────────────────────────────────────────────────
// TIPO DO USUÁRIO
// ─────────────────────────────────────────────────────────────────────────────

interface UsuarioAtual {
  id: string;
  nome: string;
  tag?: string;
  elo: string;
  role: string;
  avatar?: string;
  contaVinculada: boolean;
draft_id?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: carrega perfil do usuário autenticado
// ─────────────────────────────────────────────────────────────────────────────

async function carregarUsuario(): Promise<UsuarioAtual | null> {
  const user = await getCachedUser();
  if (!user) return null;

  const [{ data: perfil }, { data: riot }, { data: membro }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('contas_riot').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('time_membros').select('time_id, role').eq('user_id', user.id).maybeSingle(),
  ]);

  const riotAny = riot as any;
  const riotId: string = riotAny?.riot_id ?? '';
  const [gameName, tagLine] = riotId.includes('#') ? riotId.split('#') : [riotId, ''];
  const elo  = riotAny?.elo_cache?.soloQ?.tier ?? 'Sem Elo';
  const role = (membro as any)?.role ?? 'RES';
  const perfilAny = perfil as any;

  let avatar: string | undefined;
  if (riotAny?.profile_icon_id) {
    avatar = buildProfileIconUrl(riotAny.profile_icon_id);
  }

  return {
    id:             user.id,
    nome:           gameName || perfilAny?.username || perfilAny?.full_name || user.email?.split('@')[0] || 'Jogador',
    tag:            tagLine ? `#${tagLine}` : undefined,
    elo,
    role,
    avatar,
    contaVinculada: riot !== null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE DE PÁGINA
// ─────────────────────────────────────────────────────────────────────────────

type Modo = "1v1" | "aram" | "5v5"| "time_vs_time";

const coresModo: Record<Modo, string> = {
  "1v1": "text-red-500",
  "aram": "text-blue-500",
  "5v5": "text-green-500",
  "time_vs_time": "text-purple-500",
};

export default function SalaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioAtual | null>(null);
  const [salaInicial, setSalaInicial]   = useState<Sala | null>(null);
  const [loading, setLoading]           = useState(true);
  const [erro, setErro]                 = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const usuario = await carregarUsuario();
      if (!usuario) { navigate('/'); return; }
      setUsuarioAtual(usuario);

      const salaId = parseInt(id ?? '0', 10);
      if (!salaId) { navigate('/jogar'); return; }

      const vinculada = await buscarSalaVinculadaDoUsuario(usuario.id);
      if (vinculada && vinculada.id !== salaId) {
        navigate(`/sala/${vinculada.id}`, { replace: true });
        return;
      }

      const sala = await buscarSalaCompleta(salaId);
      if (!sala) {
        setErro('Sala não encontrada.');
        setLoading(false);
        return;
      }

      setSalaInicial(sala);
      setLoading(false);
    };
    init();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent mb-4" />
        <p className="text-white font-bold uppercase tracking-widest text-xs">Carregando sala...</p>
      </div>
    );
  }

  if (erro || !salaInicial || !usuarioAtual) {
    return (
      <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center text-white p-6">
        <AlertTriangle className="w-12 h-12 text-white/20 mb-4" />
        <p className="text-white/40 font-bold mb-4">{erro ?? 'Sala não encontrada'}</p>
        <button
          onClick={() => navigate('/jogar')}
          className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 transition-all"
        >
          Voltar ao Lobby
        </button>
      </div>
    );
  }

  return (
    <SalaRegrasProvider
      salaId={salaInicial.id}
      usuarioAtual={usuarioAtual}
      onSair={() => navigate('/jogar')}
      onEncerrada={() => navigate('/jogar')}
    >
      <SalaPageView usuarioAtual={usuarioAtual} />
    </SalaRegrasProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES VISUAIS (LAYOUT NOVO)
// ─────────────────────────────────────────────────────────────────────────────

function ArcaneIndicators() {
  return (
    <div className="absolute inset-0 rounded-full pointer-events-none z-10">
      {[...Array(60)].map((_, i) => (
        <div
          key={`tick-${i}`}
          className="absolute top-1/2 left-1/2 w-[1px] h-[1.5vmin] bg-white/5 origin-bottom"
          style={{
            transform: `translate(-50%, -50%) rotate(${i * 6}deg) translateY(-35vmin)`,
            height: i % 5 === 0 ? '2.5vmin' : '1.2vmin',
            backgroundColor: i % 5 === 0 ? 'rgba(255, 183, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)'
          }}
        />
      ))}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[2vmin] rounded-full border border-dashed border-white/[0.03]"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[5vmin] rounded-full border border-dotted border-[#FFB700]/[0.02]"
      />
    </div>
  );
}

function CentralDisplay({ modo, timeALogo, timeBLogo, timeANome, timeBNome, timeAColor, timeBColor, timeATag, timeBTag }: {
  modo?: string;
  timeALogo?: string;
  timeBLogo?: string;
  timeANome?: string;
  timeBNome?: string;
  timeAColor?: string;
  timeBColor?: string;
  timeATag?: string;
  timeBTag?: string;
}) {
  // Debug: log props da logo
  if (modo === 'time_vs_time') {
    console.log('[CentralDisplay] timeALogo:', timeALogo, 'timeAColor:', timeAColor);
    console.log('[CentralDisplay] timeBLogo:', timeBLogo, 'timeBColor:', timeBColor);
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-full">
      {/* Background image */}
      <AnimatePresence mode="wait">
        <motion.div
          key="image-step"
          initial={{ scale: 0.2, opacity: 0, filter: 'blur(10px)' }}
          animate={{ scale: 0.85, opacity: 0.8, filter: 'blur(0px)' }}
          exit={{ scale: 1.1, opacity: 0, filter: 'blur(5px)' }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <img
            src="https://static.wikia.nocookie.net/leagueoflegends/images/9/9c/Summoner%27s_Rift_LoL_Promo_01.png/revision/latest/scale-to-width-down/1000?cb=20220817091416"
            alt="Summoner's Rift"
            className="w-[90%] h-[90%] object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%] z-20 opacity-20" />

      {/* Logos time_vs_time — sobreposto no centro */}
      {modo === 'time_vs_time' && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="flex items-center justify-center gap-[6vmin] relative">
            {/* Time A */}
            <div className="flex flex-col items-center justify-center gap-[1.5vmin]">
              <div
                className="w-[17vmin] h-[17vmin] rounded-xl overflow-hidden border-3 flex-shrink-0"
                style={{
                  borderColor: timeAColor || '#3d3d3d',
                  backgroundColor: `${timeAColor || '#3d3d3d'}15`,
                  boxShadow: `0 0 15px ${timeAColor || '#3d3d3d'}60, inset 0 0 15px ${timeAColor || '#3d3d3d'}20`
                }}
              >
                {timeALogo ? (
                  <img src={timeALogo} alt="Time A" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[7.5vmin] font-black opacity-30">?</span>
                  </div>
                )}
              </div>
              {timeANome && (
                <div className="text-center">
                  <div className="text-[2vmin] font-black text-white uppercase tracking-widest whitespace-nowrap">
                    {timeANome.slice(0, 12)}
                  </div>
                  <div className="text-[2vmin] font-black uppercase tracking-widest whitespace-nowrap mt-[0.3vmin]" style={{ color: timeAColor || '#60a5fa' }}>
                    #{timeATag?.slice(0, 6) || 'TIME'}
                  </div>
                </div>
              )}
              {!timeANome && (
                <span className="text-[1.2vmin] font-black uppercase tracking-widest opacity-20">-</span>
              )}
            </div>

            {/* VS Badge with PNG — Centered vertically with logos */}
            <div className="flex items-center justify-center flex-shrink-0">
              <img src="/images/vs.png" alt="VS" className="w-[15vmin] h-[15vmin] object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
            </div>

            {/* Time B */}
            <div className="flex flex-col items-center justify-center gap-[1.5vmin]">
              <div
                className="w-[17vmin] h-[17vmin] rounded-xl overflow-hidden border-3 flex-shrink-0"
                style={{
                  borderColor: timeBColor || '#3d3d3d',
                  backgroundColor: `${timeBColor || '#3d3d3d'}15`,
                  boxShadow: `0 0 15px ${timeBColor || '#3d3d3d'}60, inset 0 0 15px ${timeBColor || '#3d3d3d'}20`
                }}
              >
                {timeBLogo ? (
                  <img src={timeBLogo} alt="Time B" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[7.5vmin] font-black opacity-30">?</span>
                  </div>
                )}
              </div>
              {timeBNome && (
                <div className="text-center">
                  <div className="text-[2vmin] font-black text-white uppercase tracking-widest whitespace-nowrap">
                    {timeBNome.slice(0, 12)}
                  </div>
                  <div className="text-[2vmin] font-black uppercase tracking-widest whitespace-nowrap mt-[0.3vmin]" style={{ color: timeBColor || '#f87171' }}>
                    #{timeBTag?.slice(0, 6) || 'TIME'}
                  </div>
                </div>
              )}
              {!timeBNome && (
                <span className="text-[1.2vmin] font-black uppercase tracking-widest opacity-20">-</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function HextechModule({ 
  children, 
  onClick, 
  variant = "default",
  disabled = false 
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: "default" | "danger" | "success" | "warning",
  disabled?: boolean
}) {
  const variants = {
    default: "border-white/10 text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5",
    danger: "border-red-500/20 text-red-500/40 hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/5",
    success: "border-green-500/20 text-green-500/40 hover:text-green-500 hover:border-green-500/40 hover:bg-green-500/5",
    warning: "border-[#FFB700]/20 text-[#FFB700]/40 hover:text-[#FFB700] hover:border-[#FFB700]/40 hover:bg-[#FFB700]/5"
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { y: -2, scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`px-[3vmin] py-[1vmin] border rounded-sm transition-all duration-300 flex items-center justify-center min-w-[15vmin] group ${variants[variant]} ${disabled ? 'opacity-20 cursor-not-allowed' : ''}`}
    >
      <span className="text-[1.2vmin] font-black uppercase tracking-[0.3em] transition-colors">{children}</span>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT DA SALA
// ─────────────────────────────────────────────────────────────────────────────

interface MsgChat {
  id: string;
  sala_id: number;
  user_id: string;
  nome: string;
  texto: string;
  created_at: string;
}

function SalaChat({ salaId, usuarioAtual, jogadores }: {
  salaId: number;
  usuarioAtual: { id: string; nome: string };
  jogadores: JogadorNaSala[];
}) {
  const [msgs, setMsgs]   = useState<MsgChat[]>([]);
  const [texto, setTexto] = useState('');
  const bottomRef         = useRef<HTMLDivElement>(null);

  const corDoNick = (userId: string): string => {
    const jog = jogadores.find(j => j.id === userId);
    if (!jog) return '#FFB700'; // espectador → cor primária amarela
    return jog.isTimeA ? '#3B82F6' : '#ef4444';
  };

  const VISIVEL_MS = 5 * 60 * 1000; // 5 minutos
  const visiveis = msgs.filter((m: MsgChat) => Date.now() - new Date(m.created_at).getTime() < VISIVEL_MS);

  useEffect(() => {
    // Carrega histórico dos últimos 5 min
    const desde = new Date(Date.now() - VISIVEL_MS).toISOString();
    supabase
      .from('sala_chat')
      .select('*')
      .eq('sala_id', salaId)
      .gte('created_at', desde)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMsgs(data as MsgChat[]); });

    // Realtime — novas mensagens
    const ch = supabase
      .channel(`sala_chat_${salaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sala_chat', filter: `sala_id=eq.${salaId}` },
        (payload) => setMsgs(prev => [...prev, payload.new as MsgChat])
      )
      .subscribe();

    // Timer que re-filtra a cada 30s para sumir mensagens antigas
    const timer = setInterval(() => setMsgs((prev: MsgChat[]) => [...prev]), 30_000);

    return () => { supabase.removeChannel(ch); clearInterval(timer); };
  }, [salaId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visiveis.length]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    await supabase.from('sala_chat').insert({ sala_id: salaId, user_id: usuarioAtual.id, nome: usuarioAtual.nome, texto: t });
  };
  
  const coresModo = {
  "1v1": "text-red-500",
  "2v2": "text-yellow-400",
  "5v5": "text-blue-500",
};

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } };

  return (
    <div className="w-[48vmin] h-[22vmin] bg-white/[0.02] border border-white/5 rounded-sm flex flex-col">
      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pt-2 space-y-1.5 scrollbar-thin scrollbar-thumb-[#FFB700]/20 scrollbar-track-transparent">
        <div className="text-[1vmin] text-white/20 uppercase tracking-widest mb-1 font-bold">Chat da Sala</div>
        {visiveis.length === 0 && (
          <div className="text-[1.2vmin] text-white/10">Nenhuma mensagem ainda.</div>
        )}
        {visiveis.map((m: MsgChat) => (
          <div key={m.id} className="text-[1.3vmin] text-white leading-snug break-words">
            <span className="font-black mr-1" style={{ color: corDoNick(m.user_id) }}>{m.nome}:</span>
            <span className="text-white/80">{m.texto}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/5 flex items-center px-2 gap-1.5 h-[4vmin] shrink-0">
        <button onClick={enviar} className="text-[#FFB700]/40 hover:text-[#FFB700] transition-colors shrink-0">
          <Send className="w-[1.6vmin] h-[1.6vmin]" />
        </button>
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={onKey}
          maxLength={200}
          placeholder="Pressione Enter para enviar..."
          className="flex-1 bg-transparent text-[1.3vmin] text-white/70 placeholder:text-white/10 outline-none"
        />
      </div>
    </div>
  );
}

function HextechActionBar({
  sala,
  usuarioAtual,
  jogadorAtual,
  acaoConfirmarPresenca,
  acaoSairDaSala,
  acaoSolicitarFinalizacao,
}: {
  sala: Sala,
  usuarioAtual: { id: string; nome: string },
  jogadorAtual: JogadorNaSala | undefined,
  acaoConfirmarPresenca: () => void,
  acaoSairDaSala: () => void,
  acaoSolicitarFinalizacao: () => void,
}) {
  const estado = sala.estado;

  return (
    <div className="w-full flex flex-col items-center relative pb-4">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#FFB700]/40 to-transparent blur-sm" />

      {/* Mesmo gap do MIDDLE SECTION — laterais alinham com as colunas dos slots */}
      <div className={`relative w-full flex items-end justify-center ${sala.modo === '1v1' ? 'gap-[68vmin]' : 'gap-[76vmin]'}`}>

        {/* ESQUERDA — alinha com coluna esquerda (items-start) — mais perto da sidebar */}
        <div className="flex items-end justify-start w-[48vmin]">
          <SalaChat salaId={sala.id} usuarioAtual={usuarioAtual} jogadores={sala.jogadores} />
        </div>

        {/* CENTRO — absolutamente centralizado, independente dos laterais */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[2vmin] flex flex-col items-center pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center">
            {estado === 'confirmacao' && jogadorAtual ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={acaoConfirmarPresenca}
                disabled={jogadorAtual.confirmado}
                className={`px-[10vmin] py-[2vmin] font-black uppercase tracking-[0.4em] text-[1.4vmin] rounded-sm shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-500 ${
                  jogadorAtual.confirmado ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-white text-black hover:bg-[#FFB700]'
                }`}
              >
                {jogadorAtual.confirmado ? 'Você está Pronto!' : 'Confirmar Presença'}
              </motion.button>
            ) : estado === 'em_partida' && jogadorAtual ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={acaoSolicitarFinalizacao}
                className="px-[10vmin] py-[2vmin] bg-orange-500 text-white font-black uppercase tracking-[0.4em] text-[1.4vmin] rounded-sm shadow-[0_0_40px_rgba(249,115,22,0.2)] hover:bg-orange-600 transition-all duration-500"
              >
                Encerrar Partida
              </motion.button>
            ) : estado === 'em_partida' && !jogadorAtual ? (
              <div className="px-[10vmin] py-[2vmin] border border-red-500/20 bg-red-500 rounded-sm">
                <span className="text-[1.8vmin] font-black uppercase tracking-none text-orange-400">
                  Partida em Andamento
                </span>
              </div>
            ) : estado === 'finalizacao' ? (
              <div className="px-[10vmin] py-[2vmin] border border-yellow-500/20 bg-yellow-500/5 rounded-sm">
                <span className="text-[1.8vmin] font-black uppercase tracking-none text-yellow-400">
                  Partida Finalizada
                </span>
              </div>
            ) : (
              <div className="px-[10vmin] py-[2vmin] border border-white/5 bg-white/5 rounded-sm">
                <span className="text-[1.8vmin] font-black uppercase tracking-none text-white">
                  Aguardando Jogadores...
                </span>
              </div>
            )}

            <div className="flex flex-col items-center gap-1 mt-6 max-w-[40vmin]">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${['em_partida', 'finalizacao'].includes(estado) ? 'bg-red-400' : estado === 'confirmacao' ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'} animate-pulse`} />
                <span className="text-[1vmin] font-black uppercase tracking-[0.1em] text-white/20">
                  Status da Sala
                </span>
              </div>
              <p className="text-[1.2vmin] font-medium text-white/30 text-center leading-relaxed">
                {estado === 'aberta' && sala.jogadores.length < (sala.modo === '1v1' ? 2 : 10) && "Aberta entre na vaga."}
                {estado === 'aberta' && sala.jogadores.length === (sala.modo === '1v1' ? 2 : 10) && "Assim que todas as vagas forem preenchidas, a sala entrará em processo de confirmação."}
                {estado === 'confirmacao' && "Confirme sua presença para iniciar a partida! Após todos confirmarem, o draft começará..."}
                {estado === 'em_partida' && "Partida em andamento. Boa sorte aos invocadores!"}
                {estado === 'finalizacao' && "Partida finalizada. Aguardando processamento do resultado."}
              </p>
            </div>
          </div>
        </div>

        {/* DIREITA — alinha com coluna direita (items-end), mesma largura dos slots */}
        <div className="flex items-end justify-end w-[48vmin]">
          {/* Espaço reservado para stream buttons — renderizados via componentes laterais */}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW DA SALA (LÓGICA + VISUAL NOVO)
// ─────────────────────────────────────────────────────────────────────────────

function SalaPageView({ usuarioAtual }: { usuarioAtual: UsuarioAtual }) {
  const navigate = useNavigate();
  const {
    sala, loading, jogadorAtual, viewers, semContaRiot, erroEntrada,
    timerConfirmacao, timerCancelamento, timerFinalizacao,
    meuVotoResultado,
    contagemVotosResultado,
    podeExecutar,
    acaoEntrarVaga, acaoSairVaga, acaoConfirmarPresenca,
    acaoDenunciarNaoIniciou, acaoVotarResultado, acaoSolicitarFinalizacao,
    acaoDraftFinalizado, acaoCancelarDraftPorTimeout, acaoApagarSala, acaoSairDaSala,
  } = useSalaRegras();

  const [copiado, setCopiado]               = useState(false);
  const [copiadoCodigo, setCopiadoCodigo]   = useState(false);
  const [showEncerrar, setShowEncerrar]     = useState(false);
  const [showDenuncia, setShowDenuncia]     = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState('');
  const [descricaoDenuncia, setDescricaoDenuncia] = useState('');
  const [enviandoDenuncia, setEnviandoDenuncia]   = useState(false);
  const [draftFinalizado, setDraftFinalizado] = useState<DraftState | null>(null);
  const [champions, setChampions] = useState<Record<string, Champion>>({});
  const [versionDDR, setVersionDDR] = useState('15.8.1');
  const [visualizandoPartida, setVisualizandoPartida] = useState(false);
  const [cargoUsuario, setCargoUsuario] = useState<'proprietario' | 'admin' | 'streamer' | 'coach' | 'jogador'>('jogador');
  const [salaStreamAtiva, setSalaStreamAtiva] = useState<any>(null);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [resultadoPartida, setResultadoPartida] = useState<any>(null);
  const vagasEmAndamento                    = useRef<Set<string>>(new Set());

  // Carregar cargo do usuário
  useEffect(() => {
    if (usuarioAtual) {
      const carregarCargo = async () => {
        console.log('[SalaPage] Buscando cargo para usuário:', usuarioAtual.id);
        const cargo = await buscarCargoUsuario(usuarioAtual.id);
        console.log('[SalaPage] Cargo obtido:', cargo);
        setCargoUsuario(cargo ?? 'jogador');
      };
      carregarCargo();
    }
  }, [usuarioAtual?.id]);

  // Listen to active streams in this room
  useEffect(() => {
    if (!sala?.id) return;

    const loadActiveStream = async () => {
      try {
        console.log('[SalaPage] Carregando stream ativa para sala:', sala.id);
        const { data, error } = await supabase
          .from('sala_streams')
          .select('*')
          .eq('sala_id', sala.id)
          .eq('ativo', true)
          .maybeSingle();

        if (error) {
          console.error('[SalaPage] ❌ Erro ao carregar stream:', error);
          return;
        }

        console.log('[SalaPage] ✅ Stream ativa carregada:', data);
        setSalaStreamAtiva(data?.ativo ? data : null);
      } catch (err) {
        console.error('[SalaPage] ❌ Exception ao carregar stream:', err);
      }
    };

    loadActiveStream();

    // Subscribe to realtime updates
    const subscription = supabase
      .channel(`sala_streams_${sala.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sala_streams',
          filter: `sala_id=eq.${sala.id}`,
        },
        (payload: any) => {
          console.log('[SalaPage] Realtime update - event:', payload.event, 'payload:', payload);

          const eventType = payload.event?.toUpperCase() || payload.eventType?.toUpperCase();
          console.log('[SalaPage] Event type detected:', eventType);

          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const newStream = payload.new as any;
            console.log('[SalaPage] INSERT/UPDATE received - newStream:', newStream, 'ativo:', newStream?.ativo);
            if (newStream?.ativo === true) {
              console.log('[SalaPage] ✅ Ativando stream para todos:', newStream);
              setSalaStreamAtiva(newStream);
            } else {
              console.log('[SalaPage] ⚠️ Stream não está ativo, desativando');
              setSalaStreamAtiva(null);
            }
          } else if (eventType === 'DELETE') {
            console.log('[SalaPage] ❌ DELETE - Desativando stream');
            setSalaStreamAtiva(null);
          } else {
            console.log('[SalaPage] Unknown event type:', eventType);
          }
        }
      )
      .subscribe((status: any) => {
        console.log('[SalaPage] Subscription status:', status);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [sala?.id]);

  // Carregar resultado da partida quando visualizando e sala encerrada
  useEffect(() => {
    if (visualizandoPartida && sala?.estado === 'encerrada' && sala?.id) {
      const carregarResultado = async () => {
        try {
          const { data, error } = await supabase
            .from('resultados_partidas')
            .select('*')
            .eq('sala_id', sala.id)
            .order('created_at', { ascending: false })
            .maybeSingle();

          if (error) {
            console.error('[SalaPage] Erro ao carregar resultado:', error);
          } else if (data) {
            console.log('[SalaPage] Resultado carregado:', data);
            setResultadoPartida(data);
          }
        } catch (err) {
          console.error('[SalaPage] Exception ao carregar resultado:', err);
        }
      };

      carregarResultado();
    }
  }, [visualizandoPartida, sala?.estado, sala?.id]);

  // Carregar draft quando estiver em aguardando_inicio, em_partida ou encerrada
  useEffect(() => {
    if (sala && (sala.estado === 'aguardando_inicio' || sala.estado === 'em_partida' || sala.estado === 'encerrada') && sala.draft_id) {
      const carregarDraft = async () => {
        const draft = await buscarDraftDaSala(sala.id);
        if (draft) {
          setDraftFinalizado(draft);
          // Carregar champions
          try {
            const version = await getDDRVersion();
            setVersionDDR(version);
            const response = await fetch(
              `https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/champion.json`
            );
            const data = await response.json();
            setChampions(data.data);
          } catch (error) {
            console.error('Erro ao carregar champions:', error);
          }
        }
      };
      carregarDraft();
    }
  }, [sala?.id, sala?.draft_id, sala?.estado]);

  // Auto-open resultado modal quando partida está encerrada
  useEffect(() => {
    console.log('[SalaPage] Auto-open check - Estado:', sala?.estado, 'Visualizando:', visualizandoPartida);
    if (sala && sala.estado === 'encerrada' && !visualizandoPartida) {
      console.log('[SalaPage] ✅ Abrindo modal de resultado automaticamente!');
      setVisualizandoPartida(true);
    }
  }, [sala?.estado, visualizandoPartida]);

  if (loading || !sala) {
    return (
      <div className="flex-1 bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent" />
      </div>
    );
  }

  // Mostra o DraftRoom enquanto a sala está em 'travada' e tem draft associado.
  // Quando o draft termina, acaoDraftFinalizado atribui o código e avança para aguardando_inicio.
  if (sala.estado === 'travada' && sala.draft_id) {
    return (
      <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center"><div className="text-white">Carregando draft...</div></div>}>
        <DraftRoom
          salaId={sala.id}
          usuarioId={usuarioAtual.id}
          modo={sala.modo}
          timeALogo={sala.timeALogo}
          timeBLogo={sala.timeBLogo}
          codigoPartida={sala.codigoPartida}
          cargoUsuario={cargoUsuario}
          onDraftFinalizado={acaoDraftFinalizado}
          onPickTimeout={acaoCancelarDraftPorTimeout}
          onDraftReset={() => acaoCancelarDraftPorTimeout(usuarioAtual.id)}
        />
      </Suspense>
    );
  }

  const isX1 = sala.modo === '1v1';
  const roles: Role[] = isX1 ? ['MID'] : ['TOP', 'JG', 'MID', 'ADC', 'SUP'];
  const timeA = sala.jogadores.filter(j => j.isTimeA);
  const timeB = sala.jogadores.filter(j => !j.isTimeA);

  const slotWidths: Partial<Record<Role, string>> & Record<string, string> = {
    TOP: 'w-[42vmin]',
    JG:  'w-[42vmin]',
    MID: isX1 ? 'w-[42vmin]' : 'w-[42vmin]',
    ADC: 'w-[42vmin]',
    SUP: 'w-[42vmin]',
  };

  const copiarLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const renderSlot = (role: Role, isTimeA: boolean) => {
    const jog = (isTimeA ? timeA : timeB).find(j => j.role === role);
    const roleIcon = ROLE_CONFIG[role];
    const isEu = jog?.id === usuarioAtual.id;
    const widthClass = slotWidths[role] ?? 'w-[32vmin]';
    const isLeft = isTimeA;
    const teamColor = isTimeA ? '#3B82F6' : '#ef4444';

    if (jog) {
      const isConfirmado = sala.estado === 'confirmacao' && jog.confirmado;
      const avatarEl = (
        <div className="w-[4.5vmin] h-[4.5vmin] rounded bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
          {jog.avatar
            ? <img src={jog.avatar} alt={jog.nome} className="w-full h-full object-cover" />
            : <span className="text-white/20 text-[1.6vmin] font-bold">{jog.nome[0]}</span>
          }
        </div>
      );

      return (
        <div
          key={`${isTimeA ? 'A' : 'B'}-${role}`}
          className={`relative ${widthClass} h-[8.5vmin] bg-black rounded-lg border transition-all shadow-lg flex flex-row items-center px-[1.5vmin] ${
            isConfirmado ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-white/10'
          } ${isTimeA ? 'justify-end' : 'justify-start'}`}
        >
          {isConfirmado && (
            <div className={`absolute ${isTimeA ? 'left-[1.5vmin]' : 'right-[1.5vmin]'} flex items-center justify-center`}>
              <div className="w-[2.5vmin] h-[2.5vmin] bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                <Check className="w-[1.6vmin] h-[1.6vmin] text-black stroke-[4px]" />
              </div>
            </div>
          )}

          {isTimeA ? (
            // Time Azul — tudo agrupado na direita (lado interno):
            <div className="flex items-center gap-[1vmin] overflow-hidden">
              <span className="text-[1.8vmin] font-black tracking-tight truncate" style={{ color: teamColor }}>{jog.nome}</span>
              <span className="text-white/60 text-[1.8vmin] font-semibold shrink-0">{jog.tag}</span>
              {jog.isLider && <Crown className="w-[1.4vmin] h-[1.4vmin] text-yellow-400 shrink-0" />}
              {avatarEl}
              <img src={roleIcon.img} className="w-[3.5vmin] h-[3.5vmin] opacity-80 shrink-0" alt={role} />
            </div>
          ) : (
            // Time Vermelho — tudo agrupado na esquerda (lado interno):
            <div className="flex items-center gap-[1vmin] overflow-hidden">
              <img src={roleIcon.img} className="w-[3.5vmin] h-[3.5vmin] opacity-80 shrink-0" alt={role} />
              {avatarEl}
              <span className="text-[1.8vmin] font-black tracking-tight truncate" style={{ color: teamColor }}>{jog.nome}</span>
              <span className="text-white/60 text-[1.8vmin] font-semibold shrink-0">{jog.tag}</span>
              {jog.isLider && <Crown className="w-[1.4vmin] h-[1.4vmin] text-yellow-400 shrink-0" />}
            </div>
          )}
        </div>
      );
    }

    const podeEntrar = podeExecutar('entrar_vaga') && !semContaRiot;

    return (
      <button
        key={`${isTimeA ? 'A' : 'B'}-${role}`}
        onClick={() => podeEntrar && acaoEntrarVaga(role, isTimeA)}
        disabled={!podeEntrar}
        className={`relative ${widthClass} h-[8.5vmin] bg-black rounded-lg border border-white/5 flex ${isLeft ? 'flex-row-reverse' : 'flex-row'} items-center px-[1.5vmin] gap-[1vmin] transition-all group ${
          podeEntrar ? 'hover:bg-white/[0.03] border-white/10' : 'opacity-10 cursor-not-allowed'
        }`}
      >
        <div className="w-[4.5vmin] h-[4.5vmin] rounded border border-white/5 bg-white/5 flex items-center justify-center">
          <UserPlus className="w-[2vmin] h-[2vmin] text-white/10 group-hover:text-white/40 transition-colors" />
        </div>
        <div className={`flex flex-col ${isLeft ? 'items-end text-right' : 'items-start text-left'}`}>
          <span className="text-[1.2vmin] font-black text-white/10 uppercase tracking-[0.2em] group-hover:text-white/30 transition-colors">
            {podeEntrar ? 'ENTRAR' : role}
          </span>
          <div className={`flex items-center gap-[0.7vmin] mt-[0.2vmin] ${isLeft ? 'flex-row-reverse' : 'flex-row'}`}>
            <img src={roleIcon.img} className="w-[1.5vmin] h-[1.5vmin] opacity-10 group-hover:opacity-30 transition-opacity" alt={role} />
            <span className="text-[1.1vmin] font-black text-white/5 uppercase tracking-widest">{role}</span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex-1 w-full h-full bg-[#050505] flex flex-col items-center justify-between p-0 font-sans relative overflow-hidden">

      {/* BACKGROUND IMAGE */}
      <img
        src="/images/mapa1.png"
        alt="Background Map"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        referrerPolicy="no-referrer"
      />

      {/* ERRO DE ENTRADA — TOP CENTER */}
      <AnimatePresence>
        {erroEntrada && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm font-bold">
              {erroEntrada}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MASSIVE CENTRAL CIRCLE */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full bg-black border-[4px] border-white/5 flex flex-col items-center justify-center z-10">
        <div className="absolute inset-10 rounded-full border border-white/[0.02]" />
        <ArcaneIndicators />
        <CentralDisplay
          modo={sala?.modo}
          timeALogo={sala?.timeALogo}
          timeBLogo={sala?.timeBLogo}
          timeANome={sala?.timeANome}
          timeBNome={sala?.timeBNome}
          timeATag={sala?.timeATag}
          timeBTag={sala?.timeBTag}
          timeAColor={sala?.timeAColor}
          timeBColor={sala?.timeBColor}
        />
      </div>

      {/* Blur overlay de Confirmação (atrás) — z-20 */}
      {sala.estado === 'confirmacao' && (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full bg-black/40 backdrop-blur-sm z-20 pointer-events-none" />
      )}

      {/* Overlay de Confirmação (conteúdo, frente) — z-50 */}
      {sala.estado === 'confirmacao' && (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full flex flex-col items-center justify-center z-50 pointer-events-none">
          <span className="text-[15vmin] font-black text-white tabular-nums leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">{timerConfirmacao}</span>
          <span className="text-[2vmin] font-black text-white/40 uppercase tracking-[1em] mt-6">CONFIRME AGORA</span>
        </div>
      )}

      {/* Picks em AGUARDANDO_INICIO ou ABERTA — acima do overlay */}
      {sala.estado === 'aguardando_inicio' && jogadorAtual && draftFinalizado && (
        <div className="absolute top-[14vmin] left-1/2 -translate-x-1/2 w-[85vmin] z-50 text-center">
          <div className="grid grid-cols-2 gap-[4vmin]">
            {/* Time Azul */}
            <div className="flex flex-col items-center">
              <span className="text-[1.2vmin] font-black text-blue-400 uppercase tracking-widest mb-[0.8vmin]">Picks</span>
              <div className="flex flex-wrap gap-[1vmin] justify-center">
                {draftFinalizado.blue_picks.map((champId: string, idx: number) => {
                  const champ = champions[champId];
                  return champ ? (
                    <div
                      key={idx}
                      className="w-[6vmin] h-[6vmin] rounded-lg border border-blue-500/50 bg-blue-500/15 flex items-center justify-center overflow-hidden hover:border-blue-500/80 transition-colors"
                      title={champ.name}
                    >
                      <img
                        src={buildChampionIconUrl(champId, versionDDR)}
                        alt={champ.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
            {/* Time Vermelho */}
            <div className="flex flex-col items-center">
              <span className="text-[1.2vmin] font-black text-red-400 uppercase tracking-widest mb-[1.5vmin]">Picks</span>
              <div className="flex flex-wrap gap-[1vmin] justify-center">
                {draftFinalizado.red_picks.map((champId: string, idx: number) => {
                  const champ = champions[champId];
                  return champ ? (
                    <div
                      key={idx}
                      className="w-[6vmin] h-[6vmin] rounded-lg border border-red-500/50 bg-red-500/15 flex items-center justify-center overflow-hidden hover:border-red-500/80 transition-colors"
                      title={champ.name}
                    >
                      <img
                        src={buildChampionIconUrl(champId, versionDDR)}
                        alt={champ.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blur overlay (atrás) — z-20 */}
      {sala.estado === 'aguardando_inicio' && jogadorAtual && (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full bg-black/40 backdrop-blur-sm z-20 pointer-events-none" />
      )}

      {/* Conteúdo e botões (frente) — z-50 */}
      {sala.estado === 'aguardando_inicio' && jogadorAtual && (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full flex flex-col items-center justify-center z-50 p-[8vmin] text-center pointer-events-auto">
          <p className="text-[1.4vmin] font-black text-white/40 uppercase tracking-[0.5em] mb-[1.5vmin]">
            Draft Finalizado!
          </p>
          <p className="text-[1.2vmin] text-white/30 uppercase tracking-widest mb-[2vmin]">
            {cargoUsuario === 'jogador' ? 'Aguardando partida...' : 'Entre na sala usando o código abaixo'}
          </p>
          {sala.codigoPartida ? (
            <button
              onClick={() => {
                navigator.clipboard.writeText(sala.codigoPartida!);
                setCopiadoCodigo(true);
                setTimeout(() => setCopiadoCodigo(false), 2000);
              }}
              className={`flex items-center gap-[1vmin] px-[3vmin] py-[1.2vmin] rounded-lg font-black text-[1.3vmin] uppercase tracking-widest transition-all border ${
                copiadoCodigo
                  ? 'bg-green-500/20 border-green-500/40 text-green-400'
                  : 'bg-[#FFB700]/10 border-[#FFB700]/30 text-[#FFB700] hover:bg-[#FFB700]/20'
              }`}
            >
              {copiadoCodigo
                ? <><Check className="w-[1.4vmin] h-[1.4vmin] shrink-0" /> Copiado!</>
                : <><Copy className="w-[1.4vmin] h-[1.4vmin] shrink-0" /> Copiar Código</>
              }
            </button>
          ) : (
            <div className="px-[4vmin] py-[2vmin]">
              <span className="text-[2vmin] text-white/20">Atribuindo código...</span>
            </div>
          )}

          {/* Separador + botão de denúncia */}
          <div className="w-[20vmin] h-px bg-white/10 my-[2.5vmin]" />
          <button
            onClick={() => setShowDenuncia(true)}
            className="flex items-center gap-[1vmin] px-[3vmin] py-[1.2vmin] rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 font-black text-[1.1vmin] uppercase tracking-widest transition-all"
          >
            <AlertTriangle className="w-[1.4vmin] h-[1.4vmin]" />
            Partida não iniciou
          </button>
          <span className="text-[0.9vmin] text-white/20 font-bold uppercase tracking-widest mt-[1vmin]">
            {formatTime(timerCancelamento)} restantes
          </span>
        </div>
      )}

      {/* Blur overlay para cargos especiais (atrás) — z-20 */}
      {sala.estado === 'aguardando_inicio' && !jogadorAtual && cargoUsuario !== 'jogador' && (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full bg-black/40 backdrop-blur-sm z-20 pointer-events-none" />
      )}

      {/* Conteúdo e botões para cargos especiais (frente) — z-50 */}
      {sala.estado === 'aguardando_inicio' && !jogadorAtual && cargoUsuario !== 'jogador' && (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full flex flex-col items-center justify-center z-50 p-[8vmin] text-center pointer-events-auto">
          <p className="text-[1.4vmin] font-black text-white/40 uppercase tracking-[0.5em] mb-[1.5vmin]">
            Draft Finalizado!
          </p>
          <p className="text-[1.2vmin] text-white/30 uppercase tracking-widest mb-[2vmin]">
            Entre na sala usando o código abaixo
          </p>
          {sala.codigoPartida ? (
            <button
              onClick={() => {
                navigator.clipboard.writeText(sala.codigoPartida!);
                setCopiadoCodigo(true);
                setTimeout(() => setCopiadoCodigo(false), 2000);
              }}
              className={`flex items-center gap-[1vmin] px-[3vmin] py-[1.2vmin] rounded-lg font-black text-[1.3vmin] uppercase tracking-widest transition-all border ${
                copiadoCodigo
                  ? 'bg-green-500/20 border-green-500/40 text-green-400'
                  : 'bg-[#FFB700]/10 border-[#FFB700]/30 text-[#FFB700] hover:bg-[#FFB700]/20'
              }`}
            >
              {copiadoCodigo
                ? <><Check className="w-[1.4vmin] h-[1.4vmin] shrink-0" /> Copiado!</>
                : <><Copy className="w-[1.4vmin] h-[1.4vmin] shrink-0" /> Copiar Código</>
              }
            </button>
          ) : (
            <div className="px-[4vmin] py-[2vmin]">
              <span className="text-[2vmin] text-white/20">Atribuindo código...</span>
            </div>
          )}
        </div>
      )}

      {/* Botão COPIAR CÓDIGO em "em_partida" — para streamer/admin/coach */}
      {sala.estado === 'em_partida' && sala.codigoPartida && (cargoUsuario === 'streamer' || cargoUsuario === 'admin' || cargoUsuario === 'coach') && (
        <div className="fixed bottom-[20vmin] left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              navigator.clipboard.writeText(sala.codigoPartida!);
              setCopiadoCodigo(true);
              setTimeout(() => setCopiadoCodigo(false), 2000);
            }}
            className={`flex items-center gap-[1vmin] px-[3vmin] py-[1.2vmin] rounded-lg font-black text-[1.3vmin] uppercase tracking-widest transition-all border ${
              copiadoCodigo
                ? 'bg-green-500/20 border-green-500/40 text-green-400'
                : 'bg-[#FFB700]/10 border-[#FFB700]/30 text-[#FFB700] hover:bg-[#FFB700]/20'
            }`}
          >
            {copiadoCodigo
              ? <><Check className="w-[1.4vmin] h-[1.4vmin] shrink-0" /> Copiado!</>
              : <><Copy className="w-[1.4vmin] h-[1.4vmin] shrink-0" /> Copiar Código</>
            }
          </motion.button>
        </div>
      )}

      {/* Picks em AGUARDANDO_INICIO ou ABERTA para cargos especiais */}
      {(sala.estado === 'aguardando_inicio' || sala.estado === 'aberta') && !jogadorAtual && cargoUsuario !== 'jogador' && draftFinalizado && (
        <div className="absolute top-[11vmin] left-[5vmin] right-[5vmin] z-40 text-center">
          <div className="grid grid-cols-2 gap-[4vmin]">
            {/* Time Azul */}
            <div className="flex flex-col items-center">
              <span className="text-[1.2vmin] font-black text-blue-400 uppercase tracking-widest mb-[0.8vmin]">Picks</span>
              <div className="flex flex-wrap gap-[1vmin] justify-center">
                {draftFinalizado.blue_picks.map((champId: string, idx: number) => {
                  const champ = champions[champId];
                  return champ ? (
                    <div
                      key={idx}
                      className="w-[6vmin] h-[6vmin] rounded-lg border border-blue-500/50 bg-blue-500/15 flex items-center justify-center overflow-hidden hover:border-blue-500/80 transition-colors"
                      title={champ.name}
                    >
                      <img
                        src={buildChampionIconUrl(champId, versionDDR)}
                        alt={champ.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
            {/* Time Vermelho */}
            <div className="flex flex-col items-center">
              <span className="text-[1.2vmin] font-black text-red-400 uppercase tracking-widest mb-[1.5vmin]">Picks</span>
              <div className="flex flex-wrap gap-[1vmin] justify-center">
                {draftFinalizado.red_picks.map((champId: string, idx: number) => {
                  const champ = champions[champId];
                  return champ ? (
                    <div
                      key={idx}
                      className="w-[6vmin] h-[6vmin] rounded-lg border border-red-500/50 bg-red-500/15 flex items-center justify-center overflow-hidden hover:border-red-500/80 transition-colors"
                      title={champ.name}
                    >
                      <img
                        src={buildChampionIconUrl(champId, versionDDR)}
                        alt={champ.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Picks em EM_PARTIDA — mostra os picks selecionados durante o draft */}
      {sala.estado === 'em_partida' && draftFinalizado && (
        <div className="absolute top-[11vmin] left-[5vmin] right-[5vmin] z-40 text-center">
          <div className="grid grid-cols-2 gap-[4vmin]">
            {/* Time Azul */}
            <div className="flex flex-col items-center">
              <span className="text-[1.2vmin] font-black text-blue-400 uppercase tracking-widest mb-[0.8vmin]">Picks</span>
              <div className="flex flex-wrap gap-[1vmin] justify-center">
                {draftFinalizado.blue_picks.map((champId: string, idx: number) => {
                  const champ = champions[champId];
                  return champ ? (
                    <div
                      key={idx}
                      className="w-[6vmin] h-[6vmin] rounded-lg border border-blue-500/50 bg-blue-500/15 flex items-center justify-center overflow-hidden hover:border-blue-500/80 transition-colors"
                      title={champ.name}
                    >
                      <img
                        src={buildChampionIconUrl(champId, versionDDR)}
                        alt={champ.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
            {/* Time Vermelho */}
            <div className="flex flex-col items-center">
              <span className="text-[1.2vmin] font-black text-red-400 uppercase tracking-widest mb-[1.5vmin]">Picks</span>
              <div className="flex flex-wrap gap-[1vmin] justify-center">
                {draftFinalizado.red_picks.map((champId: string, idx: number) => {
                  const champ = champions[champId];
                  return champ ? (
                    <div
                      key={idx}
                      className="w-[6vmin] h-[6vmin] rounded-lg border border-red-500/50 bg-red-500/15 flex items-center justify-center overflow-hidden hover:border-red-500/80 transition-colors"
                      title={champ.name}
                    >
                      <img
                        src={buildChampionIconUrl(champId, versionDDR)}
                        alt={champ.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de Votação de Resultado */}
      {/* Blur overlay de Finalização (atrás) — z-20 */}
      {sala.estado === 'finalizacao' && (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full bg-black/40 backdrop-blur-sm z-20 pointer-events-none" />
      )}

      {/* Overlay de Finalização (conteúdo, frente) — z-50 */}
      {sala.estado === 'finalizacao' && (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full flex flex-col items-center justify-center z-50 p-[8vmin] text-center pointer-events-auto">
          {meuVotoResultado ? (
            /* Já votou — mostra confirmação e botão de sair */
            <div className="flex flex-col items-center gap-[2vmin]">
              <div className="w-[8vmin] h-[8vmin] rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-[1vmin]">
                <Check className="w-[3.5vmin] h-[3.5vmin] text-green-400" />
              </div>
              <p className="text-green-400 font-black text-[1.8vmin] uppercase tracking-widest">Voto registrado!</p>
              <p className="text-white/30 text-[1.1vmin]">
                Você votou em <span className={`font-black ${meuVotoResultado === 'time_a' ? 'text-blue-400' : 'text-red-400'}`}>
                  {meuVotoResultado === 'time_a' ? (sala.timeANome ?? 'Equipe Azul') : (sala.timeBNome ?? 'Equipe Vermelha')}
                </span>
              </p>
              <button
                onClick={acaoSairDaSala}
                className="mt-[1vmin] px-[4vmin] py-[1.5vmin] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-black text-[1.2vmin] uppercase tracking-widest transition-all"
              >
                Sair da Sala
              </button>
            </div>
          ) : (
            /* Ainda não votou */
            <div className="flex flex-col items-center gap-[2vmin] w-full">
              <p className="text-[1.1vmin] font-black text-white/30 uppercase tracking-[0.5em]">
                Quem venceu a partida?
              </p>
              <p className="text-[0.9vmin] text-white/20 uppercase tracking-widest -mt-[1vmin]">
                {formatTime(timerFinalizacao)} para votar
              </p>
              <div className="flex gap-[2.5vmin] w-full mt-[1vmin]">
                {/* Equipe Azul */}
                <button
                  onClick={() => acaoVotarResultado('time_a')}
                  className="flex-1 flex flex-col items-center gap-[1.2vmin] py-[2.5vmin] px-[2vmin] rounded-xl border-2 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15 hover:border-blue-500/50 text-blue-400 transition-all group"
                >
                  <div className="w-[6vmin] h-[6vmin] rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                    {sala.timeALogo
                      ? <img src={sala.timeALogo} className="w-[4.5vmin] h-[4.5vmin] object-contain rounded-full" />
                      : <Trophy className="w-[2.5vmin] h-[2.5vmin] text-blue-400" />
                    }
                  </div>
                  <span className="font-black text-[1.3vmin] uppercase tracking-widest">{sala.timeANome ?? 'Equipe Azul'}</span>
                  <span className="text-[1vmin] text-blue-400/60">{contagemVotosResultado.time_a} voto{contagemVotosResultado.time_a !== 1 ? 's' : ''}</span>
                </button>

                {/* Equipe Vermelha */}
                <button
                  onClick={() => acaoVotarResultado('time_b')}
                  className="flex-1 flex flex-col items-center gap-[1.2vmin] py-[2.5vmin] px-[2vmin] rounded-xl border-2 border-red-500/20 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/50 text-red-400 transition-all group"
                >
                  <div className="w-[6vmin] h-[6vmin] rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center group-hover:bg-red-600/30 transition-colors">
                    {sala.timeBLogo
                      ? <img src={sala.timeBLogo} className="w-[4.5vmin] h-[4.5vmin] object-contain rounded-full" />
                      : <Trophy className="w-[2.5vmin] h-[2.5vmin] text-red-400" />
                    }
                  </div>
                  <span className="font-black text-[1.3vmin] uppercase tracking-widest">{sala.timeBNome ?? 'Equipe Vermelha'}</span>
                  <span className="text-[1vmin] text-red-400/60">{contagemVotosResultado.time_b} voto{contagemVotosResultado.time_b !== 1 ? 's' : ''}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}  

      {/* TOP BAR */}
      <div className="w-full h-[10vmin] flex items-start justify-center pt-[2vmin] z-50">
        <div className="w-full max-w-6xl h-[7vmin] bg-black rounded-xl border border-white/10 flex items-center px-[3vmin] shadow-2xl mx-4 justify-between relative overflow-visible">
          <div className="flex items-center">
            <button onClick={acaoSairDaSala} className="mr-[3vmin] text-yellow-500 hover:text-red-500 transition-colors">
              <ArrowLeftFromLine className="w-[2.5vmin] h-[2.5vmin]" />
            </button>
            <div className="flex items-center gap-[2vmin]">
              <h1 className="text-[2vmin] font-black tracking-tighter text-white/80">{sala.nome}</h1>
              <div className="text-[2vmin] font-black text-[#FFB700]">{sala.codigo}</div>
                <button onClick={copiarLink} className="text-white/40 hover:text-white/90 transition-colors">
                  {copiado ? <Check className="w-[1.4vmin] h-[1.4vmin] text-green-500" /> : <Copy className="w-[1.7vmin] h-[1.7vmin]" />}
                </button>
            </div>
          </div>

      
          <div className="flex items-center gap-[2vmin]">
            
            <div className="hidden sm:flex items-center gap-[1vmin] px-[1.5vmin] py-[0.8vmin] bg-white/5 rounded-lg border border-white/5">
            <span className="text-[1.5vmin] font-black uppercase">
              <span className="text-white">MODO: </span>
              <span className={coresModo[sala.modo as Modo] || "text-white"}>
                {sala.modo}
              </span>
            </span>
            <span className="text-[1.5vmin] font-black text-white uppercase tracking-widest">MC</span>
            <span className="text-[1.5vmin] font-black text-[#FFB700] uppercase">{sala.mpoints}</span>
            </div>
            <div className="flex items-center gap-[1vmin] px-[1.5vmin] py-[0.8vmin] bg-white/5 rounded-lg border border-white/5">
              <Eye className="w-[2vmin] h-[1.8vmin] text-[#FFB700]" />
              <span className="text-[1.5vmin] font-black text-white tabular-nums">{viewers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AVISO SEM CONTA RIOT */}
      {semContaRiot && (
        <div className="w-100 z-20 px-40 lg:px-8">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Vincule sua conta Riot para entrar em uma vaga. Você pode assistir a partida como espectador.</span>
          </div>
        </div>
      )}

      {/* MIDDLE SECTION */}
      <div className={`w-full flex-1 flex items-center justify-center z-20 mt-[-12vh] ${isX1 ? 'gap-[80vmin]' : 'gap-[85vmin]'}`}>
        {/* TEAM HEADERS COM VS NO MEIO */}
        {sala.modo === 'time_vs_time' ? (
          <div className="flex flex-col items-center gap-[3vmin] ">
            {/* Vagas lado a lado */}
            <div className="flex gap-[90vmin]">
              <div className="flex flex-col gap-[1.2vmin] items-start">
                {roles.map((role) => renderSlot(role, true))}
              </div>
              <div className="flex flex-col gap-[1.5vmin] items-end">
                {roles.map((role) => renderSlot(role, false))}
              </div>
            </div>
          </div>
        ) : (
          /* OUTROS MODOS - Layout original */
          <>
            <div className="flex flex-col gap-[1.2vmin] items-start">
              <div className="relative mb-[1vmin] ml-[0.5vmin] w-[22vmin]">
                 <div className="absolute inset-0 bg-[#3B82F6]/0 skew-x-[-12deg] border-l-4 border-[#3B82F6]" />
                <div className="relative px-[2vmin] py-[0.5vmin] flex flex-col">
                  <span className="text-[1.5vmin] font-black text-[#3B82F6] uppercase tracking-[0.4em] leading-none mb-[0.2vmin]">Blue-Side</span>
                </div>
              </div>                                                                                                                                
              {roles.map((role) => renderSlot(role, true))}
            </div>
            <div className="flex flex-col gap-[1.2vmin] items-end text-right">
              <div className="relative mb-[1vmin] mr-[0.5vmin] w-[22vmin]">
                <div className="absolute inset-0 bg-[#ef4444]/0 skew-x-[12deg] border-r-4 border-[#ef4444]" />
                <div className="relative px-[2vmin] py-[0.5vmin] flex flex-col items-end">
                  <span className="text-[1.5vmin] font-black text-[#ef4444] uppercase tracking-[0.4em] leading-none mb-[0.2vmin]">Red-Side</span>
                </div>
              </div>
              {roles.map((role) => renderSlot(role, false))}
            </div>
          </>
        )}
      </div>

      {/* BOTTOM BAR */}
      <div className="w-full h-[14vmin] flex items-center justify-center pb-[4vmin] z-30">
        <HextechActionBar
          sala={sala}
          usuarioAtual={usuarioAtual}
          jogadorAtual={jogadorAtual || undefined}
          acaoConfirmarPresenca={acaoConfirmarPresenca}
          acaoSairDaSala={acaoSairDaSala}
          acaoSolicitarFinalizacao={() => setShowEncerrar(true)}
        />
      </div>

      {/* Modal de Denúncia — partida não iniciou */}
      {showDenuncia && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-[2vmin]">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-[4vmin] max-w-[45vmin] w-full shadow-2xl"
          >
            <h3 className="text-[2.5vmin] font-black text-white uppercase tracking-tight mb-[2vmin]">Partida não iniciou?</h3>
            <p className="text-white/40 text-[1.4vmin] mb-[3vmin] leading-relaxed">
              Selecione o motivo. Isso cancela a sala e notifica um administrador.
            </p>
            <select
              value={motivoDenuncia}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMotivoDenuncia(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-[2vmin] py-[1.5vmin] text-white text-[1.3vmin] font-bold mb-[2vmin] outline-none focus:border-white/20"
            >
              <option value="" className="bg-[#0d0d0d]">Selecione o motivo...</option>
              <option value="jogador_trapaceou" className="bg-[#0d0d0d]">Jogador trapaceou</option>
              <option value="sala_invalida" className="bg-[#0d0d0d]">Sala inválida</option>
              <option value="codigo_invalido" className="bg-[#0d0d0d]">Código inválido</option>
              <option value="outros" className="bg-[#0d0d0d]">Outros motivos</option>
            </select>
            <textarea
              value={descricaoDenuncia}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescricaoDenuncia(e.target.value)}
              placeholder="Descrição adicional (opcional)..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-[2vmin] py-[1.5vmin] text-white/80 text-[1.2vmin] placeholder:text-white/20 mb-[3vmin] outline-none focus:border-white/20 resize-none"
            />
            <div className="flex gap-[2vmin]">
              <button
                onClick={() => { setShowDenuncia(false); setMotivoDenuncia(''); setDescricaoDenuncia(''); }}
                disabled={enviandoDenuncia}
                className="flex-1 py-[2vmin] rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-black uppercase tracking-widest text-[1.2vmin] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!motivoDenuncia) return;
                  setEnviandoDenuncia(true);
                  await acaoDenunciarNaoIniciou(motivoDenuncia, descricaoDenuncia || undefined);
                  setEnviandoDenuncia(false);
                  setShowDenuncia(false);
                }}
                disabled={!motivoDenuncia || enviandoDenuncia}
                className="flex-1 py-[2vmin] rounded-xl bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[1.2vmin] transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {enviandoDenuncia ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Encerramento */}
      {showEncerrar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-[2vmin]">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-[4vmin] max-w-[45vmin] w-full shadow-2xl"
          >
            <h3 className="text-[2.5vmin] font-black text-white uppercase tracking-tight mb-[2vmin]">Encerrar Partida?</h3>
            <p className="text-white/40 text-[1.4vmin] mb-[4vmin] leading-relaxed">
              Isso abrirá a votação de resultado para todos os jogadores. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-[2vmin]">
              <button
                onClick={() => setShowEncerrar(false)}
                className="flex-1 py-[2vmin] rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-black uppercase tracking-widest text-[1.2vmin] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => { setShowEncerrar(false); await acaoSolicitarFinalizacao(); }}
                className="flex-1 py-[2vmin] rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest text-[1.2vmin] transition-colors shadow-[0_0_20px_rgba(249,115,22,0.3)]"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Visualização de Partida Encerrada */}
      {visualizandoPartida && sala.estado === 'encerrada' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-[2vmin] overflow-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-[4vmin] max-w-[85vmin] w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-[3vmin]">
              <h3 className="text-[2.5vmin] font-black text-white uppercase tracking-tight">Resultado da Partida</h3>
              <button
                onClick={() => navigate('/jogar')}
                className="p-[1vmin] hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-[2vmin] h-[2vmin] text-white/60" />
              </button>
            </div>

            {/* Resultado */}
            {sala.vencedor && (
              <div
                className={`mb-[3vmin] p-[2vmin] rounded-lg border ${
                  sala.vencedor === 'A'
                    ? 'bg-blue-500/20 border-blue-500/40'
                    : sala.vencedor === 'B'
                    ? 'bg-red-500/20 border-red-500/40'
                    : 'bg-gray-500/20 border-gray-500/40'
                }`}
              >
                <p className={`text-[1.3vmin] font-black uppercase tracking-widest ${
                  sala.vencedor === 'A'
                    ? 'text-blue-300'
                    : sala.vencedor === 'B'
                    ? 'text-red-300'
                    : 'text-gray-300'
                }`}>
                  🏆 Vencedor: {sala.vencedor === 'A' ? (sala.timeANome ?? 'Equipe Azul') : sala.vencedor === 'B' ? (sala.timeBNome ?? 'Equipe Vermelha') : 'Empate'}
                </p>
              </div>
            )}

            {/* Jogadores e Picks */}
            <div className="grid grid-cols-2 gap-[3vmin]">
              {/* Time Azul */}
              <div className="flex flex-col gap-[1.5vmin]">
                <h4 className="text-[1.5vmin] font-black text-blue-400 uppercase tracking-widest">
                  {sala.vencedor === 'A' && '🏆 '}{sala.timeANome ?? 'Equipe Azul'}{sala.vencedor === 'A' && ' - Vencedora'}
                </h4>
                {resultadoPartida && Array.isArray(resultadoPartida.jogadores)
                  ? resultadoPartida.jogadores.filter((j: any) => j.isTimeA).map((jogador: any, idx: number) => (
                      <div key={idx} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-[1.5vmin]">
                        <p className="text-[1.1vmin] font-black text-blue-300 mb-[0.8vmin]">
                          {jogador.nome}{jogador.tag && `#${jogador.tag}`} / {ROLE_CONFIG[jogador.role as Role]?.label}
                        </p>
                      </div>
                    ))
                  : null}
              </div>

              {/* Time Vermelho */}
              <div className="flex flex-col gap-[1.5vmin]">
                <h4 className="text-[1.5vmin] font-black text-red-400 uppercase tracking-widest">
                  {sala.vencedor === 'B' && '🏆 '}{sala.timeBNome ?? 'Equipe Vermelha'}{sala.vencedor === 'B' && ' - Vencedora'}
                </h4>
                {resultadoPartida && Array.isArray(resultadoPartida.jogadores)
                  ? resultadoPartida.jogadores.filter((j: any) => !j.isTimeA).map((jogador: any, idx: number) => (
                      <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-lg p-[1.5vmin]">
                        <p className="text-[1.1vmin] font-black text-red-300 mb-[0.8vmin]">
                          {jogador.nome}{jogador.tag && `#${jogador.tag}`} / {ROLE_CONFIG[jogador.role as Role]?.label}
                        </p>
                      </div>
                    ))
                  : null}
              </div>
            </div>

            {/* PICKS dos Campeões */}
            {draftFinalizado && (draftFinalizado.blue_picks?.length > 0 || draftFinalizado.red_picks?.length > 0) && (
              <div className="mt-[3vmin] pt-[3vmin] border-t border-white/10">
                <h4 className="text-[1.3vmin] font-black text-white/80 uppercase tracking-widest mb-[1.5vmin]">Campeões Escolhidos</h4>
                <div className="grid grid-cols-2 gap-[2vmin]">
                  {/* Blue Picks */}
                  {draftFinalizado.blue_picks && draftFinalizado.blue_picks.length > 0 && (
                    <div>
                      <p className="text-[0.9vmin] font-bold text-blue-300 mb-[0.8vmin]">Time Azul</p>
                      <div className="flex gap-[0.8vmin] flex-wrap">
                        {draftFinalizado.blue_picks.map((champId: string, idx: number) => {
                          const champ = champions[champId];
                          return champ ? (
                            <div
                              key={idx}
                              className="w-[6vmin] h-[6vmin] rounded-lg border border-blue-500/40 bg-blue-500/10 flex items-center justify-center overflow-hidden group"
                              title={champ.name}
                            >
                              <img
                                src={buildChampionIconUrl(champId, versionDDR)}
                                alt={champ.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  {/* Red Picks */}
                  {draftFinalizado.red_picks && draftFinalizado.red_picks.length > 0 && (
                    <div>
                      <p className="text-[0.9vmin] font-bold text-red-300 mb-[0.8vmin]">Time Vermelho</p>
                      <div className="flex gap-[0.8vmin] flex-wrap">
                        {draftFinalizado.red_picks.map((champId: string, idx: number) => {
                          const champ = champions[champId];
                          return champ ? (
                            <div
                              key={idx}
                              className="w-[6vmin] h-[6vmin] rounded-lg border border-red-500/40 bg-red-500/10 flex items-center justify-center overflow-hidden group"
                              title={champ.name}
                            >
                              <img
                                src={buildChampionIconUrl(champId, versionDDR)}
                                alt={champ.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-[2vmin] mt-[3vmin]">
              <button
                onClick={() => navigate('/jogar')}
                className="flex-1 py-[2vmin] rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-black uppercase tracking-widest text-[1.2vmin] transition-colors"
              >
                Voltar para Jogar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Botão de Transmitir (Streamer) — lado direito superior */}
      {cargoUsuario === 'streamer' && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed right-4 top-20 z-[9999] md:right-8 md:top-24 pointer-events-auto"
        >
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (salaStreamAtiva) {
                // Desligar transmissão
                await supabase
                  .from('sala_streams')
                  .delete()
                  .eq('sala_id', sala.id)
                  .eq('user_id', usuarioAtual.id);
                setSalaStreamAtiva(null);
                setIsStreamModalOpen(false);
              } else {
                // Ligar transmissão
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('twitch')
                  .eq('id', usuarioAtual.id)
                  .maybeSingle();

                const twitchChannel = (profile as any)?.twitch;
                if (!twitchChannel) {
                  alert('Você precisa cadastrar um canal Twitch no seu perfil');
                  return;
                }

                // Check if stream already exists for this user in this room
                const { data: existingStream } = await supabase
                  .from('sala_streams')
                  .select('*')
                  .eq('sala_id', sala.id)
                  .eq('user_id', usuarioAtual.id)
                  .maybeSingle();

                let error;
                let newStreamData: any = null;
                if (existingStream) {
                  // Update existing stream to active
                  const result = await supabase
                    .from('sala_streams')
                    .update({ ativo: true })
                    .eq('id', existingStream.id);
                  error = result.error;
                  newStreamData = existingStream;
                } else {
                  // Insert new stream
                  const result = await supabase
                    .from('sala_streams')
                    .insert({
                      sala_id: sala.id,
                      user_id: usuarioAtual.id,
                      twitch_channel: twitchChannel,
                      ativo: true,
                    });
                  error = result.error;
                  // Para insert, pega o primeiro item se houver
                  if (result.data && Array.isArray(result.data)) {
                    newStreamData = result.data[0];
                  }
                }

                if (error) {
                  console.error('Erro ao ativar transmissão:', error);
                  alert('Erro ao ativar transmissão');
                } else if (newStreamData) {
                  // Atualizar state imediatamente
                  setSalaStreamAtiva(newStreamData);
                  // Abrir modal de transmissão
                  setIsStreamModalOpen(true);
                }
              }
            }}
            className={`flex items-center gap-2 px-3 py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all border-2 ${
              salaStreamAtiva
                ? 'bg-purple-600/40 border-purple-500 text-purple-200 hover:bg-purple-600/60'
                : 'bg-purple-600/10 border-purple-500/30 text-purple-400 hover:bg-purple-600/20 hover:border-purple-500/50'
            }`}
          >
            <Eye className="w-5 h-5" />
            {salaStreamAtiva && (
              <span className="hidden sm:inline">
                🔴 TRANSMITINDO
              </span>
            )}
            {salaStreamAtiva && (
              <span className="sm:hidden">
                🔴
              </span>
            )}
          </button>
        </motion.div>
      )}

      {/* HUD FIXO: Código + Botões de Transmissão — SEMPRE VISÍVEL NA FRENTE */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 md:top-6 md:right-6 pointer-events-auto">
        {/* Botão TRANSMITIR (Streamer/Admin/Coach) */}
        {(cargoUsuario === 'streamer' || cargoUsuario === 'admin' || cargoUsuario === 'coach') && sala.modo === 'time_vs_time' && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsStreamModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-black uppercase tracking-wider text-xs transition-all border bg-purple-600/10 border-purple-500/30 text-purple-400 hover:bg-purple-600/20 hover:border-purple-500/50"
            title="Transmitir ao vivo"
          >
            <Tv2 className="w-4 h-4" />
            <span className="hidden sm:inline">Transmitir</span>
          </motion.button>
        )}

      </div>

      {/* Botão ASSISTIR em BAIXO (lado direito) — quando há stream ativa */}
      {salaStreamAtiva && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed right-4 bottom-4 z-40 md:right-8 md:bottom-8"
        >
          <button
            onClick={() => setIsStreamModalOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all border-2 bg-purple-600/10 border-purple-500/30 text-purple-400 hover:bg-purple-600/20 hover:border-purple-500/50 animate-pulse"
          >
            <Eye className="w-5 h-5" />
            <span className="hidden sm:inline">ASSISTIR LIVE</span>
            <span className="sm:hidden">🔴</span>
          </button>
        </motion.div>
      )}

      {/* Stream Modal */}
      {salaStreamAtiva && salaStreamAtiva.twitch_channel && (
        <StreamModal
          isOpen={isStreamModalOpen}
          onClose={() => setIsStreamModalOpen(false)}
          channel={salaStreamAtiva.twitch_channel}
          title={`Transmissão da Sala ${sala.codigoPartida || sala.id}`}
        />
      )}

      {/* Side Vignettes */}
      <div className="absolute inset-y-0 left-0 w-[20vmin] bg-gradient-to-r from-black via-black/60 to-transparent z-5 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-[20vmin] bg-gradient-to-l from-black via-black/60 to-transparent z-5 pointer-events-none" />
    </div>
  );
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}