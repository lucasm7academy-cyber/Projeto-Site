import { supabase } from '../lib/supabase';
import { Team, Player, Role, UserRole } from '../types/team';

export const INITIAL_TEAMS: Team[] = [
  {
    id: 1, name: 'M7 Esports', tag: 'M7E',
    logoUrl: 'https://ais-pre-3jqt6pjyfyajpdpj3cp2zf-550229797587.us-east1.run.app/input_file_0.png',
    gradientFrom: '#FFB700', gradientTo: '#FF6600',
    players: [
      { name: 'ShadowKing#BR1', role: 'TOP', elo: 'Diamante IV',  balance: 850.00,  isLeader: true },
      { name: 'JungleGod#BR1',  role: 'JG',  elo: 'Mestre',       balance: 1200.00 },
      { name: 'MidLaner7#BR1',  role: 'MID', elo: 'Grão-Mestre',  balance: 320.50  },
      { name: 'CarryADC#BR1',   role: 'ADC', elo: 'Diamante II',  balance: 475.00  },
      { name: 'SupportGG#BR1',  role: 'SUP', elo: 'Platina I',    balance: 154.00  },
      { name: 'Reserva1#BR1',   role: 'RES', elo: 'Diamante III', balance: 210.00  },
      { name: 'Reserva2#BR1',   role: 'RES', elo: 'Platina II',   balance: 180.00  },
    ],
    pdl: 3240, winrate: 72, ranking: 3, wins: 36, gamesPlayed: 50, userRole: 'leader',
  },
  {
    id: 2, name: 'Shadow Blades', tag: 'SHB',
    gradientFrom: '#0044FF', gradientTo: '#00D4FF',
    players: [
      { name: 'DarkTop#KR1',   role: 'TOP', elo: 'Mestre',      balance: 2100.00, isLeader: true },
      { name: 'BladeJG#EUW',   role: 'JG',  elo: 'Grão-Mestre', balance: 1800.00 },
      { name: 'ShadowMid#BR1', role: 'MID', elo: 'Desafiante',  balance: 3400.00 },
      { name: 'PurpleADC#BR1', role: 'ADC', elo: 'Mestre',      balance: 920.00  },
      { name: 'VoidSup#BR1',   role: 'SUP', elo: 'Diamante I',  balance: 680.00  },
      { name: 'Reserva3#KR1',  role: 'RES', elo: 'Mestre',      balance: 450.00  },
      { name: 'Reserva4#EUW',  role: 'RES', elo: 'Diamante I',  balance: 380.00  },
    ],
    pdl: 4180, winrate: 78, ranking: 1, wins: 42, gamesPlayed: 54, userRole: 'visitor',
  },
  {
    id: 3, name: 'Phoenix Rising', tag: 'PHX',
    gradientFrom: '#FF3300', gradientTo: '#FF9900',
    players: [
      { name: 'FireTop#BR1',   role: 'TOP', elo: 'Diamante I',   balance: 600.00,  isLeader: true },
      { name: 'AshJungle#BR1', role: 'JG',  elo: 'Mestre',       balance: 1100.00 },
      { name: 'FlameMid#BR1',  role: 'MID', elo: 'Diamante II',  balance: 450.00  },
      { name: 'PhxADC#BR1',    role: 'ADC', elo: 'Diamante III', balance: 320.00  },
      { name: 'EmberSup#BR1',  role: 'SUP', elo: 'Platina II',   balance: 210.00  },
      { name: 'Reserva5#BR1',  role: 'RES', elo: 'Platina I',    balance: 150.00  },
      { name: 'Reserva6#BR1',  role: 'RES', elo: 'Ouro I',       balance: 90.00   },
    ],
    pdl: 3650, winrate: 68, ranking: 2, wins: 34, gamesPlayed: 50, userRole: 'visitor',
  },
  {
    id: 4, name: 'Ice Wolves', tag: 'ICW',
    gradientFrom: '#00C9FF', gradientTo: '#0044FF',
    players: [
      { name: 'FrostTop#BR1',  role: 'TOP', elo: 'Platina I',    balance: 380.00, isLeader: true },
      { name: 'IceMage#BR1',   role: 'MID', elo: 'Diamante III', balance: 510.00 },
      { name: 'ColdADC#BR1',   role: 'ADC', elo: 'Ouro I',       balance: 145.00 },
      { name: 'ArcticSup#BR1', role: 'SUP', elo: 'Prata I',      balance: 95.00  },
      { name: 'Reserva7#BR1',  role: 'RES', elo: 'Ouro II',      balance: 80.00  },
    ],
    pdl: 2890, winrate: 61, ranking: 4, wins: 28, gamesPlayed: 46, userRole: 'visitor',
  },
  {
    id: 5, name: 'Storm Knights', tag: 'STK',
    gradientFrom: '#7B00FF', gradientTo: '#00AAFF',
    players: [
      { name: 'ThunderTop#BR1', role: 'TOP', elo: 'Diamante III', balance: 490.00, isLeader: true },
      { name: 'LightJG#BR1',    role: 'JG',  elo: 'Platina I',    balance: 320.00 },
      { name: 'StormMid#BR1',   role: 'MID', elo: 'Diamante IV',  balance: 275.00 },
    ],
    pdl: 2540, winrate: 58, ranking: 5, wins: 22, gamesPlayed: 38, userRole: 'visitor',
  },
  {
    id: 6, name: 'Gold Rush', tag: 'GRS',
    gradientFrom: '#FFB700', gradientTo: '#FF6600',
    players: [
      { name: 'GoldenTop#BR1',  role: 'TOP', elo: 'Ouro I',     balance: 230.00, isLeader: true },
      { name: 'RushJG#BR1',     role: 'JG',  elo: 'Platina IV', balance: 185.00 },
      { name: 'GoldMid#BR1',    role: 'MID', elo: 'Ouro II',    balance: 120.00 },
      { name: 'TreasADC#BR1',   role: 'ADC', elo: 'Ouro I',     balance: 95.00  },
      { name: 'CoinSup#BR1',    role: 'SUP', elo: 'Prata II',   balance: 45.00  },
      { name: 'Reserva11#BR1',  role: 'RES', elo: 'Prata I',    balance: 35.00  },
      { name: 'Reserva12#BR1',  role: 'RES', elo: 'Ferro I',    balance: 20.00  },
    ],
    pdl: 1980, winrate: 54, ranking: 6, wins: 18, gamesPlayed: 33, userRole: 'visitor',
  },
];

