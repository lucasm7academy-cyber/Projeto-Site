import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle, AlertCircle, RefreshCw, ShieldCheck, Timer, Unlink, User, Gamepad2, ArrowLeft} from 'lucide-react';
import { buscarJogadorCompleto, buscarSugestoes, buildProfileIconUrl } from '../api/riot';
import { motion, AnimatePresence } from 'motion/react';
import { useVerificacao } from '../contexts/VerificacaoContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useSound } from '../hooks/useSound';


const ICONES_PADRAO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function Vincular() {
  const navigate = useNavigate();
  const { playSound } = useSound();
  const [searchTerm, setSearchTerm] = useState('');
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invocador, setInvocador] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [passo, setPasso] = useState<'busca' | 'validando' | 'verificando' | 'sucesso' | 'ja_vinculada'>('busca');
  const [iconeRequerido, setIconeRequerido] = useState<number | null>(null);
  const [popup, setPopup] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [contaVinculada, setContaVinculada] = useState<any>(null);
  const [jaVinculadaInfo, setJaVinculadaInfo] = useState<{ riotId: string; email: string } | null>(null);
  const [desvinculando, setDesvinculando] = useState(false);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const { verificacaoAtiva, iniciarVerificacao, cancelarVerificacao } = useVerificacao();

  const getIconeUrl = buildProfileIconUrl;

  // Carregar conta vinculada ao iniciar
  useEffect(() => {
    const carregarContaVinculada = async () => {
      if (!supabase) { setCarregandoInicial(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('contas_riot')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data && !error) {
          setContaVinculada(data);
          setInvocador({
            riotId: data.riot_id,
            puuid: data.puuid,
            summonerId: data.summoner_id,
            nivel: data.level,
            iconeId: data.profile_icon_id,
            iconeUrl: getIconeUrl(data.profile_icon_id)
          });
          setPasso('sucesso');
          setCarregandoInicial(false);
          return;
        }
      }

      // Sem conta vinculada — checar se há verificação em andamento no localStorage
      // (evita depender do timing do context, que pode não ter carregado ainda)
      try {
        const salva = localStorage.getItem('verificacao_ativa');
        if (salva) {
          const dados = JSON.parse(salva);
          const tempoPassado = (Date.now() - dados.iniciadoEm) / 1000;
          if (tempoPassado < 240 && (dados.status === 'pendente' || dados.status === 'verificando')) {
            setPasso('verificando');
            setInvocador({
              riotId: dados.riotId,
              puuid: dados.puuid,
              summonerId: dados.summonerId,
              nivel: dados.nivel,
              iconeId: dados.iconeAtual,
              iconeUrl: getIconeUrl(dados.iconeAtual)
            });
            setIconeRequerido(dados.iconeEsperado);
          }
        }
      } catch (_) {}

      setCarregandoInicial(false);
    };

    carregarContaVinculada();
  }, []);

  // Função para desvincular conta
  const handleDesvincular = async () => {
    setDesvinculando(true);
    
    try {
      if (!supabase) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        // Remover do time automaticamente antes de desvincular
        await supabase.from('time_membros').delete().eq('user_id', user.id);

        const { error, count } = await supabase
          .from('contas_riot')
          .delete({ count: 'exact' })
          .eq('user_id', user.id);

        console.log('[desvincular] error:', error, '| linhas afetadas:', count);
        if (error) throw error;
        
        setPopup({
          type: 'success',
          message: '✅ Conta desvinculada com sucesso!'
        });
        
        // Resetar estados
        setContaVinculada(null);
        setInvocador(null);
        setPasso('busca');
        setSearchTerm('');
        setIconeRequerido(null);
      }
    } catch (error) {
      console.error('Erro ao desvincular:', error);
      setPopup({
        type: 'error',
        message: '❌ Erro ao desvincular conta. Tente novamente.'
      });
    } finally {
      setDesvinculando(false);
    }
  };

  useEffect(() => {
    if (popup) {
      const timer = setTimeout(() => setPopup(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  useEffect(() => {
    if (verificacaoAtiva && verificacaoAtiva.status === 'verificando') {
      setPasso('verificando');
      setInvocador({
        riotId: verificacaoAtiva.riotId,
        puuid: verificacaoAtiva.puuid,
        summonerId: verificacaoAtiva.summonerId,
        nivel: verificacaoAtiva.nivel,
        iconeId: verificacaoAtiva.iconeAtual,
        iconeUrl: getIconeUrl(verificacaoAtiva.iconeAtual)
      });
      setIconeRequerido(verificacaoAtiva.iconeEsperado);
    }
  }, [verificacaoAtiva]);

  useEffect(() => {
    const handleConcluida = async () => {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('contas_riot')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data && !error) {
            setContaVinculada(data);
            setPasso('sucesso');
            return;
          }
        }
      }
      // Chegou aqui = não conseguiu carregar a conta do banco
      setPopup({
        type: 'error',
        message: '❌ Conta verificada, mas houve um erro ao carregar os dados. Recarregue a página.'
      });
      setPasso('busca');
    };

    const handleErroSalvar = () => {
      setPopup({
        type: 'error',
        message: '❌ Falha ao salvar a conta no banco de dados. Verifique o ícone e tente novamente.'
      });
      setPasso('busca');
      setInvocador(null);
      setIconeRequerido(null);
    };

    const handleTimeout = () => {
      setPopup({
        type: 'error',
        message: '⏰ Tempo esgotado! Verifique se você trocou para o ícone correto e tente novamente.'
      });
      setPasso('busca');
      setInvocador(null);
      setIconeRequerido(null);
    };

    window.addEventListener('verificacao_concluida', handleConcluida as EventListener);
    window.addEventListener('verificacao_erro_salvar', handleErroSalvar as EventListener);
    window.addEventListener('verificacao_timeout', handleTimeout as EventListener);

    return () => {
      window.removeEventListener('verificacao_concluida', handleConcluida as EventListener);
      window.removeEventListener('verificacao_erro_salvar', handleErroSalvar as EventListener);
      window.removeEventListener('verificacao_timeout', handleTimeout as EventListener);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        buscarSugestoes(searchTerm).then(setSugestoes);
        setShowSuggestions(true);
      } else {
        setSugestoes([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelecionarJogador = async (riotId: string) => {
    setSearchTerm(riotId);
    setShowSuggestions(false);
    setLoading(true);
    setErro('');

    const resultado = await buscarJogadorCompleto(riotId);
    
    if (!resultado.success) {
      setErro((resultado as any).error);
      setLoading(false);
      return;
    }

    // VERIFICAÇÃO DE CONTA JÁ VINCULADA NO SISTEMA
    if (supabase) {
      const { data: vinculoExistente, error: errorVinculo } = await supabase
        .from('contas_riot')
        .select('user_id, riot_id')
        .eq('puuid', resultado.data.puuid)
        .maybeSingle();

      if (vinculoExistente && !errorVinculo) {
        // Buscar o email do dono do vínculo (assumindo tabela profiles ou similar)
        const { data: profileDono } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', vinculoExistente.user_id)
          .maybeSingle();

        setJaVinculadaInfo({
          riotId: vinculoExistente.riot_id,
          email: profileDono?.email || 'outro usuário'
        });
        setPasso('ja_vinculada');
        setLoading(false);
        return;
      }
    }

    const iconeAtual = resultado.data.iconeId;
    const iconeAleatorio = iconeAtual;
    // AS DUAS DE CIMA DEIXA TUDO IGUAL PAR TESTES ///
    
    //const iconeAtual = resultado.data.iconeId;
    //const iconesFiltrados = ICONES_PADRAO.filter(i => i !== iconeAtual);
    //const iconeAleatorio = iconesFiltrados[Math.floor(Math.random() * iconesFiltrados.length)];
    //AS TRES DE CIMA PARA GARANTIR QUE O ÍCONE REQUERIDO SEJA SEMPRE DIFERENTE DO ATUAL, EVITANDO FALHAS NA VERIFICAÇÃO
    
    setIconeRequerido(iconeAleatorio);
    setInvocador(resultado.data);
    setPasso('validando');
    setLoading(false);
  };

  const iniciarVerificacaoAutomatica = () => {
    if (!invocador || !iconeRequerido) return;
    
    iniciarVerificacao({
      riotId: invocador.riotId,
      puuid: invocador.puuid,
      summonerId: invocador.summonerId,
      iconeAtual: invocador.iconeId,
      iconeEsperado: iconeRequerido,
      nivel: invocador.nivel,
      nickname: invocador.riotId.split('#')[0]
    });
    
    setPasso('verificando');
  };

  const handleReiniciar = () => {
    cancelarVerificacao();
    setSearchTerm('');
    setInvocador(null);
    setJaVinculadaInfo(null);
    setPasso('busca');
    setErro('');
    setIconeRequerido(null);
  };


  if (carregandoInicial) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
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
            {popup.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {popup.type === 'success' && <CheckCircle className="w-5 h-5" />}
            <span className="font-medium">{popup.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Alinhamento à esquerda com estilo premium */}
      <div className="mb-6 relative">
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-full blur-sm hidden md:block" />
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.1)]">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
              Vincular <span className="text-primary">Conta Riot</span>
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-transparent mt-1 rounded-full" />
          </div>
        </div>
        <p className="text-white/40 text-sm font-medium max-w-md">
          Conecte sua identidade do League of Legends para desbloquear partidas ranqueadas e recompensas exclusivas.
        </p>
      </div>

      {/* Estado com conta já vinculada */}
      {passo === 'sucesso' && contaVinculada && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Banner de sucesso com timeout (vai sumir após 5 segundos) */}
          <AnimatePresence>
            {popup?.type === 'success' && popup.message === '✅ Conta desvinculada com sucesso!' ? null : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex items-center gap-4 shadow-[0_0_30px_rgba(34,197,94,0.1)]"
              >
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-green-500 font-black uppercase tracking-wider text-sm">Conta Verificada!</p>
                  <p className="text-white/60 text-sm">Sua conta Riot foi vinculada com sucesso à plataforma.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card da conta vinculada */}
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            
            <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Gamepad2 className="w-3 h-3 text-primary" />
              CONTA VINCULADA
            </h3>
            
            <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <img 
                  src={invocador?.iconeUrl || getIconeUrl(contaVinculada.profile_icon_id)} 
                  className="w-28 h-28 rounded-full border-4 border-primary relative z-10 shadow-2xl" 
                  alt="Ícone" 
                />
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 z-20 border-4 border-[#0a0a0a]">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <p className="text-3xl font-black text-white tracking-tight">{contaVinculada.riot_id}</p>
                <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                  <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-white/60 border border-white/10">Nível {contaVinculada.level}</span>
                  <span className="text-[10px] text-primary font-black uppercase tracking-widest">Verificado</span>
                </div>
                <p className="text-[10px] text-white/30 mt-3 uppercase tracking-widest">Desde {new Date(contaVinculada.verified_at || contaVinculada.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Apenas Elo se existir - sem PUUID */}
            {contaVinculada.elo && (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-8 flex items-center justify-between">
                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Classificação Atual</span>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-primary font-black text-xl italic uppercase tracking-tighter">{contaVinculada.elo}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Botão Editar Conta */}
              <button
                onClick={() => {
                  playSound('click');
                  navigate('/perfil');
                }}
                className="py-4 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 group"
              >
                <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                EDITAR MINHA CONTA
              </button>

              {/* Botão Desvincular */}
              <button
                onClick={handleDesvincular}
                onMouseDown={() => playSound('click')}
                disabled={desvinculando}
                className="py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {desvinculando ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> AGUARDE...</>
                ) : (
                  <><Unlink className="w-4 h-4" /> DESVINCULAR</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Busca de nova conta */}
      {passo === 'busca' && !contaVinculada && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-visible"
        >
          <div className="relative z-50" ref={searchRef}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="text-white/30 group-focus-within:text-primary transition-colors w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Digite seu Riot ID (ex: Kami#BR1)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => sugestoes.length > 0 && setShowSuggestions(true)}
                className="w-full bg-black/[0.50] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary/100 focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <AnimatePresence>
              {showSuggestions && sugestoes.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-3 bg-[#121212]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100]"
                >
                  <div className="p-2">
                    {sugestoes.map((sug, index) => (
                      <motion.button
                        key={sug.riotId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelecionarJogador(sug.riotId)}
                        className="w-full flex items-center gap-4 p-3 hover:bg-white/[0.07] rounded-xl text-left transition-all group"
                      >
                        <div className="relative">
                          <img 
                            src={getIconeUrl(sug.iconId)} 
                            className="w-12 h-12 rounded-full border border-white/10 group-hover:border-primary/50 transition-colors" 
                            alt="Icon" 
                          />
                          <div className="absolute -bottom-1 -right-1 bg-primary text-[10px] font-bold text-black px-1.5 rounded-full border-2 border-[#121212]">
                            {sug.level}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-semibold group-hover:text-primary transition-colors">{sug.riotId}</p>
                          <p className="text-xs text-white/40">Invocador de League of Legends</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <CheckCircle className="w-5 h-5 text-primary" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={() => handleSelecionarJogador(searchTerm)}
              disabled={loading || !searchTerm}
              className="w-full py-4 bg-gradient-to-r from-primary to-[#E6A600] text-black rounded-2xl font-black text-lg shadow-[0_10px_20px_rgba(255,215,0,0.2)] hover:shadow-[0_15px_30px_rgba(255,215,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3"
            >
              {loading ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Buscando...</>
              ) : (
                <><Gamepad2 className="w-5 h-5" /> VINCULAR AGORA</>
              )}
            </button>
            
            <p className="text-center text-white/30 text-xs px-4">
              Ao vincular sua conta, você concorda com nossos termos de uso e privacidade. 
              Sua conta será verificada através do ícone de perfil.
            </p>
          </div>

          {erro && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-400 text-sm font-medium">{erro}</p>
            </motion.div>
          )}
        </motion.div>
      )}

      {passo === 'validando' && invocador && iconeRequerido && !contaVinculada && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-black/60 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
            <h3 className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Invocador Selecionado</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={invocador.iconeUrl} className="w-16 h-16 rounded-full border-2 border-primary/50 shadow-xl" alt="Ícone" />
                <div className="absolute -bottom-1 -right-1 bg-primary text-[10px] font-bold text-black px-1.5 py-0.5 rounded-full border-2 border-[#0a0a0a]">
                  {invocador.nivel}
                </div>
              </div>
              <div>
                <p className="text-xl font-black text-white tracking-tight">{invocador.riotId}</p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">Ícone Atual: #{invocador.iconeId}</p>
              </div>
            </div>
          </div>

          <div className="bg-black/60 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16" />
            
            <h3 className="text-white font-black text-lg mb-6 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              VERIFICAÇÃO
            </h3>
            
            <div className="flex flex-col items-center justify-center py-4 mb-6">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-6">Troque para este ícone no LoL</p>
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/30 transition-colors" />
                <div className="w-32 h-32 rounded-full border-4 border-primary overflow-hidden relative z-10 shadow-2xl">
                  <img src={getIconeUrl(iconeRequerido)} alt="Ícone Requerido" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {[
                  { step: 1, text: 'Abra o cliente do League of Legends' },
                  { step: 2, text: 'Vá em "Coleção" → "Ícones"' },
                  { step: 3, text: `Equipe o ícone #${iconeRequerido}` },
                  { step: 4, text: 'Clique no botão abaixo para validar' },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3 group">
                    <span className="text-primary font-black text-sm flex items-center justify-center transition-all">
                      {item.step}.
                    </span>
                    <p className="text-xs text-white/40 group-hover:text-white transition-colors">{item.text}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col justify-end gap-3">
                <button
                  onClick={iniciarVerificacaoAutomatica}
                  className="w-full py-4 bg-gradient-to-r from-primary to-[#E6A600] text-black rounded-2xl font-black text-lg shadow-[0_10px_20px_rgba(255,215,0,0.2)] hover:shadow-[0_15px_30px_rgba(255,215,0,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
                >
                  <Timer className="w-5 h-5" />
                  VALIDAR AGORA
                </button>

                <button 
                  onClick={handleReiniciar} 
                  className="w-full py-2 text-white/20 hover:text-white/40 text-[10px] font-black transition-all uppercase tracking-widest"
                >
                  BUSCAR OUTRA CONTA
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {passo === 'verificando' && !contaVinculada && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/60 backdrop-blur-xl rounded-3xl border border-primary/30 p-12 text-center shadow-[0_0_50px_rgba(255,215,0,0.1)]"
        >
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center relative z-10 animate-[spin_3s_linear_infinite]">
              <Timer className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight uppercase italic">Sincronizando Dados</h2>
          <p className="text-white/40 mb-8 max-w-sm mx-auto">
            Estamos verificando sua conta <strong className="text-primary">{invocador?.riotId}</strong> nos servidores da Riot Games.
          </p>
          
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-8">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-1/2 h-full bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </div>

          <button 
            onClick={handleReiniciar} 
            className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 rounded-2xl text-xs font-black tracking-widest transition-all uppercase"
          >
            Cancelar Processo
          </button>
        </motion.div>
      )}

      {/* Tela de Conta Já Vinculada */}
      {passo === 'ja_vinculada' && jaVinculadaInfo && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/60 backdrop-blur-xl rounded-3xl border border-red-500/30 p-10 text-center shadow-[0_0_50px_rgba(239,68,68,0.1)]"
        >
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>

          <h2 className="text-3xl font-black text-white mb-4 tracking-tight uppercase italic leading-none">
            CONTA JÁ <span className="text-red-500">VINCULADA</span>
          </h2>
          
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 mb-8 max-w-md mx-auto">
            <p className="text-white/60 text-sm">
              A conta <strong className="text-white">{jaVinculadaInfo.riotId}</strong> já está vinculada a outro usuário em nosso sistema.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleReiniciar}
              className="px-12 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-2xl font-black transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              TENTAR OUTRA CONTA
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
