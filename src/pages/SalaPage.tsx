// src/pages/SalaPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crown, UserPlus, Check, ArrowLeft, Lock, Sword, X, Eye, AlertTriangle, Trophy, Copy, Trash2, Zap, RefreshCw, Clock, CheckCircle, Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  buscarSalaCompleta, buscarSalaVinculadaDoUsuario, deletarSala,
  type Sala, type JogadorNaSala, type OpcaoVotoResultado,
} from '../api/salas';
import { SalaRegrasProvider, useSalaRegras } from '../contexts/SalaRegras';
import { getModoInfo, getMPointsInfo, ROLE_CONFIG, type Role } from '../components/partidas/salaConfig';

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
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: carrega perfil do usuário autenticado
// ─────────────────────────────────────────────────────────────────────────────

async function carregarUsuario(): Promise<UsuarioAtual | null> {
  const { data: { user } } = await supabase.auth.getUser();
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
    avatar = `https://ddragon.leagueoflegends.com/cdn/15.8.1/img/profileicon/${riotAny.profile_icon_id}.png`;
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
      if (!sala || sala.estado === 'encerrada') {
        setErro('Sala não encontrada ou já encerrada.');
        setLoading(false);
        return;
      }

      setSalaInicial(sala);
      setLoading(false);
    };
    init();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent mb-4" />
        <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Carregando sala...</p>
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

function CentralDisplay() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-full">
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
    </div>
  );
}

