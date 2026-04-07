// src/components/partidas/SalaAberta.tsx
// COMPONENTE: Lista de salas abertas e criação de novas salas (conectado ao Supabase)

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Lock, Users, Crown, X, LogIn, Zap } from 'lucide-react';
import { SalaInterna } from './SalaInterna';
import {
  MODOS_JOGO, OPCOES_ELO, OPCOES_MPOINTS, getModoInfo, getMPointsInfo,
  getMaxJogadoresPorModo, type ModoJogo,
} from './salaConfig';
import {
  carregarSalas, criarSala, deletarSala as deletarSalaDB,
  type Sala,
} from '../../api/salas';
import { supabase } from '../../lib/supabase';

// ============================================
// MODAL SENHA
// ============================================

const ModalSenha = ({ nome, onClose, onConfirm, erro }: any) => {
  const [senha, setSenha] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13, 13, 13, 0.6)',
          border: '3px solid #FFB700',
          boxShadow: '0 0 45px -10px rgba(255, 183, 0, 0.6)',
          backdropFilter: 'blur(16px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-15 pointer-events-none" style={{ background: '#FFB700' }} />
        <div className="relative z-10">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-yellow-500/20">
                <Lock className="w-4 h-4 text-yellow-400" />
              </div>
              <h2 className="text-white font-black text-lg tracking-tight uppercase">Sala Privada</h2>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-white/60 text-sm font-medium">A sala <span className="text-white font-bold">{nome}</span> requer senha para entrar</p>
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Senha da Sala</label>
              <input
                type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a senha"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-white/30"
                autoFocus
              />
            </div>
            {erro && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-xs font-medium">{erro}</p>
              </motion.div>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={() => onConfirm(senha)} className="flex-1 py-3 rounded-xl bg-yellow-500 text-black text-sm font-black hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20">Entrar</button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// MODAL CRIAR SALA
// ============================================

const ModalCriarSala = ({ onClose, onCreate, usuarioAtual, userTeam }: any) => {
  const [modo, setModo] = useState<ModoJogo>('5v5');
  const [mpoints, setMpoints] = useState(0);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [temSenha, setTemSenha] = useState(false);
  const [senha, setSenha] = useState('');
  const [eloMinimo, setEloMinimo] = useState('');
  const [usarTime, setUsarTime] = useState(false);
  const [loading, setLoading] = useState(false);

  const modoInfo = getModoInfo(modo);
  const mpInfo = getMPointsInfo(mpoints);

  const handleSubmit = async () => {
    setLoading(true);
    const maxJogadores = getMaxJogadoresPorModo(modo);
    await onCreate({
      modo,
      mpoints,
      nome: nome || `Sala ${MODOS_JOGO[modo].nome} de ${usuarioAtual.nome}`,
      descricao: descricao || MODOS_JOGO[modo].descricao,
      temSenha,
      senha: temSenha ? senha : undefined,
      maxJogadores,
      eloMinimo: eloMinimo || undefined,
      timeANome: usarTime && userTeam ? userTeam.nome : undefined,
      timeATag:  usarTime && userTeam ? userTeam.tag  : undefined,
      timeALogo: usarTime && userTeam ? userTeam.logo : undefined,
    });
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13, 13, 13, 0.6)',
          border: `3px solid ${modoInfo.cor}`,
          boxShadow: `0 0 45px -10px ${modoInfo.cor}60`,
          backdropFilter: 'blur(16px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-15 pointer-events-none" style={{ background: modoInfo.cor }} />

        <div className="relative z-10">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${modoInfo.cor}25` }}>
                <Plus className="w-4 h-4" style={{ color: modoInfo.cor }} />
              </div>
              <h2 className="text-white font-black text-lg tracking-tight uppercase">Criar Sala</h2>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Nome */}
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Nome da Sala</label>
              <input
                type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                placeholder={`Ex: ${MODOS_JOGO[modo].nome} do ${usuarioAtual.nome}`}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-white/30"
              />
            </div>

            {/* M Points */}
            <div className="space-y-3">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                Valor da Partida — M Points
              </label>
              <div className="grid grid-cols-3 gap-2">
                {OPCOES_MPOINTS.map((op) => (
                  <button
                    key={op.valor}
                    onClick={() => setMpoints(op.valor)}
                    className="p-3 rounded-xl text-center transition-all border"
                    style={
                      mpoints === op.valor
                        ? { borderColor: op.cor, background: `${op.cor}18`, color: op.cor }
                        : { borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)' }
                    }
                  >
                    <p className="text-xs font-black uppercase tracking-tighter leading-tight">
                      {op.valor === 0 ? '🎮 Casual' : `💰 ${op.valor.toLocaleString('pt-BR')} MP`}
                    </p>
                  </button>
                ))}
              </div>
              {mpoints > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: mpInfo.cor }}
                >
                  Cada jogador aposta {mpoints.toLocaleString('pt-BR')} MP · o vencedor leva tudo
                </motion.p>
              )}
            </div>

            {/* Modo */}
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Modo de Jogo</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(MODOS_JOGO) as [ModoJogo, typeof MODOS_JOGO[ModoJogo]][]).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setModo(key)}
                    className="p-3 rounded-xl text-left transition-all border"
                    style={
                      modo === key
                        ? { borderColor: value.cor, background: `${value.cor}15`, color: 'white' }
                        : { borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)' }
                    }
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{value.icone}</span>
                      <span className="text-xs font-black uppercase tracking-tighter">{value.nome}</span>
                    </div>
                    <p className="text-[9px] font-medium opacity-60 leading-tight uppercase tracking-widest">{value.descricao}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Descrição</label>
              <textarea
                value={descricao} onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva sua sala..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm resize-none h-20 focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Time */}
            {userTeam && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    {userTeam.logo
                      ? <img src={userTeam.logo} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
                      : <Crown className="w-5 h-5 text-white/30" />}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm tracking-tight">Usar meu time</p>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{userTeam.nome} #{userTeam.tag}</p>
                  </div>
                </div>
                <button
                  onClick={() => setUsarTime(!usarTime)}
                  className={`w-12 h-6 rounded-full transition-all relative ${usarTime ? 'bg-blue-500' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${usarTime ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            )}

            {/* Elo + Privacidade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">ELO Mínimo</label>
                <select
                  value={eloMinimo} onChange={(e) => setEloMinimo(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-white/30"
                >
                  {OPCOES_ELO.map(elo => (
                    <option key={elo.valor} value={elo.valor} className="bg-[#0d0d0d]">{elo.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Privacidade</label>
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl h-[46px]">
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Privada</span>
                  <button
                    onClick={() => setTemSenha(!temSenha)}
                    className={`w-10 h-5 rounded-full transition-all relative ${temSenha ? 'bg-yellow-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${temSenha ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            {temSenha && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <label className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Senha da Sala</label>
                <input
                  type="text" value={senha} onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite uma senha"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-white/30"
                />
              </motion.div>
            )}
          </div>

          <div className="p-6 border-t border-white/8 bg-white/[0.02]">
            <button
              onClick={handleSubmit} disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${modoInfo.cor}, ${modoInfo.cor}dd)`,
                boxShadow: `0 8px 20px -6px ${modoInfo.cor}60`
              }}
            >
              {loading ? 'Criando...' : 'Criar Sala'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL: SALA ABERTA
// ============================================

interface SalaAbertaProps {
  usuarioAtual: { id: string; nome: string; tag?: string; elo: string; role: string };
  userTeam?: { id: string; nome: string; tag: string; logo?: string };
  onSair?: () => void;
}

export const SalaAberta = ({ usuarioAtual, userTeam, onSair }: SalaAbertaProps) => {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [salaSelecionada, setSalaSelecionada] = useState<Sala | null>(null);
  const [showCriarModal, setShowCriarModal] = useState(false);
  const [showSenhaModal, setShowSenhaModal] = useState<{ salaId: number; nome: string } | null>(null);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erroSenha, setErroSenha] = useState('');

  const recarregar = useCallback(async () => {
    const lista = await carregarSalas();
    setSalas(lista);
    setLoading(false);
    // Atualiza sala selecionada se ainda existir
    if (salaSelecionada) {
      const atualizada = lista.find(s => s.id === salaSelecionada.id);
      if (atualizada) setSalaSelecionada(atualizada);
    }
  }, [salaSelecionada]);

  useEffect(() => {
    recarregar();

    // Realtime — atualiza lista quando algo mudar nas salas
    const channel = supabase
      .channel('salas_lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, recarregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sala_jogadores' }, recarregar)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const salasFiltradas = salas.filter(sala =>
    sala.nome.toLowerCase().includes(busca.toLowerCase()) ||
    sala.descricao.toLowerCase().includes(busca.toLowerCase()) ||
    sala.timeANome?.toLowerCase().includes(busca.toLowerCase()) ||
    sala.codigo.includes(busca.toUpperCase())
  );

  const entrarNaSala = (sala: Sala, senha?: string) => {
    if (sala.temSenha && senha !== sala.senha) {
      setErroSenha('Senha incorreta');
      return;
    }
    setSalaSelecionada(sala);
    setShowSenhaModal(null);
    setErroSenha('');
  };

  const atualizarSala = (salaAtualizada: Sala) => {
    setSalas(prev => prev.map(s => s.id === salaAtualizada.id ? salaAtualizada : s));
    setSalaSelecionada(salaAtualizada);
  };

  const handleCriarSala = async (dados: any) => {
    const nova = await criarSala(dados, usuarioAtual);
    if (nova) {
      setSalas(prev => [nova, ...prev]);
      setSalaSelecionada(nova);
      setShowCriarModal(false);
    }
  };

  const handleDeletarSala = async (salaId: number) => {
    await deletarSalaDB(salaId);
    setSalas(prev => prev.filter(s => s.id !== salaId));
    if (salaSelecionada?.id === salaId) setSalaSelecionada(null);
  };

  // Se tem sala selecionada, mostra SalaInterna
  if (salaSelecionada) {
    return (
      <SalaInterna
        sala={salaSelecionada}
        usuarioAtual={usuarioAtual}
        onAtualizarSala={atualizarSala}
        onDeletarSala={handleDeletarSala}
        onSair={() => setSalaSelecionada(null)}
      />
    );
  }

  return (
    <>
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13, 13, 13, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)'
        }}
      >
        <div className="p-6 border-b border-white/8 bg-white/[0.02]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-white font-black text-xl tracking-tight uppercase">🔓 Salas Abertas</h2>
              <p className="text-white/40 text-xs font-medium uppercase tracking-widest mt-1">Entre em uma sala ou crie a sua</p>
            </div>
            <button
              onClick={() => setShowCriarModal(true)}
              className="px-6 py-3 rounded-xl font-black text-sm text-white flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #FFB700, #FF6600)',
                boxShadow: '0 8px 20px -6px rgba(255, 183, 0, 0.4)'
              }}
            >
              <Plus className="w-5 h-5" />
              CRIAR SALA
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
            <input
              type="text"
              placeholder="BUSCAR POR NOME, TIME OU CÓDIGO (#000001)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all uppercase font-bold tracking-tight"
            />
          </div>
        </div>

        <div className="p-6 max-h-[600px] overflow-y-auto space-y-4 custom-scrollbar">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent mx-auto mb-4" />
              <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Carregando salas...</p>
            </div>
          ) : salasFiltradas.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
              <Users className="w-16 h-16 text-white/5 mx-auto mb-4" />
              <p className="text-white/30 font-black uppercase tracking-widest">Nenhuma sala encontrada</p>
              <p className="text-white/10 text-[10px] font-bold uppercase tracking-widest mt-2">Crie uma sala para começar!</p>
            </div>
          ) : (
            salasFiltradas.map((sala) => {
              const modoInfo = getModoInfo(sala.modo);
              const mpInfo = getMPointsInfo(sala.mpoints);
              const estaCheia = sala.jogadores.length >= sala.maxJogadores;
              const jaEsta = sala.jogadores.some(j => j.id === usuarioAtual.id);
              const podeEntrar = !estaCheia && !jaEsta;

              return (
                <motion.div
                  key={sala.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.06] hover:border-white/10 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex-1">
                      {/* Badges superiores */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {/* Código da partida */}
                        <span className="px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-[10px] font-black font-mono tracking-widest text-white/50">
                          {sala.codigo}
                        </span>

                        {/* Modo */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/5 bg-white/5">
                          <span className="text-[10px] font-black uppercase tracking-tighter" style={{ color: modoInfo.cor }}>
                            {modoInfo.icone} {modoInfo.nome}
                          </span>
                        </div>

                        {/* M Points */}
                        {sala.mpoints > 0 ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border" style={{ borderColor: `${mpInfo.cor}40`, background: `${mpInfo.cor}10` }}>
                            <Zap className="w-3 h-3" style={{ color: mpInfo.cor }} />
                            <span className="text-[10px] font-black uppercase tracking-tighter" style={{ color: mpInfo.cor }}>
                              {sala.mpoints.toLocaleString('pt-BR')} MP
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/5 bg-white/5">
                            <span className="text-[10px] font-black uppercase tracking-tighter text-white/30">🎮 Casual</span>
                          </div>
                        )}

                        {sala.temSenha && (
                          <div className="w-6 h-6 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                            <Lock className="w-3.5 h-3.5 text-yellow-400" />
                          </div>
                        )}
                        {sala.eloMinimo && (
                          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">🔰 Mín: {sala.eloMinimo}</span>
                        )}
                      </div>

                      <h3 className="text-white font-black text-xl tracking-tight uppercase group-hover:text-[#FFB700] transition-colors">{sala.nome}</h3>
                      <p className="text-white/40 text-xs font-medium uppercase tracking-wider mt-1 mb-4">{sala.descricao}</p>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 text-white/30" />
                          </div>
                          <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{sala.jogadores.length} / {sala.maxJogadores}</span>
                        </div>
                        {sala.timeANome && (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Crown className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{sala.timeANome}</span>
                          </div>
                        )}
                        <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">CRIADOR: {sala.criadorNome}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (sala.temSenha && !jaEsta) {
                          setShowSenhaModal({ salaId: sala.id, nome: sala.nome });
                        } else {
                          entrarNaSala(sala);
                        }
                      }}
                      disabled={!podeEntrar && !jaEsta}
                      className={`ml-4 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2 ${
                        jaEsta
                          ? 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
                          : podeEntrar
                          ? 'bg-white/5 border border-white/10 text-white/60 hover:bg-[#FFB700] hover:text-black hover:border-[#FFB700] hover:shadow-lg hover:shadow-[#FFB700]/20'
                          : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed'
                      }`}
                    >
                      <LogIn className="w-4 h-4" />
                      {jaEsta ? 'VOLTAR' : estaCheia ? 'CHEIA' : 'ENTRAR'}
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCriarModal && (
          <ModalCriarSala
            onClose={() => setShowCriarModal(false)}
            onCreate={handleCriarSala}
            usuarioAtual={usuarioAtual}
            userTeam={userTeam}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSenhaModal && (
          <ModalSenha
            nome={showSenhaModal.nome}
            onClose={() => { setShowSenhaModal(null); setErroSenha(''); }}
            onConfirm={(senha: string) => {
              const sala = salas.find(s => s.id === showSenhaModal.salaId);
              if (sala) entrarNaSala(sala, senha);
            }}
            erro={erroSenha}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default SalaAberta;
