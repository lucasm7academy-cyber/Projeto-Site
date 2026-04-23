// src/pages/jogar.tsx
// NOVA VERSÃO - Design integrado com Hero Slider, Cards de Modo e Carrossel de Salas

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, ChevronLeft, ChevronRight, Trophy, Users, Eye, Coins,
  Search, Lock, Zap, Crown, X, LogIn, Plus, SlidersHorizontal,
  Sword, Shield, Swords, Gem, Snowflake, Tv2
} from 'lucide-react';
import {
  MODOS_JOGO, OPCOES_ELO, OPCOES_MPOINTS, getModoInfo, getMPointsInfo,
  getMaxJogadoresPorModo, type ModoJogo,
} from '../components/partidas/salaConfig';
import { carregarSalas, carregarSalasFinalizadas, criarSala, buscarSalaAtivaDoUsuario, type Sala } from '../api/salas';
import { supabase } from '../lib/supabase';
import { getCachedUser } from '../contexts/AuthContext';
import { buildProfileIconUrl } from '../api/riot';

// ============================================
// TIPOS
// ============================================

interface UsuarioAtual {
  id: string;
  nome: string;
  tag?: string;
  elo: string;
  role: string;
  avatar?: string;
}

interface UserTeam {
  id: string;
  nome: string;
  tag: string;
  logo?: string;
}

interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  bgImage?: string
  actionText?: string;
  actionLink?: string;
}

// ============================================
// SLIDES DE MARKETING
// ============================================

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    title: "CRIE SUA",
    subtitle: "EQUIPE",
    description: "Monte seu time dos sonhos, recrute jogadores e domine a Summoner's Rift juntos",
    icon: Users,
    color: '#4ade80',
    bgGradient: 'from-green-500/20 via-green-500/5 to-transparent',
    bgImage: '/images/heroSlide1.png',
    actionText: 'Criar Time',
    actionLink: '/times'
  },
  {
    id: 2,
    title: "BENEFÍCIOS",
    subtitle: "VIP",
    description: "Acesso a salas exclusivas, torneios premium e recompensas em dobro",
    icon: Crown,
    color: '#fbbf24',
    bgGradient: 'from-yellow-500/20 via-yellow-500/5 to-transparent',
    bgImage: '/images/heroSlide2.png',
    actionText: 'Seja VIP',
    actionLink: '/sejavip'
  },
  {
    id: 3,
    title: "JOGUE COM",
    subtitle: "RESPEITO",
    description: "Fair play, integridade e competitividade saudável. Jogue para vencer!",
    icon: Shield,
    color: '#3b82f6',
    bgGradient: 'from-blue-500/20 via-blue-500/5 to-transparent',
    bgImage: '/images/heroSlide3.png',
    actionText: 'Código de Conduta',
    actionLink: '/políticas'
  }
];

// ============================================
// CONFIGURAÇÃO DOS MODOS DE JOGO (CARDS)
// ============================================

const modosCards = [
  {
    modo: '5v5' as ModoJogo,
    titulo: '5v5 CLÁSSICO',
    subtitulo: 'Summoner\'s Rift',
    icone: Swords,
    cor: '#fbbf24',  // Amarelo
    stats: 'Competitivo • Estratégia',
    bgImage: '/images/fundoCard5v5.png'
  },
  {
    modo: 'aram' as ModoJogo,
    titulo: 'ARAM',
    subtitulo: 'Howling Abyss',
    icone: Snowflake,
    cor: '#3b82f6',  // Azul
    stats: 'Caótico • Diversão',
    bgImage: '/images/fundoCardAram.png'
  },
  {
    modo: '1v1' as ModoJogo,
    titulo: '1v1 DUELO',
    subtitulo: 'Howling Abyss',
    icone: Sword,
    cor: '#ef4444',  // Vermelho
    stats: 'Individual • Habilidade',
    bgImage: '/images/fundoCard1v1.png'
  },
  {
    modo: 'time_vs_time' as ModoJogo,
    titulo: 'TIME vs TIME',
    subtitulo: 'Competitivo',
    icone: Trophy,
    cor: '#a855f7',  // Roxo
    stats: 'Clã • Ranking',
    bgImage: '/images/fundoCardTime.png'
  }
];

// ============================================
// MODAL SENHA
// ============================================

