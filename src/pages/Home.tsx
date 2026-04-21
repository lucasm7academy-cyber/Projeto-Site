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
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCachedUser } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(2450.00); // Default placeholder, will be fetched from Supabase
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) return;
      
      const user = await getCachedUser();
      setUser(user);
      
      if (user) {
        // Fetch balance from a hypothetical 'profiles' table
        const { data, error } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          setBalance(data.balance);
        }
      }
    };

    getUser();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_OUT') {
          navigate('/');
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
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

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/');
  };

  const navItems = [
    { label: 'Lobby', icon: LayoutDashboard, path: '/lobby' },
    { label: 'Jogar', icon: Zap, path: '/jogar' },
    { label: 'Campeonatos', icon: Trophy, path: '/campeonatos' },
    { label: 'Estatísticas Rápidas', icon: LineChart, path: '/estatisticas' },
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

  const sidebarClasses = "bg-black/40 backdrop-blur-xl border-r border-white/5 flex flex-col py-8 z-40 h-full overflow-y-auto transition-all duration-300";
  const sidebarWidths = "hidden sm:flex sm:w-[10%] md:w-[12%] lg:w-[13%] 2xl:w-[14%]";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header Area */}
      <header className="bg-black/80 backdrop-blur-md fixed top-0 z-50 w-full h-16 border-b border-primary">
        <div className="flex justify-between items-center h-full px-6">
          <div className="flex items-center gap-4 md:gap-8">
            {/* Mobile Menu Toggle */}
            <button 
              className="sm:hidden text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>

            <Link to="/lobby" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img 
                alt="M7 Academy Logo" 
                className="h-10 md:h-12 w-auto object-contain" 
                src="https://lh3.googleusercontent.com/aida/ADBb0ujzFEk80qGO8ut9CNp7M8K73tgIqMtkQl7LgJoezA7YPvagHzs-GUfrC62Fskwtfirn2X1osBEo16YUyfE4eJWojvalKYSw-LJhpItSi2RjfDa5n56VgGGO1vix_Iy1BcldEQD0QBRF1MTkF7ONLMiIr9TMyJLKaZ2PpVobna2-DG1pd5JLC47hwhU0eW_IOepuDeI6sgKh01YCLcIw-KR2lG-cHb8RbcnhUBnENs8KGBjGPuqdlPEvWBxUJQ_ClMS7TyBcEmuHdQ" 
              />
              <h1 className="text-lg md:text-2xl font-black tracking-tighter text-primary uppercase font-headline italic">
                M7 ACADEMY
              </h1>
            </Link>
            
            <div className="hidden md:flex items-center gap-4 ml-4">
              <div className="w-[1px] h-6 bg-white/20"></div>
              <h2 className="text-white font-headline font-light text-lg tracking-wide">
                Bem-vindo, <span className="font-medium text-primary">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'NickName'}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 px-3 md:px-4 h-8 bg-black border rounded-sm min-w-[120px] md:min-w-[160px] border-outline">
              <Wallet className="text-primary w-4 h-4" />
              <span className="text-xs md:text-[15px] font-bold text-white">
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <button className="bg-primary text-on-primary px-4 md:w-32 h-8 flex items-center justify-center rounded-sm font-bold text-[10px] md:text-xs uppercase tracking-wider hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-primary/10">
              DEPOSITAR
            </button>

            <div className="relative ml-2" ref={dropdownRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary shadow-lg shadow-primary/20 transition-transform active:scale-95 flex items-center justify-center"
              >
                <img 
                  alt="User Profile Avatar" 
                  className="w-full h-full object-cover" 
                  src={user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU"} 
                />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-72 md:w-80 bg-[#14151a] border border-white/10 shadow-2xl z-[60] backdrop-blur-xl rounded-2xl overflow-hidden overflow-y-auto max-h-[80vh]"
                  >
                    <div className="flex flex-col items-center pt-8 pb-6 px-4">
                      <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden shadow-lg shadow-primary/20">
                        <img 
                          alt="User Profile Avatar" 
                          className="w-full h-full object-cover" 
                          src={user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuA3y1n-s4DdI4Kf-xz0_5u_qEqNG4W9WI5aJdr0i-Z3m7Z4317zP4538rQEmRpmB9118rfgmhHyLb-pof7HyYfxNL8gzzpmOfI4aMaQxsJYMSpOeWKvYOT8VNdkz8MZ2WF5CWsh7m0eixv8iejVdJsNvy16S0GPdQ3l1ysUH-fqpuyt2PQFVIYDIFCZ0Ec5esgw2u9JZTg1FZMvobP91cIwi3gnTHGPr0s6PNIoKwNsf_Tp3CfuC2ts8k_7HKcFrfnuJ7t2E3zs4MU"} 
                        />
                      </div>
                      <div className="mt-4 text-center">
                        <h3 className="text-white font-headline font-bold text-xl">
                          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'NickName'}
                        </h3>
                        <p className="text-primary font-headline text-sm tracking-[0.2em] uppercase mt-2">PLATINA III</p>
                      </div>
                    </div>

                    <div className="pb-8 space-y-2 px-6">
                      {profileMenuItems.map((item) => (
                        <Link 
                          key={item.label}
                          to={item.path}
                          className="flex items-center gap-4 px-5 py-3.5 bg-white/5 rounded-xl text-on-surface hover:bg-primary/10 hover:text-primary transition-all group"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <item.icon className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
                          <span className="text-sm font-label font-medium">{item.label}</span>
                        </Link>
                      ))}
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-5 py-3.5 bg-white/5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all group"
                      >
                        <LogOut className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
                        <span className="text-sm font-label font-medium">Sair</span>
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
        {/* Sidebar Desktop */}
        <aside className={`${sidebarClasses} ${sidebarWidths}`}>
          <nav className="flex-1 space-y-1">
            <div className="px-3 mb-6">
              <div className="aspect-square w-full bg-surface-variant border border-white/10 rounded-sm flex items-center justify-center overflow-hidden">
                <img 
                  alt="Sidebar Featured Image" 
                  className="w-full h-full object-cover cursor-pointer opacity-100" 
                  src="https://lh3.googleusercontent.com/aida/ADBb0ui-L_jvEFkTAakC5CKhfyhgvvLnABov-byePI3np2EdVZdivGnf65_Nq9BKSxP_U6Z2zts7L171Fp9DxWZdCienkXy_rab03Dv2i7AMp8yNAPp-ADoEbQuRRQf3GBTYbqwSTzW-esMRhHvivNWzlRk5Io5VO_BYZiT6cizafHAGQgFIo1cXAlC55bqhKW97z5cH9Jw8SzPQb2kknojNjeo0JauNqVcDP8CbiYiSjFaBmQBNeNQcoZKYwzDX22ykRSgKIWy1Y2tjPg" 
                />
              </div>
            </div>

            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.label}
                  to={item.path}
                  className={`px-4 md:px-6 py-3.5 flex items-center gap-4 font-headline text-[10px] md:text-xs uppercase tracking-widest transition-all ${
                    isActive 
                      ? 'text-primary bg-primary/5 border-r-4 border-primary' 
                      : 'text-on-surface-variant hover:text-primary hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-6 mt-auto space-y-4">
            <button className="w-full py-3 m7-gradient text-on-primary font-headline text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-black hover:brightness-110 transition-all shadow-lg shadow-primary/10">
              TORNE-SE VIP
            </button>
            <div className="pt-4 border-t border-white/5">
              <Link 
                to="/suporte"
                className="flex items-center gap-4 text-on-surface-variant hover:text-on-surface py-2 text-[8px] md:text-[10px] uppercase tracking-widest font-headline"
              >
                <Headset className="w-4 h-4" />
                <span className="hidden sm:inline">Suporte</span>
              </Link>
            </div>
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
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] sm:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.aside 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                className="fixed inset-y-0 left-0 w-64 bg-background border-r border-white/10 z-[60] py-8 flex flex-col sm:hidden"
              >
                <div className="px-6 mb-8 flex justify-between items-center">
                  <h1 className="text-lg font-black text-primary font-headline italic">M7 ACADEMY</h1>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-white">
                    <X />
                  </button>
                </div>
                <nav className="flex-1 space-y-1">
                  {navItems.map((item) => (
                    <Link 
                      key={item.label}
                      to={item.path}
                      className={`px-8 py-4 flex items-center gap-4 font-headline text-xs uppercase tracking-widest transition-all ${
                        location.pathname === item.path ? 'text-primary bg-primary/5 border-r-4 border-primary' : 'text-on-surface-variant'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="px-6 mt-auto">
                  <button className="w-full py-3 m7-gradient text-on-primary font-headline text-[10px] uppercase tracking-[0.2em] font-black">
                    TORNE-SE VIP
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 bg-surface-variant relative overflow-y-auto">
          <section className="relative z-10 p-4 md:p-10 h-full flex flex-col">
            <div className="flex-1 border border-dashed border-white/5 rounded-sm flex flex-col bg-black/5">
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