export async function carregarTimesDoSupabase(currentUserId: string | null): Promise<Team[]> {
  const { data: timesRaw, error } = await supabase
    .from('times')
    .select('*, time_membros(*)')
    .order('ranking');

  if (error || !timesRaw || timesRaw.length === 0) return INITIAL_TEAMS;

  return timesRaw.map((t: any) => {
    const members: Player[] = (t.time_membros ?? []).map((m: any) => ({
      name:     m.riot_id || '',
      role:     (m.role || 'TOP') as Role,
      elo:      m.elo || '',
      balance:  Number(m.balance) || 0,
      isLeader: m.is_leader || false,
      userId:   m.user_id,
    }));

    let userRole: UserRole = 'visitor';
    if (currentUserId) {
      if (t.dono_id === currentUserId) userRole = 'leader';
      else if (members.some((m: any) => m.userId === currentUserId)) userRole = 'member';
    }

    return {
      id:           t.id,
      name:         t.nome,
      tag:          t.tag,
      logoUrl:      t.logo_url ?? undefined,
      gradientFrom: t.gradient_from || '#FFB700',
      gradientTo:   t.gradient_to   || '#FF6600',
      players:      members,
      pdl:          t.pdl       || 0,
      winrate:      t.winrate   || 0,
      ranking:      t.ranking   || 999,
      wins:         t.wins      || 0,
      gamesPlayed:  t.games_played || 0,
      userRole,
    };
  });
}
