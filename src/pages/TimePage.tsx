import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Crown, Trophy, Wallet, Users, Send,
  ChevronRight, ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSound } from '../hooks/useSound';
import { AnimatePresence as AP } from 'motion/react';
import {
  PlayerDetailModal,
  type Jogador,
  type Role,
  ROLE_CONFIG,
  TIER_MAP,
} from '../components/players/PlayerDetailModal';

// ── tipos ─────────────────────────────────────────────────────────────────────
interface Membro {
  userId:   string;
  riotId:   string;
  role:     Role;
  cargo:    string;
  isLeader: boolean;
  elo:      string;
  balance:  number;
  // enriquecidos após busca
  iconeId?: number;
  nivel?:   number;
  puuid?:   string;
}

interface TimeData {
  id:           string | number;
  nome:         string;
  tag:          string;
  logoUrl?:     string;
  gradientFrom: string;
  gradientTo:   string;
  pdl:          number;
  winrate:      number;
  ranking:      number;
  wins:         number;
  gamesPlayed:  number;
  donoId:       string;
  torneio?:     string;
  membros:      Membro[];
}

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ROLE_ORDER: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES'];

// ── helpers ───────────────────────────────────────────────────────────────────
function eloDisplay(elo: string): string {
  if (!elo) return 'Sem Rank';
  const tier = TIER_MAP[elo.toUpperCase()] ?? elo;
  return tier;
}

