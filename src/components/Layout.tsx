import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  Trophy,
  LineChart,
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
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from '../hooks/useSound';
import NotificationBell from './NotificationBell';

const getImageUrl = (fileName: string) => {
  const { data } = supabase.storage
    .from('public-images')
    .getPublicUrl(fileName);
  return data.publicUrl;
};

const LOGO_URL = getImageUrl('logo-m7.png');
const SIDEBAR_IMAGE_URL = getImageUrl('sidebar-image.png');

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { playSound } = useSound();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [contaRiot, setContaRiot] = useState<any>(null);
  const [balance, setBalance] = useState(2450.00);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Função para formatar nome do email
  const getFullNameFromEmail = (email: string) => {
    if (!email) return 'Jogador';
    const namePart = email.split('@')[0];
    return namePart
      .split(/[._-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Função para navegar com som
  const navigateWithSound = (path: string) => {
    playSound('click');
    navigate(path);
  };

  // Função para logout com som
  const handleLogoutWithSound = async () => {
    playSound('click');
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/');
  };

  useEffect(() => {
    const carregarDados = async () => {
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .maybeSingle();

        if (data && !error) {
          setBalance(data.balance);
        }

        const { data: riotData } = await supabase
          .from('contas_riot')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setContaRiot(riotData);
      }
    };

    carregarDados();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session: any) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') navigate('/');
    });

    return () => { authListener.subscription.unsubscribe(); };
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
    { label: 'Jogadores', icon: UserIcon, path: '/jogadores' },
    { label: 'Estatísticas', icon: LineChart, path: '/estatisticas' },
    { label: 'Histórico', icon: History, path: '/historico' },
  ];

  const profileMenuItems = [
    { label: 'Minha conta', icon: UserIcon, path: '/perfil' },
    { label: 'Minhas partidas', icon: Gamepad2, path: '/partidas' },
    { label: 'Equipes', icon: Users, path: '/time' },
    { label: 'Vincular conta', icon: LinkIcon, path: '/vincular' },
    { label: 'Configurações', icon: Settings, path: '/configuracoes' },
    { label: 'Políticas', icon: ShieldCheck, path: '/politicas' },
  ];

  const sidebarWidths = "hidden sm:flex sm:w-[12%] md:w-[11%] lg:w-[10%] 2xl:w-[9%] min-w-[180px] max-w-[260px]";

  const riotIconUrl = contaRiot?.profile_icon_id 
    ? `https://ddragon.leagueoflegends.com/cdn/14.19.1/img/profileicon/${contaRiot.profile_icon_id}.png`
    : null;

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ 
        backgroundImage: `url(${getImageUrl('fundo m7-infinito.png')})`,
        backgroundColor: '#0a0b0f'
      }}
    >
      <header className="bg-black/60 backdrop-blur-sm fixed top-0 z-50 w-full h-16 border-b border-primary shadow-lg">
        <div className="flex justify-between items-center h-full px-6">
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              className="sm:hidden text-white/80 hover:text-primary transition-colors p-2 rounded-lg hover:bg-white/5"
              onClick={() => {
                playSound('click');
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link 
              to="/lobby" 
              onClick={() => playSound('click')}
              className="flex items-center gap-3 hover:opacity-90 transition-all group"
            >
              <div className="relative">
                <img 
                  alt="M7 Academy Logo" 
                  className="h-10 md:h-11 w-auto object-contain relative z-10 drop-shadow-[0_0_2px_#FFFF00] drop-shadow-[0_0_5px_#FFFF00] drop-shadow-[0_0_10px_#FFFF00] drop-shadow-[0_0_20px_rgba(255,255,0,0.4)]" 
                  src={LOGO_URL} 
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-black tracking-tighter text-primary uppercase font-arial-bold italic leading-tight">
                  M7 ACADEMY
                </h1>
                <span className="text-[8px] text-white/40 tracking-[0.3em] uppercase hidden md:block">jogue e divirta-se!</span>
              </div>
            </Link>
          
            <div className="hidden lg:flex items-center gap-3 ml-2">
              <div className="w-[1px] h-5 bg-white/20"></div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <h2 className="font-body text-sm font-light tracking-wide">
                    <span className="text-primary font-semibold">Bem-vindo,</span>{" "}
                    <span className="text-white font-bold">
                      {contaRiot ? contaRiot.riot_id : (user?.user_metadata?.full_name || getFullNameFromEmail(user?.email))}
                    </span>
                  </h2>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <NotificationBell />

            <button 
              onClick={() => playSound('click')}
              className="flex items-center gap-2 px-4 py-1.5 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full hover:border-primary/30 transition-all duration-150"
            >
              <div className="p-1 bg-primary/10 rounded-full">
                <Wallet className="text-primary w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight">
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <ChevronDown className="text-white/40 w-3 h-3 group-hover:text-primary transition-colors" />
            </button>
            
            <button 
              onClick={() => {
                playSound('click');
                setIsDepositModalOpen(true);
              }}
              className="bg-gradient-to-r from-primary to-[#E6A600] text-black px-5 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-wider hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <CreditCard className="w-3.5 h-3.5" />
              DEPOSITAR
            </button>

            <div className="relative ml-1" ref={dropdownRef}>
              <button 
                onClick={() => {
                  playSound('click');
                  setIsProfileOpen(!isProfileOpen);
                }}
                className="relative group"
              >
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-md group-hover:blur-lg transition-all"></div>
                <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-primary/50 shadow-lg shadow-primary/20 transition-all hover:scale-105">
                  <img 
                    alt="User Profile Avatar" 
                    className="w-full h-full object-cover" 
                    src={riotIconUrl || user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU"}
                    onError={(e) => {
                      e.currentTarget.src = user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU";
                    }}
                  />
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.1 }} // <-- REDUZIDO de 0.2 para 0.1
                    className="absolute right-0 mt-3 w-80 bg-[#0a0b0f]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-[60] rounded-2xl overflow-hidden"
                  >
                    <div className="relative">
                      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-primary/20 to-transparent"></div>
                      <div className="flex flex-col items-center pt-6 pb-4 px-4 relative">
                        <div className="w-20 h-20 rounded-full border-3 border-primary overflow-hidden shadow-xl shadow-primary/30">
                          <img 
                            alt="User Profile Avatar" 
                            className="w-full h-full object-cover" 
                            src={riotIconUrl || user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU"}
                          />
                        </div>
                        <div className="mt-3 text-center">
                          <h3 className="text-white font-headline font-bold text-lg">
                            {contaRiot ? contaRiot.riot_id : (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Jogador')}
                          </h3>
                          {contaRiot ? (
                            <p className="text-primary font-headline text-sm tracking-[0.1em] uppercase font-semibold mt-1">
                              {contaRiot.elo || 'SEM RANQUEADA'}
                            </p>
                          ) : (
                            <p className="text-white/40 font-headline text-xs tracking-[0.1em] uppercase mt-1">
                              Conta riot não vinculada
                            </p>
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

      <div className="flex h-full pt-16">
        <aside className={`${sidebarWidths} bg-[#050505]/90 backdrop-blur-md border-r border-white/5 flex flex-col py-6 z-40 overflow-y-auto h-[calc(100vh-4rem)] sticky top-16`}>
          <div className="px-4 mb-8">
            <div className="aspect-square w-full bg-gradient-to-br from-surface-variant to-black/60 border border-white/10 rounded-xl overflow-hidden shadow-lg">
              <img 
                alt="Sidebar Featured" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                src={SIDEBAR_IMAGE_URL}
              />
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button 
                  key={item.label}
                  onClick={() => navigateWithSound(item.path)}
                  className={`group relative flex items-center gap-3 px-4 py-3 rounded-r-sm font-headline text-xs font-medium uppercase tracking-wider transition-all duration-100 w-full ${
                    isActive 
                      ? 'text-primary bg-primary/10 shadow-lg shadow-primary/5' 
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute left-0 w-1 h-10 bg-primary rounded"
                      transition={{ type: "spring", duration: 0.3, bounce: 0.2 }} // <-- MAIS RÁPIDO
                    />
                  )}
                  <item.icon className={`w-4 h-4 transition-all ${isActive ? 'text-primary' : 'group-hover:text-primary'}`} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="px-4 mt-auto space-y-3 pt-6">
            <button 
              onClick={() => playSound('click')}
              className="w-full py-2.5 bg-gradient-to-r from-primary to-[#E6A600] text-black rounded-xl font-headline text-[10px] uppercase tracking-[0.2em] font-black hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              TORNE-SE VIP
            </button>
            <button 
              onClick={() => navigateWithSound('/suporte')}
              className="flex items-center justify-center gap-2 text-white/40 hover:text-primary py-2 text-[10px] uppercase tracking-widest font-headline transition-colors w-full"
            >
              <Headset className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Suporte</span>
            </button>
          </div>
        </aside>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }} // <-- MAIS RÁPIDO
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[55] sm:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.aside 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }} // <-- MAIS RÁPIDO
                className="fixed inset-y-0 left-0 w-72 bg-background border-r border-white/10 z-[60] py-6 flex flex-col sm:hidden shadow-2xl"
              >
                <div className="px-6 mb-6 flex justify-between items-center">
                  <div>
                    <h1 className="text-xl font-black text-primary font-headline italic">M7 ACADEMY</h1>
                    <p className="text-[10px] text-white/40 mt-1">dallee</p>
                  </div>
                  <button 
                    onClick={() => {
                      playSound('click');
                      setIsMobileMenuOpen(false);
                    }} 
                    className="text-white/70 hover:text-primary p-2 rounded-lg hover:bg-white/5"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <nav className="flex-1 px-4 space-y-2">
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
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  ))}
                </nav>
                
                <div className="px-4 mt-auto pt-6 border-t border-white/10">
                  <button 
                    onClick={() => playSound('click')}
                    className="w-full py-3 bg-gradient-to-r from-primary to-[#E6A600] text-black rounded-xl font-headline text-xs uppercase tracking-wider font-black"
                  >
                    TORNE-SE VIP
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 bg-gradient-to-br from-surface-variant/30 to-background/50 relative overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="relative z-10 p-5 md:p-8 h-full">
            <div className="">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Modal de Depósito */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDepositModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0b0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent"></div>
              
              <div className="relative p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-white font-headline italic uppercase tracking-tight">Depositar</h2>
                    <p className="text-white/40 text-xs uppercase tracking-widest mt-1">Adicione saldo à sua conta</p>
                  </div>
                  <button 
                    onClick={() => setIsDepositModalOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Zap className="text-primary w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">PIX Instantâneo</p>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Processamento imediato</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[20, 50, 100, 200, 500, 1000].map((amount) => (
                      <button 
                        key={amount}
                        onClick={() => playSound('click')}
                        className="py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        R$ {amount}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Outro valor"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-white font-bold placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-primary font-bold text-sm">BRL</div>
                  </div>

                  <button 
                    onClick={() => playSound('click')}
                    className="w-full py-4 bg-gradient-to-r from-primary to-[#E6A600] text-black rounded-xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/20 mt-4"
                  >
                    GERAR QR CODE PIX
                  </button>
                </div>

                <p className="text-center text-[10px] text-white/20 mt-6 uppercase tracking-widest">
                  Ao depositar você concorda com nossos termos de uso
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
