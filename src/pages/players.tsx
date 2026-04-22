/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Crown, Trophy, Search,
  ShieldCheck, Gamepad2, X, Check
} from 'lucide-react';
import { useSound } from '../hooks/useSound';
import { supabase } from '../lib/supabase';
import {
  PlayerDetailModal,
  type Jogador,
  type Role,
  type EloType,
  ROLE_CONFIG,
  ELO_STYLES,
  ELOS_ORDER,
  ROLES_ORDER,
  TIER_MAP,
  getIconeUrl,
} from '../components/players/PlayerDetailModal';
import { VipCrown } from '../components/VipBadge';


// ── Dados Mockados (com times e VIP) ───────────────────────────────────────
const JOGADORES_MOCK: Jogador[] = [
  {
    id: '1', riotId: 'Faker#KR1', nome: 'Faker', nivel: 982, elo: 'Desafiante',
    iconeId: 28, partidas: 12450, winRate: 72.5, titulos: 4,
    rolePrincipal: 'MID', roleSecundaria: 'TOP',
    isVIP: true, isVerified: true, kda: 4.8, csPorMinuto: 8.7, participacaoKill: 72.5,
    conquistas: ['Campeão Mundial 3x', 'MVP Finals', 'All-Star 5x'],
    timeTag: 'T1', timeColor: '#e74c3c',
  },
  {
    id: '2', riotId: 'Caps#EUW', nome: 'Caps', nivel: 845, elo: 'Grão-Mestre',
    iconeId: 29, partidas: 8920, winRate: 64.8, titulos: 2,
    rolePrincipal: 'MID', roleSecundaria: 'ADC',
    isVIP: true, isVerified: true, kda: 4.2, csPorMinuto: 8.5, participacaoKill: 68.3,
    conquistas: ['Campeão Mundial', 'MVP LEC', 'All-Star 3x'],
    timeTag: 'G2', timeColor: '#f1c40f',
  },
  {
    id: '3', riotId: 'Chovy#KR2', nome: 'Chovy', nivel: 901, elo: 'Desafiante',
    iconeId: 30, partidas: 10340, winRate: 68.1, titulos: 1,
    rolePrincipal: 'MID', roleSecundaria: 'TOP',
    isVIP: false, isVerified: true, kda: 5.2, csPorMinuto: 9.2, participacaoKill: 74.1,
    conquistas: ['MVP LCK 2x', 'All-Star 2x'],
    timeTag: 'GEN', timeColor: '#3498db',
  },
  {
    id: '4', riotId: 'Jankos#EUW', nome: 'Jankos', nivel: 756, elo: 'Mestre',
    iconeId: 33, partidas: 11230, winRate: 55.2, titulos: 1,
    rolePrincipal: 'JG', roleSecundaria: 'SUP',
    isVIP: false, isVerified: true, kda: 3.8, csPorMinuto: 6.2, participacaoKill: 75.3,
    conquistas: ['Campeão Mundial', 'MVP LEC'],
    timeTag: undefined, timeColor: '#00ff88',
  },
  {
    id: '5', riotId: 'Uzi#CN2', nome: 'Uzi', nivel: 891, elo: 'Desafiante',
    iconeId: 34, partidas: 13450, winRate: 69.2, titulos: 2,
    rolePrincipal: 'ADC', roleSecundaria: 'MID',
    isVIP: true, isVerified: true, kda: 5.5, csPorMinuto: 9.1, participacaoKill: 68.7,
    conquistas: ['Campeão Mundial', 'MVP LPL', 'All-Star 4x'],
    timeTag: 'RNG', timeColor: '#ff6b6b',
  },
  {
    id: '6', riotId: 'Doublelift#NA1', nome: 'Doublelift', nivel: 723, elo: 'Diamante',
    iconeId: 35, partidas: 9870, winRate: 61.8, titulos: 8,
    rolePrincipal: 'ADC', roleSecundaria: 'SUP',
    isVIP: false, isVerified: true, kda: 4.1, csPorMinuto: 8.3, participacaoKill: 65.2,
    conquistas: ['Campeão LCS 8x', 'All-Star 7x'],
    timeTag: 'TL', timeColor: '#00a6ff',
  },
  {
    id: '7', riotId: 'CoreJJ#NA1', nome: 'CoreJJ', nivel: 678, elo: 'Mestre',
    iconeId: 36, partidas: 7650, winRate: 64.2, titulos: 2,
    rolePrincipal: 'SUP', roleSecundaria: 'ADC',
    isVIP: false, isVerified: true, kda: 3.9, csPorMinuto: 1.8, participacaoKill: 78.5,
    conquistas: ['Campeão Mundial', 'MVP LCS'],
    timeTag: undefined, timeColor: '#00a6ff',
  },
  {
    id: '8', riotId: 'Canyon#KR4', nome: 'Canyon', nivel: 823, elo: 'Desafiante',
    iconeId: 38, partidas: 9120, winRate: 67.8, titulos: 1,
    rolePrincipal: 'JG', roleSecundaria: 'TOP',
    isVIP: true, isVerified: true, kda: 4.3, csPorMinuto: 6.8, participacaoKill: 73.2,
    conquistas: ['Campeão Mundial', 'MVP LCK'],
    timeTag: 'DK', timeColor: '#1e88e5',
  },
  {
    id: '9', riotId: 'ShowMaker#KR1', nome: 'ShowMaker', nivel: 789, elo: 'Desafiante',
    iconeId: 40, partidas: 8500, winRate: 65.5, titulos: 1,
    rolePrincipal: 'MID', roleSecundaria: 'JG',
    isVIP: false, isVerified: true, kda: 4.5, csPorMinuto: 8.2, participacaoKill: 70.1,
    conquistas: ['Campeão Mundial'],
    timeTag: 'DK', timeColor: '#1e88e5',
  },
  {
    id: '10', riotId: 'Ruler#CN1', nome: 'Ruler', nivel: 812, elo: 'Desafiante',
    iconeId: 41, partidas: 9200, winRate: 68.4, titulos: 1,
    rolePrincipal: 'ADC', roleSecundaria: 'MID',
    isVIP: true, isVerified: true, kda: 4.9, csPorMinuto: 8.9, participacaoKill: 69.5,
    conquistas: ['Campeão Mundial', 'MVP LPL'],
    timeTag: 'JDG', timeColor: '#ff0000',
  },
  {
    id: '11', riotId: 'Knight#CN1', nome: 'Knight', nivel: 756, elo: 'Desafiante',
    iconeId: 42, partidas: 7800, winRate: 66.2, titulos: 0,
    rolePrincipal: 'MID', roleSecundaria: 'JG',
    isVIP: false, isVerified: true, kda: 4.7, csPorMinuto: 8.4, participacaoKill: 71.2,
    conquistas: ['MVP LPL'],
    timeTag: 'BLG', timeColor: '#00d2ff',
  },
  {
    id: '12', riotId: 'Bin#CN1', nome: 'Bin', nivel: 723, elo: 'Grão-Mestre',
    iconeId: 43, partidas: 7100, winRate: 62.1, titulos: 0,
    rolePrincipal: 'TOP', roleSecundaria: 'JG',
    isVIP: false, isVerified: true, kda: 3.9, csPorMinuto: 7.8, participacaoKill: 64.5,
    conquistas: ['Finalista Mundial'],
    timeTag: 'BLG', timeColor: '#00d2ff',
  },
  {
    id: '13', riotId: 'Keria#KR1', nome: 'Keria', nivel: 845, elo: 'Desafiante',
    iconeId: 44, partidas: 8900, winRate: 67.5, titulos: 1,
    rolePrincipal: 'SUP', roleSecundaria: 'MID',
    isVIP: true, isVerified: true, kda: 4.1, csPorMinuto: 1.5, participacaoKill: 80.2,
    conquistas: ['Campeão Mundial', 'All-Star'],
    timeTag: 'T1', timeColor: '#e74c3c',
  },
  {
    id: '14', riotId: 'Gumayusi#KR1', nome: 'Gumayusi', nivel: 832, elo: 'Desafiante',
    iconeId: 45, partidas: 8700, winRate: 66.8, titulos: 1,
    rolePrincipal: 'ADC', roleSecundaria: 'TOP',
    isVIP: false, isVerified: true, kda: 4.6, csPorMinuto: 9.0, participacaoKill: 67.8,
    conquistas: ['Campeão Mundial'],
    timeTag: 'T1', timeColor: '#e74c3c',
  },
  {
    id: '15', riotId: 'Oner#KR1', nome: 'Oner', nivel: 812, elo: 'Desafiante',
    iconeId: 46, partidas: 8400, winRate: 65.2, titulos: 1,
    rolePrincipal: 'JG', roleSecundaria: 'TOP',
    isVIP: false, isVerified: true, kda: 4.0, csPorMinuto: 6.5, participacaoKill: 72.1,
    conquistas: ['Campeão Mundial'],
    timeTag: 'T1', timeColor: '#e74c3c',
  },
  {
    id: '16', riotId: 'Zeus#KR1', nome: 'Zeus', nivel: 856, elo: 'Desafiante',
    iconeId: 47, partidas: 9100, winRate: 69.1, titulos: 1,
    rolePrincipal: 'TOP', roleSecundaria: 'MID',
    isVIP: true, isVerified: true, kda: 4.2, csPorMinuto: 8.1, participacaoKill: 66.5,
    conquistas: ['Campeão Mundial', 'MVP Finals'],
    timeTag: 'T1', timeColor: '#e74c3c',
  },
  {
    id: '17', riotId: 'BeryL#KR1', nome: 'BeryL', nivel: 745, elo: 'Mestre',
    iconeId: 48, partidas: 10200, winRate: 58.5, titulos: 2,
    rolePrincipal: 'SUP', roleSecundaria: 'MID',
    isVIP: false, isVerified: true, kda: 3.5, csPorMinuto: 1.2, participacaoKill: 76.8,
    conquistas: ['Campeão Mundial 2x'],
    timeTag: undefined, timeColor: '#ffffff',
  },
  {
    id: '18', riotId: 'Deft#KR1', nome: 'Deft', nivel: 892, elo: 'Desafiante',
    iconeId: 49, partidas: 14500, winRate: 64.2, titulos: 1,
    rolePrincipal: 'ADC', roleSecundaria: 'MID',
    isVIP: true, isVerified: true, kda: 4.4, csPorMinuto: 8.8, participacaoKill: 65.1,
    conquistas: ['Campeão Mundial', 'MVP LCK'],
    timeTag: 'KT', timeColor: '#ff0000',
  },
  {
    id: '19', riotId: 'Pyosik#KR1', nome: 'Pyosik', nivel: 712, elo: 'Diamante',
    iconeId: 50, partidas: 8200, winRate: 56.4, titulos: 1,
    rolePrincipal: 'JG', roleSecundaria: 'TOP',
    isVIP: false, isVerified: true, kda: 3.7, csPorMinuto: 6.1, participacaoKill: 71.5,
    conquistas: ['Campeão Mundial'],
    timeTag: 'KT', timeColor: '#ff0000',
  },
  {
    id: '20', riotId: 'Bdd#KR1', nome: 'Bdd', nivel: 767, elo: 'Grão-Mestre',
    iconeId: 51, partidas: 9400, winRate: 61.2, titulos: 0,
    rolePrincipal: 'MID', roleSecundaria: 'JG',
    isVIP: false, isVerified: true, kda: 4.3, csPorMinuto: 8.1, participacaoKill: 69.8,
    conquistas: ['MVP LCK'],
    timeTag: 'KT', timeColor: '#ff0000',
  },
];


