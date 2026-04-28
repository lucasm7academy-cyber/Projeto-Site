// src/pages/equipes.tsx
// ✅ VERSÃO OTIMIZADA - SEM N+1 QUERIES

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Crown, TrendingUp, Trophy, ChevronRight, X,
  Flame, Plus, Search, Check, Upload, RefreshCw,
} from 'lucide-react';
import { useSound } from '../hooks/useSound';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePerfilSafe } from '../contexts/PerfilContext';

// ── Tipos ─────────────────────────────────────────────────────────────────
type Role = 'TOP' | 'JG' | 'MID' | 'ADC' | 'SUP' | 'RES';
type UserRole = 'leader' | 'member' | 'visitor';

interface Player {
  name: string;
  role: Role;
  elo: string;
  balance?: number;
  isLeader?: boolean;
  userId?: string;
}

interface Team {
  id: string | number;
  name: string;
  tag: string;
  logoUrl?: string;
  gradientFrom: string;
  gradientTo: string;
  players: Player[];  // ⚠️ SÓ CARREGADO QUANDO CLICA
  pdl: number;
  winrate: number;
  ranking: number;
  wins: number;
  gamesPlayed: number;
  userRole: UserRole;
  donoId?: string;
  hasPlayersLoaded?: boolean; // ✅ Flag para saber se já carregou membros
}

