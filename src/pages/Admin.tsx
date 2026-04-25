// src/pages/Admin.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Trophy, Coins, Search, Check, X, AlertTriangle,
  RefreshCw, Ban, Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePerfil } from '../contexts/PerfilContext';
import { atualizarPontosPartida } from '../api/player';
import {
  type CargoAdmin,
  CARGO_LABELS, CARGO_COLORS,
  PERMISSOES_POR_CARGO, temPermissao,
} from '../config/adminPermissoes';

// ── TIPOS ──────────────────────────────────────────
interface PartidaDisputa {
  id: number; salaId: number; vencedor: string; vencedorNome?: string;
  jogadores: Array<{ id: string; nome: string; isTimeA: boolean }>;
  createdAt: string; modo: string;
}
interface SalaAberta {
  id: number; nome: string; estado: string; criadorNome: string;
  modo: string; numJogadores: number; maxJogadores: number;
}
interface PartidaTravada {
  id: number; nome: string; estado: string; modo: string; criadorNome: string;
  timeANome?: string; timeBNome?: string;
  jogadores: Array<{ id: string; nome: string; isTimeA: boolean; role: string }>;
}
interface Jogador {
  userId: string; riotId: string; nome: string; iconId?: number; saldo: number;
}
type Aba = 'salas' | 'disputas' | 'partidas_travadas' | 'saldos';

// ── HELPERS ────────────────────────────────────────
function BadgeCargo({ cargo }: { cargo: CargoAdmin }) {
  const c = CARGO_COLORS[cargo];
  return <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${c.text} ${c.bg} ${c.border}`}>{CARGO_LABELS[cargo]}</span>;
}
function CardStyle() {
  return { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)' };
}

// ── ABA: DISPUTAS ──────────────────────────────────
function AbaDisputas({ adminCargo, userId }: { adminCargo: CargoAdmin; userId: string }) {
  const [partidas, setPartidas] = useState<PartidaDisputa[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvendo, setResolvendo] = useState<number | null>(null);
  const [popup, setPopup] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const podeResolver = temPermissao(adminCargo, 'resolverPartidas');
  const podeCancelar = temPermissao(adminCargo, 'cancelarPartidas');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('resultados_partidas')
      .select('id, sala_id, vencedor, vencedor_nome, jogadores, created_at')
      .eq('vencedor', 'disputa')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setPartidas(data.map((r: any) => ({ ...r, salaId: r.sala_id, vencedorNome: r.vencedor_nome, createdAt: r.created_at, modo: '5v5' })));
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const resolver = async (id: number, decisao: 'time_a' | 'time_b' | 'cancelado') => {
    setResolvendo(id);
    const p = partidas.find(x => x.id === id)!;
    const vencedorNome = decisao === 'cancelado' ? 'Cancelado' : p.vencedorNome ?? decisao;
    const { error } = await supabase.from('resultados_partidas').update({
      vencedor: decisao, vencedor_nome: vencedorNome,
      resolvido_por: userId, resolvido_em: new Date().toISOString(),
    }).eq('id', id);

    if (!error && decisao !== 'cancelado' && p.vencedor === 'disputa') {
      await atualizarPontosPartida({
        salaId: p.salaId, modo: p.modo, vencedor: decisao,
        jogadores: p.jogadores.map(j => ({ userId: j.id, isTimeA: j.isTimeA, nome: j.nome })),
      }).catch(() => {});
    }
    setResolvendo(null);
    setPopup(error ? { tipo: 'erro', msg: 'Erro ao resolver.' } : { tipo: 'sucesso', msg: decisao === 'cancelado' ? 'Cancelada.' : 'Resultado registrado!' });
    carregar();
    setTimeout(() => setPopup(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-black text-white uppercase">Disputas</h2><p className="text-white/30 text-xs mt-1">Votos divididos.</p></div>
        <button onClick={carregar} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"><RefreshCw className={`w-4 h-4 text-white/40 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      <AnimatePresence>
        {popup && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold ${popup.tipo === 'sucesso' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{popup.tipo === 'sucesso' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}{popup.msg}</motion.div>}
      </AnimatePresence>
      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>
      : partidas.length === 0 ? <div className="flex flex-col items-center justify-center py-20 rounded-3xl" style={CardStyle()}><Trophy className="w-10 h-10 text-white/10 mb-4" /><p className="text-white/20 font-black uppercase tracking-widest text-sm">Nenhuma disputa</p></div>
      : <div className="space-y-4">{partidas.map(p => (
        <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6" style={CardStyle()}>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div><span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-orange-400 text-[10px] font-black uppercase">Disputa</span><span className="text-white/20 text-xs ml-2">#{p.salaId}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4"><p className="text-blue-400 text-[10px] font-black uppercase mb-2">Azul</p>{p.jogadores.filter(j => j.isTimeA).map(j => <p key={j.id} className="text-white/60 text-sm font-bold truncate">{j.nome}</p>)}</div>
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4"><p className="text-red-400 text-[10px] font-black uppercase mb-2">Vermelho</p>{p.jogadores.filter(j => !j.isTimeA).map(j => <p key={j.id} className="text-white/60 text-sm font-bold truncate">{j.nome}</p>)}</div>
          </div>
          <div className="flex gap-3">
            <button disabled={!podeResolver || resolvendo === p.id} onClick={() => resolver(p.id, 'time_a')} className="flex-1 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-black text-sm uppercase disabled:opacity-30">{resolvendo === p.id ? '...' : 'Azul Venceu'}</button>
            <button disabled={!podeResolver || resolvendo === p.id} onClick={() => resolver(p.id, 'time_b')} className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-sm uppercase disabled:opacity-30">{resolvendo === p.id ? '...' : 'Vermelho Venceu'}</button>
            <button disabled={!podeCancelar || resolvendo === p.id} onClick={() => resolver(p.id, 'cancelado')} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 font-black text-sm uppercase disabled:opacity-30"><Ban className="w-4 h-4" /></button>
          </div>
        </motion.div>
      ))}</div>}
    </div>
  );
}

