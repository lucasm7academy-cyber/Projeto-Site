// Lobby.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  Award, 
  ChevronRight,
  Clock,
  MapPin,
  Trophy,
  Sparkles,
  Gamepad2,
  Star,
  Flame,
  Medal,
  Target
} from 'lucide-react';
import { useSound } from '../hooks/useSound';

// Componente de card de partida
const MatchCard = ({ match, onClick }: any) => {
  const { playSound } = useSound();
  
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        playSound('click');
        onClick(match);
      }}
      className="bg-gradient-to-br from-white/5 to-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 cursor-pointer group transition-all hover:border-primary/30"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Gamepad2 className="w-4 h-4 text-primary" />
          </div>
          <span className="text-white font-bold text-sm">{match.game}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary">
          <Flame className="w-3 h-3" />
          <span>{match.players} jogadores</span>
        </div>
      </div>
      
      <h3 className="text-white font-bold text-lg mb-1">{match.title}</h3>
      <p className="text-white/50 text-xs mb-3">{match.description}</p>
      
      <div className="flex items-center justify-between text-xs text-white/60">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{match.time}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{match.mode}</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="w-3 h-3 text-primary" />
          <span className="text-primary font-bold">R$ {match.prize}</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
        <div className="flex -space-x-2">
          {match.players_list?.slice(0, 3).map((player: any, i: number) => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-white/20 bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{player.initial}</span>
            </div>
          ))}
          {match.players_count > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">+{match.players_count - 3}</span>
            </div>
          )}
        </div>
        <button className="text-primary text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
          Participar <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

// Componente de card de ranking
const RankCard = ({ rank, position }: any) => {
  const getMedalColor = (pos: number) => {
    if (pos === 1) return 'text-yellow-500';
    if (pos === 2) return 'text-gray-400';
    if (pos === 3) return 'text-amber-600';
    return 'text-white/40';
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
      <div className="w-8 text-center">
        {position <= 3 ? (
          <Medal className={`w-5 h-5 ${getMedalColor(position)}`} />
        ) : (
          <span className="text-white/40 font-bold text-sm">#{position}</span>
        )}
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center">
        <span className="text-white font-bold text-sm">{rank.initial}</span>
      </div>
      <div className="flex-1">
        <p className="text-white font-semibold text-sm">{rank.name}</p>
        <p className="text-white/40 text-xs">{rank.wins} vitórias</p>
      </div>
      <div className="text-right">
        <p className="text-primary font-bold">{rank.points}</p>
        <p className="text-white/40 text-[10px]">pontos</p>
      </div>
    </div>
  );
};

