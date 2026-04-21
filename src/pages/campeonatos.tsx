// src/pages/campeonatos.tsx
// NOVA VERSÃO - Página de Campeonatos (Em Breve)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Trophy, Crown, Calendar, Clock, Users, Coins, Gem,
  ChevronLeft, ChevronRight, Timer, Sparkles, Target, Swords, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCachedUser } from '../contexts/AuthContext';

// ============================================
// TIPOS
// ============================================

interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  bgImage?: string;
  actionText?: string;
  actionLink?: string;
}

// ============================================
// SLIDES DE MARKETING
// ============================================

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    title: "COMPETIÇÕES",
    subtitle: "ÉPICAS",
    description: "Participe dos maiores torneios de League of Legends e prove que você é uma lenda",
    icon: Trophy,
    color: '#fbbf24',
    bgGradient: 'from-yellow-500/20 via-yellow-500/5 to-transparent',
    bgImage: '/images/heroSlide1.png',
    actionText: 'Em breve',
    actionLink: '#'
  },
  {
    id: 2,
    title: "PREMIAÇÕES",
    subtitle: "EXCLUSIVAS",
    description: "Ganhe MP Coins, skins lendárias e dinheiro real competindo nos campeonatos oficiais",
    icon: Crown,
    color: '#a855f7',
    bgGradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
    bgImage: '/images/heroSlide2.png',
    actionText: 'Em breve',
    actionLink: '#'
  },
  {
    id: 3,
    title: "TIMES",
    subtitle: "LENDÁRIOS",
    description: "Forme sua equipe, treine com os melhores e domine os rankings da M7 Academy",
    icon: Shield,
    color: '#3b82f6',
    bgGradient: 'from-blue-500/20 via-blue-500/5 to-transparent',
    bgImage: '/images/heroSlide3.png',
    actionText: 'Em breve',
    actionLink: '#'
  }
];

// ============================================
// CARDS DE DESTAQUE (EM BREVE)
// ============================================

