// src/pages/Admin.tsx
// Painel administrativo — resolução de partidas em disputa e gestão de saldos MPoints.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Trophy, Coins, Search, Check, X, AlertTriangle,
  ChevronDown, RefreshCw, Ban, Users, Crown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { atualizarPontosPartida } from '../api/player';
import { resolverPartidaTravada, deletarSala, buscarSalaCompleta } from '../api/salas';
import {
  type CargoAdmin,
  CARGO_LABELS, CARGO_COLORS,
  PERMISSOES_POR_CARGO, temPermissao,
} from '../config/adminPermissoes';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

interface AdminUser {
  userId:    string;
  cargo:     CargoAdmin;
  riotId?:   string;
  nome?:     string;
  iconId?:   number;
}

interface PartidaDisputa {
  id:          number;
  salaId:      number;
  vencedor:    string;
  vencedorNome?: string;
  jogadores:   Array<{ id: string; nome: string; isTimeA: boolean }>;
  createdAt:   string;
  modo:        string;
}

interface Jogador {
  userId:   string;
  riotId:   string;
  nome:     string;
  iconId?:  number;
  saldo:    number;
}

type Aba = 'salas' | 'disputas' | 'partidas_travadas' | 'saldos';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function BadgeCargo({ cargo }: { cargo: CargoAdmin }) {
  const c = CARGO_COLORS[cargo];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${c.text} ${c.bg} ${c.border}`}>
      {CARGO_LABELS[cargo]}
    </span>
  );
}

function CardStyle() {
  return { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)' };
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA: PARTIDAS EM DISPUTA
// ─────────────────────────────────────────────────────────────────────────────

function AbaDisputas({ adminCargo }: { adminCargo: CargoAdmin }) {
  const [partidas, setPartidas]     = useState<PartidaDisputa[]>([]);
  const [loading, setLoading]       = useState(true);
  const [resolvendo, setResolvendo] = useState<number | null>(null);
  const [popup, setPopup]           = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  const podeResolver  = temPermissao(adminCargo, 'resolverPartidas');
  const podeCancelar  = temPermissao(adminCargo, 'cancelarPartidas');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('resultados_partidas')
      .select('id, sala_id, vencedor, vencedor_nome, jogadores, created_at')
      .eq('vencedor', 'disputa')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setPartidas(data.map((r: any) => ({
        id:           r.id,
        salaId:       r.sala_id,
        vencedor:     r.vencedor,
        vencedorNome: r.vencedor_nome,
        jogadores:    r.jogadores ?? [],
        createdAt:    r.created_at,
        modo:         '5v5',
      })));
    } else if (error) {
      console.error('[AbaDisputas] Erro ao carregar:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const resolver = async (id: number, decisao: 'time_a' | 'time_b' | 'cancelado') => {
    setResolvendo(id);
    const partida = partidas.find(p => p.id === id)!;
    const vencedorNome = decisao === 'cancelado' ? 'Cancelado'
      : partida.vencedorNome ?? decisao;

    const { error } = await supabase
      .from('resultados_partidas')
      .update({
        vencedor:      decisao,
        vencedor_nome: vencedorNome,
        resolvido_por: user?.id ?? null,
        resolvido_em:  new Date().toISOString(),
      })
      .eq('id', id);

    // Conceder pontos APENAS se estava em disputa antes (não se já tinha vencedor)
    if (!error && decisao !== 'cancelado' && partida.vencedor === 'disputa') {
      console.log(`[Admin] Resolvendo disputa #${id} - Vencedor: ${decisao}`);
      await atualizarPontosPartida({
        salaId:   partida.salaId,
        modo:     partida.modo,
        vencedor: decisao,
        jogadores: partida.jogadores.map(j => ({
          userId:  j.id,
          isTimeA: j.isTimeA,
          nome:    j.nome,
        })),
      }).catch(e => {
        console.error('[Admin] Erro ao conceder pontos na resolução de disputa:', e);
        setPopup({ tipo: 'erro', msg: 'Resultado registrado mas erro ao atualizar pontos.' });
      });
    }

    setResolvendo(null);
    if (error) {
      setPopup({ tipo: 'erro', msg: 'Erro ao resolver partida.' });
    } else {
      setPopup({ tipo: 'sucesso', msg: decisao === 'cancelado' ? 'Partida cancelada.' : 'Resultado registrado!' });
      carregar();
    }
    setTimeout(() => setPopup(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Partidas em Disputa</h2>
          <p className="text-white/30 text-xs mt-1">Votos divididos — defina o vencedor ou cancele.</p>
        </div>
        <button onClick={carregar} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <RefreshCw className={`w-4 h-4 text-white/40 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold ${
              popup.tipo === 'sucesso'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {popup.tipo === 'sucesso' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {popup.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : partidas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl" style={CardStyle()}>
          <Trophy className="w-10 h-10 text-white/10 mb-4" />
          <p className="text-white/20 font-black uppercase tracking-widest text-sm">Nenhuma disputa pendente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {partidas.map(p => {
            const timeA = p.jogadores.filter(j => j.isTimeA);
            const timeB = p.jogadores.filter(j => !j.isTimeA);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6"
                style={CardStyle()}
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-orange-400 text-[10px] font-black uppercase tracking-widest">
                        Em Disputa
                      </span>
                      <span className="text-white/20 text-xs">Sala #{p.salaId}</span>
                    </div>
                    <p className="text-white/30 text-xs">
                      {new Date(p.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2">Equipe Azul</p>
                    <div className="space-y-1">
                      {timeA.map(j => (
                        <p key={j.id} className="text-white/60 text-sm font-bold truncate">{j.nome}</p>
                      ))}
                    </div>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-2">Equipe Vermelha</p>
                    <div className="space-y-1">
                      {timeB.map(j => (
                        <p key={j.id} className="text-white/60 text-sm font-bold truncate">{j.nome}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-3">
                  <button
                    disabled={!podeResolver || resolvendo === p.id}
                    onClick={() => resolver(p.id, 'time_a')}
                    className="flex-1 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-black text-sm uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {resolvendo === p.id ? '...' : 'Azul Venceu'}
                  </button>
                  <button
                    disabled={!podeResolver || resolvendo === p.id}
                    onClick={() => resolver(p.id, 'time_b')}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-sm uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {resolvendo === p.id ? '...' : 'Vermelho Venceu'}
                  </button>
                  <button
                    disabled={!podeCancelar || resolvendo === p.id}
                    onClick={() => resolver(p.id, 'cancelado')}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white/60 font-black text-sm uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Cancelar partida"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA: SALAS ABERTAS
// ─────────────────────────────────────────────────────────────────────────────

interface SalaAberta {
  id:           number;
  nome:         string;
  estado:       string;
  criadorNome:  string;
  modo:         string;
  numJogadores: number;
  maxJogadores: number;
}

function AbaSalas({ adminCargo }: { adminCargo: CargoAdmin }) {
  const [salas, setSalas]               = useState<SalaAberta[]>([]);
  const [loading, setLoading]           = useState(true);
  const [deletando, setDeletando]       = useState<number | null>(null);
  const [confirmacao, setConfirmacao]   = useState<{ salaId: number; tipo: 'deletar' | 'resolver'; vencedor?: 'time_a' | 'time_b' | 'cancelada' } | null>(null);
  const [popup, setPopup]               = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  const podeDeleta = temPermissao(adminCargo, 'resolverPartidas');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('salas')
      .select('id, nome, estado, criador_nome, modo, max_jogadores, sala_jogadores(user_id)', { count: 'exact' })
      .not('estado', 'eq', 'encerrada')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setSalas(data.map((s: any) => ({
        id:           s.id,
        nome:         s.nome,
        estado:       s.estado,
        criadorNome:  s.criador_nome,
        modo:         s.modo,
        maxJogadores: s.max_jogadores,
        numJogadores: (s.sala_jogadores ?? []).length,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const executarAcao = async () => {
    if (!confirmacao) return;
    setDeletando(confirmacao.salaId);

    try {
      if (confirmacao.tipo === 'deletar') {
        const { error } = await supabase.from('salas').delete().eq('id', confirmacao.salaId);
        if (error) throw error;
        setPopup({ tipo: 'sucesso', msg: 'Sala deletada com sucesso!' });
      } else {
        // Buscar dados completos da sala com jogadores
        const salaCompleta = await buscarSalaCompleta(confirmacao.salaId);
        if (!salaCompleta) throw new Error('Sala não encontrada');

        const { sucesso, erro } = await resolverPartidaTravada(
          confirmacao.salaId,
          confirmacao.vencedor || 'cancelada',
          salaCompleta.modo,
          salaCompleta.jogadores.map(j => ({
            id: j.id,
            nome: j.nome,
            isTimeA: j.isTimeA,
            role: j.role,
          }))
        );
        if (!sucesso) throw new Error(erro || 'Erro ao resolver');
        setPopup({ tipo: 'sucesso', msg: 'Sala finalizada com sucesso!' });
      }
      carregar();
    } catch (err: any) {
      setPopup({ tipo: 'erro', msg: err?.message || 'Erro ao executar ação' });
    }

    setDeletando(null);
    setConfirmacao(null);
    setTimeout(() => setPopup(null), 3000);
  };

  const estadoColor = (estado: string) => {
    if (estado === 'aberta') return 'bg-green-500/10 border-green-500/20 text-green-400';
    if (estado === 'preenchendo') return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    if (estado === 'confirmacao') return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
    if (estado === 'travada') return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
    if (estado === 'aguardando_inicio') return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
    if (estado === 'em_partida') return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
    if (estado === 'finalizacao') return 'bg-red-500/10 border-red-500/20 text-red-400';
    return 'bg-white/5 border-white/10 text-white/40';
  };

  const estadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      'aberta': 'Aberta',
      'preenchendo': 'Preenchendo',
      'confirmacao': 'Confirmação',
      'travada': 'Travada',
      'aguardando_inicio': 'Aguardando Início',
      'em_partida': 'Em Partida',
      'finalizacao': 'Finalização',
    };
    return labels[estado] || estado;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Salas Abertas</h2>
          <p className="text-white/30 text-xs mt-1">Gerencie salas que ainda não foram finalizadas.</p>
        </div>
        <button onClick={carregar} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <RefreshCw className={`w-4 h-4 text-white/40 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold ${
              popup.tipo === 'sucesso'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {popup.tipo === 'sucesso' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {popup.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : salas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl" style={CardStyle()}>
          <Trophy className="w-10 h-10 text-white/10 mb-4" />
          <p className="text-white/20 font-black uppercase tracking-widest text-sm">Nenhuma sala aberta</p>
        </div>
      ) : (
        <div className="space-y-3">
          {salas.map(s => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={CardStyle()}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border ${estadoColor(s.estado)}`}>
                    {estadoLabel(s.estado)}
                  </span>
                  <span className="text-white/20 text-xs font-bold">#{s.id}</span>
                </div>
                <p className="text-white font-black text-sm truncate">{s.nome}</p>
                <p className="text-white/40 text-xs mt-0.5">{s.criadorNome} • {s.modo} • {s.numJogadores}/{s.maxJogadores} jogadores</p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!podeDeleta || deletando === s.id}
                  onClick={() => setConfirmacao({ salaId: s.id, tipo: 'resolver' })}
                  className="px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-black text-sm uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {deletando === s.id ? '...' : 'Finalizar'}
                </button>
                <button
                  disabled={!podeDeleta || deletando === s.id}
                  onClick={() => setConfirmacao({ salaId: s.id, tipo: 'deletar' })}
                  className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-sm uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {deletando === s.id ? '...' : 'Deletar'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de confirmação */}
      <AnimatePresence>
        {confirmacao && confirmacao.tipo === 'deletar' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => !deletando && setConfirmacao(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-8 max-w-sm w-full"
              style={CardStyle()}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Deletar Sala?</h3>
              </div>

              <p className="text-white/60 text-sm mb-6">
                Tem certeza que deseja deletar esta sala? Todos os dados será perdidos permanentemente.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => !deletando && setConfirmacao(null)}
                  disabled={!!deletando}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 font-black text-sm uppercase transition-all disabled:opacity-30"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => executarAcao()}
                  disabled={!!deletando}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-black text-sm uppercase transition-all disabled:opacity-30"
                >
                  {deletando ? 'Deletando...' : 'Deletar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {confirmacao && confirmacao.tipo === 'resolver' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => !deletando && setConfirmacao(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-8 max-w-sm w-full"
              style={CardStyle()}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Finalizar Sala</h3>
              </div>

              <p className="text-white/60 text-sm mb-6">
                Selecione o vencedor para finalizar esta sala:
              </p>

              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setConfirmacao({ ...confirmacao, vencedor: 'time_a' })}
                  className={`flex-1 py-2.5 rounded-xl font-black text-sm uppercase transition-all border ${
                    confirmacao.vencedor === 'time_a'
                      ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                  }`}
                >
                  Time A
                </button>
                <button
                  onClick={() => setConfirmacao({ ...confirmacao, vencedor: 'time_b' })}
                  className={`flex-1 py-2.5 rounded-xl font-black text-sm uppercase transition-all border ${
                    confirmacao.vencedor === 'time_b'
                      ? 'bg-red-500/20 border-red-500/30 text-red-400'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                  }`}
                >
                  Time B
                </button>
                <button
                  onClick={() => setConfirmacao({ ...confirmacao, vencedor: 'cancelada' })}
                  className={`flex-1 py-2.5 rounded-xl font-black text-sm uppercase transition-all border ${
                    confirmacao.vencedor === 'cancelada'
                      ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                  }`}
                >
                  Cancelar
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => !deletando && setConfirmacao(null)}
                  disabled={!!deletando}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 font-black text-sm uppercase transition-all disabled:opacity-30"
                >
                  Voltar
                </button>
                <button
                  onClick={() => executarAcao()}
                  disabled={!!deletando || !confirmacao.vencedor}
                  className="flex-1 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-black text-sm uppercase transition-all disabled:opacity-30"
                >
                  {deletando ? 'Finalizando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA: PARTIDAS TRAVADAS
// ─────────────────────────────────────────────────────────────────────────────

interface PartidaTravada {
  id:           number;
  nome:         string;
  estado:       string;
  modo:         string;
  criadorNome:  string;
  timeANome?:   string;
  timeBNome?:   string;
  jogadores:    Array<{ id: string; nome: string; isTimeA: boolean; role: string }>;
  finalizacaoExpiresAt?: string;
}

function AbaPartidasTravadas({ adminCargo }: { adminCargo: CargoAdmin }) {
  const [partidas, setPartidas]           = useState<PartidaTravada[]>([]);
  const [loading, setLoading]             = useState(true);
  const [resolvendo, setResolvendo]       = useState<number | null>(null);
  const [confirmacao, setConfirmacao]     = useState<{ salaId: number; vencedor: 'time_a' | 'time_b' | 'cancelada' } | null>(null);
  const [popup, setPopup]                 = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  const podeResolver = temPermissao(adminCargo, 'resolverPartidas');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('salas')
      .select('id, nome, estado, modo, criador_nome, time_a_nome, time_b_nome, finalizacao_expires_at, sala_jogadores(user_id, nome, is_time_a, role)')
      .not('estado', 'eq', 'encerrada')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setPartidas(data.map((s: any) => ({
        id:           s.id,
        nome:         s.nome,
        estado:       s.estado,
        modo:         s.modo,
        criadorNome:  s.criador_nome,
        timeANome:    s.time_a_nome,
        timeBNome:    s.time_b_nome,
        jogadores:    (s.sala_jogadores ?? []).map((j: any) => ({
          id:        j.user_id,
          nome:      j.nome,
          isTimeA:   j.is_time_a,
          role:      j.role,
        })),
        finalizacaoExpiresAt: s.finalizacao_expires_at,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const resolver = async (vencedor: 'time_a' | 'time_b' | 'cancelada') => {
    if (!confirmacao) return;

    setResolvendo(confirmacao.salaId);
    const partida = partidas.find(p => p.id === confirmacao.salaId)!;

    const { sucesso, erro } = await resolverPartidaTravada(
      confirmacao.salaId,
      vencedor,
      partida.modo,
      partida.jogadores
    );

    setResolvendo(null);
    setConfirmacao(null);

    if (sucesso) {
      setPopup({ tipo: 'sucesso', msg: vencedor === 'cancelada' ? 'Partida cancelada!' : `${vencedor === 'time_a' ? 'Time A' : 'Time B'} definido como vencedor!` });
      carregar();
    } else {
      setPopup({ tipo: 'erro', msg: erro || 'Erro ao resolver partida' });
    }
    setTimeout(() => setPopup(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Partidas Travadas</h2>
          <p className="text-white/30 text-xs mt-1">Resolva partidas que não foram finalizadas ou ficaram presas.</p>
        </div>
        <button onClick={carregar} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <RefreshCw className={`w-4 h-4 text-white/40 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold ${
              popup.tipo === 'sucesso'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {popup.tipo === 'sucesso' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {popup.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : partidas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-3xl" style={CardStyle()}>
          <Trophy className="w-10 h-10 text-white/10 mb-4" />
          <p className="text-white/20 font-black uppercase tracking-widest text-sm">Nenhuma partida travada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {partidas.map(p => {
            const timeA = p.jogadores.filter(j => j.isTimeA);
            const timeB = p.jogadores.filter(j => !j.isTimeA);
            const estadoLabel = p.estado === 'travada' ? 'Travada'
              : p.estado === 'aguardando_inicio' ? 'Aguardando Início'
              : p.estado === 'em_partida' ? 'Em Partida'
              : p.estado === 'finalizacao' ? 'Finalização' : p.estado;

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6"
                style={CardStyle()}
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded border ${
                        p.estado === 'finalizacao'
                          ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                          : p.estado === 'em_partida'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                        {estadoLabel}
                      </span>
                      <span className="text-white/20 text-xs">Sala #{p.id}</span>
                    </div>
                    <p className="text-white/30 text-xs font-bold">{p.nome}</p>
                    <p className="text-white/20 text-xs mt-1">{p.modo} • Criador: {p.criadorNome}</p>
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2">{p.timeANome || 'Time A'}</p>
                    <div className="space-y-1">
                      {timeA.map(j => (
                        <p key={j.id} className="text-white/60 text-sm font-bold truncate">{j.nome}</p>
                      ))}
                    </div>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-2">{p.timeBNome || 'Time B'}</p>
                    <div className="space-y-1">
                      {timeB.map(j => (
                        <p key={j.id} className="text-white/60 text-sm font-bold truncate">{j.nome}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-3">
                  <button
                    disabled={!podeResolver || resolvendo === p.id}
                    onClick={() => setConfirmacao({ salaId: p.id, vencedor: 'time_a' })}
                    className="flex-1 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-black text-sm uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {resolvendo === p.id ? '...' : `${p.timeANome || 'Time A'} Venceu`}
                  </button>
                  <button
                    disabled={!podeResolver || resolvendo === p.id}
                    onClick={() => setConfirmacao({ salaId: p.id, vencedor: 'time_b' })}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black text-sm uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {resolvendo === p.id ? '...' : `${p.timeBNome || 'Time B'} Venceu`}
                  </button>
                  <button
                    disabled={!podeResolver || resolvendo === p.id}
                    onClick={() => setConfirmacao({ salaId: p.id, vencedor: 'cancelada' })}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white/60 font-black text-sm uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Cancelar partida"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação */}
      <AnimatePresence>
        {confirmacao && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => !resolvendo && setConfirmacao(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl p-8 max-w-sm w-full"
              style={CardStyle()}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Confirmar Resolução</h3>
              </div>

              <p className="text-white/60 text-sm mb-6">
                Tem certeza que deseja definir o vencedor desta partida?
                {confirmacao.vencedor === 'cancelada' && ' Esta ação não pode ser desfeita.'}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => !resolvendo && setConfirmacao(null)}
                  disabled={!!resolvendo}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 font-black text-sm uppercase transition-all disabled:opacity-30"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => resolver(confirmacao.vencedor)}
                  disabled={!!resolvendo}
                  className={`flex-1 py-2.5 rounded-xl font-black text-sm uppercase transition-all disabled:opacity-30 ${
                    confirmacao.vencedor === 'cancelada'
                      ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400'
                      : 'bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary'
                  }`}
                >
                  {resolvendo ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA: SALDOS MPOINTS
// ─────────────────────────────────────────────────────────────────────────────

function AbaSaldos({ adminCargo }: { adminCargo: CargoAdmin }) {
  const [busca, setBusca]           = useState('');
  const [resultados, setResultados] = useState<Jogador[]>([]);
  const [buscando, setBuscando]     = useState(false);
  const [selecionado, setSelecionado] = useState<Jogador | null>(null);
  const [valor, setValor]           = useState('');
  const [operacao, setOperacao]     = useState<'adicionar' | 'remover'>('adicionar');
  const [motivo, setMotivo]         = useState('');
  const [salvando, setSalvando]     = useState(false);
  const [popup, setPopup]           = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  const podeMexer = temPermissao(adminCargo, 'gerenciarSaldos');

  const buscarJogadores = useCallback(async () => {
    if (busca.trim().length < 2) { setResultados([]); return; }
    setBuscando(true);
    const { data } = await supabase
      .from('contas_riot')
      .select('user_id, riot_id, profile_icon_id')
      .ilike('riot_id', `%${busca.trim()}%`)
      .limit(8);

    if (!data) { setBuscando(false); return; }

    const userIds = data.map((r: any) => r.user_id);
    const { data: saldosData } = await supabase
      .from('saldos')
      .select('user_id, saldo')
      .in('user_id', userIds);

    const saldoMap = Object.fromEntries((saldosData ?? []).map((s: any) => [s.user_id, s.saldo]));

    setResultados(data.map((r: any) => ({
      userId:  r.user_id,
      riotId:  r.riot_id ?? '—',
      nome:    (r.riot_id ?? '—').split('#')[0],
      iconId:  r.profile_icon_id,
      saldo:   saldoMap[r.user_id] ?? 0,
    })));
    setBuscando(false);
  }, [busca]);

  useEffect(() => {
    const t = setTimeout(buscarJogadores, 350);
    return () => clearTimeout(t);
  }, [buscarJogadores]);

  const aplicarSaldo = async () => {
    if (!selecionado || !valor || !podeMexer) return;
    const qtd = parseInt(valor, 10);
    if (isNaN(qtd) || qtd <= 0) return;

    setSalvando(true);
    const delta = operacao === 'adicionar' ? qtd : -qtd;
    const novoSaldo = Math.max(0, selecionado.saldo + delta);

    const { error } = await supabase
      .from('saldos')
      .upsert({ user_id: selecionado.userId, saldo: novoSaldo }, { onConflict: 'user_id' });

    if (!error) {
      // Log da operação
      await supabase.from('admin_logs').insert({
        admin_id:  user?.id ?? null,
        acao:      `saldo_${operacao}`,
        alvo_id:   selecionado.userId,
        detalhes:  { valor: qtd, saldo_anterior: selecionado.saldo, saldo_novo: novoSaldo, motivo },
      }).then(() => {});  // fire-and-forget — tabela pode não existir ainda

      setSelecionado({ ...selecionado, saldo: novoSaldo });
      setValor('');
      setMotivo('');
      setPopup({ tipo: 'sucesso', msg: `${operacao === 'adicionar' ? '+' : '-'}${qtd} MP aplicado com sucesso.` });
    } else {
      setPopup({ tipo: 'erro', msg: 'Erro ao atualizar saldo.' });
    }
    setSalvando(false);
    setTimeout(() => setPopup(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white uppercase tracking-tight">Saldos MPoints</h2>
        <p className="text-white/30 text-xs mt-1">
          {podeMexer ? 'Adicione ou remova MPoints de qualquer jogador.' : 'Apenas o Proprietário pode alterar saldos.'}
        </p>
      </div>

      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold ${
              popup.tipo === 'sucesso'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {popup.tipo === 'sucesso' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {popup.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Busca */}
        <div className="rounded-2xl p-6 space-y-4" style={CardStyle()}>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest">Buscar Jogador</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              value={busca}
              onChange={e => { setBusca(e.target.value); setSelecionado(null); }}
              placeholder="Digite o Nick#TAG..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
            />
            {buscando && (
              <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 animate-spin" />
            )}
          </div>

          {resultados.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {resultados.map(j => (
                <button
                  key={j.userId}
                  onClick={() => setSelecionado(j)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    selecionado?.userId === j.userId
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0">
                    {j.iconId ? (
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/15.8.1/img/profileicon/${j.iconId}.png`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-black">
                        {j.nome[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm truncate">{j.riotId}</p>
                    <p className="text-white/40 text-xs">{j.saldo.toLocaleString('pt-BR')} MP</p>
                  </div>
                  {selecionado?.userId === j.userId && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {busca.length >= 2 && !buscando && resultados.length === 0 && (
            <p className="text-white/20 text-sm text-center py-4">Nenhum jogador encontrado.</p>
          )}
        </div>

        {/* Painel de edição */}
        <div className="rounded-2xl p-6 space-y-5" style={CardStyle()}>
          {!selecionado ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Users className="w-8 h-8 text-white/10 mb-3" />
              <p className="text-white/20 text-sm font-black uppercase tracking-widest">Selecione um jogador</p>
            </div>
          ) : (
            <>
              {/* Header do jogador */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden shrink-0">
                  {selecionado.iconId ? (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/15.8.1/img/profileicon/${selecionado.iconId}.png`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 font-black">
                      {selecionado.nome[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white font-black">{selecionado.riotId}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Coins className="w-3.5 h-3.5 text-primary" />
                    <span className="text-primary font-black text-sm">{selecionado.saldo.toLocaleString('pt-BR')} MP</span>
                    <span className="text-white/20 text-xs">saldo atual</span>
                  </div>
                </div>
              </div>

              {!podeMexer ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                  <p className="text-white/40 text-sm">Apenas o Proprietário pode alterar saldos.</p>
                </div>
              ) : (
                <>
                  {/* Operação */}
                  <div className="flex gap-2">
                    {(['adicionar', 'remover'] as const).map(op => (
                      <button
                        key={op}
                        onClick={() => setOperacao(op)}
                        className={`flex-1 py-2 rounded-xl font-black text-sm uppercase tracking-widest border transition-all ${
                          operacao === op
                            ? op === 'adicionar'
                              ? 'bg-green-500/15 border-green-500/30 text-green-400'
                              : 'bg-red-500/15 border-red-500/30 text-red-400'
                            : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'
                        }`}
                      >
                        {op === 'adicionar' ? '+ Adicionar' : '− Remover'}
                      </button>
                    ))}
                  </div>

                  {/* Valor */}
                  <div>
                    <label className="text-white/30 text-[10px] font-black uppercase tracking-widest block mb-2">
                      Quantidade (MP)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={valor}
                      onChange={e => setValor(e.target.value)}
                      placeholder="Ex: 500"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
                    />
                  </div>

                  {/* Motivo */}
                  <div>
                    <label className="text-white/30 text-[10px] font-black uppercase tracking-widest block mb-2">
                      Motivo (opcional)
                    </label>
                    <input
                      type="text"
                      value={motivo}
                      onChange={e => setMotivo(e.target.value)}
                      placeholder="Ex: Premiação torneio, ajuste manual..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
                    />
                  </div>

                  {/* Preview */}
                  {valor && !isNaN(parseInt(valor)) && parseInt(valor) > 0 && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-white/30 text-sm">Saldo após operação:</span>
                      <span className={`font-black text-sm ${operacao === 'adicionar' ? 'text-green-400' : 'text-red-400'}`}>
                        {Math.max(0, selecionado.saldo + (operacao === 'adicionar' ? parseInt(valor) : -parseInt(valor))).toLocaleString('pt-BR')} MP
                      </span>
                    </div>
                  )}

                  {/* Botão */}
                  <button
                    onClick={aplicarSaldo}
                    disabled={salvando || !valor || parseInt(valor) <= 0}
                    className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                      operacao === 'adicionar'
                        ? 'bg-green-500 hover:bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                        : 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                    }`}
                  >
                    {salvando ? 'Aplicando...' : operacao === 'adicionar' ? `Adicionar ${valor || '—'} MP` : `Remover ${valor || '—'} MP`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth();
  const [adminInfo, setAdminInfo]   = useState<AdminUser | null>(null);
  const [loading, setLoading]       = useState(true);
  const [abaAtiva, setAbaAtiva]     = useState<Aba>('salas');

  useEffect(() => {
    const verificar = async () => {
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('admin_usuarios')
        .select('cargo')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        const { data: riot } = await supabase
          .from('contas_riot')
          .select('riot_id, profile_icon_id')
          .eq('user_id', user.id)
          .maybeSingle();

        setAdminInfo({
          userId:  user.id,
          cargo:   data.cargo as CargoAdmin,
          riotId:  (riot as any)?.riot_id ?? user.email,
          nome:    ((riot as any)?.riot_id ?? user.email ?? '').split('#')[0],
          iconId:  (riot as any)?.profile_icon_id,
        });
      }
      setLoading(false);
    };
    verificar();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-1 bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!adminInfo) {
    return (
      <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-white font-black text-xl uppercase tracking-tight">Acesso Restrito</h1>
        <p className="text-white/30 text-sm text-center max-w-xs">
          Você não tem permissão para acessar o painel administrativo.
        </p>
      </div>
    );
  }

  const permissoes = PERMISSOES_POR_CARGO[adminInfo.cargo];
  const abas: { id: Aba; label: string; icon: React.ElementType; bloqueada: boolean }[] = [
    { id: 'salas',              label: 'Salas',         icon: Users, bloqueada: !permissoes.resolverPartidas },
    { id: 'disputas',           label: 'Disputas',      icon: Trophy, bloqueada: !permissoes.resolverPartidas },
    { id: 'partidas_travadas',  label: 'Travadas',      icon: AlertTriangle, bloqueada: !permissoes.resolverPartidas },
    { id: 'saldos',             label: 'Saldos MPoints', icon: Coins,  bloqueada: !permissoes.gerenciarSaldos },
  ];

  return (
    <div className="flex-1 bg-[#050505] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white uppercase tracking-tight">Painel Admin</h1>
                <BadgeCargo cargo={adminInfo.cargo} />
              </div>
              <p className="text-white/30 text-sm">{adminInfo.riotId}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/5 overflow-x-auto">
          {abas.map(({ id, label, icon: Icon, bloqueada }) => (
            <button
              key={id}
              onClick={() => !bloqueada && setAbaAtiva(id)}
              disabled={bloqueada}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-black text-sm uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
                abaAtiva === id
                  ? 'bg-white/10 text-white'
                  : bloqueada
                  ? 'text-white/15 cursor-not-allowed'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {bloqueada && <span className="text-[9px] text-white/15 ml-1">(sem permissão)</span>}
            </button>
          ))}
        </div>

        {/* Conteúdo da aba */}
        <AnimatePresence mode="wait">
          <motion.div
            key={abaAtiva}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {abaAtiva === 'salas'              && <AbaSalas             adminCargo={adminInfo.cargo} />}
            {abaAtiva === 'disputas'           && <AbaDisputas           adminCargo={adminInfo.cargo} />}
            {abaAtiva === 'partidas_travadas'  && <AbaPartidasTravadas   adminCargo={adminInfo.cargo} />}
            {abaAtiva === 'saldos'             && <AbaSaldos            adminCargo={adminInfo.cargo} />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
