// src/components/partidas/SalaInterna.tsx
// COMPONENTE: Tela dentro da sala — realtime via Supabase

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crown, Shield, Clock, UserPlus, Check, Copy, Trash2,
  ArrowLeft, Lock, Sword, CheckCircle, RefreshCw, AlertTriangle, Trophy, X
} from 'lucide-react';
import { getModoInfo, getMPointsInfo, ROLE_CONFIG, type Role } from './salaConfig';
import type { Sala, JogadorNaSala } from '../../api/salas';
import {
  entrarNaVaga, sairDaVaga, confirmarPresencaDB,
  deletarSala as deletarSalaDB, buscarSalaCompleta,
} from '../../api/salas';
import { supabase } from '../../lib/supabase';

// ============================================
// TIPOS
// ============================================

interface SalaInternaProps {
  sala: Sala;  // estado inicial
  usuarioAtual: { id: string; nome: string; tag?: string; elo: string; role: string; avatar?: string };
  onAtualizarSala: (sala: Sala) => void;
  onDeletarSala: (salaId: number) => void;
  onSair: () => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export const SalaInterna = ({
  sala: salaInicial,
  usuarioAtual,
  onDeletarSala,
  onSair,
}: SalaInternaProps) => {
  const [sala, setSala] = useState<Sala>(salaInicial);
  const [copiado, setCopiado] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [timeLeftConfirm, setTimeLeftConfirm] = useState(15);
  const [matchTimeLeft, setMatchTimeLeft] = useState(0);
  const [loadingVaga, setLoadingVaga] = useState<string | null>(null); // chave da vaga em loading

  const isCriador = sala.criadorId === usuarioAtual.id;
  const jogadorAtual = sala.jogadores.find(j => j.id === usuarioAtual.id);
  const estaConfirmado = jogadorAtual?.confirmado || false;
  const isLider = jogadorAtual?.isLider || false;

  const timeA = sala.jogadores.filter(j => j.isTimeA);
  const timeB = sala.jogadores.filter(j => !j.isTimeA);
  const estaCheia = sala.jogadores.length >= sala.maxJogadores;
  const todosConfirmados = sala.jogadores.length > 0 &&
    sala.jogadores.length === sala.maxJogadores &&
    sala.jogadores.every(j => j.confirmado);
  const podeIniciar = isCriador && estaCheia && todosConfirmados && sala.statusInterno !== 'em_andamento';

  const modoInfo = getModoInfo(sala.modo);
  const mpInfo = getMPointsInfo(sala.mpoints);
  const vagasPorTime = modoInfo.jogadoresPorTime;
  const rolesDisponiveis: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP'];

  // ── Realtime ────────────────────────────────────────────────────────────────
  const recarregar = useCallback(async () => {
    const atualizada = await buscarSalaCompleta(sala.id);
    if (atualizada) setSala(atualizada);
  }, [sala.id]);

  useEffect(() => {
    recarregar();

    const channel = supabase
      .channel(`sala_interna_${sala.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'sala_jogadores',
        filter: `sala_id=eq.${sala.id}`,
      }, recarregar)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'salas',
        filter: `id=eq.${sala.id}`,
      }, recarregar)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sala.id]);

  // ── Timer de confirmação (15s) ───────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (estaCheia && !todosConfirmados &&
        (!sala.statusInterno || sala.statusInterno === 'aguardando' || sala.statusInterno === 'confirmacao')) {
      interval = setInterval(() => {
        setTimeLeftConfirm(prev => {
          if (prev <= 1) { return 15; }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeftConfirm(15);
    }
    return () => clearInterval(interval);
  }, [estaCheia, todosConfirmados, sala.statusInterno]);

  // ── Timer da partida ──────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sala.statusInterno === 'em_andamento') {
      if (matchTimeLeft === 0 && sala.tempoRestantePartida) {
        setMatchTimeLeft(sala.tempoRestantePartida);
      }
      interval = setInterval(() => {
        setMatchTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sala.statusInterno]);

  // ── Ações ────────────────────────────────────────────────────────────────────

  const vagaKey = (role: string, isTimeA: boolean) => `${isTimeA ? 'A' : 'B'}-${role}`;

  const handleEntrarNaVaga = async (role: string, isTimeA: boolean) => {
    const key = vagaKey(role, isTimeA);
    if (loadingVaga === key) return;

    // Já está nessa vaga exata → sai
    if (jogadorAtual?.role === role && jogadorAtual?.isTimeA === isTimeA) {
      setLoadingVaga(key);
      await sairDaVaga(sala.id, usuarioAtual.id);
      setLoadingVaga(null);
      return;
    }

    // Troca direto, sem pop-up — entrarNaVaga faz DELETE+INSERT
    setLoadingVaga(key);
    await entrarNaVaga(sala.id, { ...usuarioAtual }, role, isTimeA);
    setLoadingVaga(null);
  };

  const handleSairDaVaga = async () => {
    await sairDaVaga(sala.id, usuarioAtual.id);
  };

  const handleConfirmarPresenca = async () => {
    await confirmarPresencaDB(sala.id, usuarioAtual.id, !estaConfirmado);
  };

  const handleApagarSala = () => {
    if (confirm('Tem certeza que quer apagar esta sala?')) {
      deletarSalaDB(sala.id);
      onDeletarSala(sala.id);
      onSair();
    }
  };

  const handleIniciarPartida = () => setShowStartConfirm(true);

  const handleConfirmarInicio = async () => {
    const tempoPartida = sala.modo === '5v5' ? 2700 : sala.modo === 'aram' ? 1200 : 600;
    await supabase.from('salas').update({
      status_interno: 'em_andamento',
      updated_at: new Date().toISOString(),
    }).eq('id', sala.id);
    setMatchTimeLeft(tempoPartida);
    setShowStartConfirm(false);
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const copiarCodigo = () => {
    navigator.clipboard.writeText(sala.codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // ── Render vaga preenchida ────────────────────────────────────────────────────
  const renderJogadorCard = (jogador: JogadorNaSala, isTimeA: boolean) => {
    const roleIcon = ROLE_CONFIG[jogador.role as Role];
    const isCurrentUser = jogador.id === usuarioAtual.id;

    return (
      <div
        key={jogador.id}
        className="relative flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-white/10 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center">
            {roleIcon && (
              <img src={roleIcon.img} alt={jogador.role} className="w-6 h-6 object-contain" />
            )}
          </div>
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 overflow-hidden">
              {jogador.avatar
                ? <img src={jogador.avatar} alt={jogador.nome} className="w-full h-full object-cover" />
                : <span className="text-white font-black text-sm">{jogador.nome[0].toUpperCase()}</span>
              }
            </div>
            {jogador.confirmado && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0d0d0d]">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white font-bold text-sm tracking-tight">
                {jogador.nome}
                <span className="text-white/40 text-xs ml-1">{jogador.tag}</span>
              </p>
              {jogador.isLider && <Crown className="w-3 h-3 text-yellow-400" />}
              {isCurrentUser && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-bold">Você</span>}
            </div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{jogador.elo}</span>
          </div>
        </div>

        {isCurrentUser ? (
          <button
            onClick={handleSairDaVaga}
            className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all flex items-center justify-center"
            title="Sair da vaga"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          jogador.confirmado
            ? <span className="text-[9px] font-black px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-tighter">Pronto</span>
            : <span className="text-[9px] font-black px-2 py-1 rounded-full bg-white/5 text-white/20 border border-white/5 uppercase tracking-tighter">Aguardando</span>
        )}
      </div>
    );
  };

  // ── Render vaga aberta ────────────────────────────────────────────────────────
  const renderVagaAberta = (role: string, index: number, isTimeA: boolean) => {
    const roleIcon = ROLE_CONFIG[role as Role];

    return (
      <div
        key={`vaga-${isTimeA ? 'A' : 'B'}-${index}`}
        className="flex items-center justify-between p-3 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl opacity-60 hover:opacity-100 hover:border-white/30 transition-all cursor-pointer group"
        onClick={() => handleEntrarNaVaga(role, isTimeA)}
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center">
            {roleIcon && (
              <img src={roleIcon.img} alt={role} className="w-6 h-6 object-contain opacity-40 group-hover:opacity-80 transition-opacity" />
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
            <UserPlus className="w-4 h-4 text-white/20 group-hover:text-white/50" />
          </div>
          <span className="text-white/30 text-sm font-bold uppercase tracking-wider group-hover:text-white/60 transition-colors">
            {loadingVaga ? 'Aguarde...' : 'Clique para entrar'}
          </span>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        className="relative w-full max-w-6xl mx-auto rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13, 13, 13, 0.6)',
          border: `3px solid ${modoInfo.cor}`,
          boxShadow: `0 0 45px -10px ${modoInfo.cor}60`,
          backdropFilter: 'blur(16px)'
        }}
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-15 pointer-events-none" style={{ background: modoInfo.cor }} />

        <div className="relative z-10">
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-4">
              {sala.statusInterno !== 'em_andamento' && sala.statusInterno !== 'votacao' && (
                <button onClick={onSair} className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-white/60" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-white font-black text-xl tracking-tight uppercase">{sala.nome}</h2>
                  {sala.temSenha && <Lock className="w-4 h-4 text-yellow-400" />}
                  <span className="font-mono text-[11px] text-white/30 bg-white/5 px-2 py-0.5 rounded border border-white/10">{sala.codigo}</span>
                </div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{sala.descricao}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copiarCodigo}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
                title="Copiar código da sala"
              >
                {copiado ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/60" />}
              </button>
              {isCriador && (
                <button
                  onClick={handleApagarSala}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 transition-colors"
                  title="Apagar Sala"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* STATUS BAR */}
            <div className="flex items-center justify-between mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${estaCheia ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <span className="text-white font-bold text-sm tracking-tight">
                    {sala.statusInterno === 'em_andamento' ? 'PARTIDA EM ANDAMENTO' :
                     sala.statusInterno === 'votacao'      ? 'VOTAÇÃO' :
                     sala.statusInterno === 'finalizada'   ? 'FINALIZADA' :
                     sala.statusInterno === 'disputa'      ? 'DISPUTA ABERTA' :
                     estaCheia ? 'SALA CHEIA — AGUARDANDO CONFIRMAÇÕES' :
                     `${sala.jogadores.length} / ${sala.maxJogadores} JOGADORES`}
                  </span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white/30" />
                  <span className="text-white/40 text-xs font-bold uppercase tracking-widest">
                    {sala.statusInterno === 'em_andamento' ? formatTime(matchTimeLeft) :
                     sala.statusInterno === 'confirmacao'  ? `Confirmar: ${timeLeftConfirm}s` :
                     sala.statusInterno === 'votacao'      ? 'Votação em andamento' :
                     !jogadorAtual ? 'Observando' : 'Aguardando Início'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-white/5">
                  <span className="text-xs font-black uppercase tracking-tighter" style={{ color: modoInfo.cor }}>
                    {modoInfo.icone} {modoInfo.nome}
                  </span>
                </div>
                {sala.mpoints > 0 ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border" style={{ borderColor: `${mpInfo.cor}40`, background: `${mpInfo.cor}10` }}>
                    <span className="text-xs font-black uppercase tracking-tighter" style={{ color: mpInfo.cor }}>
                      💰 {sala.mpoints.toLocaleString('pt-BR')} MP
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-white/5">
                    <span className="text-xs font-black uppercase tracking-tighter text-white/30">🎮 Casual</span>
                  </div>
                )}
              </div>
            </div>

            {/* AVISO: OBSERVADOR */}
            {!jogadorAtual && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3"
              >
                <span className="text-blue-400 text-lg">👁️</span>
                <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">
                  Você está observando — clique em uma vaga para entrar na partida
                </p>
              </motion.div>
            )}

            {/* TIMES */}
            <div className="grid grid-cols-2 gap-8">
              {/* TIME A */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10" style={{ background: `linear-gradient(135deg, ${modoInfo.cor}20, transparent)` }}>
                      {sala.timeALogo
                        ? <img src={sala.timeALogo} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
                        : <Sword className="w-5 h-5" style={{ color: modoInfo.cor }} />}
                    </div>
                    <div>
                      <h3 className="text-white font-black text-lg tracking-tight uppercase">{sala.timeANome || 'Time A'}</h3>
                      {sala.timeATag && <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">#{sala.timeATag}</span>}
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className="text-white/40 text-[10px] font-black">{timeA.length} / {vagasPorTime}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {rolesDisponiveis.slice(0, vagasPorTime).map((role, index) => {
                    const jog = timeA.find(j => j.role === role);
                    return jog ? renderJogadorCard(jog, true) : renderVagaAberta(role, index, true);
                  })}
                </div>
              </div>

              {/* TIME B */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10" style={{ background: 'linear-gradient(135deg, #ef444420, transparent)' }}>
                      {sala.timeBLogo
                        ? <img src={sala.timeBLogo} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
                        : <Shield className="w-5 h-5 text-red-400" />}
                    </div>
                    <div>
                      <h3 className="text-white font-black text-lg tracking-tight uppercase">{sala.timeBNome || 'Time B'}</h3>
                      {sala.timeBTag && <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">#{sala.timeBTag}</span>}
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className="text-white/40 text-[10px] font-black">{timeB.length} / {vagasPorTime}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {rolesDisponiveis.slice(0, vagasPorTime).map((role, index) => {
                    const jog = timeB.find(j => j.role === role);
                    return jog ? renderJogadorCard(jog, false) : renderVagaAberta(role, index, false);
                  })}
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="mt-10 flex flex-col gap-4">
              {sala.statusInterno === 'disputa' && (
                <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-bold uppercase tracking-widest">⚠️ DISPUTA ABERTA - Aguardando decisão do ADM</span>
                </div>
              )}

              {sala.statusInterno === 'finalizada' && (
                <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <Trophy className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-bold uppercase tracking-widest">Partida Finalizada — Vencedor: Time {sala.vencedor}</span>
                </div>
              )}

              {(!sala.statusInterno || sala.statusInterno === 'aguardando' || sala.statusInterno === 'confirmacao' || sala.statusInterno === 'pre_partida') && (
                <div className="flex gap-4">
                  {jogadorAtual && estaCheia && (
                    <button
                      onClick={handleConfirmarPresenca}
                      className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                        estaConfirmado
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                          : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {estaConfirmado
                        ? <><CheckCircle className="w-5 h-5" /> Presença Confirmada</>
                        : <><Check className="w-5 h-5" /> Confirmar Presença</>}
                    </button>
                  )}

                  {podeIniciar && (
                    <button
                      onClick={handleIniciarPartida}
                      className="flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${modoInfo.cor}, ${modoInfo.cor}dd)`, boxShadow: `0 8px 20px -6px ${modoInfo.cor}60` }}
                    >
                      <Sword className="w-5 h-5" /> Iniciar Partida
                    </button>
                  )}
                </div>
              )}

              {/* Mensagem de status */}
              <div className="flex justify-center">
                {estaCheia && !todosConfirmados ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/5 border border-yellow-500/10">
                    <Clock className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-yellow-500/60 text-[10px] font-black uppercase tracking-widest">
                      Aguardando {sala.jogadores.filter(j => !j.confirmado).length} confirmações ({timeLeftConfirm}s)
                    </span>
                  </div>
                ) : !estaCheia ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                    <RefreshCw className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">
                      Aguardando {sala.maxJogadores - sala.jogadores.length} jogadores
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAIS */}
      <AnimatePresence>
        {/* INICIAR PARTIDA */}
        {showStartConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Iniciar Partida</h3>
              <p className="text-white/60 text-sm mb-6">Confirma o início? Todos os jogadores devem ir para o League of Legends e entrar.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowStartConfirm(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-bold transition-colors">Cancelar</button>
                <button onClick={handleConfirmarInicio} className="flex-1 py-3 rounded-xl font-bold text-white transition-colors" style={{ background: modoInfo.cor }}>Confirmar</button>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
};