// ── componente ────────────────────────────────────────────────────────────────
export default function TimePage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { playSound } = useSound();

  const [time,    setTime]    = useState<TimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'leader' | 'member' | 'visitor'>('visitor');

  const [selectedJogador, setSelectedJogador] = useState<{ jogador: Jogador; puuid?: string } | null>(null);

  // ── carregar ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setCurrentUserId(uid);

      const { data: t, error } = await supabase
        .from('times')
        .select('*, time_membros(*)')
        .eq('id', id)
        .maybeSingle();

      if (error || !t) { setLoading(false); return; }

      // Enriquecer membros com dados da Riot
      const membrosRaw: Membro[] = (t.time_membros ?? []).map((m: any) => ({
        userId:   m.user_id,
        riotId:   m.riot_id || 'Jogador',
        role:     (m.role || 'TOP') as Role,
        cargo:    m.cargo || 'jogador',
        isLeader: m.is_leader || false,
        elo:      m.elo || '',
        balance:  Number(m.balance) || 0,
      }));

      // Buscar dados Riot de todos os membros em paralelo
      const userIds = membrosRaw.map(m => m.userId).filter(Boolean);
      if (userIds.length > 0) {
        const { data: contas } = await supabase
          .from('contas_riot')
          .select('user_id, profile_icon_id, level, puuid')
          .in('user_id', userIds);

        const contaMap: Record<string, any> = {};
        (contas ?? []).forEach((c: any) => { contaMap[c.user_id] = c; });

        membrosRaw.forEach(m => {
          const c = contaMap[m.userId];
          if (c) {
            m.iconeId = c.profile_icon_id ?? 1;
            m.nivel   = c.level ?? 1;
            m.puuid   = c.puuid ?? undefined;
          }
        });
      }

      let role: 'leader' | 'member' | 'visitor' = 'visitor';
      if (uid) {
        if (t.dono_id === uid) role = 'leader';
        else if (membrosRaw.some(m => m.userId === uid)) role = 'member';
      }
      setUserRole(role);

      setTime({
        id:           t.id,
        nome:         t.nome,
        tag:          t.tag,
        logoUrl:      t.logo_url ?? undefined,
        gradientFrom: t.gradient_from || '#FFB700',
        gradientTo:   t.gradient_to   || '#FF6600',
        pdl:          t.pdl           || 0,
        winrate:      t.winrate       || 0,
        ranking:      t.ranking       || 999,
        wins:         t.wins          || 0,
        gamesPlayed:  t.games_played  || 0,
        donoId:       t.dono_id,
        torneio:      t.torneio       ?? undefined,
        membros:      membrosRaw,
      });
      setLoading(false);
    };

    load();
  }, [id]);

  // ── abrir modal de jogador ──────────────────────────────────────────────────
  const handlePlayerClick = (m: Membro) => {
    if (!m.puuid && !m.userId) return;
    playSound('click');
    const jogador: Jogador = {
      id:               m.userId,
      riotId:           m.riotId,
      nome:             m.riotId.split('#')[0],
      nivel:            m.nivel ?? 1,
      elo:              'Ferro',
      iconeId:          m.iconeId ?? 1,
      partidas:         0,
      winRate:          0,
      titulos:          0,
      rolePrincipal:    m.role,
      roleSecundaria:   'RES',
      isVIP:            false,
      isVerified:       true,
      kda:              0,
      csPorMinuto:      0,
      participacaoKill: 0,
      conquistas:       [],
      timeTag:          time?.tag,
      timeColor:        time?.gradientFrom,
      timeLogo:         time?.logoUrl,
      timeId:           time?.id,
    };
    setSelectedJogador({ jogador, puuid: m.puuid });
  };

  // ── loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!time) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/40 font-bold uppercase tracking-widest">Time não encontrado</p>
        <button onClick={() => navigate('/times')} className="text-primary text-sm hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar para Equipes
        </button>
      </div>
    );
  }

  const totalSaldo = time.membros.reduce((s, m) => s + m.balance, 0);
  const lider = time.membros.find(m => m.isLeader);

  return (
    <>
      <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
        {/* Voltar */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/times')}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold">Equipes</span>
        </motion.button>

        {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden mb-6 border border-white/10"
          style={{ background: `linear-gradient(135deg, ${time.gradientFrom}22, #0d0d0d 60%)` }}
        >
          {/* glow de fundo */}
          <div
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full blur-[120px] opacity-30 pointer-events-none"
            style={{ background: time.gradientFrom }}
          />

          <div className="relative z-10 p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Logo */}
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center shrink-0 relative overflow-hidden"
              style={{
                border: `3px solid transparent`,
                background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${time.gradientFrom}, ${time.gradientTo}) border-box`,
                boxShadow: `0 0 40px -10px ${time.gradientFrom}`,
              }}
            >
              {time.logoUrl ? (
                <img src={time.logoUrl} alt={time.nome} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-3xl tracking-widest" style={{ color: time.gradientFrom }}>
                  {time.tag}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
                <h1 className="text-4xl font-black text-white uppercase tracking-tight">{time.nome}</h1>
                {userRole === 'leader' && <Crown className="w-5 h-5 shrink-0" style={{ color: time.gradientFrom }} />}
              </div>
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-4">
                <span
                  className="text-[11px] font-black px-2 py-0.5 rounded-lg tracking-widest"
                  style={{ color: time.gradientFrom, background: `${time.gradientFrom}18`, border: `1px solid ${time.gradientFrom}40` }}
                >
                  #{time.tag}
                </span>
                <span className="text-white/30 text-[11px] font-black">Ranking #{time.ranking}</span>
              </div>

              {/* Stats rápidas */}
              <div className="flex gap-6 justify-center sm:justify-start flex-wrap">
                {[
                  { label: 'PDL',      val: time.pdl.toLocaleString('pt-BR') },
                  { label: 'Win Rate', val: `${time.winrate}%` },
                  { label: 'Vitórias', val: `${time.wins}/${time.gamesPlayed}` },
                  { label: 'Torneio',  val: time.torneio ?? 'Nenhum' },
                ].map((s, i) => (
                  <div key={i} className="text-center sm:text-left">
                    <p className="font-black text-lg text-white leading-none">{s.val}</p>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Poder financeiro */}
            <div
              className="shrink-0 rounded-2xl p-4 text-center border"
              style={{ background: `${time.gradientFrom}0e`, borderColor: `${time.gradientFrom}35` }}
            >
              <Wallet className="w-5 h-5 mx-auto mb-1" style={{ color: time.gradientFrom }} />
              <p className="font-black text-xl" style={{ color: time.gradientFrom }}>{formatBRL(totalSaldo)}</p>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">Poder Financeiro</p>
            </div>
          </div>
        </motion.div>

        {/* ── GRID: LINEUP + INFO ─────────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* LINEUP */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="md:col-span-2 rounded-3xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: time.gradientFrom }} />
              <h2 className="text-white font-black text-sm uppercase tracking-widest">Lineup</h2>
              <span className="ml-auto text-white/30 text-[11px]">{time.membros.length} jogadores</span>
            </div>

            <div className="p-4 space-y-2">
              {ROLE_ORDER.map(role => {
                const membrosRole = time.membros.filter(m => m.role === role);
                const cfg = ROLE_CONFIG[role];

                if (membrosRole.length === 0) {
                  return (
                    <div
                      key={role}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-white/5 opacity-30"
                    >
                      <div className="flex items-center gap-2 w-16 shrink-0">
                        <img src={cfg.img} alt={cfg.label} className="w-5 h-5 object-contain opacity-40" />
                        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <span className="text-white/20 text-sm">Vaga aberta</span>
                    </div>
                  );
                }

                return membrosRole.map((m, idx) => (
                  <motion.div
                    key={m.userId}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handlePlayerClick(m)}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] cursor-pointer transition-all"
                  >
                    {/* Role */}
                    <div className="flex items-center gap-2 w-16 shrink-0">
                      <img src={cfg.img} alt={cfg.label} className="w-5 h-5 object-contain" />
                      <span className={`text-xs font-bold ${cfg.color}`}>
                        {role === 'RES' ? `R${idx + 1}` : cfg.label}
                      </span>
                    </div>

                    {/* Avatar */}
                    {m.iconeId ? (
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/14.19.1/img/profileicon/${m.iconeId}.png`}
                        alt={m.riotId}
                        className="w-9 h-9 rounded-xl border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 shrink-0 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white/20" />
                      </div>
                    )}

                    {/* Nome + cargo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-sm truncate">{m.riotId.split('#')[0]}</span>
                        {m.isLeader && (
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 border"
                            style={{ color: time.gradientFrom, borderColor: `${time.gradientFrom}60`, background: `${time.gradientFrom}18` }}
                          >
                            CAP
                          </span>
                        )}
                        {m.puuid && <ShieldCheck className="w-3 h-3 text-green-400 shrink-0" />}
                      </div>
                      <span className="text-white/30 text-[11px]">{m.riotId.split('#')[1] ? `#${m.riotId.split('#')[1]}` : ''}</span>
                    </div>

                    {/* Elo */}
                    <span className="text-white/40 text-xs font-semibold shrink-0">{eloDisplay(m.elo)}</span>

                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                  </motion.div>
                ));
              })}
            </div>
          </motion.div>

          {/* COLUNA DIREITA */}
          <div className="space-y-4">
            {/* Capitão */}
            {lider && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-3xl border border-white/10 p-5 overflow-hidden"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-3">Capitão</p>
                <div
                  className="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer hover:brightness-110 transition-all"
                  style={{ background: `${time.gradientFrom}0e`, borderColor: `${time.gradientFrom}35` }}
                  onClick={() => handlePlayerClick(lider)}
                >
                  {lider.iconeId ? (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/14.19.1/img/profileicon/${lider.iconeId}.png`}
                      alt={lider.riotId}
                      className="w-10 h-10 rounded-xl border"
                      style={{ borderColor: `${time.gradientFrom}60` }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                      <Crown className="w-5 h-5" style={{ color: time.gradientFrom }} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-black text-sm truncate">{lider.riotId.split('#')[0]}</p>
                    <p className="text-xs font-bold" style={{ color: time.gradientFrom }}>Capitão</p>
                  </div>
                  <Crown className="w-4 h-4 ml-auto shrink-0" style={{ color: time.gradientFrom }} />
                </div>
              </motion.div>
            )}

            {/* Histórico */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl border border-white/10 p-5"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-white/20" />
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Histórico</p>
              </div>
              <div className="text-center py-4">
                <p className="text-white/20 text-sm">Em breve</p>
                <span className="text-xs text-white/10 bg-white/5 px-2 py-0.5 rounded-full mt-2 inline-block">Campeonatos</span>
              </div>
            </motion.div>

            {/* Solicitar entrada (visitante) */}
            {userRole === 'visitor' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  onClick={() => playSound('click')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: `${time.gradientFrom}18`,
                    border: `1px solid ${time.gradientFrom}50`,
                    color: time.gradientFrom,
                  }}
                >
                  <Send className="w-4 h-4" /> Solicitar Entrada
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Player Detail Modal */}
      <AnimatePresence>
        {selectedJogador && (
          <PlayerDetailModal
            jogador={selectedJogador.jogador}
            puuid={selectedJogador.puuid}
            onClose={() => setSelectedJogador(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