// ── Mapas ──────────────────────────────────────────────────────────────────
const LANE_MAP: Record<string, Role> = {
  Top: 'TOP', Jungle: 'JG', Middle: 'MID', Bottom: 'ADC', Support: 'SUP', Fill: 'RES',
};

// ── Carregador Supabase ────────────────────────────────────────────────────
const PLAYERS_PAGE = 30;

/**
 * Conta partidas reais que o jogador participou no site
 */
async function contarPartidas(userId: string): Promise<{ total: number; vitories: number; defeats: number }> {
  const { data: resultados } = await supabase
    .from('resultados_partidas')
    .select('vencedor, jogadores')
    .limit(1000);

  if (!resultados) return { total: 0, vitories: 0, defeats: 0 };

  let vitories = 0;
  let defeats = 0;

  for (const resultado of resultados) {
    const jogadores = resultado.jogadores as any[];
    const jogador = jogadores?.find((j: any) => j.id === userId);

    if (!jogador) continue;

    const ehVitoria =
      (resultado.vencedor === 'time_a' && jogador.isTimeA) ||
      (resultado.vencedor === 'time_b' && !jogador.isTimeA);

    if (ehVitoria) vitories++;
    else defeats++;
  }

  const total = vitories + defeats;
  return { total, vitories, defeats };
}

