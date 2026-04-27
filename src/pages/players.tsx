/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ✅ VERSÃO OTIMIZADA - players.tsx
 * - Elo via cache do banco (sem Riot API)
 * - Contagem de partidas otimizada com mapa
 * - Logs removidos em produção
 * - Promise.all para atualizações paralelas
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Crown, Trophy, Search,
  ShieldCheck, Gamepad2, X, Check
} from 'lucide-react';
import { useSound } from '../hooks/useSound';
import { supabase } from '../lib/supabase';
import { buscarElo } from '../api/riot';
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

const IS_DEV = import.meta.env.DEV;
const PLAYERS_PAGE = 30;
const PRIMARY_COLOR = '#FFB700';

// Mapa de roles
const LANE_MAP: Record<string, Role> = {
  Top: 'TOP', Jungle: 'JG', Middle: 'MID', Bottom: 'ADC', Support: 'SUP', Fill: 'RES',
};

// ✅ Função otimizada para contar partidas (usa mapa em memória)
async function contarPartidasPorUsuarios(userIds: string[]): Promise<Record<string, { total: number; vitories: number; defeats: number }>> {
  const { data: resultados } = await supabase
    .from('resultados_partidas')
    .select('vencedor, jogadores')
    .order('created_at', { ascending: false })
    .limit(500);

  const inicial: Record<string, { total: number; vitories: number; defeats: number }> = {};
  for (const userId of userIds) {
    inicial[userId] = { total: 0, vitories: 0, defeats: 0 };
  }

  if (!resultados) return inicial;

  for (const resultado of resultados) {
    const jogadores = resultado.jogadores as any[];
    for (const jogador of jogadores ?? []) {
      if (!inicial[jogador.id]) continue;
      const ehVitoria = (resultado.vencedor === 'time_a' && jogador.isTimeA) ||
                        (resultado.vencedor === 'time_b' && !jogador.isTimeA);
      inicial[jogador.id].total++;
      if (ehVitoria) inicial[jogador.id].vitories++;
      else inicial[jogador.id].defeats++;
    }
  }
  return inicial;
}

// ✅ Atualizar elos em paralelo
async function atualizarElosNecessarios(contas: any[]): Promise<void> {
  const umDiaMs = 24 * 60 * 60 * 1000;
  const agora = Date.now();
  const contasParaAtualizar = contas.filter(conta => {
    const eloAntigo = !conta.last_elo_update || (agora - new Date(conta.last_elo_update).getTime()) > umDiaMs;
    const semElo = !conta.tier;
    return (eloAntigo || semElo) && conta.puuid;
  });

  if (contasParaAtualizar.length === 0) return;

  await Promise.all(contasParaAtualizar.map(async (conta) => {
    try {
      const ranqueadas = await buscarElo(conta.puuid);
      const soloEntry = ranqueadas?.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');
      if (soloEntry) {
        await supabase.from('contas_riot').update({
          tier: soloEntry.tier ?? 'IRON',
          rank: soloEntry.rank ?? 'IV',
          lp: soloEntry.leaguePoints ?? 0,
          last_elo_update: new Date().toISOString(),
        }).eq('user_id', conta.user_id);
        if (IS_DEV) console.log(`[atualizarElos] ${conta.riot_id}: ${soloEntry.tier} ${soloEntry.rank}`);
      }
    } catch (err: any) {
      if (IS_DEV) console.warn(`[atualizarElos] Erro ${conta.riot_id}:`, err?.message);
    }
  }));
}

