import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { buildProfileIconUrl } from '../api/riot';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  Trophy,
  History,
  Headset,
  LogOut,
  Wallet,
  User as UserIcon,
  Gamepad2,
  Users,
  Link as LinkIcon,
  Settings,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  CreditCard,
  Tv2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from '../hooks/useSound';
import NotificationBell from './NotificationBell';
import DepositModal from './DepositModal';
import VipModal from './VipModal';

const getImageUrl = (fileName: string) => {
  const { data } = supabase.storage
    .from('public-images')
    .getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_URL = getImageUrl('logo-m7.png');

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSalaPage = location.pathname.startsWith('/sala/');
  const isDraftPage = location.pathname.startsWith('/draft/');
  const isGamePage = isSalaPage || isDraftPage; // Colapsível em salas e drafts
  const { playSound } = useSound();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isGamePage); // Começa fechada em salas
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [contaRiot, setContaRiot] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [loadingUser, setLoadingUser] = useState(true);
  const [hideLinkPrompt, setHideLinkPrompt] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navigateWithSound = (path: string) => {
    playSound('click');
    navigate(path);
  };

  const handleLogoutWithSound = async () => {
    playSound('click');
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/');
  };

  // Fechar sidebar ao entrar em página de jogo
  useEffect(() => {
    if (isGamePage) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [isGamePage]);

  useEffect(() => {
    const carregarDados = async () => {
      if (!supabase) return;

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setUser(user);

      if (user) {
        const [{ data: saldoData }, { data: riotData }] = await Promise.all([
          supabase.from('saldos').select('saldo').eq('user_id', user.id).maybeSingle(),
          supabase.from('contas_riot').select('*').eq('user_id', user.id).maybeSingle(),
        ]);

        if (saldoData) setBalance(saldoData.saldo ?? 0);
        setContaRiot(riotData);
      }
      setLoadingUser(false);
    };

    carregarDados();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session: any) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') navigate('/');
    });

    // Realtime: atualiza saldo automaticamente quando admin altera
    let saldoChannel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (!uid) return;
      saldoChannel = supabase
        .channel(`saldo_${uid}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'saldos',
          filter: `user_id=eq.${uid}`,
        }, (payload) => {
          setBalance((payload.new as any).saldo ?? 0);
        })
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'saldos',
          filter: `user_id=eq.${uid}`,
        }, (payload) => {
          setBalance((payload.new as any).saldo ?? 0);
        })
        .subscribe();
    });

    return () => {
      authListener.subscription.unsubscribe();
      if (saldoChannel) supabase.removeChannel(saldoChannel);
    };
  }, [navigate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Lobby', icon: LayoutDashboard, path: '/lobby' },
    { label: 'Jogar', icon: Zap, path: '/jogar' },
    { label: 'Campeonatos', icon: Trophy, path: '/campeonatos' },
    { label: 'Times', icon: Users, path: '/times' },
    { label: 'Players', icon: UserIcon, path: '/players' },
    { label: 'Streamers', icon: Tv2, path: '/streamers' },
    { label: 'Histórico', icon: History, path: '/jogar?view=finalizadas' },
  ];

  const profileMenuItems = [
    { label: 'Minha conta', icon: UserIcon, path: '/perfil' },
    { label: 'Minhas partidas', icon: Gamepad2, path: '/partidas' },
    { label: 'Equipes', icon: Users, path: '/times' },
    { label: 'Vincular conta', icon: LinkIcon, path: '/vincular' },
    { label: 'Configurações', icon: Settings, path: '/configuracoes' },
    { label: 'Políticas', icon: ShieldCheck, path: '/politicas' },
  ];

  // Em salas/drafts: colapsível em qualquer tamanho | Fora de salas: padrão responsivo
  const sidebarWidths = isGamePage
    ? `${isSidebarOpen ? 'w-[220px] xl:w-[240px] 2xl:w-[200px]' : 'w-0'} shrink-0 transition-all duration-300 ease-out`
    : "hidden lg:flex lg:w-[220px] xl:w-[240px] 2xl:w-[200px] shrink-0";

  const riotIconUrl = contaRiot?.profile_icon_id
    ? buildProfileIconUrl(contaRiot.profile_icon_id)
    : null;

  return (
    <div className="min-h-screen bg-[#050506]">
      {/* Header Responsivo */}
      <header className="bg-black/60 backdrop-blur-sm fixed top-0 z-50 w-full h-14 md:h-16 border-b border-primary shadow-lg">
        {/* Linha amarela na base */}
        <div className="absolute bottom-0 left-0 w-full h-0 bg-primary shadow-[0_0_10px_rgba(255,255,0,0.5)] z-50"></div>
        
        <div className="flex justify-between items-center h-full px-3 md:px-6">
          {/* Lado esquerdo - Mobile: apenas menu hambúrguer | Desktop: menu + logo + nome + bem-vindo */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Menu Hamburguer - visível em mobile/tablet OU sidebar toggle em salas */}
            <button
              className={`text-white/80 hover:text-primary transition-colors p-1.5 md:p-2 rounded-lg hover:bg-white/5 ${isGamePage ? '' : 'lg:hidden'}`}
              onClick={() => {
                playSound('click');
                if (isGamePage) {
                  setIsSidebarOpen(!isSidebarOpen);
                } else {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }
              }}
              title={isGamePage ? 'Toggle Sidebar' : 'Menu'}
            >
              <Menu size={18} className="md:w-5 md:h-5" />
            </button>

            {/* Logo e Nome - APENAS DESKTOP (lg pra cima) */}
            <Link 
              to="/lobby" 
              onClick={() => playSound('click')}
              className="hidden lg:flex items-center gap-2 xl:gap-3 hover:opacity-90 transition-all group"
            >
              <div className="relative">
                <img 
                  alt="M7 Academy Logo" 
                  className="h-8 xl:h-10 w-auto object-contain relative z-10 drop-shadow-[0_0_2px_#FFFF00] drop-shadow-[0_0_5px_#FFFF00] drop-shadow-[0_0_10px_rgba(255,255,0,0.4)]" 
                  src={LOGO_URL} 
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm xl:text-base font-black tracking-tighter text-primary uppercase font-arial-bold italic leading-tight">
                  M7 ACADEMY
                </h1>
                <span className="text-[6px] xl:text-[8px] text-white/40 tracking-[0.2em] xl:tracking-[0.3em] uppercase">
                  jogue e divirta-se!
                </span>
              </div>
            </Link>
          
            {/* Bem-vindo - apenas desktop grande */}
            <div className="hidden xl:flex items-center gap-3 ml-2">
              <div className="w-[1px] h-5 bg-white/20"></div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {loadingUser ? (
                    <div className="h-4 w-36 bg-white/10 rounded animate-pulse" />
                  ) : (
                    <h2 className="font-body text-sm font-light tracking-wide">
                      <span className="text-primary font-semibold">Bem-vindo,</span>
                      <span className="text-white/80 ml-1">
                        {contaRiot ? contaRiot.riot_id?.split('#')[0] : (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Jogador')}
                      </span>
                    </h2>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lado direito - elementos responsivos */}
          <div className="flex items-center gap-2 md:gap-3 lg:gap-5">
            {/* Saldo */}
            <button 
              onClick={() => playSound('click')}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full hover:border-primary/30 transition-all duration-150"
            >
              <div className="p-0.5 md:p-1 bg-primary/10 rounded-full">
                <Wallet className="text-primary w-3 h-3 md:w-3.5 md:h-3.5" />
              </div>
              <span className="text-xs md:text-sm font-bold text-white tracking-tight">
                MP {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </button>

            {/* Botão Depositar - Mobile: "DEP" | Desktop: "DEPOSITAR" */}
            <button 
              onClick={() => {
                playSound('click');
                setIsDepositModalOpen(true);
              }}
              className="bg-gradient-to-r from-primary to-[#E6A600] text-black px-2 md:px-3 lg:px-4 py-1 md:py-1.5 rounded-full font-bold text-[10px] md:text-[11px] uppercase tracking-wider hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-1"
            >
              <CreditCard className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span className="hidden sm:inline">Carteira</span>
              <span className="sm:hidden">Carteira</span>
            </button>

            {/* Notification Bell */}
            <div>
              <NotificationBell />
            </div>

            {/* Profile Dropdown */}
            <div className="relative ml-0 md:ml-1" ref={dropdownRef}>
              <button 
                onClick={() => {
                  playSound('click');
                  setIsProfileOpen(!isProfileOpen);
                }}
                className="relative group flex items-center gap-1 md:gap-2 p-0.5 md:p-1 rounded-xl hover:bg-white/5 transition-all"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-md group-hover:blur-lg transition-all"></div>
                  {loadingUser ? (
                    <div className="relative w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-full bg-white/10 animate-pulse border-2 border-primary/30" />
                  ) : (
                    <div className="relative w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-full overflow-hidden border-2 border-primary shadow-[0_0_10px_rgba(255,255,0,0.3)] transition-all hover:scale-105">
                      <img
                        alt="User Profile Avatar"
                        className="w-full h-full object-cover"
                        src={riotIconUrl || user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU"}
                        onError={(e) => {
                          e.currentTarget.src = user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU";
                        }}
                      />
                    </div>
                  )}
                </div>
                <ChevronDown className="text-white/40 w-2.5 h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 group-hover:text-primary transition-colors" />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-72 md:w-80 bg-[#0a0b0f]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-[60] rounded-2xl overflow-hidden"
                  >
                    <div className="relative">
                      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-primary/20 to-transparent"></div>
                      <div className="flex flex-col items-center pt-6 pb-4 px-4 relative">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-3 border-primary overflow-hidden shadow-xl shadow-primary/30">
                          <img 
                            alt="User Profile Avatar" 
                            className="w-full h-full object-cover" 
                            src={riotIconUrl || user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU"}
                          />
                        </div>
                        <div className="mt-3 text-center">
                          {loadingUser ? (
                            <>
                              <div className="h-5 w-32 bg-white/10 rounded animate-pulse mx-auto" />
                              <div className="h-3 w-20 bg-white/10 rounded animate-pulse mx-auto mt-2" />
                            </>
                          ) : (
                            <>
                              <h2 className="text-white font-headline font-bold text-base md:text-lg">
                                {contaRiot ? contaRiot.riot_id : (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Jogador')}
                              </h2>
                              {contaRiot ? (
                                <p className="text-primary font-headline text-xs md:text-sm tracking-[0.1em] uppercase font-semibold mt-1">
                                  {contaRiot.elo || 'SEM RANQUEADA'}
                                </p>
                              ) : (
                                <p className="text-white/40 font-headline text-[10px] md:text-xs tracking-[0.1em] uppercase mt-1">
                                  Conta riot não vinculada
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-3 pb-5 space-y-1">
                      {profileMenuItems.map((item) => (
                        <button 
                          key={item.label}
                          onClick={() => {
                            playSound('click');
                            navigateWithSound(item.path);
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:text-primary hover:bg-white/5 transition-all group text-left"
                        >
                          <item.icon className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:text-primary transition-all" />
                          <span className="text-sm font-body font-medium">{item.label}</span>
                        </button>
                      ))}
                      <div className="h-px bg-white/10 my-2"></div>
                      <button 
                        onClick={handleLogoutWithSound}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all group"
                      >
                        <LogOut className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                        <span className="text-sm font-body font-medium">Sair</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Layout Principal */}
      <div className="flex h-full pt-14 md:pt-16">
        {/* Sidebar Desktop */}
        <aside className={`${sidebarWidths} ${isGamePage ? 'flex' : 'hidden lg:flex'} bg-[#050505]/90 backdrop-blur-md border-r border-white/5 flex-col z-[50] h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] sticky top-14 md:top-16 overflow-hidden`}>
          {/* Top Section - Profile/Link */}
          <div className="py-6 px-3 relative z-[60]">
            {contaRiot ? (
              <Link
                to="/perfil"
                onClick={() => playSound('click')}
                className="flex flex-col items-center group/profile cursor-pointer"
              >
                <div className="relative mb-3 md:mb-4">
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-lg transition-all"></div>
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_15px_rgba(255,255,0,0.2)] transition-all">
                    <img
                      alt="User Profile Avatar"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/profile:scale-110"
                      src={riotIconUrl || user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU"}
                      onError={(e) => {
                        e.currentTarget.src = user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU";
                      }}
                    />
                  </div>
                  <div className="absolute bottom-1 right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-green-500 border-2 border-[#050505] rounded-full z-10 shadow-[0_0_8px_rgba(34,197,94,0.3)]"></div>
                </div>
                <h3 className="text-white font-headline font-bold text-xs text-center transition-colors truncate max-w-full px-2">
                  {contaRiot.riot_id}
                </h3>
              </Link>
            ) : (
              <>
                {createPortal(
                  user && !contaRiot && !loadingUser && (
                    <motion.div
                      initial={{ opacity: 0, x: -20, scale: 0.9 }}
                      animate={{
                        opacity: 1,
                        x: [0, -6, 0],
                        scale: 1
                      }}
                      transition={{
                        x: {
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        },
                        opacity: { duration: 0.3 },
                        scale: { duration: 0.3 }
                      }}
                      className="fixed left-[200px] top-20 w-52 z-[9999]"
                    >
                      <div className="bg-[#1a1b23] border-2 border-primary/50 rounded-2xl p-3 shadow-[0_0_30px_rgba(255,255,0,0.25)] relative flex items-center gap-3">
                        <motion.img
                          src="/images/poro1.png"
                          alt="Poro"
                          className="w-14 h-14 object-contain shrink-0"
                          animate={{
                            scale: [1, 1.15, 1, 1.15, 1, 1],
                          }}
                          transition={{
                            duration: 2.5,
                            times: [0, 0.1, 0.2, 0.3, 0.4, 1],
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <div className="text-left">
                          <p
                            className="text-[10px] font-black uppercase tracking-tighter text-white leading-tight"
                            style={{
                              textShadow: '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000'
                            }}
                          >
                            Ei, você ainda não<br/>
                            vinculou sua conta.
                          </p>
                        </div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-[#1a1b23] border-l-2 border-b-2 border-primary/50 rotate-45 z-0"></div>
                      </div>
                    </motion.div>
                  ),
                  document.body
                )}
                <Link
                  to="/vincular"
                  onClick={() => {
                    playSound('click');
                    setHideLinkPrompt(true);
                  }}
                  className="block w-full"
                >
                  <motion.div
                    animate={{
                      y: [0, 3, 0],
                      boxShadow: [
                        "0 4px 0 0 rgba(0,0,0,0.3)",
                        "0 1px 0 0 rgba(0,0,0,0.3)",
                        "0 4px 0 0 rgba(0,0,0,0.3)"
                      ]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="bg-primary text-black text-[10px] font-black uppercase tracking-[0.15em] py-4 px-3 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-2 border-b-4 border-black/20"
                  >
                    <span className="leading-tight text-[10px]">Vincular Conta Riot</span>
                  </motion.div>
                </Link>
              </>
            )}
          </div>

          {/* Middle Section - Navigation (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button 
                    key={item.label}
                    onClick={() => navigateWithSound(item.path)}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-r-sm font-headline font-bold text-sm uppercase tracking-wider transition-all duration-100 w-full ${
                      isActive 
                        ? 'text-primary bg-primary/20 shadow-lg shadow-primary/5' 
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute left-0 w-1 h-8 bg-primary rounded"
                        transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
                      />
                    )}
                    <item.icon className={`w-4 h-4 transition-all ${isActive ? 'text-primary' : 'group-hover:text-primary'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Section - Actions (Non-scrolling) */}
          <div className="px-3 py-6 space-y-3 border-t border-white/5">
            <button
              onClick={() => {
                playSound('click');
                setIsVipModalOpen(true);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-primary to-[#E6A600] text-black rounded-xl font-headline text-[10px] uppercase tracking-[0.2em] font-black hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              TORNE-SE VIP
            </button>
            <button 
              onClick={() => navigateWithSound('/suporte')}
              className="flex items-center justify-center gap-2 text-white/40 hover:text-primary py-2 text-[10px] uppercase tracking-widest font-headline transition-colors w-full"
            >
              <Headset className="w-3.5 h-3.5" />
              <span>Suporte</span>
            </button>
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[55] lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.aside 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 left-0 w-64 sm:w-72 bg-[#050505] border-r border-white/10 z-[60] py-6 flex flex-col lg:hidden shadow-2xl"
              >
                <div className="px-5 mb-6 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <img alt="Logo" className="h-8 w-auto" src={LOGO_URL} />
                    <div>
                      <h1 className="text-sm font-black text-primary font-headline italic">M7 ACADEMY</h1>
                      <p className="text-[8px] text-white/40">jogue e divirta-se!</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      playSound('click');
                      setIsMobileMenuOpen(false);
                    }} 
                    className="text-white/70 hover:text-primary p-2 rounded-lg hover:bg-white/5"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                {/* Perfil Mobile */}
                {contaRiot ? (
                  <div className="px-5 mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary">
                        <img src={riotIconUrl || user?.user_metadata?.avatar_url} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{contaRiot.riot_id}</p>
                        <p className="text-primary text-[10px] uppercase">{contaRiot.elo || 'SEM RANQUEADA'}</p>
                      </div>
                    </div>
                  </div>
                ) : (!hideLinkPrompt && location.pathname !== '/vincular') ? (
                  <div className="px-5 mb-6">
                    {/* Poro Prompt Balloon Mobile */}
                    <AnimatePresence>
                      {user && !contaRiot && !loadingUser && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ 
                            opacity: 1, 
                            y: [0, 6, 0],
                            scale: 1 
                          }}
                          transition={{
                            y: {
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut"
                            },
                            opacity: { duration: 0.3 },
                            scale: { duration: 0.3 }
                          }}
                          className="mb-4 relative"
                        >
                          <div className="bg-[#1a1b23] border-2 border-primary/50 rounded-2xl p-3 shadow-[0_0_20px_rgba(255,255,0,0.15)] relative">
                            <div className="flex flex-col items-center gap-2">
                              <motion.img 
                                src="/images/poro1.png"
                                alt="Poro"
                                className="w-14 h-14 object-contain"
                                animate={{ 
                                  scale: [1, 1.15, 1, 1.15, 1, 1],
                                }}
                                transition={{ 
                                  duration: 2.5,
                                  times: [0, 0.1, 0.2, 0.3, 0.4, 1],
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              />
                              <div className="text-center">
                                <p 
                                  className="text-[10px] font-black uppercase tracking-tighter text-white leading-tight"
                                  style={{ 
                                    textShadow: '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000' 
                                  }}
                                >
                                  Ei, você ainda não<br/>
                                  vinculou sua conta.
                                </p>
                              </div>
                            </div>
                            {/* Arrow pointing down */}
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1a1b23] border-r-2 border-b-2 border-primary/50 rotate-45 z-0"></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Link to="/vincular" onClick={() => {
                      setIsMobileMenuOpen(false);
                      setHideLinkPrompt(true);
                      playSound('click');
                    }}>
                      <motion.div 
                        animate={{
                          y: [0, 2, 0],
                          boxShadow: [
                            "0 4px 0 0 rgba(0,0,0,0.3)",
                            "0 1px 0 0 rgba(0,0,0,0.3)",
                            "0 4px 0 0 rgba(0,0,0,0.3)"
                          ]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="bg-primary text-black text-xs font-bold py-3 rounded-xl text-center relative z-10 border-b-4 border-black/20"
                      >
                        Vincular Conta Riot
                      </motion.div>
                    </Link>
                  </div>
                ) : null}
                
                <nav className="flex-1 px-3 space-y-1">
                  {navItems.map((item) => (
                    <button 
                      key={item.label}
                      onClick={() => {
                        playSound('click');
                        navigateWithSound(item.path);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-headline text-sm uppercase tracking-wider transition-all text-left ${
                        location.pathname === item.path 
                          ? 'text-primary bg-primary/10' 
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                </nav>
                
                <div className="px-4 mt-auto pt-6 border-t border-white/10">
                  <button
                    onClick={() => {
                      playSound('click');
                      setIsVipModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-primary to-[#E6A600] text-black rounded-xl font-headline text-xs uppercase tracking-wider font-black"
                  >
                    TORNE-SE VIP
                  </button>
                  {/* Suporte centralizado abaixo do botão VIP */}
                  <button 
                    onClick={() => {
                      navigateWithSound('/suporte');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-primary py-3 mt-2 text-xs transition-colors"
                  >
                    <Headset className="w-3.5 h-3.5" />
                    Suporte
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main
          className="flex-1 relative overflow-y-auto h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] bg-cover bg-center bg-no-repeat bg-fixed"
          style={{
            backgroundImage: `url(${getImageUrl('fundoescuro.png')})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-surface-variant/30 to-background/50 z-0" />
          <div className="relative z-10 min-h-full flex flex-col p-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Modal de Depósito PIX */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />

      {/* Modal de Assinatura VIP */}
      <VipModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
      />
    </div>
  );
}