async function carregarJogadores(offset = 0, limit = PLAYERS_PAGE): Promise<{ jogadores: Jogador[]; temMais: boolean }> {
  // ✅ NOVO: Incluir tier, rank, lp, last_elo_update do cache
  const { data: contas, error } = await supabase
    .from('contas_riot')
    .select('user_id, riot_id, puuid, profile_icon_id, level, mp, tier, rank, lp, last_elo_update')
    .order('mp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) { console.error('[players] erro ao buscar contas_riot:', error); return { jogadores: [], temMais: false }; }
  if (!contas || contas.length === 0) { return { jogadores: [], temMais: false }; }
  const temMais = contas.length === limit;

  const userIds = contas.map((c: any) => c.user_id);

  // ✅ OTIMIZAÇÃO: Buscar resultados UMA VEZ para todos, não por jogador
  const { data: resultados } = await supabase
    .from('resultados_partidas')
    .select('vencedor, jogadores')
    .limit(1000);

  // Contar partidas por jogador em memória (O(n) em vez de O(n*m))
  const contarMap: Record<string, { total: number; vitories: number; defeats: number }> = {};
  for (const userId of userIds) {
    contarMap[userId] = { total: 0, vitories: 0, defeats: 0 };
  }
  if (resultados) {
    for (const resultado of resultados) {
      const jogadores = resultado.jogadores as any[];
      for (const jogador of jogadores ?? []) {
        if (!contarMap[jogador.id]) continue;
        const ehVitoria = (resultado.vencedor === 'time_a' && jogador.isTimeA) || (resultado.vencedor === 'time_b' && !jogador.isTimeA);
        contarMap[jogador.id].total++;
        if (ehVitoria) contarMap[jogador.id].vitories++;
        else contarMap[jogador.id].defeats++;
      }
    }
  }

  const [{ data: perfis }, { data: membros }] = await Promise.all([
    supabase.from('profiles').select('id, lane, lane2, is_vip').in('id', userIds),
    supabase.from('time_membros').select('user_id, time_id').in('user_id', userIds),
  ]);

  const timeIds = [...new Set((membros ?? []).map((m: any) => m.time_id))];
  const { data: times } = timeIds.length > 0
    ? await supabase.from('times').select('id, tag, gradient_from, logo_url').in('id', timeIds)
    : { data: [] };

  const perfilMap = Object.fromEntries((perfis ?? []).map((p: any) => [p.id, p]));
  const membroMap = Object.fromEntries((membros ?? []).map((m: any) => [m.user_id, m]));
  const timeMap   = Object.fromEntries((times  ?? []).map((t: any) => [t.id, t]));

  const jogadores = contas.map((c: any) => {
    const perfil = perfilMap[c.user_id] ?? {};
    const membro = membroMap[c.user_id];
    const time   = membro ? timeMap[membro.time_id] : null;

    // ✅ Contar vem do mapa pré-computado (sem async)
    const { total, vitories, defeats } = contarMap[c.user_id] ?? { total: 0, vitories: 0, defeats: 0 };
    const winRate = total > 0 ? Math.round((vitories / total) * 100) : 0;

    // ✅ CACHE: Elo vem do banco (tier), não de busca sequencial da Riot API
    const eloType: EloType = c.tier ? (TIER_MAP[c.tier] ?? 'Ferro') : 'Ferro';
    const eloIdadeMs = c.last_elo_update ? Date.now() - new Date(c.last_elo_update).getTime() : null;
    const eloTempoAtualizacao = eloIdadeMs
      ? eloIdadeMs < 3600000 ? '< 1h'
      : eloIdadeMs < 86400000 ? '< 24h'
      : '> 24h'
      : 'nunca';

    return {
      id:               c.user_id,
      riotId:           c.riot_id ?? 'Jogador',
      nome:             (c.riot_id ?? 'Jogador').split('#')[0],
      nivel:            c.level ?? 1,
      elo:              eloType,
      iconeId:          c.profile_icon_id ?? 1,
      partidas:         total,
      winRate:          winRate,
      titulos:          0,
      rolePrincipal:    (LANE_MAP[perfil.lane]  ?? 'MID') as Role,
      roleSecundaria:   (LANE_MAP[perfil.lane2] ?? 'RES') as Role,
      isVIP:            perfil.is_vip ?? false,
      isVerified:       true,
      kda:              0,
      csPorMinuto:      0,
      participacaoKill: 0,
      conquistas:       [],
      timeTag:          time?.tag          ?? undefined,
      timeColor:        time?.gradient_from ?? undefined,
      timeLogo:         time?.logo_url      ?? undefined,
      timeId:           membro?.time_id     ?? undefined,
      mp:               c.mp ?? 0,
      mc:               c.mc ?? 0,
      _puuid:           c.puuid ?? undefined,
      _eloTempoAtual:   eloTempoAtualizacao,  // ← Mostrar idade do cache
    } as Jogador & { _puuid?: string; _eloTempoAtual?: string };
  });

  return { jogadores, temMais };
}


// ── Componente Principal ────────────────────────────────────────────────────
export default function App() {
  const { playSound } = useSound();
  const [searchTerm, setSearchTerm] = useState('');
  const [todosJogadores, setTodosJogadores] = useState<Jogador[]>([]);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [filtroElo, setFiltroElo] = useState<EloType | 'todos'>('todos');
  const [filtroRole, setFiltroRole] = useState<Role | 'todos'>('todos');
  const [filtroSemTime, setFiltroSemTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [temMais, setTemMais] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [selectedJogador, setSelectedJogador] = useState<Jogador | null>(null);
  const [selectedPuuid, setSelectedPuuid] = useState<string | undefined>(undefined);
  const [popup, setPopup] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);

  const offsetRef        = useRef(0);
  const sentinelRef      = useRef<HTMLDivElement>(null);
  const fetchingRef      = useRef(false);
  const temMaisRef       = useRef(true);
  // Impede que o observer carregue antes do load inicial terminar
  const readyRef         = useRef(false);

  const PRIMARY_COLOR = '#FFB700';

  // Função centralizada de "carregar mais" — usada pelo observer e pelo pós-load inicial
  const carregarMaisRef = useRef<() => void>(() => {});
  carregarMaisRef.current = () => {
    if (!readyRef.current || !temMaisRef.current || fetchingRef.current) return;
    fetchingRef.current = true;
    setCarregandoMais(true);
    carregarJogadores(offsetRef.current, PLAYERS_PAGE)
      .then(({ jogadores: mais, temMais: ainda }) => {
        setTodosJogadores((prev: Jogador[]) => {
          // Deduplicação: garante que IDs repetidos não entrem na lista
          const idsExistentes = new Set(prev.map((j: Jogador) => j.id));
          const novos = mais.filter((j: Jogador) => !idsExistentes.has(j.id));
          return [...prev, ...novos];
        });
        temMaisRef.current = ainda;
        setTemMais(ainda);
        offsetRef.current += mais.length;
      })
      .finally(() => {
        fetchingRef.current = false;
        setCarregandoMais(false);
      });
  };

  // Carrega primeira página
  useEffect(() => {
    let ignore = false;
    readyRef.current = false;
    carregarJogadores(0, PLAYERS_PAGE).then(({ jogadores: lista, temMais: mais }) => {
      if (ignore) return;
      setTodosJogadores(lista);
      temMaisRef.current = mais;
      setTemMais(mais);
      offsetRef.current = lista.length;
      readyRef.current = true;
      setLoading(false);
      // Após o load inicial, verifica se o sentinel ainda está visível
      // (caso a lista seja pequena e o observer já tenha disparado antes)
      if (mais && sentinelRef.current) {
        const rect = sentinelRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          carregarMaisRef.current();
        }
      }
    });
    return () => { ignore = true; };
  }, []);

  // IntersectionObserver — só busca mais quando readyRef = true
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      if (!readyRef.current) return; // load inicial ainda não terminou
      carregarMaisRef.current();
    }, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // ✅ DESABILITADO: Elo agora vem do cache (contas_riot.tier)
  // Não precisa mais buscar da Riot API sequencialmente (16+ segundos)
  // O elo é atualizado quando jogador entra em seu perfil
  // useEffect(() => { ... }, [todosJogadores.length]);

  useEffect(() => {
    if (popup) {
      const timer = setTimeout(() => setPopup(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  // Filtragem reativa sobre os dados já carregados
  useEffect(() => {
    let filtrados = [...todosJogadores];
    if (searchTerm) {
      filtrados = filtrados.filter(j =>
        j.riotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filtroElo !== 'todos') filtrados = filtrados.filter(j => j.elo === filtroElo);
    if (filtroRole !== 'todos') filtrados = filtrados.filter(j => j.rolePrincipal === filtroRole || j.roleSecundaria === filtroRole);
    if (filtroSemTime) filtrados = filtrados.filter(j => !j.timeTag);
    setJogadores(filtrados);
  }, [searchTerm, filtroElo, filtroRole, filtroSemTime, todosJogadores]);

  const handleVerPerfil = (jogador: Jogador) => {
    playSound('click');
    setSelectedJogador(jogador);
    setSelectedPuuid((jogador as any)._puuid);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Popup */}
      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
              popup.type === 'error' ? 'bg-red-500/90' : popup.type === 'success' ? 'bg-green-500/90' : 'bg-blue-500/90'
            } text-white`}
          >
            {popup.type === 'error' && <X className="w-5 h-5" />}
            {popup.type === 'success' && <Check className="w-5 h-5" />}
            <span className="font-medium">{popup.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Detalhes */}
      <AnimatePresence>
        {selectedJogador && (
          <PlayerDetailModal jogador={selectedJogador} puuid={selectedPuuid} onClose={() => { setSelectedJogador(null); setSelectedPuuid(undefined); }} />
        )}
      </AnimatePresence>

      {/* Arena de Jogadores Banner */}
      <div className="space-y-0 rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a]/20 backdrop-blur-md mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden p-6 group transition-all duration-500"
        >
          {/* Imagem FIXA */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/fundoryzecortado.png"
              alt="Arena de Jogadores"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/10 via-black/3 to-white/0" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-white/60" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Arena de Jogadores
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">
                Jogadores <span style={{ color: PRIMARY_COLOR }}>Rankeados</span>
              </h1>

              <p className="text-white/50 text-sm max-w-lg">
                Conheça os melhores invocadores da comunidade, suas estatísticas e conquistas.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-white/40 font-bold text-[10px] uppercase tracking-wider">
                <span className="text-white font-black">{jogadores.length}</span> Jogadores
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="w-full rounded-2xl border border-white/10 p-6 mb-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)' }}
      >
        <div className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Busca */}
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="text-white/30 w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Buscar por Riot ID ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none transition-all"
              />
            </div>

            {/* Filtro Elo */}
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Trophy className="text-white/30 w-4 h-4" />
              </div>
              <select
                value={filtroElo}
                onChange={(e) => setFiltroElo(e.target.value as EloType | 'todos')}
                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-white/80 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="todos">Todos os Elos</option>
                {ELOS_ORDER.map(elo => (
                  <option key={elo} value={elo}>{elo}</option>
                ))}
              </select>
            </div>

            {/* Filtro Role */}
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Gamepad2 className="text-white/30 w-4 h-4" />
              </div>
              <select
                value={filtroRole}
                onChange={(e) => setFiltroRole(e.target.value as Role | 'todos')}
                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-white/80 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="todos">Todas as Roles</option>
                {ROLES_ORDER.map(role => (
                  <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
                ))}
              </select>
            </div>

            {/* Filtro Sem Time */}
            <button
              onClick={() => setFiltroSemTime((v: boolean) => !v)}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border font-bold text-sm transition-all ${
                filtroSemTime
                  ? 'bg-[#C89B3C]/20 border-[#C89B3C]/50 text-[#C89B3C]'
                  : 'bg-black/40 border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              Sem Time
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Jogadores */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-2 rounded-full animate-spin"
            style={{ borderColor: PRIMARY_COLOR, borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {jogadores.map((jogador, index) => {
              const roleConfig = ROLE_CONFIG[jogador.rolePrincipal];
              const roleSecConfig = ROLE_CONFIG[jogador.roleSecundaria];
              const eloStyle = ELO_STYLES[jogador.elo];
              const carregando = (jogador as any)._carregando;
              const winRateColor = jogador.winRate >= 50 ? '#4ade80' : '#ef4444';
              
              return (
                <motion.div
                  key={jogador.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: (index % 8) * 0.05 }}
                  className={`group relative cursor-pointer rounded-[28px] transition-all hover:-translate-y-1 ${
                    jogador.isVIP ? 'p-0.5' : 'p-[1.5px]'
                  }`}
                  style={jogador.isVIP ? {} : { background: eloStyle.border }}
                  onClick={() => handleVerPerfil(jogador)}
                >
                  {/* VIP Border Animation */}
                  {jogador.isVIP && (
                    <div
                      className="absolute inset-0 rounded-[28px]"
                      style={{
                        background: 'conic-gradient(from 0deg, #FFB800, #FFD700, #FFB800)',
                        animation: 'vip-border-rotate 8s linear infinite',
                      }}
                    />
                  )}

                  <div className={`relative rounded-[26.5px] p-5 overflow-hidden ${jogador.isVIP ? 'relative' : ''}`}
                    style={{
                      background: '#0d0d0d',
                      zIndex: jogador.isVIP ? 1 : 'auto',
                    }}
                  >
                    {/* VIP Crown */}
                    {jogador.isVIP && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                        <VipCrown />
                      </div>
                    )}

                    {/* VIP Banner Fita Lateral Esquerda */}
                    <div className="absolute top-0 left-0 w-16 h-16 overflow-hidden pointer-events-none z-10">
                      <div
                        className="absolute w-20 h-8 bg-gradient-to-r from-[#FFB800] to-[#FFD700] flex items-center justify-center font-black text-black text-[11px] tracking-widest shadow-lg"
                        style={{
                          top: '4px',
                          left: '-28px',
                          transform: 'rotate(-45deg)',
                          boxShadow: '0 2px 8px rgba(255, 184, 0, 0.5)',
                          letterSpacing: '0.15em'
                        }}
                      >
                        VIP
                      </div>
                    </div>
                    
                    {/* Ícone e Info */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full blur-[3px] opacity-40 group-hover:opacity-100 transition-opacity"
                          style={{ background: eloStyle.border }}
                        />
                        <img 
                          src={getIconeUrl(jogador.iconeId)} 
                          className="w-16 h-16 rounded-full border-2 relative z-10 shadow-xl"
                          style={{ borderColor: eloStyle.border }}
                          alt={jogador.nome}
                        />
                        <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-black border-2 border-[#0a0a0a] z-20"
                          style={{ background: PRIMARY_COLOR }}
                        >
                          {jogador.nivel}
                        </div>
                        {/* Ranking Badge */}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white font-black text-lg tracking-tight truncate max-w-[150px]">{jogador.riotId}</p>
                          {jogador.isVerified && (
                            <ShieldCheck className="w-3 h-3" style={{ color: eloStyle.border }} />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${eloStyle.bg} ${eloStyle.text}`}>
                            {jogador.elo}
                          </span>
                          <span className="text-[9px] text-white/40 font-bold">
                            Ranking #{index + 1}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-white/[0.02] rounded-xl">
                        {carregando
                          ? <div className="h-4 w-8 bg-white/10 rounded animate-pulse mx-auto mb-1" />
                          : <p className="text-white font-black text-sm">{jogador.partidas.toLocaleString()}</p>
                        }
                        <p className="text-[8px] text-white/40 uppercase tracking-wider">Partidas</p>
                      </div>
                      <div className="text-center p-2 bg-white/[0.02] rounded-xl">
                        {carregando
                          ? <div className="h-4 w-8 bg-white/10 rounded animate-pulse mx-auto mb-1" />
                          : <p className="font-black text-sm" style={{ color: winRateColor }}>{jogador.winRate}%</p>
                        }
                        <p className="text-[8px] text-white/40 uppercase tracking-wider">Win Rate</p>
                      </div>
                      <div className="text-center p-2 bg-white/[0.02] rounded-xl">
                        <p className="text-white font-black text-sm">{(jogador.mp ?? 0).toLocaleString()}</p>
                        <p className="text-[8px] text-white/40 uppercase tracking-wider">M7 Points</p>
                      </div>
                    </div>
                    
                    {/* Roles Principal e Secundária */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <img src={roleConfig.img} alt={roleConfig.label} className="w-4 h-4 object-contain" />
                          <span className={`text-xs font-bold ${roleConfig.color}`}>{roleConfig.label}</span>
                        </div>
                        <span className="text-white/30 text-[10px]">/</span>
                        <div className="flex items-center gap-1">
                          <img src={roleSecConfig.img} alt={roleSecConfig.label} className="w-3 h-3 object-contain opacity-60" />
                          <span className="text-[10px] text-white/40">{roleSecConfig.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {jogador.timeTag && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter"
                            style={{ background: `${jogador.timeColor}20`, color: jogador.timeColor, border: `1px solid ${jogador.timeColor}40` }}
                          >
                            #{jogador.timeTag.substring(0, 3)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Sentinel + loading indicator para infinite scroll */}
      <div ref={sentinelRef} className="flex justify-center mt-8 pb-4">
        {carregandoMais && (
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: PRIMARY_COLOR, borderTopColor: 'transparent' }}
          />
        )}
      </div>

      {/* Mensagem vazia */}
      {!loading && jogadores.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-3xl border border-white/10 p-12 text-center"
          style={{ background: '#0d0d0d' }}
        >
          <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-lg">Nenhum jogador encontrado com os filtros selecionados.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFiltroElo('todos');
              setFiltroRole('todos');
              playSound('click');
            }}
            className="mt-4 px-6 py-2 rounded-xl font-bold transition-all"
            style={{ 
              background: `${PRIMARY_COLOR}20`, 
              color: PRIMARY_COLOR,
              border: `1px solid ${PRIMARY_COLOR}40`
            }}
          >
            Limpar Filtros
          </button>
        </motion.div>
      )}
    </div>
  );
}

