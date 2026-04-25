import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { useAuth } from '../contexts/AuthContext';
import { usePerfil } from '../contexts/PerfilContext';
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
  const { user, isLoading: authLoading } = useAuth(); // ✅ Única fonte do usuário
  const { perfil } = usePerfil(); // ✅ Dados da conta Riot
  const navigate = useNavigate();
  const location = useLocation();
  const isSalaPage = location.pathname.startsWith('/sala/');
  const isDraftPage = location.pathname.startsWith('/draft/');
  const isGamePage = isSalaPage || isDraftPage;
  const { playSound } = useSound();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isGamePage);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const navigateWithSound = (path: string) => {
    playSound('click');
    navigate(path);
  };

  const handleLogoutWithSound = async () => {
    playSound('click');
    await supabase.auth.signOut();
    navigate('/');
  };

  // ✅ Fechar sidebar ao entrar em página de jogo
  useEffect(() => {
    setIsSidebarOpen(!isGamePage);
  }, [isGamePage]);

  // ✅ Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
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
    { label: 'Histórico', icon: History, path: '/partidas' },
  ];

  const profileMenuItems = [
    { label: 'Minha conta', icon: UserIcon, path: '/perfil' },
    { label: 'Minhas partidas', icon: Gamepad2, path: '/partidas' },
    { label: 'Equipes', icon: Users, path: '/times' },
    { label: 'Vincular conta', icon: LinkIcon, path: '/vincular' },
    { label: 'Configurações', icon: Settings, path: '/configuracoes' },
    { label: 'Políticas', icon: ShieldCheck, path: '/politicas' },
  ];

  const sidebarWidths = isGamePage
    ? `${isSidebarOpen ? 'w-[220px] xl:w-[240px] 2xl:w-[200px]' : 'w-0'} shrink-0 transition-all duration-300 ease-out`
    : "hidden lg:flex lg:w-[220px] xl:w-[240px] 2xl:w-[200px] shrink-0";

  // Loading inicial
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050506] flex items-center justify-center">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050506]">
      {/* Header */}
      <header className="bg-black/60 backdrop-blur-sm fixed top-0 z-50 w-full h-14 md:h-16 border-b border-primary shadow-lg">
        <div className="absolute bottom-0 left-0 w-full h-0 bg-primary shadow-[0_0_10px_rgba(255,255,0,0.5)] z-50"></div>
        
        <div className="flex justify-between items-center h-full px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
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
            >
              <Menu size={18} className="md:w-5 md:h-5" />
            </button>

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
          
            <div className="hidden xl:flex items-center gap-3 ml-2">
              <div className="w-[1px] h-5 bg-white/20"></div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {!perfil ? (
                    <div className="h-4 w-36 bg-white/10 rounded animate-pulse" />
                  ) : (
                    <h2 className="font-body text-sm font-light tracking-wide">
                      <span className="text-primary font-semibold">Bem-vindo,</span>
                      <span className="text-white/80 ml-1">
                        {perfil.riotId ? perfil.riotId.split('#')[0] : (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Jogador')}
                      </span>
                    </h2>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 lg:gap-5">
            <button
              onClick={() => playSound('click')}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full hover:border-primary/30 transition-all duration-150"
            >
              <div className="p-0.5 md:p-1 bg-primary/10 rounded-full">
                <Wallet className="text-primary w-3 h-3 md:w-3.5 md:h-3.5" />
              </div>
              <span className="text-xs md:text-sm font-bold text-white tracking-tight">
                MC {(perfil?.saldo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </button>

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

            <NotificationBell />
            {/* ✅ ADICIONAR O PERFIL COM SETA AQUI ✅ */}
  <div className="relative" ref={dropdownRef}>
    <button
      onClick={() => setIsProfileOpen(!isProfileOpen)}
      className="relative group flex items-center gap-1 md:gap-2 p-0.5 md:p-1 rounded-xl hover:bg-white/5 transition-all"
    >
      <div className="relative">
        <div className="relative w-7 h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-full overflow-hidden border-2 border-primary shadow-[0_0_10px_rgba(255,255,0,0.3)]">
          {!perfil ? (
            <div className="w-full h-full bg-white/10 animate-pulse" />
          ) : (
            <img
              alt="Avatar"
              className="w-full h-full object-cover"
              src={perfil.avatar || user?.user_metadata?.avatar_url || "https://ui-avatars.com/api/?background=FFB800&color=000&name=User"}
            />
          )}
        </div>
      </div>
      {/* SETA PARA BAIXO */}
      <ChevronDown className="text-white/40 w-2.5 h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 group-hover:text-primary transition-colors" />
    </button>

    {/* Dropdown Menu */}
    <AnimatePresence>
      {isProfileOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute right-0 mt-2 w-72 bg-[#0a0b0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden z-[60]"
        >
          <div className="flex flex-col items-center pt-6 pb-4 px-4">
            <div className="w-16 h-16 rounded-full border-2 border-primary overflow-hidden">
              <img src={perfil?.avatar || user?.user_metadata?.avatar_url} className="w-full h-full object-cover" />
            </div>
            <h2 className="text-white font-bold text-base mt-3">
              {perfil?.riotId || user?.email?.split('@')[0] || 'Jogador'}
            </h2>
            {perfil?.elo && perfil.elo !== 'Sem Elo' && (
              <p className="text-primary text-xs uppercase font-semibold">{perfil.elo}</p>
            )}
          </div>

          <div className="px-3 pb-5 space-y-1">
            {profileMenuItems.map((item) => (
              <button 
                key={item.label}
                onClick={() => {
                  navigateWithSound(item.path);
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:text-primary hover:bg-white/5 transition-all"
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
            <div className="h-px bg-white/10 my-2"></div>
            <button 
              onClick={handleLogoutWithSound}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sair</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>

          </div>
        </div>
      </header>
      
     <div className="flex h-full pt-14 md:pt-16">
  {/* Sidebar Desktop */}
  <aside className={`${sidebarWidths} ${isGamePage ? 'flex' : 'hidden lg:flex'} bg-[#050505]/90 backdrop-blur-md border-r border-white/5 flex-col z-[50] h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] sticky top-14 md:top-16 overflow-visible`}>
    <div className="py-6 px-3 relative z-[60]">
      {perfil?.contaVinculada ? (
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
                src={perfil.avatar || user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU"}
                onError={(e) => {
                  e.currentTarget.src = user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU";
                }}
              />
            </div>
            <div className="absolute bottom-1 right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-green-500 border-2 border-[#050505] rounded-full z-10 shadow-[0_0_8px_rgba(34,197,94,0.3)]"></div>
          </div>
          <h3 className="text-white font-headline font-bold text-xs text-center transition-colors truncate max-w-full px-2">
            {perfil.riotId?.split('#')[0]}
          </h3>
        </Link>
      ) : (
        <>
          {/* BALÃO DO PORO ANIMADO */}
          {perfil && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{
                opacity: 1,
                x: [0, -6, 0, -6, 0],
                scale: 1
              }}
              transition={{
                x: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 }
              }}
              className="absolute top-4 -right-64 w-56 z-[60]"
            >
              <div className="bg-[#1a1b23] border-2 border-primary/50 rounded-2xl p-3 shadow-[0_0_30px_rgba(255,255,0,0.25)] relative">
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#1a1b23] border-l-2 border-t-2 border-primary/50 -rotate-45 z-0"></div>
                <div className="flex items-center gap-3 relative z-10">
                  <motion.img
                    src="/images/poro1.png"
                    alt="Poro"
                    className="w-14 h-14 object-contain shrink-0"
                    animate={{
                      scale: [1, 1.2, 1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      times: [0, 0.15, 0.3, 0.45, 0.6],
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <div className="text-left">
                    <p
                      className="text-[11px] font-black uppercase tracking-tighter text-white leading-tight"
                      style={{
                        textShadow: '1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000'
                      }}
                    >
                      Ei, você ainda não<br/>
                      vinculou sua conta!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Botão Vincular Conta */}
          <Link
            to="/vincular"
            onClick={() => playSound('click')}
            className="block w-full"
          >
            <div className="bg-primary hover:bg-yellow-500 text-black text-[10px] font-black uppercase tracking-[0.15em] py-5 px-3 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-2 border-b-4 border-black/20">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                <span className="leading-tight">Vincular Conta</span>
              </div>
            </div>
          </Link>
        </>
      )}
    </div>

    {/* ✅ NAVEGAÇÃO - Menu da Sidebar */}
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

    {/* ✅ BOTÕES INFERIORES */}
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
                
                {perfil?.contaVinculada && (
                  <div className="px-5 mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary">
                        <img src={perfil.avatar || user?.user_metadata?.avatar_url} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{perfil.riotId?.split('#')[0]}</p>
                        <p className="text-primary text-[10px] uppercase">{perfil.elo !== 'Sem Elo' ? perfil.elo : 'SEM RANQUEADA'}</p>
                      </div>
                    </div>
                  </div>
                )}
                {user && perfil && !perfil.contaVinculada && (
                  <div className="px-5 mb-6">
                    <Link to="/vincular" onClick={() => {
                      setIsMobileMenuOpen(false);
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
                )}
                
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

      <DepositModal isOpen={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} />
      <VipModal isOpen={isVipModalOpen} onClose={() => setIsVipModalOpen(false)} />
    </div>
  );
}