// src/pages/jogar.tsx
// Página completa de "Jogar" - Lobby de partidas com Salas Abertas

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Users, Sword, Trophy, DoorOpen,
  Crown, Shield, ChevronRight, LogIn, Plus,
  Search, Lock, Globe, Clock, UserPlus, X,
  Copy, Trash2, ArrowLeft
} from 'lucide-react';
import SalaAberta from '../components/partidas/salaaberta';

// ============================================
// TIPOS
// ============================================

type GameMode = 'solo' | 'team_vs_random' | 'team_vs_team' | 'open';

interface UserTeam {
  id: string;
  nome: string;
  tag: string;
  members: number;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const Jogar = () => {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [showSalaAberta, setShowSalaAberta] = useState(false);
  
  // Dados do usuário logado (depois vem do auth)
  const usuarioAtual = {
    id: '1',
    nome: 'Lucks',
    elo: 'Ouro',
    role: 'MID'
  };

  // Time do usuário (se tiver)
  const userTeam: UserTeam | null = {
    id: '1',
    nome: 'Nexus Dragon',
    tag: 'NDX',
    members: 5,
  };

  const modes = [
    {
      id: 'solo' as GameMode,
      name: '🎲 Rápido',
      description: 'Entre sozinho, times são montados automaticamente',
      icon: Zap,
      color: '#4ade80',
      requiresTeam: false,
      estimatedTime: '1-2 min',
      status: 'Em breve',
    },
    {
      id: 'team_vs_random' as GameMode,
      name: '👥 Time vs Aleatórios',
      description: 'Seu time enfrenta jogadores casuais',
      icon: Shield,
      color: '#3b82f6',
      requiresTeam: true,
      estimatedTime: '2-3 min',
      status: 'Em breve',
    },
    {
      id: 'team_vs_team' as GameMode,
      name: '🏆 Time vs Time',
      description: 'Desafie outro time organizado',
      icon: Trophy,
      color: '#fbbf24',
      requiresTeam: true,
      estimatedTime: 'Agendado',
      status: 'Em breve',
    },
    {
      id: 'open' as GameMode,
      name: '🔓 Sala Aberta',
      description: 'Crie ou entre em salas personalizadas',
      icon: DoorOpen,
      color: '#a855f7',
      requiresTeam: false,
      estimatedTime: 'Imediato',
      status: 'Disponível',
    },
  ];

  const handleModeSelect = (mode: GameMode) => {
    const modeConfig = modes.find(m => m.id === mode);
    
    if (modeConfig?.requiresTeam && !userTeam) {
      alert('⚔️ Você precisa estar em um time para jogar este modo!\nCrie ou entre em um time primeiro.');
      return;
    }
    
    if (mode === 'open') {
      setShowSalaAberta(true);
    } else {
      alert(`🚧 Modo "${modeConfig?.name}" em desenvolvimento!\nEm breve estará disponível.`);
    }
  };

  // Tela de Salas Abertas
  if (showSalaAberta) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setShowSalaAberta(false)}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Modos
          </button>
          
          <SalaAberta 
            usuarioAtual={usuarioAtual}
            userTeam={userTeam || undefined}
          />
        </div>
      </div>
    );
  }

  // Tela principal com os modos (SEM FUNDO PRETO)
  return (
    <div className="p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-white font-black text-4xl mb-2">🎮 Arena</h1>
        <p className="text-white/40 text-lg">Escolha seu modo de jogo e comece a partida</p>
      </div>

      {/* Grid de Modos */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isDisabled = mode.requiresTeam && !userTeam;
            const isAvailable = mode.status === 'Disponível';
            
            return (
              <button
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                disabled={isDisabled}
                className={`relative overflow-hidden rounded-[26.5px] p-6 text-left transition-all ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${!isAvailable ? 'opacity-60' : ''}`}
                style={{
                  background: `linear-gradient(135deg, ${mode.color}08, transparent)`,
                  border: `1px solid ${mode.color}20`,
                }}
              >
                {/* Badge de status */}
                {!isAvailable && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-white/10 text-white/40 text-[10px] font-bold">
                    {mode.status}
                  </div>
                )}
                
                <div className="relative z-10">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${mode.color}15` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: mode.color }} />
                  </div>
                  
                  <h3 className="text-white font-bold text-xl mb-1">{mode.name}</h3>
                  <p className="text-white/40 text-sm mb-4">{mode.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                      style={{ background: `${mode.color}10`, color: mode.color }}
                    >
                      ⏱️ {mode.estimatedTime}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </div>
                  
                  {mode.requiresTeam && !userTeam && (
                    <div className="mt-3 text-[11px] text-yellow-400/70">
                      ⚠️ Requer um time
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Informação do Time */}
      {userTeam && (
        <div className="max-w-6xl mx-auto mt-8">
          <div 
            className="rounded-[20px] p-4 flex items-center justify-between"
            style={{ background: `#0044ff08`, border: `1px solid #0044ff20` }}
          >
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white/60 text-xs">Seu Time</p>
                <p className="text-white font-bold">{userTeam.nome}</p>
              </div>
            </div>
            <span 
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: `#0044ff15`, color: `#0044ff` }}
            >
              #{userTeam.tag}
            </span>
          </div>
        </div>
      )}

      {/* Aviso de desenvolvimento */}
      <div className="max-w-6xl mx-auto mt-8">
        <div className="text-center p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <p className="text-yellow-400/60 text-sm">
            🚧 Modos "Rápido", "Time vs Aleatórios" e "Time vs Time" em desenvolvimento.
            <br />
            Por enquanto, utilize o modo <strong className="text-purple-400">"Sala Aberta"</strong> para jogar!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Jogar;