/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, Ban, Copy, Check, Tv2, Eye } from 'lucide-react';
import { FiShieldOff } from 'react-icons/fi';
import { supabase } from '../../lib/supabase';
import { getDDRVersion, buildChampionIconUrl } from '../../api/riot';
import {
  buscarDraftDaSala,
  criarDraft,
  banirCampeao,
  pickarCampeao,
  podeControlarDraft,
  inscreverDraftRealtime,
} from '../../api/draft';
import { getTurnOrder, type DraftState, type Champion } from './draftTypes';
import { StreamModal } from '../StreamModal';

interface DraftRoomProps {
  salaId: number;
  usuarioId: string;
  modo: string;
  timeALogo?: string;
  timeBLogo?: string;
  codigoPartida?: string;
  cargoUsuario?: string;
  onDraftFinalizado?: (draft: DraftState) => void;
  onPickTimeout?: (usuarioId: string) => void;
  onDraftReset?: () => void;
}

export const DraftRoom: React.FC<DraftRoomProps> = ({
  salaId,
  usuarioId,
  modo,
  timeALogo,
  timeBLogo,
  codigoPartida,
  cargoUsuario,
  onDraftFinalizado,
  onPickTimeout,
  onDraftReset,
}) => {
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [champions, setChampions] = useState<Record<string, Champion>>({});
  const [version, setVersion] = useState('14.7.1');
  const [loading, setLoading] = useState(true);
  const [selectedChamp, setSelectedChamp] = useState<Champion | null>(null);
  const [meuTime, setMeuTime] = useState<'blue' | 'red' | null>(null);
  const [possoJogar, setPossoJogar] = useState(false);
  const [timer, setTimer] = useState(30);
  const [searchTerm, setSearchTerm] = useState('');
  const [nomeJogador, setNomeJogador] = useState<string>('');
  const [jogadorAtual, setJogadorAtual] = useState<{ blue: string; red: string }>({ blue: 'Jogador Azul', red: 'Jogador Vermelho' });
  const [timerFrozen, setTimerFrozen] = useState(false);
  const [dotAnimation, setDotAnimation] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [salaStreamAtiva, setSalaStreamAtiva] = useState<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // ============================================================
  // INITIALIZATION (só roda uma vez)
  // ============================================================
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const inicializar = async () => {
      try {
        const permissao = await podeControlarDraft(salaId, usuarioId, modo) as any;
        setMeuTime(permissao.team);
        setPossoJogar(permissao.pode);
        setNomeJogador(permissao.nome || 'Jogador');

        // Buscar nomes dos jogadores de cada time
        try {
          const { data: jogadores } = await (supabase as any)
            .from('sala_jogadores')
            .select('user_id, nome, is_time_a, role')
            .eq('sala_id', salaId)
            .eq('role', modo === '1v1' ? 'MID' : 'JG');

          if (jogadores) {
            const blue = jogadores.find((j: any) => j.is_time_a);
            const red = jogadores.find((j: any) => !j.is_time_a);
            setJogadorAtual({
              blue: blue?.nome || 'Time Azul',
              red: red?.nome || 'Time Vermelho'
            });
          }
        } catch (error) {
          console.error('Erro ao buscar jogadores:', error);
        }

        try {
          const v = await getDDRVersion();
          setVersion(v);
          const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/pt_BR/champion.json`);
          const data = await res.json();
          setChampions(data.data);
        } catch (error) {
          console.error('Error fetching champions:', error);
        }

        let draftAtual = await buscarDraftDaSala(salaId);
        console.log('[DraftRoom] Draft buscado:', draftAtual?.id, 'turn:', draftAtual?.current_turn, 'status:', draftAtual?.status);

        if (!draftAtual) {
          console.log('[DraftRoom] Nenhum draft encontrado, criando novo...');
          draftAtual = await criarDraft(salaId, modo === 'time_vs_time');
        }

        setDraft(draftAtual);

        if (draftAtual?.status === 'finished') {
          onDraftFinalizado?.(draftAtual);
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    inicializar();
  }, [salaId, usuarioId, modo, onDraftFinalizado]);

  // ============================================================
  // REALTIME
  // ============================================================
  useEffect(() => {
    if (!draft) return;
    const channel = inscreverDraftRealtime(salaId, (novoDraft) => {
      // Verificar se timer expirou enquanto aba estava inativa
      const agora = Date.now();
      const tempoRestante = Math.max(0, Math.floor(((novoDraft.timer_end || agora) - agora) / 1000));

      // Se timer zerou e a ação ainda não foi tomada, executar automaticamente
      if (tempoRestante === 0 && novoDraft.status === 'ongoing' && !timerFrozen) {
        const turnOrder = getTurnOrder(modo);
        const ehMeuTurno = turnOrder[novoDraft.current_turn]?.team === meuTime;

        if (ehMeuTurno && possoJogar && meuTime) {
          console.log('[DraftRoom] ⏱️ Timer expirou - executando ação automática');
          if (novoDraft.current_phase === 'ban') {
            console.log('[DraftRoom] Ban automático em branco');
            banirCampeao(novoDraft, '', novoDraft.current_team, modo);
          } else {
            console.log('[DraftRoom] Pick timeout - cancelando draft');
            onPickTimeout?.(usuarioId);
          }
          setTimerFrozen(true);
        }
      }

      setDraft(novoDraft);
      if (novoDraft.status === 'finished') onDraftFinalizado?.(novoDraft);
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [salaId, draft?.id, onDraftFinalizado, meuTime, possoJogar, timerFrozen, modo, onPickTimeout, usuarioId]);

  // ============================================================
  // REALTIME STREAMS
  // ============================================================
  useEffect(() => {
    const loadActiveStream = async () => {
      try {
        console.log('[DraftRoom] Carregando stream ativa para sala:', salaId);
        const { data, error } = await supabase
          .from('sala_streams')
          .select('*')
          .eq('sala_id', salaId)
          .eq('ativo', true)
          .maybeSingle();

        if (error) {
          console.error('[DraftRoom] ❌ Erro ao carregar stream:', error);
          return;
        }

        console.log('[DraftRoom] ✅ Stream ativa carregada:', data);
        setSalaStreamAtiva(data);
      } catch (err) {
        console.error('[DraftRoom] ❌ Exception ao carregar stream:', err);
      }
    };

    loadActiveStream();

    const subscription = supabase
      .channel(`sala_streams_${salaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sala_streams',
          filter: `sala_id=eq.${salaId}`,
        },
        (payload: any) => {
          console.log('[DraftRoom] Realtime stream update - event:', payload.event);
          const eventType = payload.event?.toUpperCase() || payload.eventType?.toUpperCase();

          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const newStream = payload.new as any;
            if (newStream?.ativo) {
              console.log('[DraftRoom] ✅ Stream ativa para todos:', newStream);
              setSalaStreamAtiva(newStream);
            } else {
              console.log('[DraftRoom] ⚠️ Stream não está ativo');
            }
          } else if (eventType === 'DELETE') {
            console.log('[DraftRoom] ❌ Stream desativada');
            setSalaStreamAtiva(null);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [salaId]);

  // ============================================================
  // ANIMAÇÃO DOS 3 PONTINHOS
  // ============================================================
  useEffect(() => {
    const interval = setInterval(() => {
      setDotAnimation(prev => (prev + 1) % 3);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // DETECTAR DRAFT ZERADO (SEM NENHUMA SELEÇÃO) E RESETAR SALA
  // ============================================================
  useEffect(() => {
    if (!draft || draft.status !== 'ongoing') return;

    const turnOrder = getTurnOrder(modo);
    const totalTurnos = turnOrder.length;

    // Só reseta se completou TODOS os turnos SEM fazer nenhuma seleção
    const nenhuma_selecao =
      draft.blue_bans.length === 0 &&
      draft.blue_picks.length === 0 &&
      draft.red_bans.length === 0 &&
      draft.red_picks.length === 0;

    // Se chegou ao final e ninguém escolheu nada
    if (draft.current_turn >= totalTurnos && nenhuma_selecao) {
      console.log('[DraftRoom] ⚠️ Draft completo sem nenhuma seleção - resetando sala');
      onDraftReset?.();
    }
  }, [draft?.current_turn, draft?.blue_bans, draft?.blue_picks, draft?.red_bans, draft?.red_picks, modo, onDraftReset]);

  // ============================================================
  // TIMER
  // ============================================================
  useEffect(() => {
    if (!draft || draft.status !== 'ongoing') return;
    const interval = setInterval(() => {
      const agora = Date.now();
      const restante = Math.max(0, Math.floor(((draft.timer_end || agora) - agora) / 1000));
      setTimer(restante);

      // ✅ VERIFICAR TIMEOUT A CADA SEGUNDO (aqui dentro!)
      if (restante === 0 && !timerFrozen && possoJogar && meuTime) {
        const turnOrder = getTurnOrder(modo);
        const ehMeuTurno = turnOrder[draft.current_turn]?.team === meuTime;
        if (ehMeuTurno) {
          console.log('[DraftRoom] Timer chegou a 0 - iniciando buffer de 2s');
          setTimerFrozen(true);
          timeoutRef.current = setTimeout(async () => {
            if (draft.current_phase === 'ban') {
              console.log('[DraftRoom] Timeout: Ban automático em branco');
              await banirCampeao(draft, '', draft.current_team, modo);
            } else {
              console.log('[DraftRoom] Timeout: Pick não foi feito, cancelando draft');
              onPickTimeout?.(usuarioId);
            }
            setTimerFrozen(false);
          }, 2000);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [draft, timerFrozen, possoJogar, meuTime, onPickTimeout, usuarioId, modo]);

  // ============================================================
  // LIMPAR TIMEOUT QUANDO TURNO AVANÇA
  // ============================================================
  useEffect(() => {
    // Quando o turno muda (novo draft chega), resetar timerFrozen
    setTimerFrozen(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [draft?.current_turn]);

  // ============================================================
  // DETECTAR ABA VOLTANDO AO FOCO (Page Visibility API)
  // ============================================================
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) return;
      // Aba voltou ao foco - refrescar draft para detectar timeouts
      console.log('[DraftRoom] Aba retomada - verificando timeout');
      if (!draft) return;
      const draftAtualizado = await buscarDraftDaSala(salaId);
      if (draftAtualizado) {
        setDraft(draftAtualizado);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [salaId, draft]);

  // ============================================================
  // ACTIONS
  // ============================================================
  const isMeuTurno = useCallback((): boolean => {
    if (!draft || !possoJogar || !meuTime) return false;
    if (draft.status !== 'ongoing') return false;
    const turnOrder = getTurnOrder(modo);
    return turnOrder[draft.current_turn]?.team === meuTime;
  }, [draft, possoJogar, meuTime, modo]);

  const handleBanir = async (champion: Champion) => {
    if (!draft || !meuTime || !isMeuTurno()) return;
    if (draft.current_phase !== 'ban') return;
    // Bloquear se timer expirou
    if (timer <= 0) {
      console.log('[DraftRoom] ❌ Tempo expirado - não pode banir');
      return;
    }
    const sucesso = await banirCampeao(draft, champion.id, meuTime, modo);
    if (sucesso) setSelectedChamp(null);
  };

  const handlePickar = async (champion: Champion) => {
    if (!draft || !meuTime || !isMeuTurno()) return;
    if (draft.current_phase !== 'pick') return;
    // Bloquear se timer expirou
    if (timer <= 0) {
      console.log('[DraftRoom] ❌ Tempo expirado - não pode escolher');
      return;
    }
    const sucesso = await pickarCampeao(draft, champion.id, meuTime, modo);
    if (sucesso) setSelectedChamp(null);
  };

  const confirmarAcao = () => {
    if (!selectedChamp || !draft) return;
    if (draft.current_phase === 'ban') {
      handleBanir(selectedChamp);
    } else {
      handlePickar(selectedChamp);
    }
  };

  const handleChampionClick = (champion: Champion) => {
    if (!isMeuTurno()) return;
    const isBanned = draft?.blue_bans.includes(champion.id) || draft?.red_bans.includes(champion.id);
    const isPicked = draft?.blue_picks.includes(champion.id) || draft?.red_picks.includes(champion.id);
    if (isBanned || isPicked) return;
    setSelectedChamp(champion);
  };

  const filteredChampions = useMemo(() => {
    return (Object.values(champions) as Champion[]).filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [champions, searchTerm]);

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderBanSlot = (championId: string | null, team: 'blue' | 'red', index: number) => {
    const champion = championId ? champions[championId] : null;
    const turnOrder = getTurnOrder(modo);
    const isActive = draft?.current_turn !== undefined &&
                     turnOrder[draft.current_turn]?.team === team &&
                     turnOrder[draft.current_turn]?.phase === 'ban' &&
                     draft.current_phase === 'ban';

    const isThisSlotActive = isActive && (
      team === 'blue' ? draft?.blue_bans.filter(b => b === null).length - 1 === index :
                        draft?.red_bans.filter(b => b === null).length - 1 === index
    );

    // ✅ Determina se este slot já foi baniado (compara índice com tamanho do array)
    const bansFeitos = team === 'blue' ? draft?.blue_bans.length || 0 : draft?.red_bans.length || 0;
    const jaBaniuEsteSlot = index < bansFeitos;

    return (
      <div key={index} className="flex flex-col items-center gap-[0.3vmin]">
        <div className={`
          relative w-[5vmin] h-[5vmin] border bg-black/60 flex items-center justify-center overflow-hidden transition-all duration-300
          ${jaBaniuEsteSlot ? 'border-red-600/80 shadow-[0_0_8px_rgba(220,38,38,0.3)]' : 'border-white/15'}
          ${isThisSlotActive ? 'border-[#c89b3c] shadow-[0_0_12px_rgba(200,155,60,0.5)] scale-110' : ''}
        `}>
          {champion ? (
            <>
              <img
                src={buildChampionIconUrl(champion.id, version)}
                alt={champion.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 border-t-2 border-red-600/80 -rotate-45 origin-center scale-150" />
            </>
          ) : (
            <div className={jaBaniuEsteSlot ? 'opacity-40' : 'opacity-15'}>
              <Ban className="w-[3vmin] h-[3vmin] text-white" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPickSlot = (championId: string | null, team: 'blue' | 'red', index: number) => {
    const champion = championId ? champions[championId] : null;
    const turnOrder = getTurnOrder(modo);
    const isActive = draft?.current_turn !== undefined && 
                     turnOrder[draft.current_turn]?.team === team && 
                     turnOrder[draft.current_turn]?.phase === 'pick' &&
                     draft.current_phase === 'pick';
    
    const isThisSlotActive = isActive && (
      team === 'blue' ? draft?.blue_picks.filter(p => p === null).length - 1 === index : 
                        draft?.red_picks.filter(p => p === null).length - 1 === index
    );

    return (
      <div key={index} className="flex flex-col items-center gap-[0.3vmin]">
        <div className={`
          w-[10vmin] h-[11vmin] border bg-black/50 overflow-hidden shadow-inner relative group transition-all duration-300
          ${champion ? 'border-white/20' : 'border-white/10'}
          ${isThisSlotActive ? 'border-[#c89b3c] shadow-[0_0_12px_rgba(200,155,60,0.5)]' : ''}
        `}>
          {champion ? (
            <>
              <img 
                src={buildChampionIconUrl(champion.id, version)} 
                alt={champion.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 left-0 right-0 h-[3vmin] bg-gradient-to-t from-black/90 to-transparent flex items-end justify-center pb-[0.3vmin]">
                <span className="text-[0.9vmin] font-bold text-[#f0e6d2] uppercase tracking-wider drop-shadow-md">
                  {champion.name}
                </span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-15">
              <FiShieldOff size="5vmin" />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-[#010a13] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#c89b3c] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] bg-black text-[#f0e6d2] font-sans overflow-hidden select-none">
      
      {/* DYNAMIC BACKGROUND */}
      <div className={`absolute inset-0 ${
        draft?.current_phase === 'ban' 
          ? 'bg-gradient-radial from-red-900/40 via-black to-black' 
          : 'bg-gradient-radial from-blue-900/40 via-black to-black'
      }`} />

      {/* HUD FIXO: Código + Botões de Transmissão — SEMPRE VISÍVEL */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 items-end">
        {/* Código da Partida */}
        {codigoPartida && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFB700]/10 border border-[#FFB700]/30 text-[#FFB700] font-bold text-xs tracking-wider"
          >
            <span>#{codigoPartida}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codigoPartida);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className="hover:opacity-70 transition"
              title="Copiar código"
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </motion.div>
        )}

        {/* Botão TRANSMITIR (Streamer/Admin/Coach) — TODOS OS MODOS */}
        {(cargoUsuario === 'streamer' || cargoUsuario === 'admin' || cargoUsuario === 'coach') && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsStreamModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-all border bg-purple-600/10 border-purple-500/30 text-purple-400 hover:bg-purple-600/20 hover:border-purple-500/50"
            title="Transmitir ao vivo"
          >
            <Tv2 className="w-4 h-4" />
            Transmitir
          </motion.button>
        )}
      </div>

      {/* TOP DECORATION & CONTROLS — Botão ASSISTIR LIVE (quando há stream) */}
      <div className="absolute top-0 left-0 right-0 h-[5vmin] flex items-center justify-end px-[2vmin] gap-[2vmin] z-[9999] pointer-events-auto">
        {salaStreamAtiva && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsStreamModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-all border-2 bg-purple-600/10 border-purple-500/30 text-purple-400 hover:bg-purple-600/20 hover:border-purple-500/50 animate-pulse"
            title="Assistir transmissão"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Assistir Live</span>
            <span className="sm:hidden">🔴</span>
          </motion.button>
        )}
      </div>

      {/* HEADER SECTION - TIMER + FASE */}
      <div className="relative pt-[2vmin] flex flex-col items-center z-40">
        <h1 className="text-[3.5vmin] font-bold tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] uppercase">
          {draft?.current_phase === 'ban' ? 'FASE DE BANS' : 'FASE DE PICKS'}
        </h1>
        
        {/* TIMER BAR */}
        <div className="relative w-[60vmin] h-[0.5vmin] bg-white/10 mt-[1vmin] overflow-hidden">
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c89b3c] to-transparent"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: timer / 30 }}
            transition={{ duration: 1, ease: "linear" }}
            style={{ originX: 0.5 }}
          />
        </div>

        {/* TIMER NUMBER */}
        <div className={`text-[6vmin] font-black mt-[0.5vmin] tabular-nums drop-shadow-lg ${timer <= 10 ? 'text-red-500' : 'text-white'}`}>
          {timer}
        </div>
      </div>

      {/* BANS SECTION */}
      <div className="absolute top-[5vmin] left-0 right-0 flex justify-between px-[4vmin] z-40">
        {/* Blue Bans (Left side, starts from lateral/left) */}
        <div className="flex flex-col gap-[0.5vmin] items-start">
          <span className="text-[1vmin] font-bold text-white/20 uppercase tracking-[0.3em] ml-[0.5vmin]">Bans</span>
          <div className="flex flex-row gap-[1vmin]">
            {[...Array(5)].map((_, i) => renderBanSlot(draft?.blue_bans[i] || null, 'blue', i))}
          </div>
        </div>
        {/* Red Bans (Right side, starts from middle/left) */}
        <div className="flex flex-col gap-[0.5vmin] items-start">
          <span className="text-[1vmin] font-bold text-white/20 uppercase tracking-[0.3em] ml-[0.5vmin]">Bans</span>
          <div className="flex flex-row gap-[1vmin]">
            {[...Array(5)].map((_, i) => renderBanSlot(draft?.red_bans[i] || null, 'red', i))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="absolute inset-0 flex items-center justify-between px-[4vmin] pointer-events-none z-30">
        
        {/* LEFT PANEL - BLUE TEAM */}
        <div className="w-[25vmin] flex flex-col items-center gap-[1.5vmin] pointer-events-auto">
          <div className="relative">
            <motion.div
              initial={false}
              animate={draft?.current_team === 'blue' ? {
                boxShadow: ["0 0 20px rgba(8,8,255,0.3)", "0 0 60px rgba(8,8,255,0.9)", "0 0 20px rgba(8,8,255,0.3)"],
                borderColor: ["#0000FF", "#4d4dFF", "#0000FF"]
              } : {
                boxShadow: "0 0 0px rgba(0,0,0,0)",
                borderColor: "rgba(255,255,255,0.1)"
              }}
              transition={draft?.current_team === 'blue' ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
              className={`w-[18vmin] h-[18vmin] rounded-full border-[0.6vmin] overflow-hidden bg-black transition-all duration-300 ${draft?.current_team === 'blue' ? 'border-[#0000FF]' : 'border-white/10'}`}
            >
              {/* Se é turno do outro time: mostra apenas o avatar */}
              {draft?.current_team !== 'blue' && (
                <div className="w-full h-full flex items-center justify-center">
                  {timeALogo ? (
                    <img src={timeALogo} alt="Time A" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-[14vmin] h-[14vmin] rounded-full bg-gradient-to-br from-blue-500/40 to-blue-900/40 flex items-center justify-center border border-blue-400/30">
                      <span className="text-[3vmin] font-black text-blue-400/60">👤</span>
                    </div>
                  )}
                </div>
              )}

              {/* Se é seu turno e selecionou campeão: mostra preview */}
              {selectedChamp && draft?.current_team === 'blue' ? (
                <img
                  src={buildChampionIconUrl(selectedChamp.id, version)}
                  alt={selectedChamp.name}
                  className="w-full h-full object-cover scale-125"
                  referrerPolicy="no-referrer"
                />
              ) : null}

              {/* Se é seu turno e não selecionou: mostra 3 pontinhos */}
              {draft?.current_team === 'blue' && !selectedChamp && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-[1vmin]">
                  <div className="flex gap-[0.8vmin]">
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-[1.2vmin] h-[1.2vmin] bg-white/60 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-[1.2vmin] h-[1.2vmin] bg-white/60 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-[1.2vmin] h-[1.2vmin] bg-white/60 rounded-full" />
                  </div>
                  <p className="text-[1.2vmin] font-bold text-white/70 uppercase tracking-wider">Aguardando</p>
                </div>
              )}
            </motion.div>
          </div>

          <div className="text-center">
            {/* Se for seu turno, mostra a ação e o nome do jogador */}
            {draft?.current_team === 'blue' && draft?.status === 'ongoing' && (
              <>
                <p className={`text-[1.5vmin] font-semibold uppercase tracking-widest transition-colors duration-300 mb-[0.5vmin] ${
                  draft.current_phase === 'ban' ? 'text-red-400' : 'text-green-400'
                }`}>
                  {draft.current_phase === 'ban' ? 'Aguardando' : 'Aguardando'}
                </p>
                <h2 className="text-[2.5vmin] font-bold text-white uppercase tracking-tighter mb-[0.5vmin]">
                  {jogadorAtual.blue}
                </h2>
                <p className="text-[1.3vmin] font-bold uppercase tracking-widest">
                  {draft.current_phase === 'ban' ? 'Banir' : 'Escolher'}{'.'.repeat((dotAnimation % 3) + 1)}
                </p>
              </>
            )}

            {/* Se não for seu turno e for espectador de azul */}
            {possoJogar && meuTime === 'blue' && !isMeuTurno() && draft?.status === 'ongoing' && (
              <div className="mt-[1vmin] px-[2vmin] py-[0.5vmin] bg-blue-500/10 border border-blue-500/20 rounded-full">
                <p className="text-blue-400 text-[1.2vmin] font-bold">⏳ Aguarde seu turno...</p>
              </div>
            )}

            {/* Exibe o campeão selecionado se houver */}
            {selectedChamp && draft?.current_team === 'blue' && (
              <p className="text-[1.2vmin] font-bold text-[#c89b3c] mt-[0.5vmin] uppercase">
                ↳ {selectedChamp.name}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - RED TEAM */}
        <div className="w-[25vmin] flex flex-col items-center gap-[1.5vmin] pointer-events-auto">
          <div className="relative">
            <motion.div
              initial={false}
              animate={draft?.current_team === 'red' ? {
                boxShadow: ["0 0 20px rgba(255,0,0,0.3)", "0 0 60px rgba(255,0,0,0.9)", "0 0 20px rgba(255,0,0,0.3)"],
                borderColor: ["#FF0000", "#FF4d4d", "#FF0000"]
              } : {
                boxShadow: "0 0 0px rgba(0,0,0,0)",
                borderColor: "rgba(255,255,255,0.1)"
              }}
              transition={draft?.current_team === 'red' ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
              className={`w-[18vmin] h-[18vmin] rounded-full border-[0.6vmin] overflow-hidden bg-black transition-all duration-300 ${draft?.current_team === 'red' ? 'border-[#FF0000]' : 'border-white/10'}`}
            >
              {/* Se é turno do outro time: mostra logo do time */}
              {draft?.current_team !== 'red' && (
                <div className="w-full h-full flex items-center justify-center">
                  {timeBLogo ? (
                    <img src={timeBLogo} alt="Time B" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-[14vmin] h-[14vmin] rounded-full bg-gradient-to-br from-red-500/40 to-red-900/40 flex items-center justify-center border border-red-400/30">
                      <span className="text-[3vmin] font-black text-red-400/60">👤</span>
                    </div>
                  )}
                </div>
              )}

              {/* Se é seu turno e selecionou campeão: mostra preview */}
              {selectedChamp && draft?.current_team === 'red' ? (
                <img
                  src={buildChampionIconUrl(selectedChamp.id, version)}
                  alt={selectedChamp.name}
                  className="w-full h-full object-cover scale-125"
                  referrerPolicy="no-referrer"
                />
              ) : null}

              {/* Se é seu turno e não selecionou: mostra 3 pontinhos */}
              {draft?.current_team === 'red' && !selectedChamp && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-[1vmin]">
                  <div className="flex gap-[0.8vmin]">
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-[1.2vmin] h-[1.2vmin] bg-white/60 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-[1.2vmin] h-[1.2vmin] bg-white/60 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-[1.2vmin] h-[1.2vmin] bg-white/60 rounded-full" />
                  </div>
                  <p className="text-[1.2vmin] font-bold text-white/70 uppercase tracking-wider">Aguardando</p>
                </div>
              )}
            </motion.div>
          </div>

          <div className="text-center">
            {/* Se for seu turno, mostra a ação e o nome do jogador */}
            {draft?.current_team === 'red' && draft?.status === 'ongoing' && (
              <>
                <p className={`text-[1.5vmin] font-semibold uppercase tracking-widest transition-colors duration-300 mb-[0.5vmin] ${
                  draft.current_phase === 'ban' ? 'text-red-400' : 'text-green-400'
                }`}>
                  {draft.current_phase === 'ban' ? 'Aguardando' : 'Aguardando'}
                </p>
                <h2 className="text-[2.5vmin] font-bold text-white uppercase tracking-tighter mb-[0.5vmin]">
                  {jogadorAtual.red}
                </h2>
                <p className="text-[1.3vmin] font-bold uppercase tracking-widest">
                  {draft.current_phase === 'ban' ? 'Banir' : 'Escolher'}{'.'.repeat((dotAnimation % 3) + 1)}
                </p>
              </>
            )}

            {/* Se não for seu turno e for espectador de vermelho */}
            {possoJogar && meuTime === 'red' && !isMeuTurno() && draft?.status === 'ongoing' && (
              <div className="mt-[1vmin] px-[2vmin] py-[0.5vmin] bg-blue-500/10 border border-blue-500/20 rounded-full">
                <p className="text-blue-400 text-[1.2vmin] font-bold">⏳ Aguarde seu turno...</p>
              </div>
            )}

            {/* Exibe o campeão selecionado se houver */}
            {selectedChamp && draft?.current_team === 'red' && (
              <p className="text-[1.2vmin] font-bold text-[#c89b3c] mt-[0.5vmin] uppercase">
                ↳ {selectedChamp.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CENTER - CHAMPION GRID */}
      <div className="absolute top-[12vmin] left-1/2 -translate-x-1/2 w-full max-w-[85vmin] flex flex-col gap-[1vmin] z-40">
        {/* SEARCH BAR */}
        <div className="flex justify-end mb-[0.5vmin]">
          <div className="relative w-[30vmin]">
            <Search className="absolute left-[1vmin] top-1/2 -translate-y-1/2 w-[1.8vmin] h-[1.8vmin] text-[#c89b3c]" />
            <input 
              type="text" 
              placeholder="Buscar campeão..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/80 border border-[#c89b3c]/40 rounded-sm py-[0.8vmin] pl-[3.5vmin] pr-[1.5vmin] text-[1.6vmin] outline-none focus:border-[#c89b3c] transition-colors placeholder:text-[#c89b3c]/30 text-white"
            />
          </div>
        </div>

        {/* GRID (6x4 layout) */}
        <div className="grid grid-cols-6 gap-x-[0.8vmin] gap-y-[1.2vmin] max-h-[58vmin] overflow-y-auto custom-scrollbar pr-[1vmin]">
          {filteredChampions.map(champ => {
            const isBanned = draft?.blue_bans.includes(champ.id) || draft?.red_bans.includes(champ.id);
            const isPicked = draft?.blue_picks.includes(champ.id) || draft?.red_picks.includes(champ.id);
            const isSelected = selectedChamp?.id === champ.id;
            const isDisabled = isBanned || isPicked;

            return (
              <div 
                key={champ.id}
                onClick={() => handleChampionClick(champ)}
                className="flex flex-col items-center gap-[0.3vmin] cursor-pointer group"
              >
                <div className={`
                  relative w-[11.5vmin] h-[11.5vmin] border-2 transition-all duration-200
                  ${isSelected ? 'border-[#c89b3c] scale-110 shadow-[0_0_15px_rgba(200,155,60,0.5)]' : 'border-white/10 group-hover:border-white/40'}
                  ${isDisabled ? 'opacity-30 grayscale cursor-not-allowed' : ''}
                `}>
                  <img 
                    src={buildChampionIconUrl(champ.id, version)} 
                    alt={champ.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isBanned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-grayscale overflow-hidden">
                      <div className="absolute inset-0 border-t-4 border-red-600/80 -rotate-45 origin-center scale-150" />
                    </div>
                  )}
                </div>
                <span className={`text-[1.2vmin] font-bold truncate w-full text-center ${isSelected ? 'text-[#c89b3c]' : 'text-white/60'}`}>
                  {champ.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER PICKS & ACTION BUTTON */}
      <div className="absolute bottom-[2vmin] left-0 right-0 flex items-end justify-between px-[4vmin] z-50">
         {/* Blue Picks */}
         <div className="flex flex-col gap-[1vmin]">
            <span className="text-[1.2vmin] font-bold text-[#0000FF]/60 uppercase tracking-[0.3em] ml-[0.5vmin]">PICKS AZUL</span>
            <div className="flex gap-[0.8vmin]">
              {[...Array(5)].map((_, i) => renderPickSlot(draft?.blue_picks[i] || null, 'blue', i))}
            </div>
         </div>

          {/* Action Button (Centered) */}
          <div className="mb-[2vmin] relative">
            <button 
              disabled={!selectedChamp || !isMeuTurno()}
              onClick={confirmarAcao}
              className={`
                relative px-[12vmin] py-[2.5vmin] font-bold text-[2.2vmin] tracking-[0.15em] uppercase transition-all duration-300 group
                ${selectedChamp && isMeuTurno() 
                  ? 'text-[#f0e6d2] hover:text-white cursor-pointer' 
                  : 'text-white/20 cursor-not-allowed'}
              `}
            >
              <div className="absolute inset-0 z-0">
                <svg 
                  viewBox="0 0 300 80" 
                  preserveAspectRatio="none" 
                  className="w-full h-full drop-shadow-[0_0_15px_rgba(200,155,60,0.1)]"
                >
                  <path 
                    d="M40,5 L260,5 L295,60 Q150,85 5,60 Z" 
                    fill="none" 
                    stroke={selectedChamp && isMeuTurno() ? "#c89b3c" : "rgba(255,255,255,0.1)"} 
                    strokeWidth="2"
                  />
                  <path 
                    d="M42,7 L258,7 L292,59 Q150,83 8,59 Z" 
                    fill={selectedChamp && isMeuTurno() ? "#1e2328" : "#0a0a0a"} 
                    className="transition-colors duration-300 group-hover:fill-[#252a30]"
                  />
                </svg>
              </div>
              
              <span className="relative z-10 drop-shadow-md">
                {draft?.current_phase === 'ban' ? 'BANIR' : 'CONFIRMAR'}
              </span>
            </button>
          </div>

          {/* Red Picks */}
          <div className="flex flex-col gap-[1vmin] items-end">
            <span className="text-[1.2vmin] font-bold text-[#FF0000]/60 uppercase tracking-[0.3em] mr-[0.5vmin]">PICKS VERMELHO</span>
            <div className="flex gap-[0.8vmin]">
              {[...Array(5)].map((_, i) => renderPickSlot(draft?.red_picks[i] || null, 'red', i))}
            </div>
          </div>
      </div>

      {/* AVISO DE ESPECTADOR (GLOBAL) */}
      {!possoJogar && (
        <div className="absolute bottom-[12vmin] left-1/2 -translate-x-1/2 px-[3vmin] py-[0.8vmin] bg-yellow-500/10 border border-yellow-500/20 rounded-full z-50">
          <p className="text-yellow-400 text-[1.2vmin] font-bold">
            👀 Você está como espectador
          </p>
        </div>
      )}

      {/* Stream Modal */}
      {salaStreamAtiva && salaStreamAtiva.twitch_channel && (
        <StreamModal
          isOpen={isStreamModalOpen}
          onClose={() => setIsStreamModalOpen(false)}
          channel={salaStreamAtiva.twitch_channel}
          title={`Transmissão do Draft - Código: ${codigoPartida || salaId}`}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(200, 155, 60, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #c89b3c; border-radius: 2px; }
      `}</style>
    </div>
  );
};