function ScoreboardHeader() {
  return (
    <div className="flex items-center justify-center h-full scale-90">
      <div className="relative flex items-center">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#FFB700]/30 to-transparent" />
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#FFB700]/30 to-transparent" />
        
        <div className="relative z-10 h-[3.5vmin] w-[14vmin] bg-blue-600 flex items-center justify-center border-y border-l border-white/20 rounded-l transform -skew-x-12 ml-1 shadow-[0_0_20px_rgba(37,99,235,0.6)]">
          <span className="text-[1vmin] font-black text-white uppercase tracking-[0.2em] skew-x-12 italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">TEAM BLUE</span>
        </div>

        <div className="relative z-20 h-[5.5vmin] w-[11vmin] bg-[#0a0a0a] border border-white/20 rounded flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,1)] mx-[-0.8vmin]">
          <div className="absolute inset-0.5 border border-[#FFB700]/10 rounded" />
          <span className="text-[2.5vmin] font-bold text-white tabular-nums tracking-tighter italic">00:00</span>
        </div>

        <div className="relative z-10 h-[3.5vmin] w-[14vmin] bg-red-600 flex items-center justify-center border-y border-r border-white/20 rounded-r transform skew-x-12 mr-1 shadow-[0_0_20px_rgba(220,38,38,0.6)]">
          <span className="text-[1vmin] font-black text-white uppercase tracking-[0.2em] -skew-x-12 italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">TEAM RED</span>
        </div>
      </div>
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
      <span className="text-[1.2vmin] font-black uppercase tracking-[0.3em] italic transition-colors">{children}</span>
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

  useEffect(() => {
    // Carrega histórico das últimas 24h
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from('sala_chat')
      .select('*')
      .eq('sala_id', salaId)
      .gte('created_at', desde)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMsgs(data as MsgChat[]); });

    // Realtime
    const ch = supabase
      .channel(`sala_chat_${salaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sala_chat', filter: `sala_id=eq.${salaId}` },
        (payload) => setMsgs(prev => [...prev, payload.new as MsgChat])
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [salaId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    await supabase.from('sala_chat').insert({ sala_id: salaId, user_id: usuarioAtual.id, nome: usuarioAtual.nome, texto: t });
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } };

  return (
    <div className="w-[36vmin] h-[17vmin] bg-white/[0.02] border border-white/5 rounded-sm flex flex-col">
      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pt-2 space-y-1.5 scrollbar-thin scrollbar-thumb-[#FFB700]/20 scrollbar-track-transparent">
        <div className="text-[0.8vmin] text-white/20 uppercase tracking-widest mb-1 font-bold">Chat da Sala</div>
        {msgs.length === 0 && (
          <div className="text-[1vmin] text-white/10 italic">Nenhuma mensagem ainda.</div>
        )}
        {msgs.map(m => (
          <div key={m.id} className="text-[1vmin] text-white leading-snug break-words">
            <span className="font-black mr-1" style={{ color: corDoNick(m.user_id) }}>{m.nome}:</span>
            <span className="text-white/80">{m.texto}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/5 flex items-center px-2 gap-1.5 h-[3.5vmin] shrink-0">
        <button onClick={enviar} className="text-[#FFB700]/40 hover:text-[#FFB700] transition-colors shrink-0">
          <Send className="w-[1.4vmin] h-[1.4vmin]" />
        </button>
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={onKey}
          maxLength={200}
          placeholder="Pressione Enter para enviar..."
          className="flex-1 bg-transparent text-[1vmin] text-white/70 placeholder:text-white/10 outline-none"
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
  isCriador
}: {
  sala: Sala,
  usuarioAtual: { id: string; nome: string },
  jogadorAtual: JogadorNaSala | undefined,
  acaoConfirmarPresenca: () => void,
  acaoSairDaSala: () => void,
  acaoSolicitarFinalizacao: () => void,
  isCriador: boolean
}) {
  const estado = sala.estado;

  return (
    <div className="w-full flex flex-col items-center relative pb-4">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#FFB700]/40 to-transparent blur-sm" />

      {/* Mesmo gap-[68vmin] do MIDDLE SECTION — laterais alinham com as colunas dos slots */}
      <div className="relative w-full flex items-end justify-center gap-[68vmin]">

        {/* ESQUERDA — alinha com coluna esquerda (items-start) */}
        <div className="flex items-end justify-start w-[36vmin] pb-1">
          <HextechModule variant="danger" onClick={acaoSairDaSala}>
            Sair da Sala
          </HextechModule>
        </div>

        {/* CENTRO — absolutamente centralizado, independente dos laterais */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 flex flex-col items-center pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1.5 h-1.5 rounded-full ${['em_partida', 'finalizacao'].includes(estado) ? 'bg-red-400' : estado === 'confirmacao' ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'} animate-pulse`} />
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white/30 italic">
                Status: {estado.replace('_', ' ')}
              </span>
            </div>

            {estado === 'confirmacao' && jogadorAtual ? (
              <motion.button
                whileHover={{ scale: 1.02, letterSpacing: '0.6em' }}
                whileTap={{ scale: 0.98 }}
                onClick={acaoConfirmarPresenca}
                disabled={jogadorAtual.confirmado}
                className={`px-[10vmin] py-[2vmin] font-black uppercase tracking-[0.4em] text-[1.4vmin] rounded-sm shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-500 ${
                  jogadorAtual.confirmado ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-white text-black hover:bg-[#FFB700]'
                }`}
              >
                {jogadorAtual.confirmado ? 'Você está Pronto!' : 'Confirmar Presença'}
              </motion.button>
            ) : estado === 'em_partida' && isCriador ? (
              <motion.button
                whileHover={{ scale: 1.02, letterSpacing: '0.6em' }}
                whileTap={{ scale: 0.98 }}
                onClick={acaoSolicitarFinalizacao}
                className="px-[10vmin] py-[2vmin] bg-orange-500 text-white font-black uppercase tracking-[0.4em] text-[1.4vmin] rounded-sm shadow-[0_0_40px_rgba(249,115,22,0.2)] hover:bg-orange-600 transition-all duration-500"
              >
                Encerrar Partida
              </motion.button>
            ) : (
              <div className="px-[10vmin] py-[2vmin] border border-white/5 bg-white/5 rounded-sm">
                <span className="text-[1.1vmin] font-black uppercase tracking-[0.8em] text-white/10 italic">
                  {estado === 'aberta' ? 'Aguardando Jogadores' : 'Partida em Andamento'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* DIREITA — alinha com coluna direita (items-end), mesma largura dos slots */}
        <div className="flex items-end justify-end w-[36vmin]">
          <SalaChat salaId={sala.id} usuarioAtual={usuarioAtual} jogadores={sala.jogadores} />
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
    sala, loading, jogadorAtual, viewers, semContaRiot,
    timerConfirmacao, timerAguardando,
    meuVotoInicio, meuVotoResultado,
    contagemVotosInicio, contagemVotosResultado,
    podeExecutar,
    acaoEntrarVaga, acaoSairVaga, acaoConfirmarPresenca,
    acaoVotarInicio, acaoVotarResultado, acaoSolicitarFinalizacao,
    acaoApagarSala, acaoSairDaSala,
  } = useSalaRegras();

  const [copiado, setCopiado]           = useState(false);
  const [showEncerrar, setShowEncerrar] = useState(false);
  const vagasEmAndamento                = useRef<Set<string>>(new Set());

  if (loading || !sala) {
    return (
      <div className="flex-1 bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent" />
      </div>
    );
  }

  const roles: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP'];
  const timeA = sala.jogadores.filter(j => j.isTimeA);
  const timeB = sala.jogadores.filter(j => !j.isTimeA);
  const isCriador = sala.criadorId === usuarioAtual.id;

  const slotWidths = [
    'w-[36vmin]', // TOP
    'w-[34vmin]', // JG
    'w-[32vmin]', // MID
    'w-[34vmin]', // ADC
    'w-[36vmin]', // SUP
  ];

  const copiarLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const renderSlot = (role: Role, isTimeA: boolean, index: number) => {
    const jog = (isTimeA ? timeA : timeB).find(j => j.role === role);
    const roleIcon = ROLE_CONFIG[role];
    const isEu = jog?.id === usuarioAtual.id;
    const widthClass = slotWidths[index];
    const isLeft = isTimeA;
    const teamColor = isTimeA ? '#3B82F6' : '#ef4444';

    if (jog) {
      const avatarEl = (
        <div className="w-[4vmin] h-[4vmin] rounded bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
          {jog.avatar
            ? <img src={jog.avatar} alt={jog.nome} className="w-full h-full object-cover" />
            : <span className="text-white/20 text-[1.4vmin] font-bold">{jog.nome[0]}</span>
          }
        </div>
      );

      return (
        <div
          key={`${isTimeA ? 'A' : 'B'}-${role}`}
          className={`relative ${widthClass} h-[7.5vmin] bg-black rounded-lg border border-white/10 flex flex-row items-center px-[1.5vmin] shadow-lg transition-all ${
            sala.estado === 'confirmacao' && jog.confirmado ? 'border-green-500/30 bg-green-500/5' : ''
          } ${isTimeA ? 'justify-end' : 'justify-start'}`}
        >
          {isTimeA ? (
            // Time Azul — tudo agrupado na direita (lado interno):
            // [avatar] [nome] [tag] [ícone rota]
            <div className="flex items-center gap-[0.8vmin] overflow-hidden">
              {avatarEl}
              <span className="text-[1.6vmin] font-black tracking-tight truncate" style={{ color: teamColor }}>{jog.nome}</span>
              <span className="text-white/60 text-[1.6vmin] font-semibold shrink-0">{jog.tag}</span>
              {jog.isLider && <Crown className="w-[1.2vmin] h-[1.2vmin] text-yellow-400 shrink-0" />}
              <img src={roleIcon.img} className="w-[3.2vmin] h-[3.2vmin] opacity-80 shrink-0" alt={role} />
            </div>
          ) : (
            // Time Vermelho — tudo agrupado na esquerda (lado interno):
            // [ícone rota] [avatar] [nome] [tag]
            <div className="flex items-center gap-[0.8vmin] overflow-hidden">
              <img src={roleIcon.img} className="w-[3.2vmin] h-[3.2vmin] opacity-80 shrink-0" alt={role} />
              {avatarEl}
              <span className="text-[1.6vmin] font-black tracking-tight truncate" style={{ color: teamColor }}>{jog.nome}</span>
              <span className="text-white/60 text-[1.6vmin] font-semibold shrink-0">{jog.tag}</span>
              {jog.isLider && <Crown className="w-[1.2vmin] h-[1.2vmin] text-yellow-400 shrink-0" />}
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
        className={`relative ${widthClass} h-[7.5vmin] bg-black rounded-lg border border-white/5 flex ${isLeft ? 'flex-row-reverse' : 'flex-row'} items-center px-[1.5vmin] gap-[1vmin] transition-all group ${
          podeEntrar ? 'hover:bg-white/[0.03] border-white/10' : 'opacity-10 cursor-not-allowed'
        }`}
      >
        <div className="w-[4vmin] h-[4vmin] rounded border border-white/5 bg-white/5 flex items-center justify-center">
          <UserPlus className="w-[1.8vmin] h-[1.8vmin] text-white/10 group-hover:text-white/40 transition-colors" />
        </div>
        <div className={`flex flex-col ${isLeft ? 'items-end text-right' : 'items-start text-left'}`}>
          <span className="text-[1vmin] font-black text-white/10 uppercase tracking-[0.2em] group-hover:text-white/30 transition-colors">
            {podeEntrar ? 'ENTRAR' : role}
          </span>
          <div className={`flex items-center gap-[0.7vmin] mt-[0.2vmin] ${isLeft ? 'flex-row-reverse' : 'flex-row'}`}>
            <img src={roleIcon.img} className="w-[1.3vmin] h-[1.3vmin] opacity-10 group-hover:opacity-30 transition-opacity" alt={role} />
            <span className="text-[0.9vmin] font-black text-white/5 uppercase tracking-widest">{role}</span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex-1 w-full bg-[#050505] flex flex-col items-center justify-between p-0 font-sans relative overflow-hidden">
      
      {/* BACKGROUND IMAGE */}
      <img 
        src="/images/mapa1.png" 
        alt="Background Map" 
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        referrerPolicy="no-referrer"
      />

      {/* MASSIVE CENTRAL CIRCLE */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full bg-black border-[4px] border-white/5 flex flex-col items-center justify-center z-10">
        <div className="absolute inset-10 rounded-full border border-white/[0.02]" />
        <ArcaneIndicators />
        <CentralDisplay />
        
        {/* Overlay de Confirmação */}
        {sala.estado === 'confirmacao' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-30 rounded-full">
            <span className="text-[15vmin] font-black text-white tabular-nums leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">{timerConfirmacao}</span>
            <span className="text-[2vmin] font-black text-white/40 uppercase tracking-[1em] mt-6">CONFIRME AGORA</span>
          </div>
        )}

        {/* Overlay de Votação de Início */}
        {sala.estado === 'aguardando_inicio' && jogadorAtual && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-30 rounded-full p-[10vmin] text-center">
            <p className="text-white font-black text-[2.5vmin] uppercase tracking-widest mb-[4vmin]">A partida iniciou?</p>
            <div className="flex gap-[2vmin] w-full max-w-[40vmin]">
              <button
                onClick={() => acaoVotarInicio('iniciou')}
                className={`flex-1 py-[2vmin] rounded-xl font-black text-[1.5vmin] uppercase tracking-widest transition-all border ${
                  meuVotoInicio === 'iniciou' ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                Sim ({contagemVotosInicio.iniciou})
              </button>
              <button
                onClick={() => acaoVotarInicio('nao_iniciou')}
                className={`flex-1 py-[2vmin] rounded-xl font-black text-[1.5vmin] uppercase tracking-widest transition-all border ${
                  meuVotoInicio === 'nao_iniciou' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                Não ({contagemVotosInicio.nao_iniciou})
              </button>
            </div>
            <p className="text-white/20 text-[1.2vmin] font-bold uppercase mt-[4vmin] tracking-widest">{formatTime(timerAguardando)} restantes</p>
          </div>
        )}

        {/* Overlay de Votação de Resultado */}
        {sala.estado === 'finalizacao' && jogadorAtual && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-30 rounded-full p-[10vmin] text-center">
            <p className="text-white font-black text-[2.5vmin] uppercase tracking-widest mb-[4vmin]">Quem venceu?</p>
            <div className="grid grid-cols-3 gap-[2vmin] w-full max-w-[50vmin]">
              <button
                onClick={() => acaoVotarResultado('time_a')}
                className={`py-[2vmin] rounded-xl font-black text-[1.2vmin] uppercase tracking-widest transition-all border ${
                  meuVotoResultado === 'time_a' ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-white/40'
                }`}
              >
                Time A ({contagemVotosResultado.time_a})
              </button>
              <button
                onClick={() => acaoVotarResultado('empate')}
                className={`py-[2vmin] rounded-xl font-black text-[1.2vmin] uppercase tracking-widest transition-all border ${
                  meuVotoResultado === 'empate' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' : 'bg-white/5 border-white/10 text-white/40'
                }`}
              >
                Empate ({contagemVotosResultado.empate})
              </button>
              <button
                onClick={() => acaoVotarResultado('time_b')}
                className={`py-[2vmin] rounded-xl font-black text-[1.2vmin] uppercase tracking-widest transition-all border ${
                  meuVotoResultado === 'time_b' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-white/40'
                }`}
              >
                Time B ({contagemVotosResultado.time_b})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TOP BAR */}
      <div className="w-full h-[10vmin] flex items-start justify-center pt-[2vmin] z-30">
        <div className="w-full max-w-6xl h-[7vmin] bg-black rounded-xl border border-white/10 flex items-center px-[3vmin] shadow-2xl mx-4 justify-between relative overflow-visible">
          <div className="flex items-center">
            <button onClick={acaoSairDaSala} className="mr-[3vmin] text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-[2.5vmin] h-[2.5vmin]" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-[2vmin] font-black uppercase tracking-tighter text-white italic leading-none">{sala.nome}</h1>
              <div className="flex items-center gap-[1vmin] mt-[0.5vmin]">
                <span className="text-[1vmin] font-black text-[#FFB700] tracking-[0.5em]">{sala.codigo}</span>
                <button onClick={copiarLink} className="text-white/20 hover:text-white/40 transition-colors">
                  {copiado ? <Check className="w-[1.4vmin] h-[1.4vmin] text-green-500" /> : <Copy className="w-[1.4vmin] h-[1.4vmin]" />}
                </button>
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden xl:block">
            <ScoreboardHeader />
          </div>

          <div className="flex items-center gap-[3vmin]">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[0.9vmin] font-black text-white/20 uppercase tracking-widest">MODO</span>
              <span className="text-[1.2vmin] font-black text-white uppercase italic">{sala.modo}</span>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[0.9vmin] font-black text-white/20 uppercase tracking-widest">MPOINTS</span>
              <span className="text-[1.2vmin] font-black text-[#FFB700] uppercase">{sala.mpoints}</span>
            </div>
            <div className="flex items-center gap-[1vmin] px-[1.5vmin] py-[0.8vmin] bg-white/5 rounded-lg border border-white/5">
              <Eye className="w-[1.8vmin] h-[1.8vmin] text-[#FFB700]" />
              <span className="text-[1.4vmin] font-black text-white tabular-nums">{viewers}</span>
            </div>
            {isCriador && sala.estado === 'aberta' && (
              <button
                onClick={async () => { await acaoApagarSala(); navigate('/jogar'); }}
                className="p-[1vmin] rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-[1.8vmin] h-[1.8vmin] text-red-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AVISO SEM CONTA RIOT */}
      {semContaRiot && (
        <div className="w-full z-20 px-4 lg:px-8">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Vincule sua conta Riot para entrar em uma vaga. Você pode assistir a partida como espectador.</span>
          </div>
        </div>
      )}

      {/* MIDDLE SECTION */}
      <div className="w-full flex-1 flex items-center justify-center gap-[68vmin] z-20 mt-[-12vh]">
        <div className="flex flex-col gap-[1.5vmin] items-start">
          {roles.map((role, idx) => renderSlot(role, true, idx))}
        </div>
        <div className="flex flex-col gap-[1.5vmin] items-end">
          {roles.map((role, idx) => renderSlot(role, false, idx))}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="w-full h-[14vmin] flex items-center justify-center pb-[4vmin] z-30">
        <HextechActionBar
          sala={sala}
          usuarioAtual={usuarioAtual}
          jogadorAtual={jogadorAtual}
          acaoConfirmarPresenca={acaoConfirmarPresenca}
          acaoSairDaSala={acaoSairDaSala}
          acaoSolicitarFinalizacao={() => setShowEncerrar(true)}
          isCriador={isCriador}
        />
      </div>

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

      {/* Side Vignettes */}
      <div className="absolute inset-y-0 left-0 w-[20vmin] bg-gradient-to-r from-black via-black/60 to-transparent z-5 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-[20vmin] bg-gradient-to-l from-black via-black/60 to-transparent z-5 pointer-events-none" />
    </div>
  );
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}