// ── Configuração visual ───────────────────────────────────────────────────
const ROLE_CONFIG: Record<Role, { label: string; img: string; color: string; bg: string }> = {
  TOP: { label: 'TOP', img: '/lanes_brancas/Top_iconB.png', color: 'text-red-400', bg: 'bg-red-400/10' },
  JG:  { label: 'JG',  img: '/lanes_brancas/Jungle_iconB.png', color: 'text-green-400', bg: 'bg-green-400/10' },
  MID: { label: 'MID', img: '/lanes_brancas/Middle_iconB.png', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  ADC: { label: 'ADC', img: '/lanes_brancas/Bottom_iconB.png', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  SUP: { label: 'SUP', img: '/lanes_brancas/Support_iconB.png', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  RES: { label: 'RES', img: '/lanes_brancas/icon-position-fillB.png', color: 'text-gray-400', bg: 'bg-gray-400/10' },
};

const COLOR_THEMES = [
  { from: '#FFB700', to: '#FF6600', label: 'M7 Gold' },
  { from: '#0044FF', to: '#00D4FF', label: 'Neon Blue' },
  { from: '#FF3300', to: '#FF9900', label: 'Fire' },
  { from: '#00FF88', to: '#00C3FF', label: 'Toxic' },
  { from: '#7B00FF', to: '#00AAFF', label: 'Storm' },
  { from: '#FF006E', to: '#FF9966', label: 'Rose' },
  { from: '#00FF41', to: '#008F11', label: 'Matrix' },
  { from: '#F953C6', to: '#B91D73', label: 'Candy' },
  { from: '#1CB5E0', to: '#000851', label: 'Ocean' },
  { from: '#FF416C', to: '#FF4B2B', label: 'Infrared' },
  { from: '#11998e', to: '#38ef7d', label: 'Mint' },
];

const ROLE_ORDER: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES'];
const TEAMS_PAGE = 20;

const ELO_COLORS: Record<string, string> = {
  Ferro: 'text-gray-500', Bronze: 'text-amber-600', Prata: 'text-gray-300',
  Ouro: 'text-yellow-400', Platina: 'text-cyan-400', Esmeralda: 'text-emerald-400',
  Diamante: 'text-blue-400', Mestre: 'text-amber-500',
  'Grão-Mestre': 'text-red-400', Desafiante: 'text-yellow-300',
};

const getEloColor = (elo: string): string => ELO_COLORS[elo.split(' ')[0]] ?? 'text-white/60';
const formatBRL = (v: number): string => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ✅ Função para carregar SOMENTE os dados básicos do time (SEM membros)
async function carregarTimesBasico(
  currentUserId: string | null,
  offset = 0,
  limit = TEAMS_PAGE,
): Promise<{ teams: Team[]; temMais: boolean }> {
  const { data: timesRaw, error } = await supabase
    .from('times')
    .select('id, nome, tag, logo_url, gradient_from, gradient_to, pdl, winrate, ranking, wins, games_played, dono_id')
    .order('ranking', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error || !timesRaw) return { teams: [], temMais: false };

  const teamsComMembros: Team[] = timesRaw.map((t: any) => {
    let userRole: UserRole = 'visitor';
    if (currentUserId) {
      if (t.dono_id === currentUserId) userRole = 'leader';
      // ⚠️ Não sabemos se é member sem os membros! Será verificado depois
    }

    return {
      id: t.id,
      name: t.nome,
      tag: t.tag,
      logoUrl: t.logo_url ?? undefined,
      gradientFrom: t.gradient_from || '#FFB700',
      gradientTo: t.gradient_to || '#FF6600',
      players: [], // ✅ Vazio! Carrega só quando clica
      hasPlayersLoaded: false,
      pdl: t.pdl || 0,
      winrate: t.winrate || 0,
      ranking: t.ranking || 999,
      wins: t.wins || 0,
      gamesPlayed: t.games_played || 0,
      userRole,
      donoId: t.dono_id,
    };
  });

  return {
    teams: teamsComMembros,
    temMais: timesRaw.length === limit,
  };
}

// ✅ Função para carregar membros de UM time específico (lazy)
async function carregarMembrosDoTime(timeId: string | number): Promise<Player[]> {
  const { data: membros, error } = await supabase
    .from('time_membros')
    .select('riot_id, role, elo, is_leader, user_id')
    .eq('time_id', timeId)
    .order('is_leader', { ascending: false });

  if (error || !membros) return [];

  return membros.map((m: any) => ({
    name: m.riot_id || 'Jogador',
    role: (m.role || 'RES') as Role,
    elo: m.elo || 'Sem Elo',
    isLeader: m.is_leader || false,
    userId: m.user_id,
  }));
}

// ✅ Função para carregar MEU time (com membros, pois é o time do usuário)
async function carregarMeuTime(userId: string): Promise<Team | null> {
  const { data: membro } = await supabase
    .from('time_membros')
    .select('time_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!membro?.time_id) return null;

  const { data: timeData } = await supabase
    .from('times')
    .select('id, nome, tag, logo_url, gradient_from, gradient_to, pdl, winrate, ranking, wins, games_played, dono_id')
    .eq('id', membro.time_id)
    .maybeSingle();

  if (!timeData) return null;

  const membros = await carregarMembrosDoTime(timeData.id);
  const userRole: UserRole = timeData.dono_id === userId ? 'leader' : 'member';

  return {
    id: timeData.id,
    name: timeData.nome,
    tag: timeData.tag,
    logoUrl: timeData.logo_url ?? undefined,
    gradientFrom: timeData.gradient_from || '#FFB700',
    gradientTo: timeData.gradient_to || '#FF6600',
    players: membros,
    hasPlayersLoaded: true,
    pdl: timeData.pdl || 0,
    winrate: timeData.winrate || 0,
    ranking: timeData.ranking || 999,
    wins: timeData.wins || 0,
    gamesPlayed: timeData.games_played || 0,
    userRole,
    donoId: timeData.dono_id,
  };
}

// ── Componente TimeCard (adaptado para lazy-load) ─────────────────────────
const TimeCard = ({ team, onClick, isLarge = false, appliedSlots = [], flat = false, onLoadPlayers }: any) => {
  const { playSound } = useSound();
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // ✅ Carrega membros quando expande
  const handleExpand = async () => {
    if (team.hasPlayersLoaded) {
      setExpanded(!expanded);
      return;
    }
    
    setLoadingPlayers(true);
    try {
      const membros = await carregarMembrosDoTime(team.id);
      team.players = membros;
      team.hasPlayersLoaded = true;
      setExpanded(true);
      if (onLoadPlayers) onLoadPlayers(team.id, membros);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const content = (
    <div className="relative z-10 p-5">
      {/* Header */}
      <div className="flex flex-col gap-1.5 mb-4">
        <div className="flex items-start gap-2 min-w-0">
          {team.userRole !== 'visitor' && (
            <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="mt-1 shrink-0">
              <Crown className="w-4 h-4" style={{ color: team.gradientFrom }} />
            </motion.div>
          )}
          <h3 className="text-white font-black text-2xl tracking-tight leading-tight overflow-hidden">
            {team.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md tracking-widest"
            style={{ color: team.gradientFrom, background: `${team.gradientFrom}18`, border: `1px solid ${team.gradientFrom}40` }}>
            #{team.tag}
          </span>
          <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-md tracking-widest"
            style={{ color: team.gradientFrom, background: `${team.gradientFrom}10`, border: `1px solid ${team.gradientFrom}30` }}>
            RANK #{team.ranking}
          </span>
        </div>
      </div>

      {/* Logo centralizada */}
      <div className="flex items-center justify-center py-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className="w-36 h-36 rounded-2xl flex items-center justify-center relative overflow-hidden cursor-pointer"
          style={{ border: `2px solid ${team.gradientFrom}`, background: 'black', boxShadow: `0 10px 28px -8px ${team.gradientFrom}70` }}
          onClick={handleExpand}
        >
          {team.logoUrl ? <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : <span className="font-black text-3xl tracking-widest" style={{ color: team.gradientFrom }}>{team.tag}</span>}
        </motion.div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 w-full mt-2">
        {[
          { icon: <Flame className="w-3 h-3" style={{ color: team.gradientFrom }} />, label: 'PDL', value: team.pdl.toLocaleString('pt-BR'), color: team.gradientFrom },
          { icon: <TrendingUp className="w-3 h-3 text-green-400" />, label: 'WIN%', value: `${team.winrate}%`, color: '#4ade80' },
          { icon: <Trophy className="w-3 h-3 text-white/30" />, label: 'W/L', value: `${team.wins}/${team.gamesPlayed - team.wins}`, color: 'white' },
        ].map(m => (
          <div key={m.label} className="bg-[rgba(13,13,13,1)] rounded-xl p-2.5 text-center border border-white/[0.04] flex flex-col justify-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {m.icon}
              <span className="text-[9px] text-white/35 uppercase tracking-wider">{m.label}</span>
            </div>
            <span className="font-black text-sm" style={{ color: m.color }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* ✅ Membros (expansível) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-2">MEMBROS</p>
            {loadingPlayers ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : team.players.length === 0 ? (
              <p className="text-white/20 text-xs text-center py-2">Nenhum membro</p>
            ) : (
              <div className="space-y-1">
                {team.players.map((player: Player, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1 px-2 bg-white/5 rounded-lg">
                    <span className="text-white/80 text-sm">{player.name}</span>
                    <span className={`text-xs ${getEloColor(player.elo)}`}>{player.elo}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1.5 mt-4 group/card">
        <span className="font-bold text-sm" style={{ color: team.gradientFrom }}>Ver página do time</span>
        <ChevronRight className="w-4 h-4 transition-transform group-hover/card:translate-x-1" style={{ color: team.gradientFrom }} />
      </div>
    </div>
  );

  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={() => { playSound('click'); onClick(team); }}
      className="rounded-3xl cursor-pointer overflow-hidden group transition-all duration-500 border-[5px] border-transparent"
      style={{ background: `linear-gradient(rgba(13, 13, 13, 1), rgba(13, 13, 13, 1)) padding-box, linear-gradient(135deg, ${team.gradientFrom}, ${team.gradientTo || team.gradientFrom}) border-box` }}>
      <div className="rounded-[19px] overflow-hidden relative">{content}</div>
    </motion.div>
  );
};

// ── Modal Criar Time (simplificado) ───────────────────────────────────────
const CreateTeamModal = ({ onClose, onCreate, hasRiot }: any) => {
  const { playSound } = useSound();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [theme, setTheme] = useState({ from: COLOR_THEMES[0].from, to: COLOR_THEMES[0].to });
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState('');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    if (!file.type.includes('image')) { setLogoError('Apenas imagens PNG ou JPEG'); return; }
    playSound('click');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCreate = (): void => {
    if (!name || tag.length < 3 || !hasRiot) return;
    playSound('success');
    onCreate({ name, tag: tag.toUpperCase().slice(0, 3), gradientFrom: theme.from, gradientTo: theme.to, logoUrl: logoPreview || undefined, _logoFile: logoFile });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="rounded-2xl overflow-hidden relative" style={{ border: '3px solid transparent', backgroundImage: `linear-gradient(rgba(13, 13, 13, 1), rgba(13, 13, 13, 1)) padding-box, linear-gradient(135deg, ${theme.from}, ${theme.to}) border-box` }}>
          <div className="relative z-10">
            <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${theme.from}25` }}>
                  <Plus className="w-4 h-4" style={{ color: theme.from }} />
                </div>
                <h2 className="text-white font-black text-lg">Criar Equipe</h2>
              </div>
              <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div><label className="text-white/40 text-xs uppercase tracking-widest">Nome do Time</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: M7 Esports" maxLength={24}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30" />
              </div>
              <div><label className="text-white/40 text-xs uppercase tracking-widest">Tag (3 letras)</label>
                <input value={tag} onChange={e => setTag(e.target.value.toUpperCase().slice(0, 3))} placeholder="Ex: M7E" maxLength={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold tracking-widest focus:outline-none focus:border-white/30" />
              </div>
              <div><label className="text-white/40 text-xs uppercase tracking-widest">Logo do Time</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0" style={{ border: `2px solid ${theme.from}` }}>
                    {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-white/30" />}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} />
                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all cursor-pointer" style={{ borderColor: `${theme.from}50`, background: `${theme.from}10`, color: theme.from }}>
                      <Upload className="w-4 h-4" /><span className="text-sm font-medium">Enviar Logo</span>
                    </div>
                  </label>
                </div>
                {logoError && <p className="text-red-400 text-[11px] mt-1">{logoError}</p>}
              </div>
              <div><label className="text-white/40 text-xs uppercase tracking-widest">Tema de Cor</label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_THEMES.map(t => (
                    <button key={t.label} onClick={() => setTheme({ from: t.from, to: t.to })}
                      className="relative h-10 rounded-xl overflow-hidden border-2 transition-all"
                      style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})`, borderColor: theme.from === t.from ? 'white' : 'transparent' }}>
                      {theme.from === t.from && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Check className="w-4 h-4 text-white" /></div>}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleCreate} disabled={!name || tag.length < 3 || !hasRiot}
                className="w-full py-4 rounded-xl font-black text-white uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`, boxShadow: `0 10px 20px -5px ${theme.from}50` }}>
                Criar Equipe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────
export default function Equipes() {
  const { playSound } = useSound();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { perfil: perfilContext } = usePerfilSafe();
  
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [arenaTeams, setArenaTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalCriar, setModalCriar] = useState(false);
  
  const arenaOffsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);
  const temMaisRef = useRef(true);
  const userIdRef = useRef<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [appliedSearch, setAppliedSearch] = useState<string>('');

  const hasRiot = !!perfilContext?.contaVinculada;

  // Carregar dados iniciais
  useEffect(() => {
    let isMounted = true;
    const uid = user?.id ?? null;
    userIdRef.current = uid;

    const loadInitialData = async (): Promise<void> => {
      setLoading(true);
      try {
        const [meuTime, { teams: pagina1, temMais: mais }] = await Promise.all([
          uid ? carregarMeuTime(uid) : Promise.resolve(null),
          carregarTimesBasico(uid, 0, TEAMS_PAGE),
        ]);
        if (!isMounted) return;
        setMyTeam(meuTime);
        setArenaTeams(pagina1);
        temMaisRef.current = mais;
        arenaOffsetRef.current = pagina1.length;
      } catch (error) {
        console.error('[Equipes] Erro:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialData();

    return () => { isMounted = false; };
  }, [user]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting) return;
      if (!temMaisRef.current || fetchingRef.current) return;
      fetchingRef.current = true;
      setCarregandoMais(true);
      try {
        const { teams: mais, temMais: ainda } = await carregarTimesBasico(userIdRef.current, arenaOffsetRef.current, TEAMS_PAGE);
        setArenaTeams(prev => [...prev, ...mais]);
        temMaisRef.current = ainda;
        arenaOffsetRef.current += mais.length;
      } finally {
        fetchingRef.current = false;
        setCarregandoMais(false);
      }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setAppliedSearch(searchQuery);
    }, 200);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const filteredTeams = useMemo(() => {
    if (!appliedSearch) return arenaTeams;
    return arenaTeams.filter(team =>
      team.name.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      team.tag.toLowerCase().includes(appliedSearch.toLowerCase())
    );
  }, [arenaTeams, appliedSearch]);

  const handleCreateTeam = async (newTeamData: any) => {
    if (!user) return;
    
    const { data: novoTime, error } = await supabase.from('times').insert({
      nome: newTeamData.name,
      tag: newTeamData.tag,
      logo_url: newTeamData.logoUrl ?? null,
      gradient_from: newTeamData.gradientFrom,
      gradient_to: newTeamData.gradientTo,
      pdl: 0,
      winrate: 0,
      ranking: arenaTeams.length + 1,
      wins: 0,
      games_played: 0,
      dono_id: user.id,
    }).select().single();

    if (error || !novoTime) { playSound('click'); return; }

    if (newTeamData._logoFile) {
      const ext = newTeamData._logoFile.type === 'image/png' ? 'png' : 'jpg';
      const path = `${novoTime.id}-${Date.now()}.${ext}`;
      await supabase.storage.from('team-logos').upload(path, newTeamData._logoFile, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('team-logos').getPublicUrl(path);
      await supabase.from('times').update({ logo_url: publicUrl }).eq('id', novoTime.id);
    }

    await supabase.from('time_membros').insert({
      time_id: novoTime.id,
      user_id: user.id,
      riot_id: perfilContext?.riotId || user.email?.split('@')[0] || 'Jogador',
      cargo: 'lider',
      role: 'TOP',
      is_leader: true,
      elo: '',
      balance: 0,
    });

    const [meuTime, { teams: pagina1, temMais: mais }] = await Promise.all([
      carregarMeuTime(user.id),
      carregarTimesBasico(user.id, 0, TEAMS_PAGE),
    ]);
    setMyTeam(meuTime);
    setArenaTeams(pagina1);
    temMaisRef.current = mais;
    arenaOffsetRef.current = pagina1.length;
    playSound('success');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Banner Minha Equipe */}
        <div className="space-y-0 rounded-3xl overflow-hidden backdrop-blur-xl transition-all duration-500"
          style={{ background: 'rgba(0, 0, 0, 0.4)', border: myTeam ? `2px solid ${myTeam.gradientFrom}` : '1px solid rgba(255,255,255,0.1)' }}>
          <div className="relative overflow-hidden p-6 group transition-all duration-500">
            <div className="absolute inset-0 z-0">
              <img src="/images/fundo fanaticaaa.png" alt="Fundo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/10 to-white/0" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-white/60" /><span className="text-xs font-bold uppercase text-white/60">Minha Equipe</span></div>
                <h1 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase italic">Minha <span className="text-primary">Equipe</span></h1>
                <p className="text-white/50 text-sm max-w-lg">Gerencie sua equipe e lidere seus companheiros rumo à vitória.</p>
              </div>
              {!myTeam && hasRiot && (
                <button onClick={() => setModalCriar(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all bg-white/10 border-white/10 text-white hover:bg-white/20">
                  <Plus className="w-4 h-4" /> Criar Equipe
                </button>
              )}
            </div>
          </div>
          <div className="p-6 backdrop-blur-md">
            {myTeam ? (
              <TimeCard team={myTeam} onClick={(t: Team) => navigate(`/times/${t.id}`)} isLarge={true} flat={true} appliedSlots={[]} />
            ) : (
              <div className="bg-white/[0.03] border border-dashed border-white/10 rounded-2xl p-12 text-center">
                <Users className="w-14 h-14 text-white/10 mx-auto mb-4" />
                <p className="text-white/35 font-semibold mb-1">Você não está em nenhuma equipe</p>
                <p className="text-white/20 text-sm mb-5">Crie sua equipe ou solicite entrada em um time abaixo.</p>
                {hasRiot && (
                  <button onClick={() => setModalCriar(true)} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border font-bold text-sm bg-white/5 border-white/10 text-white/50 hover:bg-white/10">
                    <Plus className="w-4 h-4" /> Criar Equipe
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Arena de Times */}
        <div className="space-y-0 rounded-3xl overflow-hidden backdrop-blur-xl transition-all duration-500" style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="relative overflow-hidden p-6 group transition-all duration-500">
            <div className="absolute inset-0 z-0"><img src="/images/fundoSKTRYZEAZUL.png" alt="Arena" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/10 to-white/0" /></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2"><Trophy className="w-5 h-5 text-white/60" /><span className="text-xs font-bold uppercase text-white/60">Arena de Times</span></div>
                <h1 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase italic">Arena de <span className="text-primary">Times</span></h1>
                <p className="text-white/50 text-sm max-w-lg">Analise os rivais e descubra quais equipes dominarão a plataforma.</p>
              </div>
              <span className="text-white/40 font-bold text-[10px] uppercase"><span className="text-white font-black">{filteredTeams.length}</span> Equipes</span>
            </div>
          </div>
          <div className="p-6 backdrop-blur-md space-y-6">
            <div className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-xl flex items-center px-4 py-2.5 gap-3 focus-within:border-white/30">
              <Search className="w-4 h-4 text-white/30" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar times..." className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/20" />
            </div>
            {filteredTeams.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredTeams.map(team => <TimeCard key={team.id} team={team} onClick={(t: Team) => navigate(`/times/${t.id}`)} isLarge={false} appliedSlots={[]} />)}
                </div>
                <div ref={sentinelRef} className="flex justify-center py-6">
                  {carregandoMais && <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                </div>
              </>
            ) : (
              <div className="bg-white/[0.02] border border-dashed border-white/5 rounded-2xl p-16 text-center">
                <Search className="w-14 h-14 text-white/5 mx-auto mb-4" />
                <p className="text-white/30 font-medium text-lg">Nenhum time encontrado para "{searchQuery}"</p>
                <button onClick={() => setSearchQuery('')} className="mt-4 text-xs font-bold uppercase tracking-widest text-primary hover:underline">Limpar busca</button>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>{modalCriar && <CreateTeamModal onClose={() => setModalCriar(false)} onCreate={handleCreateTeam} hasRiot={hasRiot} />}</AnimatePresence>
      </div>
    </div>
  );
}