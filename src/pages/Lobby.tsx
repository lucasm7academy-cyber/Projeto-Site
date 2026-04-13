// src/pages/lobby.tsx
// LOBBY / HOME - Hub central do usuário com perfil, times, benefícios VIP e rankings.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Crown, Gem, Users, Trophy, Shield, Zap, TrendingUp, Star,
  User, Settings, LogOut, ChevronRight, Clock, Calendar, Coins,
  Swords, Target, Medal, ArrowUpRight, Plus, Edit, Copy, CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  mpCoins: number;
  isVip: boolean;
  vipExpiraEm?: string;
}

interface UserTeam {
  id: string;
  nome: string;
  tag: string;
  logo?: string;
  membrosCount: number;
  rankingGeral: number;
  wins: number;
  losses: number;
}

interface TopPlayer {
  id: string;
  nome: string;
  tag: string;
  elo: string;
  avatar?: string;
  wins: number;
  winRate: number;
  teamNome?: string;
  teamTag?: string;
}

interface TorneioAtivo {
  id: string;
  nome: string;
  premio: string;
  dataFim: string;
  participantes: number;
  cor: string;
  icon: React.ElementType;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const Lobby = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioAtual | null>(null);
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [topJogadores, setTopJogadores] = useState<TopPlayer[]>([]);
  const [torneiosAtivos, setTorneiosAtivos] = useState<TorneioAtivo[]>([]);
  const [convitesTime, setConvitesTime] = useState(0);
  const [copied, setCopied] = useState(false);