const ModalSenha = ({ nome, onClose, onConfirm, erro }: any) => {
  const [senha, setSenha] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13, 13, 13, 0.8)',
          border: '2px solid #FFB700',
          boxShadow: '0 0 45px -10px rgba(255, 183, 0, 0.4)',
          backdropFilter: 'blur(16px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-400" />
            <h2 className="text-white font-black text-lg uppercase tracking-tight">Sala Privada</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-white/60 text-sm">A sala <span className="text-white font-bold">{nome}</span> requer senha</p>
          <input
            type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite a senha"
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-yellow-500/50"
            autoFocus
          />
          {erro && <p className="text-red-400 text-xs">{erro}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10">Cancelar</button>
            <button onClick={() => onConfirm(senha)} className="flex-1 py-3 rounded-xl bg-yellow-500 text-black text-sm font-black hover:bg-yellow-400">Entrar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// MODAL CRIAR SALA (Versão simplificada)
// ============================================

const ModalCriarSala = ({ onClose, onCreate, usuarioAtual, userTeam, modoInicial }: any) => {
  const [modo, setModo] = useState<ModoJogo>(modoInicial || '5v5');
  const [mpoints, setMpoints] = useState(0); // MVP: Começa com 0 MC (sem apostas por enquanto)
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [temSenha, setTemSenha] = useState(false);
  const [senha, setSenha] = useState('');
  const [eloMinimo, setEloMinimo] = useState('');
  const [loading, setLoading] = useState(false);

  const modoInfo = getModoInfo(modo);
  const mpInfo = getMPointsInfo(mpoints);

  const handleSubmit = async () => {
    setLoading(true);
    const maxJogadores = getMaxJogadoresPorModo(modo);
    
    const dados: any = {
      modo,
      mpoints,
      nome: nome || `Sala ${MODOS_JOGO[modo].nome} de ${usuarioAtual.nome}`,
      descricao: descricao || MODOS_JOGO[modo].descricao,
      temSenha,
      senha: temSenha ? senha : undefined,
      maxJogadores,
      eloMinimo: eloMinimo || undefined,
    };

    // Para time_vs_time, a sala nasce branca (sem time preenchido)
    // O criador entra como jogador normal depois

    await onCreate(dados);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-md rounded-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
        style={{
          background: 'rgba(13, 13, 13, 0.9)',
          border: `2px solid ${modoInfo.cor}`,
          boxShadow: `0 0 45px -10px ${modoInfo.cor}60`,
          backdropFilter: 'blur(16px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Background Image */}
        {modoInfo.bgImage && (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center opacity-10 pointer-events-none transition-all duration-500"
            style={{ backgroundImage: `url(${modoInfo.bgImage})` }}
          />
        )}
        <div className="absolute inset-0 z-0 opacity-50 pointer-events-none transition-all duration-500"
          style={{ background: `linear-gradient(to bottom, transparent, ${modoInfo.cor}20)` }}
        />

        <div className="relative z-10 px-6 py-4 border-b border-white/8 flex items-center justify-between sticky top-0 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5" style={{ color: modoInfo.cor }} />
            <h2 className="text-white font-black text-lg uppercase">Criar Sala • {modoInfo.nome}</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 p-6 space-y-5">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Nome da Sala</label>
            <input
              type="text" value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder={`Ex: Sala de ${usuarioAtual.nome}${usuarioAtual.tag}`}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          {/* M Points */}
          <div className="space-y-3">
            <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Valor da Partida</label>
            <div className="grid grid-cols-3 gap-2">
              {OPCOES_MPOINTS.map((op) => {
                const isLocked = op.valor > 0; // Apenas valor 0 (casual) está disponível
                return (
                  <button
                    key={op.valor}
                    onClick={() => !isLocked && setMpoints(op.valor)}
                    disabled={isLocked}
                    className={`p-2.5 rounded-xl text-center transition-all border ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    style={
                      mpoints === op.valor && !isLocked
                        ? { borderColor: op.cor, background: `${op.cor}18`, color: op.cor }
                        : { borderColor: isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.05)',
                            background: isLocked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
                            color: isLocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)' }
                    }
                  >
                    <p className="text-xs font-black uppercase">
                      {isLocked ? `🔒 Em breve` : `💰 ${op.valor} MC`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modo */}
          <div className="space-y-2">
            <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Modo de Jogo</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(MODOS_JOGO) as [ModoJogo, typeof MODOS_JOGO[ModoJogo]][]).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setModo(key)}
                  className="p-3 rounded-xl text-left transition-all border relative overflow-hidden group"
                  style={
                    modo === key
                      ? { borderColor: value.cor, background: `${value.cor}15`, color: 'white' }
                      : { borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)' }
                  }
                >
                  {/* Button Background Image */}
                  {value.bgImage && (
                    <div 
                      className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-300 ${modo === key ? 'opacity-30' : 'opacity-5 group-hover:opacity-15'}`}
                      style={{ backgroundImage: `url(${value.bgImage})` }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-2 mb-1">
                    <span className="text-lg">{value.icone}</span>
                    <span className="text-xs font-black uppercase tracking-tighter">{value.nome}</span>
                  </div>
                  <p className="relative z-10 text-[9px] font-medium opacity-60 leading-tight uppercase tracking-widest">{value.descricao}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Descrição</label>
            <textarea
              value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva sua sala..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm resize-none h-20"
            />
          </div>

          {/* Elo + Senha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">ELO Mínimo</label>
              <select
                value={eloMinimo} onChange={(e) => setEloMinimo(e.target.value)}
                disabled={modo === 'time_vs_time'}
                className={`w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm ${modo === 'time_vs_time' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {OPCOES_ELO.map(elo => (
                  <option key={elo.valor} value={elo.valor} className="bg-[#0d0d0d]">{elo.label}</option>
                ))}
              </select>
              {modo === 'time_vs_time' && <p className="text-[9px] text-white/30 italic">Desativado para times</p>}
            </div>
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Senha</label>
              <button
                onClick={() => setTemSenha(!temSenha)}
                className={`w-full p-3 rounded-xl border transition-all ${temSenha ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                {temSenha ? '🔒 Privada' : '🔓 Pública'}
              </button>
            </div>
          </div>

          {temSenha && (
            <input
              type="text" value={senha} onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a senha"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm"
            />
          )}
        </div>

        <div className="relative z-10 p-6 border-t border-white/8 sticky bottom-0 bg-black/50 backdrop-blur-sm">
          <button
            onClick={handleSubmit} disabled={loading}
            className="w-full py-4 rounded-xl font-black text-sm uppercase text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${modoInfo.cor}, ${modoInfo.cor}dd)` }}
          >
            {loading ? 'Criando...' : 'Criar Sala'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const Jogar = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeHero, setActiveHero] = useState(0);
  const gamesRef = useRef<HTMLDivElement>(null);
  const finalizadasRef = useRef<HTMLDivElement>(null);
  
  // Estados do usuário
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioAtual | null>(null);
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  // Estados das salas
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loadingSalas, setLoadingSalas] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroModo, setFiltroModo] = useState<ModoJogo | 'todos'>('todos');
  const [streamsAtivos, setStreamsAtivos] = useState<Record<number, boolean>>({}); // Track active streams per sala
  const recarregarSalasTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Estados das salas finalizadas
  const [salasFinalizadas, setSalasFinalizadas] = useState<Sala[]>([]);
  const [loadingSalasFinalizadas, setLoadingSalasFinalizadas] = useState(false);
  const [buscaFinalizadas, setBuscaFinalizadas] = useState('');
  const [filtroModoFinalizadas, setFiltroModoFinalizadas] = useState<ModoJogo | 'todos'>('todos');
  
  // Modais
  const [showCriarModal, setShowCriarModal] = useState(false);
  const [modoSelecionado, setModoSelecionado] = useState<ModoJogo>('5v5');
  const [showSenhaModal, setShowSenhaModal] = useState<{ salaId: number; nome: string } | null>(null);
  const [erroSenha, setErroSenha] = useState('');
  
  const salaVinculadaRef = useRef<Sala | null>(null);

  // Scroll para Salas Finalizadas se view=finalizadas
  useEffect(() => {
    if (searchParams.get('view') === 'finalizadas' && finalizadasRef.current) {
      setTimeout(() => {
        finalizadasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [searchParams]);

  // Carregar usuário
  useEffect(() => {
    const carregarUsuario = async () => {
      const user = await getCachedUser();
      if (!user) { setLoadingUser(false); return; }

      const [{ data: perfil }, { data: riot }, { data: membro }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('contas_riot').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('time_membros').select('time_id, role').eq('user_id', user.id).maybeSingle(),
      ]);

      const riotAny = riot as any;
      const riotId: string = riotAny?.riot_id ?? '';
      const [gameName, tagLine] = riotId.includes('#') ? riotId.split('#') : [riotId, ''];
      const elo = riotAny?.elo_cache?.soloQ?.tier ?? 'Sem Elo';
      const role = membro?.role ?? 'RES';
      const perfilAny = perfil as any;

      let avatar: string | undefined;
      if (riotAny?.profile_icon_id) {
        avatar = buildProfileIconUrl(riotAny.profile_icon_id);
      }

      setUsuarioAtual({
        id: user.id,
        nome: gameName || perfilAny?.username || perfilAny?.full_name || user.email?.split('@')[0] || 'Jogador',
        tag: tagLine ? `#${tagLine}` : undefined,
        elo,
        role,
        avatar,
      });

      if (membro?.time_id) {
        const { data: time } = await supabase
          .from('times')
          .select('id, nome, tag, logo_url')
          .eq('id', membro.time_id)
          .maybeSingle();
        if (time) {
          setUserTeam({
            id: String(time.id),
            nome: time.nome,
            tag: time.tag,
            logo: time.logo_url ?? undefined,
          });
        }
      }

      setLoadingUser(false);
    };
    carregarUsuario();
  }, []);

  // Carregar salas
  const recarregarSalas = useCallback(async () => {
    const lista = await carregarSalas();
    setSalas(lista);
    setLoadingSalas(false);
  }, []);

  // ✅ Debounce 500ms para recarregarSalas — evita múltiplas queries quando eventos disparam juntos
  const recarregarSalasComDebounce = useCallback((usuarioAtual: any) => {
    if (recarregarSalasTimeoutRef.current) clearTimeout(recarregarSalasTimeoutRef.current);
    recarregarSalasTimeoutRef.current = setTimeout(() => {
      recarregarSalas();
    }, 500);
  }, [recarregarSalas]);

  // Carregar salas finalizadas
  const recarregarSalasFinalizadas = useCallback(async () => {
    const lista = await carregarSalasFinalizadas();
    setSalasFinalizadas(lista);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!usuarioAtual) return;
      const vinculada = await buscarSalaAtivaDoUsuario(usuarioAtual.id);
      if (vinculada) {
        salaVinculadaRef.current = vinculada;
        navigate(`/sala/${vinculada.id}`, { replace: true });
        return;
      }
      await recarregarSalas();
    };
    if (usuarioAtual) init();

    const channel = supabase
      .channel('salas_jogar_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, () => recarregarSalasComDebounce(usuarioAtual))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sala_jogadores' }, () => recarregarSalasComDebounce(usuarioAtual))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sala_streams' }, async () => {
        // Atualizar streams ativos
        const { data: streams } = await supabase
          .from('sala_streams')
          .select('sala_id')
          .eq('ativo', true);

        const streamMap: Record<number, boolean> = {};
        if (streams) {
          streams.forEach(s => { streamMap[s.sala_id as number] = true; });
        }
        setStreamsAtivos(streamMap);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [usuarioAtual, navigate, recarregarSalas, recarregarSalasComDebounce]);

  // Carregar e monitorar salas finalizadas
  useEffect(() => {
    if (!usuarioAtual) return;

    const init = async () => {
      setLoadingSalasFinalizadas(true);
      await recarregarSalasFinalizadas();
      setLoadingSalasFinalizadas(false);
    };
    init();

    const channel = supabase
      .channel('salas_finalizadas_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, recarregarSalasFinalizadas)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [usuarioAtual, recarregarSalasFinalizadas]);

  // ✅ REMOVIDO: Canais Presence individuais por sala (N canais = N² WebSocket overhead)
  // Usar sala.jogadores.length em vez disso (já sincronizado via Realtime)

  // Hero navigation
  const nextHero = () => setActiveHero((prev) => (prev + 1) % heroSlides.length);
  const prevHero = () => setActiveHero((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));

  // Auto-advance hero slides every 8 seconds
  useEffect(() => {
    const interval = setInterval(nextHero, 8000);
    return () => clearInterval(interval);
  }, []);

  // Scroll do carrossel
  const scrollCarrossel = (direction: 'left' | 'right') => {
    if (gamesRef.current) {
      const scrollAmount = direction === 'left' ? -450 : 450;
      gamesRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filtrar salas
  const salasFiltradas = salas.filter(sala => {
    const matchBusca = sala.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       sala.descricao.toLowerCase().includes(busca.toLowerCase()) ||
                       sala.codigo.includes(busca.toUpperCase());
    const matchModo = filtroModo === 'todos' || sala.modo === filtroModo;
    return matchBusca && matchModo;
  });

  // Filtrar salas finalizadas
  const salasFinalizadasFiltradas = salasFinalizadas.filter(sala => {
    const matchBusca = sala.nome.toLowerCase().includes(buscaFinalizadas.toLowerCase()) ||
                       sala.descricao.toLowerCase().includes(buscaFinalizadas.toLowerCase()) ||
                       sala.codigo.includes(buscaFinalizadas.toUpperCase());
    const matchModo = filtroModoFinalizadas === 'todos' || sala.modo === filtroModoFinalizadas;
    return matchBusca && matchModo;
  });

  // Entrar na sala
  const entrarNaSala = (sala: Sala, senha?: string) => {
    if (sala.temSenha && senha !== sala.senha) {
      setErroSenha('Senha incorreta');
      return;
    }
    const vinculada = salaVinculadaRef.current;
    if (vinculada && vinculada.id !== sala.id) {
      navigate(`/sala/${vinculada.id}`, { replace: true });
      return;
    }
    navigate(`/sala/${sala.id}`);
    setShowSenhaModal(null);
    setErroSenha('');
  };

  // Criar sala
  const handleCriarSala = async (dados: any) => {
    if (!usuarioAtual) return;

    // Se for Time vs Time, precisa ter um time
    if (dados.modo === 'time_vs_time' && !userTeam) {
      alert('⚠️ Você precisa estar em um time para criar salas Time vs Time!');
      return;
    }

    const nova = await criarSala(dados, usuarioAtual);
    if (nova) {
      setShowCriarModal(false);
      navigate(`/sala/${nova.id}`);
    }
  };

  // Abrir modal com modo pré-selecionado
  const abrirModalCriar = (modo: ModoJogo) => {
    // Validação para Time vs Time
    if (modo === 'time_vs_time' && !userTeam) {
      alert('⚠️ Você precisa estar em um time para criar salas Time vs Time!');
      return;
    }
    setModoSelecionado(modo);
    setShowCriarModal(true);
  };

  if (loadingUser || !usuarioAtual) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent mx-auto mb-4" />
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Carregando...</p>
        </div>
      </div>
    );
  }

  const currentSlide = heroSlides[activeHero];
  const SlideIcon = currentSlide.icon;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 md:p-10 overflow-x-hidden relative">
      
      {/* Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%] z-50 opacity-20" />

      <div className="max-w-[1400px] mx-auto space-y-10 relative z-10">
        
        {/* ============================================ */}
        {/* HERO BANNER - SLIDES DE MARKETING */}
        {/* ============================================ */}
        <div className="relative w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl group">

          <div className="relative w-full p-8 md:p-14 flex items-center justify-between min-h-[320px]">
            {currentSlide.bgImage && (
              <motion.div
                key={`bg-${activeHero}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${currentSlide.bgImage})` }}
              />
            )}
            <motion.div
              key={`gradient-${activeHero}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className={`absolute inset-0 bg-gradient-to-r ${currentSlide.bgGradient} z-0`}
            />

            <motion.div
              key={`content-${activeHero}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="z-10 max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${currentSlide.color}20` }}>
                  <SlideIcon className="w-6 h-6" style={{ color: currentSlide.color }} />
                </div>
                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">LOL TEAMS</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-white uppercase leading-[0.9] tracking-tighter italic mb-4">
                {currentSlide.title}<br />
                <span style={{ color: currentSlide.color }}>{currentSlide.subtitle}</span>
              </h1>
              <p className="text-lg md:text-xl text-white/60 mb-8 max-w-md font-medium leading-snug">
                {currentSlide.description}
              </p>
              
              {currentSlide.actionText && (
                <button
                  onClick={() => currentSlide.actionLink && navigate(currentSlide.actionLink)}
                  className="px-6 py-3 rounded-xl font-black text-sm uppercase text-black transition-all hover:scale-105 cursor-pointer"
                  style={{ background: currentSlide.color }}
                >
                  {currentSlide.actionText} →
                </button>
              )}
            </motion.div>
          </div>

          {/* Hero Navigation */}
          <button onClick={prevHero} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-20">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextHero} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center border border-white/10 transition-all opacity-0 group-hover:opacity-100 z-20">
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Hero Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {heroSlides.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveHero(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === activeHero ? 'w-8 bg-[#FFB700]' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>
        </div>

        {/* ============================================ */}
        {/* CARDS DE MODO - 4 BOTÕES PRINCIPAIS */}
        {/* ============================================ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[#FFB700]" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest">
              Escolha seu Modo de Jogo
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {modosCards.map((card) => {
              const Icon = card.icone;
              return (
                <button
                  key={card.modo}
                  onClick={() => abrirModalCriar(card.modo)}
                  className="w-full bg-black rounded-xl p-6 flex flex-col items-center text-center border border-white/10 hover:border-[#FFB700]/50 hover:bg-white/5 transition-all shadow-lg group cursor-pointer relative overflow-hidden"
                >
                  {/* Background Image */}
                  {card.bgImage && (
                    <div 
                      className="absolute inset-0 z-0 bg-cover bg-center opacity-20 group-hover:opacity-40 transition-opacity duration-300"
                      style={{ backgroundImage: `url(${card.bgImage})` }}
                    />
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 z-0 opacity-50"
                    style={{ background: `linear-gradient(to bottom, transparent, ${card.cor}20)` }}
                  />

                  <div className="relative z-10 w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-colors"
                    style={{ background: `${card.cor}15`, border: `1px solid ${card.cor}30` }}
                  >
                    <Icon className="w-8 h-8" style={{ color: card.cor }} />
                  </div>
                  
                  <h3 className="relative z-10 text-white font-black text-lg uppercase tracking-tight mb-1 group-hover:text-[#FFB700] transition-colors">
                    {card.titulo}
                  </h3>
                  <p className="relative z-10 text-white/40 text-xs uppercase tracking-widest mb-2">{card.subtitulo}</p>
                  
                  <div className="relative z-10 flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: card.cor }}>
                      {card.stats}
                    </span>
                  </div>
                  
                  <div className="relative z-10 mt-4 text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-[#FFB700] transition-colors">
                    Clique para criar sala →
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================ */}
        {/* BARRA DE BUSCA E FILTROS */}
        {/* ============================================ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Search className="w-4 h-4 text-[#FFB700]" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-widest">
                Salas Disponíveis
              </h2>
            </div>
            
            {/* Filtros */}
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="w-4 h-4 text-white/30" />

              {/* Filtro Modo */}
              <select
                value={filtroModo}
                onChange={(e) => setFiltroModo(e.target.value as ModoJogo | 'todos')}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-bold uppercase tracking-wider"
              >
                <option value="todos" className="bg-black">Todos Modos</option>
                <option value="5v5" className="bg-black">5v5 Clássico</option>
                <option value="aram" className="bg-black">ARAM</option>
                <option value="1v1" className="bg-black">1v1</option>
                <option value="time_vs_time" className="bg-black">Time vs Time</option>
              </select>
            </div>
          </div>

          {/* Barra de Busca */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
            <input
              type="text"
              placeholder="BUSCAR POR NOME OU CÓDIGO (#000001)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FFB700]/50 transition-all uppercase font-bold tracking-tight"
            />
          </div>
        </div>

        {/* ============================================ */}
        {/* CARROSSEL DE SALAS */}
        {/* ============================================ */}
        <div className="relative group">
          <div 
            ref={gamesRef}
            className="flex gap-5 overflow-x-auto hide-scrollbar pb-4 snap-x snap-mandatory"
          >
            {loadingSalas ? (
              <div className="w-full text-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent mx-auto mb-4" />
                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Carregando salas...</p>
              </div>
            ) : salasFiltradas.length === 0 ? (
              <div className="w-full text-center py-20 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                <Users className="w-16 h-16 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 font-black uppercase tracking-widest">Nenhuma sala encontrada</p>
                <p className="text-white/20 text-xs uppercase mt-2">Crie uma sala nos cards acima!</p>
              </div>
            ) : (
              salasFiltradas.map((sala) => {
                const modoInfo = getModoInfo(sala.modo);
                const mpInfo = getMPointsInfo(sala.mpoints);
                const estaCheia = sala.jogadores.length >= sala.maxJogadores;
                const jaEsta = sala.jogadores.some(j => j.id === usuarioAtual.id);
                const estaCheiaOuEncerrada = estaCheia || sala.estado === 'encerrada';
                // Pode entrar na sala para assistir/visualizar mesmo se estiver cheia
                // Mas não pode entrar em uma vaga se não houver vagas disponíveis
                const podeEntrar = !jaEsta; // Sempre pode entrar na sala para assistir

                return (
                  <div
                    key={sala.id}
                    onClick={() => {
                      if (sala.temSenha && !jaEsta) {
                        setShowSenhaModal({ salaId: sala.id, nome: sala.nome });
                      } else {
                        entrarNaSala(sala);
                      }
                    }}
                    className="flex-none w-full sm:w-[380px] h-[320px] rounded-xl overflow-hidden relative cursor-pointer border border-white/10 hover:border-[#FFB700]/50 transition-all snap-start group/card bg-black"
                  >
                    {/* Background Image */}
                    {modoInfo.bgImage && (
                      <div 
                        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 group-hover/card:opacity-50 transition-opacity duration-300"
                        style={{ backgroundImage: `url(${modoInfo.bgImage})` }}
                      />
                    )}
                    {/* Background decorativo */}
                    <div className="absolute inset-0 opacity-50 z-0"
                      style={{ background: `linear-gradient(135deg, ${modoInfo.cor}40, transparent)` }}
                    />
                    
                    {/* Conteúdo */}
                    <div className="relative z-10 p-5 h-full flex flex-col">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black text-white/40 border border-white/10 px-2 py-1 rounded bg-black/50">
                            {sala.codigo}
                          </span>
                          {sala.temSenha && <Lock className="w-3.5 h-3.5 text-yellow-400" />}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Visualizações */}
                          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white/60 text-[10px] font-black px-2.5 py-1.5 rounded border border-white/10">
                            <Eye className="w-3 h-3 text-[#FFB700]" />
                            {viewerCounts[sala.id] || 0}
                          </div>
                          {/* Vagas */}
                          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white/60 text-[10px] font-black px-2.5 py-1.5 rounded border border-white/10">
                            <Users className="w-3 h-3" />
                            {sala.jogadores.length}/{sala.maxJogadores}
                          </div>
                        </div>
                      </div>
                      
                      {/* Título */}
                      <h3 className="text-white font-black text-xl uppercase tracking-tight mb-1 line-clamp-1">
                        {sala.nome}
                      </h3>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-3 line-clamp-2">
                        {sala.descricao}
                      </p>
                      
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 rounded text-[10px] font-black uppercase"
                          style={{ background: `${modoInfo.cor}20`, color: modoInfo.cor, border: `1px solid ${modoInfo.cor}40` }}
                        >
                          {modoInfo.icone} {modoInfo.nome}
                        </span>
                        <span className="px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1"
                          style={{ background: `${mpInfo.cor}20`, color: mpInfo.cor, border: `1px solid ${mpInfo.cor}40` }}
                        >
                          <Coins className="w-3 h-3" />
                          {sala.mpoints} MP
                        </span>
                        {sala.eloMinimo && (
                          <span className="px-2 py-1 rounded text-[10px] font-black uppercase bg-white/5 border border-white/10 text-white/40">
                            Mín: {sala.eloMinimo}
                          </span>
                        )}
                        {streamsAtivos[sala.id] && (
                          <span className="px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1 bg-purple-600/20 border border-purple-500/30 text-purple-400 animate-pulse">
                            <Tv2 className="w-3 h-3" />
                            ENTRAR / ASSISTIR
                          </span>
                        )}
                      </div>
                      
                      {/* Criador */}
                      <div className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-4">
                        Criador: {sala.criadorNome}
                        {sala.timeANome && (
                          <span className="ml-2 text-blue-400">• {sala.timeANome}</span>
                        )}
                      </div>
                      
                      {/* Botão Entrar */}
                      <button
                        onClick={() => {
                          if (sala.temSenha && !jaEsta) {
                            setShowSenhaModal({ salaId: sala.id, nome: sala.nome });
                          } else {
                            entrarNaSala(sala);
                          }
                        }}
                        disabled={!podeEntrar || sala.estado === 'encerrada'}
                        className={`mt-auto w-full py-3 rounded-lg font-black text-sm uppercase transition-all flex items-center justify-center gap-2 ${
                          sala.estado === 'encerrada'
                            ? 'bg-black border border-white/10 text-white/40 cursor-not-allowed'
                            : jaEsta
                            ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30'
                            : podeEntrar
                            ? 'bg-[#FFB700] hover:bg-[#e0a000] text-black'
                            : 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed'
                        }`}
                      >
                        <LogIn className="w-4 h-4" />
                        {sala.estado === 'encerrada' ? 'FINALIZADO' : jaEsta ? 'VOLTAR' : 'ENTRAR'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Botões de navegação do carrossel */}
          {salasFiltradas.length > 2 && (
            <>
              <button 
                onClick={() => scrollCarrossel('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -ml-5 w-10 h-10 rounded-lg bg-black text-white/60 hover:text-white flex items-center justify-center border border-white/20 hover:border-[#FFB700]/50 transition-all opacity-0 group-hover:opacity-100 z-10 shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => scrollCarrossel('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 -mr-5 w-10 h-10 rounded-lg bg-black text-white/60 hover:text-white flex items-center justify-center border border-white/20 hover:border-[#FFB700]/50 transition-all opacity-0 group-hover:opacity-100 z-10 shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* ============================================ */}
        {/* SALAS FINALIZADAS */}
        {/* ============================================ */}
        {salasFinalizadas.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-[#FFB700]" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest">
                  Partidas Finalizadas
                </h2>
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-4 h-4 text-white/30" />

                {/* Filtro Modo */}
                <select
                  value={filtroModoFinalizadas}
                  onChange={(e) => setFiltroModoFinalizadas(e.target.value as ModoJogo | 'todos')}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-bold uppercase tracking-wider"
                >
                  <option value="todos" className="bg-black">Todos Modos</option>
                  <option value="5v5" className="bg-black">5v5 Clássico</option>
                  <option value="aram" className="bg-black">ARAM</option>
                  <option value="1v1" className="bg-black">1v1</option>
                  <option value="time_vs_time" className="bg-black">Time vs Time</option>
                </select>
              </div>
            </div>

            {/* Barra de Busca */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
              <input
                type="text"
                placeholder="BUSCAR POR NOME OU CÓDIGO (#000001)..."
                value={buscaFinalizadas}
                onChange={(e) => setBuscaFinalizadas(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FFB700]/50 transition-all uppercase font-bold tracking-tight"
              />
            </div>
          </div>
        )}

        {/* Carrossel de Salas Finalizadas */}
        {salasFinalizadas.length > 0 && (
          <div className="relative group">
            <div
              ref={finalizadasRef}
              className="flex gap-5 overflow-x-auto hide-scrollbar pb-4 snap-x snap-mandatory"
            >
              {loadingSalasFinalizadas ? (
                <div className="w-full text-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent mx-auto mb-4" />
                  <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Carregando salas finalizadas...</p>
                </div>
              ) : salasFinalizadasFiltradas.length === 0 ? (
                <div className="w-full text-center py-20 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                  <Trophy className="w-16 h-16 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 font-black uppercase tracking-widest">Nenhuma sala finalizada encontrada</p>
                </div>
              ) : (
                salasFinalizadasFiltradas.map((sala) => {
                  const modoInfo = getModoInfo(sala.modo);
                  const mpInfo = getMPointsInfo(sala.mpoints);

                  // Definir cor da borda baseado no vencedor
                  const borderColor = sala.vencedor === 'A'
                    ? '#3b82f6' // Azul
                    : sala.vencedor === 'B'
                    ? '#ef4444' // Vermelho
                    : '#fbbf24'; // Amarelo (disputa)

                  return (
                    <div
                      key={sala.id}
                      onClick={() => navigate(`/sala/${sala.id}`)}
                      className="flex-none w-full sm:w-[380px] h-[320px] rounded-xl overflow-hidden relative cursor-pointer transition-all snap-start group/card bg-black"
                      style={{ border: `2px solid ${borderColor}` }}
                    >
                      {/* Background Image - Preto e Branco */}
                      {modoInfo.bgImage && (
                        <div
                          className="absolute inset-0 z-0 bg-cover bg-center opacity-30 group-hover/card:opacity-50 transition-opacity duration-300"
                          style={{
                            backgroundImage: `url(${modoInfo.bgImage})`,
                            filter: 'grayscale(100%)'
                          }}
                        />
                      )}
                      {/* Background decorativo */}
                      <div className="absolute inset-0 opacity-50 z-0"
                        style={{ background: `linear-gradient(135deg, ${modoInfo.cor}40, transparent)`, filter: 'grayscale(100%)' }}
                      />

                      {/* Conteúdo */}
                      <div className="relative z-10 p-5 h-full flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-black text-white/40 border border-white/10 px-2 py-1 rounded bg-black/50">
                              {sala.codigo}
                            </span>
                          </div>
                          <div className="text-[10px] font-black uppercase px-2.5 py-1.5 rounded border"
                            style={{
                              background: sala.vencedor === 'A' ? 'rgba(59, 130, 246, 0.2)' : sala.vencedor === 'B' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 183, 0, 0.2)',
                              borderColor: sala.vencedor === 'A' ? 'rgba(59, 130, 246, 0.3)' : sala.vencedor === 'B' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 183, 0, 0.3)',
                              color: sala.vencedor === 'A' ? '#60a5fa' : sala.vencedor === 'B' ? '#f87171' : '#fbbf24'
                            }}
                          >
                            {sala.vencedor === 'A' ? '🏆 Time A' : sala.vencedor === 'B' ? '🏆 Time B' : '⚔️ Disputa'}
                          </div>
                        </div>

                        {/* Título */}
                        <h3 className="text-white font-black text-xl uppercase tracking-tight mb-1 line-clamp-1">
                          {sala.nome}
                        </h3>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 line-clamp-2">
                          {sala.descricao}
                        </p>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="px-2 py-1 rounded text-[10px] font-black uppercase"
                            style={{ background: `${modoInfo.cor}20`, color: modoInfo.cor, border: `1px solid ${modoInfo.cor}40` }}
                          >
                            {modoInfo.icone} {modoInfo.nome}
                          </span>
                          <span className="px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1"
                            style={{ background: `${mpInfo.cor}20`, color: mpInfo.cor, border: `1px solid ${mpInfo.cor}40` }}
                          >
                            <Coins className="w-3 h-3" />
                            {sala.mpoints} MP
                          </span>
                        </div>

                        {/* Times */}
                        <div className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-auto space-y-1">
                          {sala.timeANome && (
                            <div className="flex items-center justify-between">
                              <span className="text-blue-400">{sala.timeANome}</span>
                              {sala.vencedor === 'A' && <span className="text-yellow-400">✓</span>}
                            </div>
                          )}
                          {sala.timeBNome && (
                            <div className="flex items-center justify-between">
                              <span className="text-red-400">{sala.timeBNome}</span>
                              {sala.vencedor === 'B' && <span className="text-yellow-400">✓</span>}
                            </div>
                          )}
                        </div>

                        {/* Botão Ver Resultado */}
                        <button
                          onClick={() => navigate(`/sala/${sala.id}`)}
                          className="mt-auto w-full py-3 rounded-lg font-black text-sm uppercase transition-all flex items-center justify-center gap-2 bg-[#FFB700] hover:bg-[#e0a000] text-black"
                        >
                          <Trophy className="w-4 h-4" />
                          Ver Resultado
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Botões de navegação do carrossel */}
            {salasFinalizadasFiltradas.length > 2 && (
              <>
                <button
                  onClick={() => {
                    if (finalizadasRef.current) {
                      finalizadasRef.current.scrollBy({ left: -450, behavior: 'smooth' });
                    }
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -ml-5 w-10 h-10 rounded-lg bg-black text-white/60 hover:text-white flex items-center justify-center border border-white/20 hover:border-[#FFB700]/50 transition-all opacity-0 group-hover:opacity-100 z-10 shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (finalizadasRef.current) {
                      finalizadasRef.current.scrollBy({ left: 450, behavior: 'smooth' });
                    }
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 -mr-5 w-10 h-10 rounded-lg bg-black text-white/60 hover:text-white flex items-center justify-center border border-white/20 hover:border-[#FFB700]/50 transition-all opacity-0 group-hover:opacity-100 z-10 shadow-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* MODAIS */}
      {/* ============================================ */}
      <AnimatePresence>
        {showCriarModal && (
          <ModalCriarSala
            onClose={() => setShowCriarModal(false)}
            onCreate={handleCriarSala}
            usuarioAtual={usuarioAtual}
            userTeam={userTeam}
            modoInicial={modoSelecionado}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSenhaModal && (
          <ModalSenha
            nome={showSenhaModal.nome}
            onClose={() => { setShowSenhaModal(null); setErroSenha(''); }}
            onConfirm={(senha: string) => {
              const sala = salas.find(s => s.id === showSenhaModal.salaId);
              if (sala) entrarNaSala(sala, senha);
            }}
            erro={erroSenha}
          />
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};

export default Jogar;