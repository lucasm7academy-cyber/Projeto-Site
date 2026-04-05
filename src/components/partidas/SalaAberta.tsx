// src/components/partidas/salaaberta.tsx
// COMPONENTE COMPLETO - Salas Abertas

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Lock, Globe, Users, Sword, 
  X, ChevronRight, Crown, Shield, Clock,
  UserPlus, LogIn, ArrowLeft, Copy, Check,
  Trash2, AlertCircle
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface JogadorNaSala {
  id: string;
  nome: string;
  tag: string;
  elo: string;
  role: string;
  isLider: boolean;
  isTimeA: boolean;
}

interface Sala {
  id: string;
  nome: string;
  descricao: string;
  criadorId: string;
  criadorNome: string;
  timeANome?: string;
  timeATag?: string;
  timeBNome?: string;
  timeBTag?: string;
  jogadores: JogadorNaSala[];
  maxJogadores: number;
  temSenha: boolean;
  senha?: string;
  tipo: 'casual' | 'ranqueada' | 'treino';
  status: 'aberta' | 'cheia' | 'em_andamento';
  eloMinimo?: string;
  eloMaximo?: string;
  createdAt: Date;
}

// ============================================
// MODAL SENHA
// ============================================

const ModalSenha = ({ nome, onClose, onConfirm, erro }: any) => {
  const [senha, setSenha] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-[#0d0d0d] rounded-[26.5px] max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-yellow-400" />
            <h2 className="text-white font-black text-lg">Sala Privada</h2>
          </div>
          <p className="text-white/60 text-sm mb-4">A sala <strong>{nome}</strong> requer senha para entrar</p>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Digite a senha"
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm mb-4"
            autoFocus
          />
          {erro && <p className="text-red-400 text-xs mb-3">{erro}</p>}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(senha)}
              className="flex-1 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 text-sm font-medium"
            >
              Entrar
            </button>
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
  const [tipo, setTipo] = useState('casual');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [temSenha, setTemSenha] = useState(false);
  const [senha, setSenha] = useState('');
  const [usarTime, setUsarTime] = useState(false);
  const [maxJogadores, setMaxJogadores] = useState(10);
  const [eloMinimo, setEloMinimo] = useState('');
  const [loading, setLoading] = useState(false);

  const tipos = [
    { id: 'casual', nome: '🎮 Casual', cor: '#4ade80' },
    { id: 'ranqueada', nome: '🏆 Ranqueada', cor: '#fbbf24' },
    { id: 'treino', nome: '⚡ Treino', cor: '#3b82f6' },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    onCreate({
      tipo,
      nome: nome || `Sala de ${usuarioAtual.nome}`,
      descricao: descricao || `Partida ${tipo} - venha jogar!`,
      temSenha,
      senha: temSenha ? senha : undefined,
      usarTime: usarTime && userTeam,
      maxJogadores,
      eloMinimo: eloMinimo || undefined,
    });
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-[#0d0d0d] rounded-[26.5px] max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-white font-black text-xl">✨ Criar Sala</h2>
          <button onClick={onClose} className="p-1 rounded-lg bg-white/5">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Tipo */}
          <div>
            <label className="text-white/60 text-xs font-bold uppercase mb-2 block">Tipo</label>
            <div className="flex gap-2">
              {tipos.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    tipo === t.id 
                      ? 'bg-white/10 text-white border' 
                      : 'bg-white/5 text-white/40 border border-white/10'
                  }`}
                  style={tipo === t.id ? { borderColor: t.cor } : {}}
                >
                  {t.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="text-white/60 text-xs font-bold uppercase mb-2 block">Nome da Sala</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={`Ex: Sala do ${usuarioAtual.nome}`}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-sm"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-white/60 text-xs font-bold uppercase mb-2 block">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva sua sala..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-sm resize-none h-20"
            />
          </div>

          {/* Time fixo */}
          {userTeam && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div>
                <p className="text-white text-sm">Usar meu time</p>
                <p className="text-white/30 text-xs">{userTeam.nome} #{userTeam.tag}</p>
              </div>
              <button
                onClick={() => setUsarTime(!usarTime)}
                className={`w-10 h-5 rounded-full transition-all ${usarTime ? 'bg-blue-500' : 'bg-white/20'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-all ${usarTime ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          )}

          {/* Máximo de jogadores */}
          <div>
            <label className="text-white/60 text-xs font-bold uppercase mb-2 block">Máximo de Jogadores</label>
            <select
              value={maxJogadores}
              onChange={(e) => setMaxJogadores(Number(e.target.value))}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-sm"
            >
              <option value={10}>10 jogadores (5v5)</option>
              <option value={8}>8 jogadores (4v4)</option>
              <option value={6}>6 jogadores (3v3)</option>
              <option value={4}>4 jogadores (2v2)</option>
            </select>
          </div>

          {/* ELO mínimo */}
          <div>
            <label className="text-white/60 text-xs font-bold uppercase mb-2 block">ELO Mínimo (opcional)</label>
            <select
              value={eloMinimo}
              onChange={(e) => setEloMinimo(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-sm"
            >
              <option value="">Sem restrição</option>
              <option value="Ferro">Ferro+</option>
              <option value="Bronze">Bronze+</option>
              <option value="Prata">Prata+</option>
              <option value="Ouro">Ouro+</option>
              <option value="Platina">Platina+</option>
              <option value="Esmeralda">Esmeralda+</option>
              <option value="Diamante">Diamante+</option>
            </select>
          </div>

          {/* Senha */}
          <div className="flex items-center justify-between">
            <span className="text-white text-sm">Sala Privada</span>
            <button
              onClick={() => setTemSenha(!temSenha)}
              className={`w-10 h-5 rounded-full transition-all ${temSenha ? 'bg-yellow-500' : 'bg-white/20'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-all ${temSenha ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          {temSenha && (
            <input
              type="text"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite uma senha"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-sm"
            />
          )}
        </div>

        <div className="p-5 border-t border-white/10">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, #3b82f6, #8b5cf6)` }}
          >
            {loading ? 'Criando...' : 'Criar Sala'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL: SalaAberta
// ============================================

const SalaAberta = ({ 
  usuarioAtual,
  userTeam,
  onSair 
}: { 
  usuarioAtual: { id: string; nome: string; elo: string; role: string };
  userTeam?: { id: string; nome: string; tag: string };
  onSair?: () => void;
}) => {
  // Estados
  const [salas, setSalas] = useState<Sala[]>([]);
  const [salaAtual, setSalaAtual] = useState<Sala | null>(null);
  const [showCriarModal, setShowCriarModal] = useState(false);
  const [showSenhaModal, setShowSenhaModal] = useState<{ salaId: string; nome: string } | null>(null);
  const [senhaDigitada, setSenhaDigitada] = useState('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erroSenha, setErroSenha] = useState('');

  // Carregar salas mockadas
  useEffect(() => {
    setTimeout(() => {
      setSalas([
        {
          id: '1',
          nome: '🔥 Partida Rápida',
          descricao: 'Venham jogar, só diversão!',
          criadorId: 'user2',
          criadorNome: 'Joãozinho',
          timeANome: userTeam?.nome || 'Time A',
          timeATag: userTeam?.tag || 'TA',
          jogadores: [
            { id: usuarioAtual.id, nome: usuarioAtual.nome, tag: '#BR1', elo: usuarioAtual.elo, role: usuarioAtual.role, isLider: true, isTimeA: true },
            { id: '2', nome: 'Fulano', tag: '#BR1', elo: 'Ouro', role: 'MID', isLider: false, isTimeA: true },
          ],
          maxJogadores: 10,
          temSenha: false,
          tipo: 'casual',
          status: 'aberta',
          createdAt: new Date(),
        },
        {
          id: '2',
          nome: '🏆 Ranqueada - Só fortes',
          descricao: 'ELO mínimo Platina',
          criadorId: 'user3',
          criadorNome: 'Tryhard',
          timeANome: 'Nexus Dragon',
          timeATag: 'NDX',
          jogadores: [
            { id: '3', nome: 'Tryhard', tag: '#BR1', elo: 'Diamante', role: 'JG', isLider: true, isTimeA: true },
            { id: '4', nome: 'ProPlayer', tag: '#BR1', elo: 'Mestre', role: 'MID', isLider: false, isTimeA: true },
            { id: '5', nome: 'SuporteGod', tag: '#BR1', elo: 'Platina', role: 'SUP', isLider: false, isTimeA: true },
          ],
          maxJogadores: 10,
          temSenha: false,
          tipo: 'ranqueada',
          status: 'aberta',
          eloMinimo: 'Platina',
          createdAt: new Date(),
        },
        {
          id: '3',
          nome: '🔒 Sala Privada',
          descricao: 'Sala com senha - chamem no Discord',
          criadorId: 'user6',
          criadorNome: 'Private',
          jogadores: [
            { id: '6', nome: 'Private', tag: '#BR1', elo: 'Prata', role: 'TOP', isLider: true, isTimeA: true },
          ],
          maxJogadores: 10,
          temSenha: true,
          senha: '123',
          tipo: 'treino',
          status: 'aberta',
          createdAt: new Date(),
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  // Filtrar salas
  const salasFiltradas = salas.filter(sala => 
    sala.nome.toLowerCase().includes(busca.toLowerCase()) ||
    sala.descricao.toLowerCase().includes(busca.toLowerCase()) ||
    sala.timeANome?.toLowerCase().includes(busca.toLowerCase())
  );

  // Entrar na sala
  const entrarNaSala = (sala: Sala, senha?: string) => {
    // Verificar senha
    if (sala.temSenha && senha !== sala.senha) {
      setErroSenha('Senha incorreta');
      return;
    }
    
    // Verificar se já está cheia
    if (sala.jogadores.length >= sala.maxJogadores) {
      alert('⚠️ Sala está cheia!');
      return;
    }
    
    // Verificar ELO mínimo
    if (sala.eloMinimo && usuarioAtual.elo !== sala.eloMinimo) {
      alert(`⚠️ Esta sala requer ELO mínimo: ${sala.eloMinimo}`);
      return;
    }
    
    // Adicionar jogador à sala
    const novaSala = {
      ...sala,
      jogadores: [
        ...sala.jogadores,
        {
          id: usuarioAtual.id,
          nome: usuarioAtual.nome,
          tag: '#BR1',
          elo: usuarioAtual.elo,
          role: usuarioAtual.role,
          isLider: false,
          isTimeA: sala.jogadores.filter(j => j.isTimeA).length < 5,
        }
      ]
    };
    
    setSalas(salas.map(s => s.id === sala.id ? novaSala : s));
    setSalaAtual(novaSala);
    setShowSenhaModal(null);
    setSenhaDigitada('');
    setErroSenha('');
  };

  // Sair da sala
  const sairDaSala = (sala: Sala) => {
    const novaSala = {
      ...sala,
      jogadores: sala.jogadores.filter(j => j.id !== usuarioAtual.id)
    };
    
    setSalas(salas.map(s => s.id === sala.id ? novaSala : s));
    setSalaAtual(null);
  };

  // Criar nova sala
  const criarSala = (dados: any) => {
    const novaSala: Sala = {
      id: Date.now().toString(),
      nome: dados.nome || `Sala de ${usuarioAtual.nome}`,
      descricao: dados.descricao || `Partida ${dados.tipo} - venha jogar!`,
      criadorId: usuarioAtual.id,
      criadorNome: usuarioAtual.nome,
      timeANome: dados.usarTime ? userTeam?.nome : 'Time A',
      timeATag: dados.usarTime ? userTeam?.tag : undefined,
      jogadores: [
        {
          id: usuarioAtual.id,
          nome: usuarioAtual.nome,
          tag: '#BR1',
          elo: usuarioAtual.elo,
          role: usuarioAtual.role,
          isLider: true,
          isTimeA: true,
        }
      ],
      maxJogadores: dados.maxJogadores || 10,
      temSenha: dados.temSenha || false,
      senha: dados.temSenha ? dados.senha : undefined,
      tipo: dados.tipo || 'casual',
      status: 'aberta',
      eloMinimo: dados.eloMinimo,
      createdAt: new Date(),
    };
    
    setSalas([novaSala, ...salas]);
    setSalaAtual(novaSala);
    setShowCriarModal(false);
  };

  // Apagar sala
  const apagarSala = (salaId: string) => {
    if (confirm('Tem certeza que quer apagar esta sala?')) {
      setSalas(salas.filter(s => s.id !== salaId));
      if (salaAtual?.id === salaId) setSalaAtual(null);
    }
  };

  // Copiar código
  const copiarCodigo = (salaId: string) => {
    navigator.clipboard.writeText(salaId);
    alert('✅ Código da sala copiado!');
  };

  // ============================================
  // TELA DENTRO DA SALA
  // ============================================
  
  if (salaAtual) {
    const isCriador = salaAtual.criadorId === usuarioAtual.id;
    const timeA = salaAtual.jogadores.filter(j => j.isTimeA);
    const timeB = salaAtual.jogadores.filter(j => !j.isTimeA);
    const estaCheia = salaAtual.jogadores.length >= salaAtual.maxJogadores;
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div className="bg-[#0d0d0d] rounded-[26.5px] max-w-5xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => sairDaSala(salaAtual)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-black text-xl">{salaAtual.nome}</h2>
                  {salaAtual.temSenha && <Lock className="w-4 h-4 text-yellow-400" />}
                </div>
                <p className="text-white/40 text-sm">{salaAtual.descricao}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => copiarCodigo(salaAtual.id)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10"
              >
                <Copy className="w-4 h-4 text-white/60" />
              </button>
              {isCriador && (
                <button 
                  onClick={() => apagarSala(salaAtual.id)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          </div>

          <div className="p-5">
            {/* Status */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${estaCheia ? 'bg-green-400' : 'bg-yellow-400'}`} />
                <span className="text-white/60 text-sm">
                  {estaCheia ? 'Sala cheia! Partida vai começar...' : `${salaAtual.jogadores.length}/${salaAtual.maxJogadores} jogadores`}
                </span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                salaAtual.tipo === 'ranqueada' ? 'bg-yellow-500/20 text-yellow-400' :
                salaAtual.tipo === 'treino' ? 'bg-blue-500/20 text-blue-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {salaAtual.tipo === 'ranqueada' ? '🏆 Ranqueada' : 
                 salaAtual.tipo === 'treino' ? '⚡ Treino' : '🎮 Casual'}
              </span>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-6">
              {/* Time A */}
              <div className="bg-white/[0.02] rounded-[20px] border border-white/5 overflow-hidden">
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-bold">
                      {salaAtual.timeANome || 'Time A'}
                      {salaAtual.timeATag && <span className="text-white/40 ml-1">#{salaAtual.timeATag}</span>}
                    </span>
                  </div>
                  <span className="text-white/40 text-xs">{timeA.length}/5</span>
                </div>
                <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                  {timeA.map(jogador => (
                    <div key={jogador.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold">{jogador.nome[0]}</span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{jogador.nome}</p>
                          <p className="text-white/30 text-[10px]">{jogador.role} • {jogador.elo}</p>
                        </div>
                      </div>
                      {jogador.isLider && <Crown className="w-3 h-3 text-yellow-400" />}
                    </div>
                  ))}
                  {Array(5 - timeA.length).fill(0).map((_, i) => (
                    <div key={`empty-a-${i}`} className="flex items-center gap-2 p-2 opacity-50">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <UserPlus className="w-3 h-3 text-white/30" />
                      </div>
                      <span className="text-white/30 text-sm">Aguardando...</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time B */}
              <div className="bg-white/[0.02] rounded-[20px] border border-white/5 overflow-hidden">
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-400" />
                    <span className="text-white font-bold">{salaAtual.timeBNome || 'Time B'}</span>
                  </div>
                  <span className="text-white/40 text-xs">{timeB.length}/5</span>
                </div>
                <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                  {timeB.map(jogador => (
                    <div key={jogador.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                          <span className="text-xs font-bold">{jogador.nome[0]}</span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{jogador.nome}</p>
                          <p className="text-white/30 text-[10px]">{jogador.role} • {jogador.elo}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {Array(5 - timeB.length).fill(0).map((_, i) => (
                    <div key={`empty-b-${i}`} className="flex items-center gap-2 p-2 opacity-50">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <UserPlus className="w-3 h-3 text-white/30" />
                      </div>
                      <span className="text-white/30 text-sm">Aguardando...</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Botão Iniciar */}
            {isCriador && estaCheia && (
              <button
                className="w-full mt-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, #4ade80, #22c55e)` }}
                onClick={() => alert('🎮 Partida iniciada!')}
              >
                <Sword className="w-4 h-4 inline mr-2" />
                Iniciar Partida
              </button>
            )}

            {/* Aviso */}
            {!estaCheia && (
              <div className="mt-6 text-center p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                <Clock className="w-4 h-4 text-yellow-400 inline mr-2" />
                <span className="text-yellow-400/60 text-sm">Aguardando {salaAtual.maxJogadores - salaAtual.jogadores.length} jogadores...</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ============================================
  // TELA LISTA DE SALAS
  // ============================================

  return (
    <>
      <div className="bg-[#0d0d0d] rounded-[26.5px] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-white font-black text-xl">🔓 Salas Abertas</h2>
              <p className="text-white/40 text-sm">Entre em uma sala ou crie a sua</p>
            </div>
            <button
              onClick={() => setShowCriarModal(true)}
              className="px-4 py-2 rounded-xl font-bold text-white flex items-center gap-2 transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, #3b82f6, #8b5cf6)` }}
            >
              <Plus className="w-4 h-4" />
              Criar Sala
            </button>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Buscar sala por nome, time ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white text-sm placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="p-5 max-h-[500px] overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 mx-auto mb-3" />
              <p className="text-white/40">Carregando salas...</p>
            </div>
          ) : salasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/30">Nenhuma sala encontrada</p>
              <p className="text-white/20 text-sm mt-1">Crie uma sala para começar!</p>
            </div>
          ) : (
            salasFiltradas.map((sala) => {
              const estaCheia = sala.jogadores.length >= sala.maxJogadores;
              const podeEntrar = !estaCheia && !sala.jogadores.some(j => j.id === usuarioAtual.id);
              
              return (
                <motion.div
                  key={sala.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/[0.02] border border-white/5 rounded-[20px] p-4 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sala.tipo === 'ranqueada' ? 'bg-yellow-500/20 text-yellow-400' :
                          sala.tipo === 'treino' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {sala.tipo === 'ranqueada' ? '🏆 Ranqueada' : 
                           sala.tipo === 'treino' ? '⚡ Treino' : '🎮 Casual'}
                        </span>
                        {sala.temSenha && <Lock className="w-3 h-3 text-yellow-400" />}
                        {sala.eloMinimo && (
                          <span className="text-[10px] text-white/30">🔰 Mín: {sala.eloMinimo}</span>
                        )}
                      </div>
                      
                      <h3 className="text-white font-bold text-lg">{sala.nome}</h3>
                      <p className="text-white/40 text-sm mb-2">{sala.descricao}</p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-white/30" />
                          <span className="text-white/40 text-xs">{sala.jogadores.length}/{sala.maxJogadores}</span>
                        </div>
                        {sala.timeANome && (
                          <div className="flex items-center gap-1">
                            <Crown className="w-3 h-3 text-blue-400" />
                            <span className="text-white/40 text-xs">{sala.timeANome}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-white/30 text-xs">Criador: {sala.criadorNome}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (sala.temSenha) {
                          setShowSenhaModal({ salaId: sala.id, nome: sala.nome });
                        } else {
                          entrarNaSala(sala);
                        }
                      }}
                      disabled={!podeEntrar}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        podeEntrar 
                          ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                          : 'bg-white/5 text-white/20 cursor-not-allowed'
                      }`}
                    >
                      <LogIn className="w-3 h-3" />
                      {estaCheia ? 'Cheia' : sala.jogadores.some(j => j.id === usuarioAtual.id) ? 'Dentro' : 'Entrar'}
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Modais */}
      <AnimatePresence>
        {showCriarModal && (
          <ModalCriarSala
            onClose={() => setShowCriarModal(false)}
            onCreate={criarSala}
            usuarioAtual={usuarioAtual}
            userTeam={userTeam}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSenhaModal && (
          <ModalSenha
            nome={showSenhaModal.nome}
            onClose={() => {
              setShowSenhaModal(null);
              setErroSenha('');
            }}
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