// ── ABA: SALAS ─────────────────────────────────────
function AbaSalas({ adminCargo }: { adminCargo: CargoAdmin }) {
  const [salas, setSalas] = useState<SalaAberta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletando, setDeletando] = useState<number | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ salaId: number; tipo: 'deletar' | 'resolver'; vencedor?: 'time_a' | 'time_b' | 'cancelada' } | null>(null);
  const [popup, setPopup] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const podeDeleta = temPermissao(adminCargo, 'resolverPartidas');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: salasData } = await supabase.from('salas').select('id, nome, estado, criador_nome, modo, max_jogadores').not('estado', 'eq', 'encerrada').order('created_at', { ascending: false }).limit(100);
    if (salasData) {
      const ids = salasData.map(s => s.id);
      const { data: contagens } = await supabase.from('sala_jogadores').select('sala_id').in('sala_id', ids);
      const map: Record<number, number> = {};
      contagens?.forEach(c => { map[c.sala_id] = (map[c.sala_id] || 0) + 1; });
      setSalas(salasData.map(s => ({ ...s, criadorNome: s.criador_nome, maxJogadores: s.max_jogadores, numJogadores: map[s.id] || 0 })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const executarAcao = async () => {
    if (!confirmacao) return;
    setDeletando(confirmacao.salaId);
    try {
      if (confirmacao.tipo === 'deletar') {
        await supabase.from('salas').delete().eq('id', confirmacao.salaId);
        setPopup({ tipo: 'sucesso', msg: 'Sala deletada!' });
      } else {
        if (confirmacao.vencedor !== 'cancelada') {
          const { data: jogadores } = await supabase.from('sala_jogadores').select('user_id, nome, is_time_a').eq('sala_id', confirmacao.salaId);
          const { data: salaData } = await supabase.from('salas').select('modo').eq('id', confirmacao.salaId).single();
          if (jogadores && salaData) {
            await atualizarPontosPartida({
              salaId: confirmacao.salaId, modo: salaData.modo, vencedor: confirmacao.vencedor || 'time_a',
              jogadores: jogadores.map(j => ({ userId: j.user_id, isTimeA: j.is_time_a, nome: j.nome })),
            }).catch(() => {});
          }
        }
        await supabase.from('salas').update({ estado: 'encerrada', vencedor: confirmacao.vencedor === 'cancelada' ? null : (confirmacao.vencedor === 'time_a' ? 'A' : 'B'), updated_at: new Date().toISOString() }).eq('id', confirmacao.salaId);
        await supabase.from('sala_jogadores').delete().eq('sala_id', confirmacao.salaId);
        setPopup({ tipo: 'sucesso', msg: 'Sala finalizada!' });
      }
      carregar();
    } catch { setPopup({ tipo: 'erro', msg: 'Erro ao executar ação.' }); }
    setDeletando(null); setConfirmacao(null); setTimeout(() => setPopup(null), 3000);
  };

  const estadoColor = (e: string) => ({ 'aberta': 'bg-green-500/10 border-green-500/20 text-green-400', 'preenchendo': 'bg-blue-500/10 border-blue-500/20 text-blue-400', 'confirmacao': 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400', 'travada': 'bg-purple-500/10 border-purple-500/20 text-purple-400', 'aguardando_inicio': 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', 'em_partida': 'bg-orange-500/10 border-orange-500/20 text-orange-400', 'finalizacao': 'bg-red-500/10 border-red-500/20 text-red-400' }[e] || 'bg-white/5 border-white/10 text-white/40');
  const estadoLabel = (e: string) => ({ 'aberta': 'Aberta', 'preenchendo': 'Preenchendo', 'confirmacao': 'Confirmação', 'travada': 'Travada', 'aguardando_inicio': 'Aguardando', 'em_partida': 'Em Partida', 'finalizacao': 'Finalização' }[e] || e);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-black text-white uppercase">Salas Abertas</h2><p className="text-white/30 text-xs mt-1">Gerencie salas.</p></div><button onClick={carregar} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"><RefreshCw className={`w-4 h-4 text-white/40 ${loading ? 'animate-spin' : ''}`} /></button></div>
      <AnimatePresence>{popup && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold ${popup.tipo === 'sucesso' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{popup.tipo === 'sucesso' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}{popup.msg}</motion.div>}</AnimatePresence>
      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>
      : salas.length === 0 ? <div className="flex flex-col items-center justify-center py-20 rounded-3xl" style={CardStyle()}><Trophy className="w-10 h-10 text-white/10 mb-4" /><p className="text-white/20 font-black uppercase tracking-widest text-sm">Nenhuma sala</p></div>
      : <div className="space-y-3">{salas.map(s => (
        <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-4 flex items-center justify-between gap-4" style={CardStyle()}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1"><span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${estadoColor(s.estado)}`}>{estadoLabel(s.estado)}</span><span className="text-white/20 text-xs font-bold">#{s.id}</span></div>
            <p className="text-white font-black text-sm truncate">{s.nome}</p>
            <p className="text-white/40 text-xs mt-0.5">{s.criadorNome} • {s.modo} • {s.numJogadores}/{s.maxJogadores} jogadores</p>
          </div>
          {podeDeleta && <div className="flex gap-2">
            <button onClick={() => setConfirmacao({ salaId: s.id, tipo: 'resolver' })} className="px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-black text-sm uppercase">{deletando === s.id ? '...' : 'Finalizar'}</button>
            <button onClick={() => setConfirmacao({ salaId: s.id, tipo: 'deletar' })} className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-sm uppercase">{deletando === s.id ? '...' : 'Deletar'}</button>
          </div>}
        </motion.div>
      ))}</div>}
    </div>
  );
}

// ── ABA: TRAVADAS ──────────────────────────────────
function AbaPartidasTravadas({ adminCargo }: { adminCargo: CargoAdmin }) {
  const [partidas, setPartidas] = useState<PartidaTravada[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvendo, setResolvendo] = useState<number | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ salaId: number; vencedor: 'time_a' | 'time_b' | 'cancelada' } | null>(null);
  const [popup, setPopup] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const podeResolver = temPermissao(adminCargo, 'resolverPartidas');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('salas').select('id, nome, estado, modo, criador_nome, time_a_nome, time_b_nome').not('estado', 'eq', 'encerrada').order('updated_at', { ascending: false }).limit(50);
    if (data) {
      const ids = data.map(s => s.id);
      const { data: jogadores } = await supabase.from('sala_jogadores').select('user_id, nome, is_time_a, role, sala_id').in('sala_id', ids);
      const map: Record<number, any[]> = {};
      jogadores?.forEach(j => { if (!map[j.sala_id]) map[j.sala_id] = []; map[j.sala_id].push({ id: j.user_id, nome: j.nome, isTimeA: j.is_time_a, role: j.role }); });
      setPartidas(data.map(s => ({ ...s, criadorNome: s.criador_nome, timeANome: s.time_a_nome, timeBNome: s.time_b_nome, jogadores: map[s.id] || [] })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const resolver = async (vencedor: 'time_a' | 'time_b' | 'cancelada') => {
    if (!confirmacao) return;
    setResolvendo(confirmacao.salaId);
    const p = partidas.find(x => x.id === confirmacao.salaId)!;
    try {
      if (vencedor !== 'cancelada') {
        await atualizarPontosPartida({ salaId: confirmacao.salaId, modo: p.modo, vencedor, jogadores: p.jogadores.map(j => ({ userId: j.id, isTimeA: j.isTimeA, nome: j.nome })) }).catch(() => {});
      }
      await supabase.from('salas').update({ estado: 'encerrada', vencedor: vencedor === 'cancelada' ? null : (vencedor === 'time_a' ? 'A' : 'B'), updated_at: new Date().toISOString() }).eq('id', confirmacao.salaId);
      await supabase.from('sala_jogadores').delete().eq('sala_id', confirmacao.salaId);
      setPopup({ tipo: 'sucesso', msg: vencedor === 'cancelada' ? 'Cancelada!' : `${vencedor === 'time_a' ? 'Time A' : 'Time B'} venceu!` });
      carregar();
    } catch { setPopup({ tipo: 'erro', msg: 'Erro ao resolver.' }); }
    setResolvendo(null); setConfirmacao(null); setTimeout(() => setPopup(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-black text-white uppercase">Partidas Travadas</h2><p className="text-white/30 text-xs mt-1">Resolva partidas presas.</p></div><button onClick={carregar} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"><RefreshCw className={`w-4 h-4 text-white/40 ${loading ? 'animate-spin' : ''}`} /></button></div>
      <AnimatePresence>{popup && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold ${popup.tipo === 'sucesso' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{popup.tipo === 'sucesso' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}{popup.msg}</motion.div>}</AnimatePresence>
      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>
      : partidas.length === 0 ? <div className="flex flex-col items-center justify-center py-20 rounded-3xl" style={CardStyle()}><Trophy className="w-10 h-10 text-white/10 mb-4" /><p className="text-white/20 font-black uppercase tracking-widest text-sm">Nenhuma travada</p></div>
      : <div className="space-y-4">{partidas.map(p => (
        <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6" style={CardStyle()}>
          <div className="flex items-start justify-between gap-4 mb-5"><div><span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400 text-[10px] font-black uppercase">{p.estado}</span><span className="text-white/20 text-xs ml-2">#{p.id}</span><p className="text-white/30 text-xs mt-1">{p.nome}</p></div></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4"><p className="text-blue-400 text-[10px] font-black uppercase mb-2">{p.timeANome || 'Azul'}</p>{p.jogadores.filter(j => j.isTimeA).map(j => <p key={j.id} className="text-white/60 text-sm font-bold truncate">{j.nome}</p>)}</div>
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4"><p className="text-red-400 text-[10px] font-black uppercase mb-2">{p.timeBNome || 'Vermelho'}</p>{p.jogadores.filter(j => !j.isTimeA).map(j => <p key={j.id} className="text-white/60 text-sm font-bold truncate">{j.nome}</p>)}</div>
          </div>
          {podeResolver && <div className="flex gap-3">
            <button disabled={resolvendo === p.id} onClick={() => setConfirmacao({ salaId: p.id, vencedor: 'time_a' })} className="flex-1 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-black text-sm uppercase disabled:opacity-30">{resolvendo === p.id ? '...' : `${p.timeANome || 'Azul'} Venceu`}</button>
            <button disabled={resolvendo === p.id} onClick={() => setConfirmacao({ salaId: p.id, vencedor: 'time_b' })} className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-sm uppercase disabled:opacity-30">{resolvendo === p.id ? '...' : `${p.timeBNome || 'Vermelho'} Venceu`}</button>
            <button disabled={resolvendo === p.id} onClick={() => setConfirmacao({ salaId: p.id, vencedor: 'cancelada' })} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 font-black text-sm uppercase disabled:opacity-30"><Ban className="w-4 h-4" /></button>
          </div>}
        </motion.div>
      ))}</div>}
    </div>
  );
}

// ── ABA: SALDOS ────────────────────────────────────
function AbaSaldos({ adminCargo }: { adminCargo: CargoAdmin }) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Jogador[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionado, setSelecionado] = useState<Jogador | null>(null);
  const [valor, setValor] = useState('');
  const [operacao, setOperacao] = useState<'adicionar' | 'remover'>('adicionar');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [popup, setPopup] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const podeMexer = temPermissao(adminCargo, 'gerenciarSaldos');

  const buscarJogadores = useCallback(async () => {
    if (busca.trim().length < 2) { setResultados([]); return; }
    setBuscando(true);
    const [{ data: riotData }, { data: saldosData }] = await Promise.all([
      supabase.from('contas_riot').select('user_id, riot_id, profile_icon_id').ilike('riot_id', `%${busca.trim()}%`).limit(8),
      supabase.from('saldos').select('user_id, saldo'),
    ]);
    const saldoMap = Object.fromEntries((saldosData ?? []).map((s: any) => [s.user_id, s.saldo]));
    if (riotData) setResultados(riotData.map((r: any) => ({ userId: r.user_id, riotId: r.riot_id ?? '—', nome: (r.riot_id ?? '—').split('#')[0], iconId: r.profile_icon_id, saldo: saldoMap[r.user_id] ?? 0 })));
    setBuscando(false);
  }, [busca]);

  useEffect(() => { const t = setTimeout(buscarJogadores, 350); return () => clearTimeout(t); }, [buscarJogadores]);

  const aplicarSaldo = async () => {
    if (!selecionado || !valor || !podeMexer) return;
    const qtd = parseInt(valor, 10);
    if (isNaN(qtd) || qtd <= 0) return;
    setSalvando(true);
    const novoSaldo = Math.max(0, selecionado.saldo + (operacao === 'adicionar' ? qtd : -qtd));
    const { error } = await supabase.from('saldos').upsert({ user_id: selecionado.userId, saldo: novoSaldo }, { onConflict: 'user_id' });
    if (!error) {
      setSelecionado({ ...selecionado, saldo: novoSaldo }); setValor(''); setMotivo('');
      setPopup({ tipo: 'sucesso', msg: `${operacao === 'adicionar' ? '+' : '-'}${qtd} MP aplicado.` });
    } else setPopup({ tipo: 'erro', msg: 'Erro ao atualizar saldo.' });
    setSalvando(false);
    setTimeout(() => setPopup(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-black text-white uppercase">Saldos MPoints</h2><p className="text-white/30 text-xs mt-1">{podeMexer ? 'Adicione ou remova MPoints.' : 'Sem permissão.'}</p></div>
      <AnimatePresence>{popup && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold ${popup.tipo === 'sucesso' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{popup.tipo === 'sucesso' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}{popup.msg}</motion.div>}</AnimatePresence>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6 space-y-4" style={CardStyle()}>
          <p className="text-white/40 text-xs font-black uppercase">Buscar Jogador</p>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" /><input type="text" value={busca} onChange={e => { setBusca(e.target.value); setSelecionado(null); }} placeholder="Nick#TAG..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none placeholder:text-white/20" />{buscando && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 animate-spin" />}</div>
          {resultados.length > 0 && <div className="space-y-2 max-h-64 overflow-y-auto">{resultados.map(j => <button key={j.userId} onClick={() => setSelecionado(j)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left ${selecionado?.userId === j.userId ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}><div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0">{j.iconId ? <img src={`https://ddragon.leagueoflegends.com/cdn/15.8.1/img/profileicon/${j.iconId}.png`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-black">{j.nome[0]}</div>}</div><div className="flex-1 min-w-0"><p className="text-white font-black text-sm truncate">{j.riotId}</p><p className="text-white/40 text-xs">{j.saldo.toLocaleString('pt-BR')} MP</p></div>{selecionado?.userId === j.userId && <Check className="w-4 h-4 text-primary shrink-0" />}</button>)}</div>}
        </div>
        <div className="rounded-2xl p-6 space-y-5" style={CardStyle()}>
          {!selecionado ? <div className="flex flex-col items-center justify-center h-full py-12"><Users className="w-8 h-8 text-white/10 mb-3" /><p className="text-white/20 text-sm font-black uppercase">Selecione um jogador</p></div>
          : <>
            <div className="flex items-center gap-3 pb-4 border-b border-white/5"><div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden shrink-0">{selecionado.iconId ? <img src={`https://ddragon.leagueoflegends.com/cdn/15.8.1/img/profileicon/${selecionado.iconId}.png`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/30 font-black">{selecionado.nome[0]}</div>}</div><div><p className="text-white font-black">{selecionado.riotId}</p><div className="flex items-center gap-1.5 mt-0.5"><Coins className="w-3.5 h-3.5 text-primary" /><span className="text-primary font-black text-sm">{selecionado.saldo.toLocaleString('pt-BR')} MP</span></div></div></div>
            {podeMexer && <>
              <div className="flex gap-2">{(['adicionar', 'remover'] as const).map(op => <button key={op} onClick={() => setOperacao(op)} className={`flex-1 py-2 rounded-xl font-black text-sm uppercase border ${operacao === op ? (op === 'adicionar' ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400') : 'bg-white/5 border-white/5 text-white/30'}`}>{op === 'adicionar' ? '+ Adicionar' : '− Remover'}</button>)}</div>
              <div><label className="text-white/30 text-[10px] font-black uppercase block mb-2">Quantidade (MP)</label><input type="number" min="1" value={valor} onChange={e => setValor(e.target.value)} placeholder="Ex: 500" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none placeholder:text-white/20" /></div>
              <button onClick={aplicarSaldo} disabled={salvando || !valor || parseInt(valor) <= 0} className={`w-full py-3 rounded-xl font-black text-sm uppercase disabled:opacity-30 ${operacao === 'adicionar' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}>{salvando ? 'Aplicando...' : `${operacao === 'adicionar' ? 'Adicionar' : 'Remover'} ${valor || '—'} MP`}</button>
            </>}
          </>}
        </div>
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ───────────────────────────────
export default function Admin() {
  const { perfil } = usePerfil();
  const [abaAtiva, setAbaAtiva] = useState<Aba>('salas');

  if (!perfil) {
    return <div className="flex-1 bg-[#050505] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>;
  }

  const adminCargo = (perfil.cargo as CargoAdmin) || 'jogador';
  if (adminCargo === 'jogador') {
    return <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center gap-4 p-8"><div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center"><ShieldCheck className="w-8 h-8 text-red-400" /></div><h1 className="text-white font-black text-xl uppercase">Acesso Restrito</h1><p className="text-white/30 text-sm text-center max-w-xs">Você não tem permissão.</p></div>;
  }

  const permissoes = PERMISSOES_POR_CARGO[adminCargo];
  const abas: { id: Aba; label: string; icon: React.ElementType; bloqueada: boolean }[] = [
    { id: 'salas', label: 'Salas', icon: Users, bloqueada: !permissoes.resolverPartidas },
    { id: 'disputas', label: 'Disputas', icon: Trophy, bloqueada: !permissoes.resolverPartidas },
    { id: 'partidas_travadas', label: 'Travadas', icon: AlertTriangle, bloqueada: !permissoes.resolverPartidas },
    { id: 'saldos', label: 'Saldos', icon: Coins, bloqueada: !permissoes.gerenciarSaldos },
  ];

  return (
    <div className="flex-1 bg-[#050505] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"><ShieldCheck className="w-6 h-6 text-primary" /></div>
            <div><div className="flex items-center gap-2"><h1 className="text-2xl font-black text-white uppercase">Painel Admin</h1><BadgeCargo cargo={adminCargo} /></div><p className="text-white/30 text-sm">{perfil.riotId || perfil.nome}</p></div>
          </div>
        </div>
        <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/5 overflow-x-auto">
          {abas.map(({ id, label, icon: Icon, bloqueada }) => (
            <button key={id} onClick={() => !bloqueada && setAbaAtiva(id)} disabled={bloqueada} className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-black text-sm uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${abaAtiva === id ? 'bg-white/10 text-white' : bloqueada ? 'text-white/15 cursor-not-allowed' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}><Icon className="w-4 h-4" />{label}</button>
          ))}
        </div>
        <AnimatePresence mode="wait"><motion.div key={abaAtiva} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {abaAtiva === 'salas' && <AbaSalas adminCargo={adminCargo} />}
          {abaAtiva === 'disputas' && <AbaDisputas adminCargo={adminCargo} userId={perfil.id} />}
          {abaAtiva === 'partidas_travadas' && <AbaPartidasTravadas adminCargo={adminCargo} />}
          {abaAtiva === 'saldos' && <AbaSaldos adminCargo={adminCargo} />}
        </motion.div></AnimatePresence>
      </div>
    </div>
  );
}