export default function Lobby() {
  const { playSound } = useSound();
  const [featuredMatches, setFeaturedMatches] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [stats, setStats] = useState({
    partidasJogadas: 24,
    vitorias: 15,
    taxaVitoria: 62.5,
    premioTotal: 1250.00,
    ranking: 42
  });

  useEffect(() => {
    // Dados mockados para demonstração
    setFeaturedMatches([
      {
        id: 1,
        game: "League of Legends",
        title: "Torneio SoloQ",
        description: "Partidas ranqueadas solo/duo",
        time: "Inicia em 15min",
        mode: "5x5",
        prize: 500,
        players: 8,
        players_count: 8,
        players_list: [
          { initial: "JD" },
          { initial: "MK" },
          { initial: "LP" },
          { initial: "CR" },
          { initial: "FT" }
        ]
      },
      {
        id: 2,
        game: "Valorant",
        title: "Competição 5x5",
        description: "Torneio fechado para elo platina+",
        time: "Inicia em 45min",
        mode: "5x5",
        prize: 1000,
        players: 10,
        players_count: 10,
        players_list: [
          { initial: "VN" },
          { initial: "SP" },
          { initial: "RX" },
          { initial: "QL" }
        ]
      },
      {
        id: 3,
        game: "CS2",
        title: "Arena Pro",
        description: "Partidas competitivas MR12",
        time: "Inicia em 1h30",
        mode: "5x5",
        prize: 750,
        players: 6,
        players_count: 6,
        players_list: [
          { initial: "NK" },
          { initial: "TR" },
          { initial: "PS" }
        ]
      }
    ]);

    setRanking([
      { name: "DarkSouls", initial: "DS", wins: 45, points: 2840, position: 1 },
      { name: "ShadowBlade", initial: "SB", wins: 42, points: 2670, position: 2 },
      { name: "PhoenixFire", initial: "PF", wins: 38, points: 2510, position: 3 },
      { name: "IceWizard", initial: "IW", wins: 35, points: 2320, position: 4 },
      { name: "StormBringer", initial: "ST", wins: 32, points: 2180, position: 5 }
    ]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 p-6"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-primary text-xs font-bold uppercase tracking-wider">Bem-vindo de volta!</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
            Arena de Competições
          </h1>
          <p className="text-white/60 text-sm max-w-lg">
            Escolha seu próximo desafio, dispute torneios emocionantes e conquiste premiações exclusivas.
          </p>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-0"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-2xl -z-0"></div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
        >
          <p className="text-white/50 text-xs mb-1">Partidas</p>
          <p className="text-white font-bold text-2xl">{stats.partidasJogadas}</p>
          <p className="text-primary text-xs mt-1">Total jogadas</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
        >
          <p className="text-white/50 text-xs mb-1">Vitórias</p>
          <p className="text-white font-bold text-2xl">{stats.vitorias}</p>
          <p className="text-green-400 text-xs mt-1">{stats.taxaVitoria}% taxa</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
        >
          <p className="text-white/50 text-xs mb-1">Prêmios</p>
          <p className="text-primary font-bold text-2xl">R$ {stats.premioTotal.toFixed(2)}</p>
          <p className="text-white/40 text-xs mt-1">Acumulado</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
        >
          <p className="text-white/50 text-xs mb-1">Ranking</p>
          <p className="text-white font-bold text-2xl">#{stats.ranking}</p>
          <p className="text-white/40 text-xs mt-1">Global</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 rounded-xl p-4"
        >
          <p className="text-white/70 text-xs mb-1">Próximo rank</p>
          <p className="text-white font-bold text-2xl">Top 40</p>
          <p className="text-primary text-xs mt-1">+{8 - (stats.ranking % 10)} vitórias</p>
        </motion.div>
      </div>

      {/* Featured Tournaments Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="text-white font-bold text-lg">Torneios em Destaque</h2>
          </div>
          <button 
            onClick={() => playSound('click')}
            className="text-primary text-sm flex items-center gap-1 hover:gap-2 transition-all"
          >
            Ver todos <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredMatches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
            >
              <MatchCard match={match} onClick={() => console.log('Match clicked:', match)} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Active Players & Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Players */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-white font-bold">Jogadores Ativos</h3>
            </div>
            <span className="text-primary text-sm font-bold">+12 online</span>
          </div>
          
          <div className="space-y-3">
            {[
              { name: "Lucas Mendes", game: "League of Legends", status: "Buscando partida", elo: "Diamante" },
              { name: "Gabriel Silva", game: "Valorant", status: "Em partida", elo: "Platina" },
              { name: "Rafael Costa", game: "CS2", status: "Online", elo: "Global Elite" },
              { name: "Felipe Oliveira", game: "League of Legends", status: "Em torneio", elo: "Mestre" }
            ].map((player, i) => (
              <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-all">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{player.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">{player.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">{player.game}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="text-primary text-xs">{player.elo}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-white/60 text-xs">{player.status}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Ranking Top 5 */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <h3 className="text-white font-bold">Top 5 Ranking</h3>
            </div>
            <button 
              onClick={() => playSound('click')}
              className="text-primary text-xs flex items-center gap-1"
            >
              Ver ranking completo
            </button>
          </div>
          
          <div className="space-y-2">
            {ranking.map((rank, index) => (
              <RankCard key={index} rank={rank} position={index + 1} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Weekly Challenges */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-white font-bold">Desafios Semanais</h3>
          <span className="text-primary text-xs bg-primary/20 px-2 py-1 rounded-full">3/5 concluídos</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">5 partidas completadas</p>
              <p className="text-white/40 text-xs">Recompensa: R$ 50,00</p>
              <div className="w-full h-1 bg-white/10 rounded-full mt-1">
                <div className="w-3/5 h-full bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">3 vitórias consecutivas</p>
              <p className="text-white/40 text-xs">Recompensa: R$ 75,00</p>
              <div className="w-full h-1 bg-white/10 rounded-full mt-1">
                <div className="w-1/5 h-full bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">MVP em 2 partidas</p>
              <p className="text-white/40 text-xs">Recompensa: R$ 100,00</p>
              <div className="w-full h-1 bg-white/10 rounded-full mt-1">
                <div className="w-2/5 h-full bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}