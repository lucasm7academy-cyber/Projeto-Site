import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Zap, Users, Trophy, Calendar, ArrowRight, TrendingUp, Medal, Star } from 'lucide-react';

interface Perfil {
  id: string;
  nome: string;
  avatar_url?: string;
}

interface ContaRiot {
  riot_id: string;
  elo: string;
  profile_icon_id: number;
}

interface MembroTime {
  time_id: string;
  role: string;
}

interface VipStatus {
  is_vip: boolean;
  expires_at?: string;
}

export default function Lobby() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth(); // ✅ Usa o AuthContext
  
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [contaRiot, setContaRiot] = useState<ContaRiot | null>(null);
  const [membroTime, setMembroTime] = useState<MembroTime | null>(null);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [estatisticas, setEstatisticas] = useState({
    partidasJogadas: 0,
    vitorias: 0,
    taxaVitoria: 0,
    pontosRanking: 0
  });

  const carregarDadosLobby = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // ✅ Todas as queries em PARALELO (otimizado)
      const [perfilResult, riotResult, membroResult, vipResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('contas_riot').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('time_membros').select('time_id, role').eq('user_id', user.id).maybeSingle(),
        supabase.from('vip_assinaturas').select('*').eq('user_id', user.id).maybeSingle() // Ajuste para sua tabela VIP
      ]);

      setPerfil(perfilResult.data as Perfil || null);
      setContaRiot(riotResult.data as ContaRiot || null);
      setMembroTime(membroResult.data as MembroTime || null);
      setVipStatus(vipResult.data as VipStatus || null);

      // ✅ Buscar estatísticas do jogador (partidas)
      const { data: partidas } = await supabase
        .from('partidas')
        .select('*')
        .eq('user_id', user.id);

      const partidasJogadas = partidas?.length || 0;
      const vitorias = partidas?.filter(p => p.resultado === 'vitoria').length || 0;
      const taxaVitoria = partidasJogadas > 0 ? (vitorias / partidasJogadas) * 100 : 0;

      // ✅ Buscar pontos do ranking
      const { data: ranking } = await supabase
        .from('ranking')
        .select('pontos')
        .eq('user_id', user.id)
        .maybeSingle();

      setEstatisticas({
        partidasJogadas,
        vitorias,
        taxaVitoria: Math.round(taxaVitoria),
        pontosRanking: ranking?.pontos || 0
      });

    } catch (error) {
      console.error('[Lobby] Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      carregarDadosLobby();
    }
  }, [user]);

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Carregando lobby...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <p className="text-white/60">Faça login para acessar o lobby</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-primary text-black rounded-lg font-bold"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-black text-white">
          Bem-vindo,{' '}
          <span className="text-primary">
            {perfil?.nome || contaRiot?.riot_id?.split('#')[0] || user?.email?.split('@')[0] || 'Jogador'}
          </span>
        </h1>
        <p className="text-white/40 mt-2">Prepare-se para a próxima partida!</p>
        
        {/* VIP Badge */}
        {vipStatus?.is_vip && (
          <div className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-primary/20 to-yellow-500/20 px-3 py-1 rounded-full border border-primary/30">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-primary text-xs font-bold uppercase">Membro VIP</span>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface/50 backdrop-blur-sm rounded-2xl p-4 border border-white/5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-xs uppercase tracking-wider">Partidas</span>
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-black text-white">{estatisticas.partidasJogadas}</p>
          <p className="text-white/30 text-xs mt-1">Total jogadas</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface/50 backdrop-blur-sm rounded-2xl p-4 border border-white/5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-xs uppercase tracking-wider">Vitórias</span>
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-black text-white">{estatisticas.vitorias}</p>
          <p className="text-white/30 text-xs mt-1">{estatisticas.taxaVitoria}% taxa</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface/50 backdrop-blur-sm rounded-2xl p-4 border border-white/5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-xs uppercase tracking-wider">Elo</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-black text-white">{contaRiot?.elo || 'Não ranqueado'}</p>
          {contaRiot?.riot_id && (
            <p className="text-white/30 text-xs mt-1 truncate">{contaRiot.riot_id}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface/50 backdrop-blur-sm rounded-2xl p-4 border border-white/5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-xs uppercase tracking-wider">Ranking</span>
            <Medal className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-black text-white">{estatisticas.pontosRanking}</p>
          <p className="text-white/30 text-xs mt-1">Pontos</p>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => navigate('/jogar')}
          className="group relative overflow-hidden bg-gradient-to-r from-primary to-yellow-500 rounded-2xl p-6 text-left transition-all hover:scale-[1.02]"
        >
          <div className="relative z-10">
            <Zap className="w-8 h-8 text-black mb-3" />
            <h3 className="text-xl font-black text-black">Jogar Agora</h3>
            <p className="text-black/60 text-sm mt-1">Encontre uma partida rápida</p>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-black/40 group-hover:translate-x-1 transition-transform" />
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => navigate('/times')}
          className="bg-surface/50 backdrop-blur-sm rounded-2xl p-6 text-left border border-white/5 hover:border-primary/30 transition-all"
        >
          <Users className="w-8 h-8 text-primary mb-3" />
          <h3 className="text-xl font-black text-white">Times</h3>
          <p className="text-white/40 text-sm mt-1">
            {membroTime?.time_id ? 'Seu time' : 'Encontre um time'}
          </p>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={() => navigate('/campeonatos')}
          className="bg-surface/50 backdrop-blur-sm rounded-2xl p-6 text-left border border-white/5 hover:border-primary/30 transition-all"
        >
          <Trophy className="w-8 h-8 text-primary mb-3" />
          <h3 className="text-xl font-black text-white">Campeonatos</h3>
          <p className="text-white/40 text-sm mt-1">Participe de torneios</p>
        </motion.button>
      </div>

      {/* Recent Matches Preview (opcional) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">Partidas Recentes</h3>
          <button 
            onClick={() => navigate('/partidas')}
            className="text-primary text-sm hover:underline"
          >
            Ver todas
          </button>
        </div>
        <div className="bg-surface/30 backdrop-blur-sm rounded-2xl p-6 border border-white/5 text-center">
          <p className="text-white/40 text-sm">
            {estatisticas.partidasJogadas > 0 
              ? `Você tem ${estatisticas.partidasJogadas} partidas no total`
              : 'Nenhuma partida recente. Comece a jogar agora!'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}