const destaquesCards = [
  {
    id: 1,
    titulo: 'CLASH DAS LENDAS',
    subtitulo: 'Torneio 5v5',
    icone: Swords,
    cor: '#fbbf24',
    premio: '50.000 MP + R$ 500',
    data: 'Em breve',
    vagas: '32 times',
    bgImage: '/images/fundoCard5v5.png'
  },
  {
    id: 2,
    titulo: 'DUELO DOS REIS',
    subtitulo: 'Torneio 1v1',
    icone: Target,
    cor: '#ef4444',
    premio: 'VIP 3 meses',
    data: 'Em breve',
    vagas: '64 jogadores',
    bgImage: '/images/fundoCard1v1.png'
  },
  {
    id: 3,
    titulo: 'ARAM INSANO',
    subtitulo: 'Torneio ARAM',
    icone: Sparkles,
    cor: '#3b82f6',
    premio: '10.000 MP',
    data: 'Em breve',
    vagas: '16 times',
    bgImage: '/images/fundoCardAram.png'
  }
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const Campeonatos = () => {
  const navigate = useNavigate();
  const [activeHero, setActiveHero] = useState(0);
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Carregar usuário
  useEffect(() => {
    const carregarUsuario = async () => {
      const user = await getCachedUser();
      if (user) {
        setUsuarioAtual(user);
      }
      setLoadingUser(false);
    };
    carregarUsuario();
  }, []);

  // Hero navigation
  const nextHero = () => setActiveHero((prev) => (prev + 1) % heroSlides.length);
  const prevHero = () => setActiveHero((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1));

  // Auto-advance hero slides every 8 seconds
  useEffect(() => {
    const interval = setInterval(nextHero, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loadingUser) {
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
              className="z-10 max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${currentSlide.color}20` }}>
                  <SlideIcon className="w-6 h-6" style={{ color: currentSlide.color }} />
                </div>
                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">M7 ACADEMY</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-white uppercase leading-[0.9] tracking-tighter italic mb-4">
                {currentSlide.title}<br />
                <span style={{ color: currentSlide.color }}>{currentSlide.subtitle}</span>
              </h1>
              <p className="text-lg md:text-xl text-white/60 mb-8 max-w-md font-medium leading-snug">
                {currentSlide.description}
              </p>
              
              <div className="px-6 py-3 rounded-xl font-black text-sm uppercase text-white/60 inline-flex items-center gap-2 border border-white/10 bg-white/5">
                <Timer className="w-4 h-4" />
                Em breve
              </div>
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
        {/* BANNER PRINCIPAL "EM BREVE" */}
        {/* ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative rounded-2xl overflow-hidden border-2 border-[#FFB700]/30 p-12 md:p-16 text-center"
          style={{
            background: 'rgba(13, 13, 13, 0.9)',
            boxShadow: '0 0 60px -10px rgba(255, 183, 0, 0.3)',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFB700]/10 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB700]/5 blur-3xl rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-3xl rounded-full -ml-32 -mb-32" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFB700]/10 border border-[#FFB700]/30 mb-6">
              <Sparkles className="w-4 h-4 text-[#FFB700]" />
              <span className="text-[#FFB700] font-black text-xs uppercase tracking-widest">Em desenvolvimento</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter mb-4">
              CAMPEONATOS <span className="text-[#FFB700]">EM BREVE</span>
            </h2>
            
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">
              Estamos preparando os torneios mais épicos do League of Legends. 
              Prepare seu time, treine suas habilidades e fique atento!
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Trophy className="w-4 h-4 text-[#FFB700]" />
                <span className="text-white/60 text-sm font-bold uppercase">Premiações em dinheiro</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Crown className="w-4 h-4 text-purple-400" />
                <span className="text-white/60 text-sm font-bold uppercase">Títulos exclusivos</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Gem className="w-4 h-4 text-blue-400" />
                <span className="text-white/60 text-sm font-bold uppercase">Skins lendárias</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================ */}
        {/* CARDS DE DESTAQUE - TORNEIOS EM BREVE */}
        {/* ============================================ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[#FFB700]" />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest">
              Próximos Torneios
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {destaquesCards.map((card) => {
              const Icon = card.icone;
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * card.id }}
                  className="bg-black rounded-xl p-6 flex flex-col border border-white/10 hover:border-[#FFB700]/30 transition-all shadow-lg relative overflow-hidden group cursor-default"
                >
                  {/* Background Image */}
                  {card.bgImage && (
                    <div 
                      className="absolute inset-0 z-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-300"
                      style={{ backgroundImage: `url(${card.bgImage})` }}
                    />
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 z-0 opacity-50"
                    style={{ background: `linear-gradient(to bottom, transparent, ${card.cor}20)` }}
                  />

                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${card.cor}15`, border: `1px solid ${card.cor}30` }}
                    >
                      <Icon className="w-7 h-7" style={{ color: card.cor }} />
                    </div>
                    
                    <h3 className="text-white font-black text-lg uppercase tracking-tight mb-1">
                      {card.titulo}
                    </h3>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-4">{card.subtitulo}</p>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-white/60">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-bold">{card.premio}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <Calendar className="w-4 h-4 text-[#FFB700]" />
                        <span className="text-sm font-bold">{card.data}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-bold">{card.vagas}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Clock className="w-3 h-3 text-white/40" />
                        <span className="text-white/40 text-[10px] font-black uppercase tracking-wider">
                          Inscrições em breve
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ============================================ */}
        {/* SEÇÃO DE RECOMPENSAS */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-[#0D0D0D] to-[#1A1A1A] border border-white/10 rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h4 className="text-white font-black text-sm uppercase mb-1">1º Lugar</h4>
              <p className="text-[#FFB700] font-bold text-xl">R$ 500 + 50K MP</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#0D0D0D] to-[#1A1A1A] border border-white/10 rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-400/20 border border-gray-400/30 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h4 className="text-white font-black text-sm uppercase mb-1">2º Lugar</h4>
              <p className="text-gray-300 font-bold text-xl">R$ 200 + 25K MP</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#0D0D0D] to-[#1A1A1A] border border-white/10 rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-700/20 border border-orange-700/30 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h4 className="text-white font-black text-sm uppercase mb-1">3º Lugar</h4>
              <p className="text-orange-400 font-bold text-xl">R$ 100 + 10K MP</p>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* CTA FINAL */}
        {/* ============================================ */}
        <div className="text-center py-8">
          <p className="text-white/30 text-sm uppercase tracking-widest mb-4">
            Quer ser notificado quando os campeonatos começarem?
          </p>
          <button
            onClick={() => navigate('/perfil')}
            className="px-8 py-4 rounded-xl bg-[#FFB700] text-black font-black text-sm uppercase hover:bg-[#e0a000] transition-all hover:scale-[1.02] inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Ativar notificações
          </button>
        </div>
      </div>
    </div>
  );
};

export default Campeonatos;