  // ============================================
  // CARREGAR DADOS DO USUÁRIO E LOBBY
  // ============================================
  useEffect(() => {
    const carregarDadosLobby = async () => {
      setLoading(true);
      
      // 1. Usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // 2. Perfil + Riot + VIP Status (simulado - você terá que adaptar para sua tabela real de VIP)
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

      // Simulação de VIP - Substitua pela sua lógica real
      const isVip = perfilAny?.is_vip || false;
      const vipExpiraEm = perfilAny?.vip_expira_em || null;

      setUsuarioAtual({
        id: user.id,
        nome: gameName || perfilAny?.username || perfilAny?.full_name || user.email?.split('@')[0] || 'Jogador',
        tag: tagLine ? `#${tagLine}` : undefined,
        elo,
        role,
        avatar,
        mpCoins: perfilAny?.mp_coins || 1250, // Mock
        isVip,
        vipExpiraEm
      });

      // 3. Time do usuário
      if (membro?.time_id) {
        const { data: time } = await supabase
          .from('times')
          .select('id, nome, tag, logo_url')
          .eq('id', membro.time_id)
          .maybeSingle();
          
        if (time) {
          // Buscar contagem de membros e stats (mock ou real)
          const { count } = await supabase
            .from('time_membros')
            .select('*', { count: 'exact', head: true })
            .eq('time_id', time.id);

          // Mock de wins/losses - Substitua pela sua tabela de partidas de time
          setUserTeam({
            id: String(time.id),
            nome: time.nome,
            tag: time.tag,
            logo: time.logo_url ?? undefined,
            membrosCount: count || 1,
            rankingGeral: 42, // Mock
            wins: 15,
            losses: 7
          });
        }
      }

      // 4. Top Jogadores (Mock - Substitua pela sua query real)
      // Exemplo: Top 3 por Win Rate nos últimos 30 dias
      setTopJogadores([
        { id: '1', nome: 'Ludenberg', tag: '#BR1', elo: 'DESAFIANTE', wins: 48, winRate: 72, avatar: 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/profileicon/4029.png', teamNome: 'Los Grandes', teamTag: 'LOS' },
        { id: '2', nome: 'TitanShield', tag: '#LAN', elo: 'GRÃO-MESTRE', wins: 52, winRate: 68, avatar: 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/profileicon/4567.png', teamNome: 'Furia', teamTag: 'FUR' },
        { id: '3', nome: 'NightOwl', tag: '#OCE', elo: 'MESTRE', wins: 39, winRate: 65, avatar: 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/profileicon/4123.png' }
      ]);

      // 5. Torneios Ativos (Mock)
      setTorneiosAtivos([
        { id: '1', nome: 'CLASH DAS LENDAS', premio: '50.000 MP + R$ 500', dataFim: '2026-04-20', participantes: 32, cor: '#fbbf24', icon: Trophy },
        { id: '2', nome: 'DUELO DOS REIS', premio: 'VIP 3 Meses + Skin Lendária', dataFim: '2026-04-18', participantes: 128, cor: '#a855f7', icon: Crown },
        { id: '3', nome: 'ARAM INSANO', premio: '10.000 MP', dataFim: '2026-04-15', participantes: 64, cor: '#3b82f6', icon: Swords }
      ]);

      setLoading(false);
    };

    carregarDadosLobby();
  }, [navigate]);

  const handleCopyReferral = () => {
    if (usuarioAtual) {
      navigator.clipboard.writeText(`https://lolteams.com/ref/${usuarioAtual.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || !usuarioAtual) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent mx-auto mb-4" />
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Carregando Lobby...</p>
        </div>
      </div>
    );
  }

  const isVipAtivo = usuarioAtual.isVip;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 md:p-10 overflow-x-hidden relative">
      
      {/* Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%] z-50 opacity-20" />

      <div className="max-w-[1400px] mx-auto space-y-8 relative z-10">
        
        {/* ============================================ */}
        {/* HEADER - PERFIL DO USUÁRIO */}
        {/* ============================================ */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-r from-[#0D0D0D] to-[#1A1A1A] border border-white/10 p-6 md:p-8">
          <div className="absolute inset-0 bg-[url('/images/bg-lobby-header.png')] bg-cover bg-center opacity-20" />
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar e Info Básica */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-[#FFB700] p-0.5 bg-black/50 backdrop-blur-sm">
                  <img 
                    src={usuarioAtual.avatar || 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/profileicon/29.png'} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                {isVipAtivo && (
                  <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1 border-2 border-black">
                    <Crown className="w-4 h-4 text-black" />
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                    {usuarioAtual.nome}
                  </h1>
                  {usuarioAtual.tag && (
                    <span className="text-white/40 text-sm font-bold">#{usuarioAtual.tag}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-white/60 text-sm font-bold uppercase flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-[#FFB700]" /> {usuarioAtual.elo}
                  </span>
                  <span className="text-white/40 text-xs">•</span>
                  <span className="text-white/60 text-sm font-bold uppercase flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-yellow-400" /> {usuarioAtual.mpCoins.toLocaleString()} MP
                  </span>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-3 md:ml-auto">
              <button 
                onClick={() => navigate('/perfil')}
                className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">EDITAR PERFIL</span>
              </button>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">SAIR</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* GRID PRINCIPAL - 2 COLUNAS */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUNA ESQUERDA (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ============================================ */}
            {/* CARD DO TIME */}
            {/* ============================================ */}
            {userTeam ? (
              <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 hover:border-[#FFB700]/30 transition-all">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-400" />
                    </div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">Meu Time</h2>
                  </div>
                  <button 
                    onClick={() => navigate(`/times/${userTeam.id}`)}
                    className="text-white/40 hover:text-white text-xs font-bold uppercase flex items-center gap-1"
                  >
                    GERENCIAR <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  {userTeam.logo ? (
                    <img src={userTeam.logo} alt="Logo" className="w-16 h-16 rounded-xl border border-white/10" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Users className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-black text-white uppercase">{userTeam.nome}</h3>
                    <p className="text-white/40 text-sm font-bold">[{userTeam.tag}] • {userTeam.membrosCount} Membros</p>
                  </div>
                  
                  {/* Stats do Time */}
                  <div className="ml-auto flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-white/40 text-[10px] uppercase tracking-widest">Ranking</p>
                      <p className="text-2xl font-black text-white">#{userTeam.rankingGeral}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/40 text-[10px] uppercase tracking-widest">W/L</p>
                      <p className="text-xl font-black text-green-400">{userTeam.wins}<span className="text-white/20 mx-1">/</span><span className="text-red-400">{userTeam.losses}</span></p>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação do Time */}
                <div className="flex gap-3">
                  <button className="flex-1 py-3 rounded-xl bg-[#FFB700] text-black font-black text-sm uppercase hover:bg-[#e0a000] transition-all flex items-center justify-center gap-2">
                    <Trophy className="w-4 h-4" /> BUSCAR PARTIDA
                  </button>
                  <button className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 font-bold text-sm uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <Users className="w-4 h-4" /> CONVIDAR
                  </button>
                </div>
              </div>
            ) : (
              /* Usuário sem Time */
              <div className="bg-gradient-to-r from-[#0D0D0D] to-[#1A1A1A] border border-white/10 rounded-2xl p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/images/bg-team-card.png')] bg-cover bg-center opacity-20" />
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase mb-2">Você ainda não tem um time</h3>
                  <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">
                    Crie seu próprio time ou junte-se a um existente para participar de campeonatos e salas Time vs Time!
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button 
                      onClick={() => navigate('/times/criar')}
                      className="px-6 py-3 rounded-xl bg-[#FFB700] text-black font-black text-sm uppercase hover:bg-[#e0a000] transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> CRIAR TIME
                    </button>
                    <button 
                      onClick={() => navigate('/times/buscar')}
                      className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm uppercase hover:bg-white/10 transition-all"
                    >
                      BUSCAR TIMES
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* TOP 3 JOGADORES (LISTINHA) */}
            {/* ============================================ */}
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                    <Medal className="w-5 h-5 text-yellow-400" />
                  </div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">Top Jogadores da Semana</h2>
                </div>
                <button className="text-white/40 hover:text-white text-xs font-bold uppercase flex items-center gap-1">
                  VER RANKING <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {topJogadores.map((player, index) => (
                  <div key={player.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all">
                    <div className="w-8 text-center">
                      <span className={`text-xl font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-orange-400'}`}>
                        #{index + 1}
                      </span>
                    </div>
                    
                    <img 
                      src={player.avatar || 'https://ddragon.leagueoflegends.com/cdn/14.5.1/img/profileicon/29.png'} 
                      alt={player.nome}
                      className="w-10 h-10 rounded-full border border-white/20"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{player.nome}</span>
                        <span className="text-white/30 text-xs">{player.tag}</span>
                        {player.teamTag && (
                          <span className="text-[10px] font-black bg-white/10 px-1.5 py-0.5 rounded text-white/60">[{player.teamTag}]</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-white/40 text-[10px] font-bold uppercase">{player.elo}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-white font-black">{player.winRate}% <span className="text-white/20 text-xs">WR</span></p>
                      <p className="text-white/30 text-[10px] uppercase">{player.wins} Wins</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA (1/3) */}
          <div className="space-y-6">
            
            {/* ============================================ */}
            {/* CARD VIP / BENEFÍCIOS */}
            {/* ============================================ */}
            <div className={`rounded-2xl overflow-hidden border relative ${isVipAtivo ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-transparent' : 'border-white/10 bg-[#0D0D0D]'}`}>
              {isVipAtivo && (
                <div className="absolute top-0 right-0 bg-yellow-500 text-black px-3 py-1 text-[10px] font-black uppercase rounded-bl-lg">
                  ATIVO
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isVipAtivo ? 'bg-yellow-500/30 border border-yellow-500' : 'bg-white/5 border border-white/10'}`}>
                    <Crown className={`w-5 h-5 ${isVipAtivo ? 'text-yellow-400' : 'text-white/40'}`} />
                  </div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">
                    {isVipAtivo ? 'Benefícios VIP' : 'Seja VIP'}
                  </h2>
                </div>

                {isVipAtivo ? (
                  <>
                    <p className="text-white/60 text-sm mb-4">
                      Seu VIP expira em <span className="text-yellow-400 font-bold">{usuarioAtual.vipExpiraEm || '30 dias'}</span>
                    </p>
                    <div className="space-y-3">
                      {[
                        { icon: Zap, text: 'Prioridade em filas de partidas' },
                        { icon: Gem, text: 'Salas exclusivas VIP' },
                        { icon: Coins, text: 'Recompensas MP em dobro' },
                        { icon: Crown, text: 'Ícone e borda exclusiva' }
                      ].map((benefit, i) => (
                        <div key={i} className="flex items-center gap-3 text-white/80">
                          <benefit.icon className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm">{benefit.text}</span>
                        </div>
                      ))}
                    </div>
                    <button className="w-full mt-6 py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-bold text-sm hover:bg-yellow-500/30 transition-all">
                      RENOVAR VIP
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-white/40 text-sm mb-4">
                      Desbloqueie benefícios exclusivos e acelere seu progresso na plataforma.
                    </p>
                    <div className="space-y-2 mb-6">
                      {['Salas VIP', 'MP em Dobro', 'Prioridade', 'Insígnia'].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-white/60 text-sm">
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          {item}
                        </div>
                      ))}
                    </div>
                    <button className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black text-sm uppercase hover:scale-[1.02] transition-all">
                      Assinar VIP • R$ 19,90/mês
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ============================================ */}
            {/* TORNEIOS ATIVOS */}
            {/* ============================================ */}
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Torneios Ativos</h2>
              </div>

              <div className="space-y-3">
                {torneiosAtivos.map(torneio => {
                  const Icon = torneio.icon;
                  return (
                    <div 
                      key={torneio.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                      onClick={() => navigate(`/torneios/${torneio.id}`)}
                      style={{ borderLeft: `3px solid ${torneio.cor}` }}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 mt-0.5" style={{ color: torneio.cor }} />
                        <div className="flex-1">
                          <h4 className="font-black text-white uppercase text-sm mb-1">{torneio.nome}</h4>
                          <p className="text-white/60 text-xs mb-2">{torneio.premio}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-white/30 text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Termina em {torneio.dataFim}
                            </span>
                            <span className="text-white/40 text-[10px] font-bold">{torneio.participantes} Times</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <button className="w-full mt-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase hover:bg-white/10 transition-all">
                Ver todos os torneios
              </button>
            </div>

            {/* ============================================ */}
            {/* CÓDIGO DE CONVITE / REFERRAL */}
            {/* ============================================ */}
            <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Convide Amigos</h2>
              </div>
              
              <p className="text-white/40 text-sm mb-4">
                Ganhe <span className="text-green-400 font-bold">500 MP</span> para cada amigo que se cadastrar com seu código!
              </p>
              
              <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl p-1.5">
                <input 
                  type="text" 
                  readOnly 
                  value={`lolteams.com/ref/${usuarioAtual.id.substring(0, 8)}`}
                  className="flex-1 bg-transparent text-white/60 text-sm px-2 py-1.5 focus:outline-none"
                />
                <button 
                  onClick={handleCopyReferral}
                  className="px-4 py-1.5 rounded-lg bg-[#FFB700] text-black font-bold text-xs uppercase hover:bg-[#e0a000] transition-all flex items-center gap-1"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'COPIADO' : 'COPIAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;