// ✅ Carregar jogadores (elo via cache do banco)
async function carregarJogadores(offset = 0, limit = PLAYERS_PAGE): Promise<{ jogadores: Jogador[]; temMais: boolean }> {
  const { data: contas, error } = await supabase
    .from('contas_riot')
    .select('user_id, riot_id, puuid, profile_icon_id, level, mp, mc, tier, rank, lp, last_elo_update')
    .order('mp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !contas?.length) return { jogadores: [], temMais: false };
  const temMais = contas.length === limit;
  const userIds = contas.map(c => c.user_id);

  // Contar partidas
  const contarMap = await contarPartidasPorUsuarios(userIds);

  const [{ data: perfis }, { data: membros }] = await Promise.all([
    supabase.rpc('buscar_perfis_publicos', { user_ids: userIds }),
    supabase.from('time_membros').select('user_id, time_id').in('user_id', userIds),
  ]);

  const timeIds = [...new Set((membros ?? []).map(m => m.time_id))];
  const { data: times } = timeIds.length
    ? await supabase.from('times').select('id, tag, gradient_from, logo_url').in('id', timeIds)
    : { data: [] };

  const perfilMap = Object.fromEntries((perfis ?? []).map((p: any) => [p.id, p]));
  const membroMap = Object.fromEntries((membros ?? []).map(m => [m.user_id, m]));
  const timeMap = Object.fromEntries((times ?? []).map(t => [t.id, t]));

  const jogadores: Jogador[] = contas.map(c => {
    const perfil = perfilMap[c.user_id] ?? {};
    const membro = membroMap[c.user_id];
    const time = membro ? timeMap[membro.time_id] : null;
    const { total, vitories } = contarMap[c.user_id] ?? { total: 0, vitories: 0 };
    const winRate = total > 0 ? Math.round((vitories / total) * 100) : 0;
    const eloType: EloType = c.tier ? (TIER_MAP[c.tier] ?? 'Ferro') : 'Ferro';

    return {
      id: c.user_id,
      riotId: c.riot_id ?? 'Jogador',
      nome: (c.riot_id ?? 'Jogador').split('#')[0],
      nivel: c.level ?? 1,
      elo: eloType,
      iconeId: c.profile_icon_id ?? 1,
      partidas: total,
      winRate,
      titulos: 0,
      rolePrincipal: (LANE_MAP[perfil.lane] ?? 'MID') as Role,
      roleSecundaria: (LANE_MAP[perfil.lane2] ?? 'RES') as Role,
      isVIP: perfil?.is_vip ?? false,
      isVerified: true,
      kda: 0,
      csPorMinuto: 0,
      participacaoKill: 0,
      conquistas: [],
      timeTag: time?.tag ?? undefined,
      timeColor: time?.gradient_from ?? undefined,
      timeLogo: time?.logo_url ?? undefined,
      timeId: membro?.time_id ?? undefined,
      mp: c.mp ?? 0,
      mc: c.mc ?? 0,
      _puuid: c.puuid ?? undefined,
    } as Jogador & { _puuid?: string };
  });

  // Background update
  atualizarElosNecessarios(contas).catch(err => IS_DEV && console.error('[players] Erro atualizar elos:', err));

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
  const [popup, setPopup] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [selectedPuuid, setSelectedPuuid] = useState<string | undefined>(undefined);

  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);
  const temMaisRef = useRef(true);
  const readyRef = useRef(false);
  const filterTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const carregarMais = async () => {
    if (!readyRef.current || !temMaisRef.current || fetchingRef.current) return;
    fetchingRef.current = true;
    setCarregandoMais(true);
    try {
      const { jogadores: mais, temMais: ainda } = await carregarJogadores(offsetRef.current, PLAYERS_PAGE);
      setTodosJogadores(prev => {
        const idsExistentes = new Set(prev.map(j => j.id));
        const novos = mais.filter(j => !idsExistentes.has(j.id));
        return [...prev, ...novos];
      });
      temMaisRef.current = ainda;
      setTemMais(ainda);
      offsetRef.current += mais.length;
    } finally {
      fetchingRef.current = false;
      setCarregandoMais(false);
    }
  };

  // Carregar primeira página
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
      if (mais && sentinelRef.current && sentinelRef.current.getBoundingClientRect().top < window.innerHeight) {
        carregarMais();
      }
    });
    return () => { ignore = true; };
  }, []);

  // IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || !readyRef.current) return;
      carregarMais();
    }, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);


  // Popup auto-dismiss
  useEffect(() => {
    if (popup) {
      const timer = setTimeout(() => setPopup(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  // Filtros com debounce
  useEffect(() => {
    if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
    filterTimeoutRef.current = setTimeout(() => {
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
    }, 200);
    return () => { if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current); };
  }, [searchTerm, filtroElo, filtroRole, filtroSemTime, todosJogadores]);

  const handleVerPerfil = (jogador: Jogador) => {
    playSound('click');
    setSelectedJogador(jogador);
    setSelectedPuuid((jogador as any)._puuid);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-2 rounded-full animate-spin" style={{ borderColor: PRIMARY_COLOR, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
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

      <AnimatePresence>
        {selectedJogador && (
          <PlayerDetailModal jogador={selectedJogador} onClose={() => { setSelectedJogador(null); setSelectedPuuid(undefined); }} />
        )}
      </AnimatePresence>

      {/* Banner */}
      <div className="space-y-0 rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a]/20 backdrop-blur-md mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden p-6">
          <div className="absolute inset-0 z-0">
            <img src="/images/fundoryzecortado.png" alt="Arena" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/10 to-white/0" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-white/60" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Arena de Jogadores</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">
                Jogadores <span style={{ color: PRIMARY_COLOR }}>Rankeados</span>
              </h1>
              <p className="text-white/50 text-sm max-w-lg">Conheça os melhores invocadores da comunidade, suas estatísticas e conquistas.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/40 font-bold text-[10px] uppercase">
                <span className="text-white font-black">{jogadores.length}</span> Jogadores
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="w-full rounded-2xl border border-white/10 p-6 mb-12" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
            <input type="text" placeholder="Buscar por Riot ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none" />
          </div>
          <div className="relative">
            <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
            <select value={filtroElo} onChange={e => setFiltroElo(e.target.value as EloType | 'todos')}
              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-white/80 focus:outline-none appearance-none cursor-pointer">
              <option value="todos">Todos os Elos</option>
              {ELOS_ORDER.map(elo => <option key={elo} value={elo}>{elo}</option>)}
            </select>
          </div>
          <div className="relative">
            <Gamepad2 className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
            <select value={filtroRole} onChange={e => setFiltroRole(e.target.value as Role | 'todos')}
              className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-white/80 focus:outline-none appearance-none cursor-pointer">
              <option value="todos">Todas as Roles</option>
              {ROLES_ORDER.map(role => <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>)}
            </select>
          </div>
          <button onClick={() => setFiltroSemTime(v => !v)}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border font-bold text-sm transition-all ${
              filtroSemTime ? 'bg-[#C89B3C]/20 border-[#C89B3C]/50 text-[#C89B3C]' : 'bg-black/40 border-white/5 text-white/40 hover:text-white/60'
            }`}>
            <Users className="w-4 h-4" /> Sem Time
          </button>
        </div>
      </div>

      {/* Lista de Jogadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {jogadores.map((jogador, index) => {
            const roleConfig = ROLE_CONFIG[jogador.rolePrincipal];
            const roleSecConfig = ROLE_CONFIG[jogador.roleSecundaria];
            const eloStyle = ELO_STYLES[jogador.elo];
            const winRateColor = jogador.winRate >= 50 ? '#4ade80' : '#ef4444';

            return (
              <motion.div
                key={jogador.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: (index % 8) * 0.05 }}
                className={`group relative cursor-pointer rounded-[28px] transition-all hover:-translate-y-1 ${jogador.isVIP ? 'p-0.5' : 'p-[1.5px]'}`}
                style={jogador.isVIP ? {} : { background: eloStyle.border }}
                onClick={() => handleVerPerfil(jogador)}
              >
                {jogador.isVIP && (
                  <div className="absolute inset-0 rounded-[28px]" style={{ background: 'conic-gradient(from 0deg, #FFB800, #FFD700, #FFB800)', animation: 'vip-border-rotate 8s linear infinite' }} />
                )}
                <div className={`relative rounded-[26.5px] p-5 overflow-hidden ${jogador.isVIP ? 'relative' : ''}`} style={{ background: '#0d0d0d', zIndex: jogador.isVIP ? 1 : 'auto' }}>
                  {jogador.isVIP && (
                    <>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10"><VipCrown /></div>
                      <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none z-10">
                        <div className="absolute w-24 h-8 bg-gradient-to-r from-[#FFB800] to-[#FFD700] flex items-center justify-center font-black text-black text-[11px] tracking-widest shadow-lg"
                          style={{ top: '12px', right: '-32px', transform: 'rotate(45deg)' }}>VIP</div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full blur-[3px] opacity-40 group-hover:opacity-100 transition-opacity" style={{ background: eloStyle.border }} />
                      <img src={getIconeUrl(jogador.iconeId)} className="w-16 h-16 rounded-full border-2 relative z-10 shadow-xl" style={{ borderColor: eloStyle.border }} alt={jogador.nome} />
                      <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-black border-2 border-[#0a0a0a] z-20" style={{ background: PRIMARY_COLOR }}>{jogador.nivel}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-black text-lg tracking-tight truncate max-w-[150px]">{jogador.riotId}</p>
                        {jogador.isVerified && <ShieldCheck className="w-3 h-3" style={{ color: eloStyle.border }} />}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${eloStyle.bg} ${eloStyle.text}`}>{jogador.elo}</span>
                        <span className="text-[9px] text-white/40 font-bold">Ranking #{index + 1}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-white/[0.02] rounded-xl">
                      <p className="text-white font-black text-sm">{jogador.partidas.toLocaleString()}</p>
                      <p className="text-[8px] text-white/40 uppercase tracking-wider">Partidas</p>
                    </div>
                    <div className="text-center p-2 bg-white/[0.02] rounded-xl">
                      <p className="font-black text-sm" style={{ color: winRateColor }}>{jogador.winRate}%</p>
                      <p className="text-[8px] text-white/40 uppercase tracking-wider">Win Rate</p>
                    </div>
                    <div className="text-center p-2 bg-white/[0.02] rounded-xl">
                      <p className="text-white font-black text-sm">{(jogador.mp ?? 0).toLocaleString()}</p>
                      <p className="text-[8px] text-white/40 uppercase tracking-wider">M7 Points</p>
                    </div>
                  </div>

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
                    {jogador.timeTag && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter"
                        style={{ background: `${jogador.timeColor}20`, color: jogador.timeColor, border: `1px solid ${jogador.timeColor}40` }}>
                        #{jogador.timeTag.substring(0, 3)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="flex justify-center mt-8 pb-4">
        {carregandoMais && <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: PRIMARY_COLOR, borderTopColor: 'transparent' }} />}
      </div>

      {/* Empty state */}
      {!loading && jogadores.length === 0 && (
        <div className="rounded-3xl border border-white/10 p-12 text-center bg-[#0d0d0d]">
          <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-lg">Nenhum jogador encontrado com os filtros selecionados.</p>
          <button onClick={() => { setSearchTerm(''); setFiltroElo('todos'); setFiltroRole('todos'); playSound('click'); }}
            className="mt-4 px-6 py-2 rounded-xl font-bold transition-all" style={{ background: `${PRIMARY_COLOR}20`, color: PRIMARY_COLOR, border: `1px solid ${PRIMARY_COLOR}40` }}>
            Limpar Filtros
          </button>
        </div>
      )}
    </div>
  );
}