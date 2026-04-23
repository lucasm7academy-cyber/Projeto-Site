// src/contexts/SalaRegras.tsx
// Motor de estados centralizado para o sistema de salas/partidas.
// Define a máquina de estados, valida transições e expõe ações tipadas.
// O estado autoritativo vive no Supabase; este contexto é a camada de coordenação.

import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, useMemo,
} from 'react';
import { supabase } from '../lib/supabase';
import {
  buscarSalaCompleta, transicionarEstado, entrarNaVaga, sairDaVaga,
  confirmarPresencaDB, resetarConfirmacoes, vincularJogadores,
  registrarVoto, buscarVotos, deletarSala, encerrarSala,
  atribuirCodigoPartida, liberarCodigoPartida,
  criarRequisicaoAdmin,
  atualizarVinculacao, deletarJogadoresDaSala, desvincularJogador, salvarResultadoPartida,
  type Sala, type EstadoSala, type JogadorNaSala,
  type OpcaoVotoResultado, type Voto,
} from '../api/salas';
import { atualizarPontosPartida, processarApostaPartida, type ResultadoPartida } from '../api/player';

// ─────────────────────────────────────────────────────────────────────────────
// MÁQUINA DE ESTADOS
// ─────────────────────────────────────────────────────────────────────────────

/** Transições válidas: de qual estado pode ir para qual estado */
export const TRANSICOES_VALIDAS: Record<EstadoSala, EstadoSala[]> = {
  aberta:             ['preenchendo', 'encerrada'],
  preenchendo:        ['aberta', 'confirmacao', 'encerrada'],
  confirmacao:        ['preenchendo', 'travada', 'aguardando_inicio'],
  travada:            ['aguardando_inicio', 'preenchendo'], // ← Permite volta ao preenchimento se jogador sair durante draft
  aguardando_inicio:  ['em_partida', 'preenchendo', 'encerrada'],
  em_partida:         ['finalizacao'],
  finalizacao:        ['encerrada'],
  encerrada:          [],
};

/** Ações permitidas por estado */
export const ACOES_POR_ESTADO: Record<EstadoSala, string[]> = {
  aberta:             ['entrar_vaga'],
  preenchendo:        ['entrar_vaga', 'sair_vaga'],
  confirmacao:        ['confirmar_presenca'],
  travada:            [],
  aguardando_inicio:  ['votar_inicio'],
  em_partida:         ['solicitar_finalizacao'],
  finalizacao:        ['votar_resultado'],
  encerrada:          [],
};

/** Verificação local de transição antes de chamar o banco */
export function transicaoValida(atual: EstadoSala, proximo: EstadoSala): boolean {
  return TRANSICOES_VALIDAS[atual]?.includes(proximo) ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMERS — duração de cada estado com timer
// ─────────────────────────────────────────────────────────────────────────────
const TIMER_CONFIRMACAO_S  = 30;
const TIMER_CANCELAMENTO_S = 180; // aguardando_inicio: 3 min para denunciar → depois vai pra em_partida
const TIMER_FINALIZACAO_S  = 180; // finalizacao: 3 min para votar

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO DE VOTOS
// ─────────────────────────────────────────────────────────────────────────────

type DecisaoResultado = 'time_a' | 'time_b' | 'disputa' | 'pendente';

/**
 * Pluralidade simples: quem tem mais votos vence.
 * Empate de votos → disputa (admin resolve).
 * Sem votos → pendente.
 */
function avaliarVotosResultado(finVotos: Voto[]): DecisaoResultado {
  if (finVotos.length === 0) return 'pendente';
  const paraA = finVotos.filter(v => v.opcao === 'time_a').length;
  const paraB = finVotos.filter(v => v.opcao === 'time_b').length;
  if (paraA > paraB) return 'time_a';
  if (paraB > paraA) return 'time_b';
  return 'disputa';
}

/** Encerra a sala salvando resultado e desvinculando todos os jogadores. */
async function encerrarPartidaComResultado(
  salaId: number,
  decisao: DecisaoResultado,
  sala: { timeANome?: string; timeBNome?: string; modo: string; mpoints?: number; jogadores: JogadorNaSala[] }
): Promise<void> {
  const vencedorLado  = decisao === 'time_a' ? 'time_a' : decisao === 'time_b' ? 'time_b' : 'disputa';
  const vencedorNome  = decisao === 'time_a' ? (sala.timeANome ?? 'Equipe Azul')
    : decisao === 'time_b' ? (sala.timeBNome ?? 'Equipe Vermelha')
    : 'Disputa';
  const vencedorDB    = decisao === 'time_a' ? 'A' : decisao === 'time_b' ? 'B' : undefined;

  await salvarResultadoPartida(
    salaId,
    vencedorLado as 'time_a' | 'time_b' | 'disputa',
    vencedorNome,
    sala.jogadores.map((j: JogadorNaSala) => ({ id: j.id, nome: j.nome, isTimeA: j.isTimeA, role: j.role })),
  );

  // 🎯 Atualizar M7 Points dos jogadores
  if (decisao !== 'pendente') {
    const resultado: ResultadoPartida = {
      salaId,
      modo: sala.modo,
      vencedor: decisao === 'time_a' ? 'time_a' : decisao === 'time_b' ? 'time_b' : 'empate',
      jogadores: sala.jogadores.map((j: JogadorNaSala) => ({
        userId: j.id,
        isTimeA: j.isTimeA,
        nome: j.nome,
      })),
    };
    await atualizarPontosPartida(resultado).catch(e => {
      console.error('[encerrarPartidaComResultado] Erro ao atualizar pontos:', e);
    });

    // 💰 Processar aposta em M Coins (se houver)
    const apostaValor = sala.mpoints ?? 0;
    if (apostaValor > 0 && decisao !== 'disputa') {
      await processarApostaPartida(resultado, apostaValor, salaId).catch(e => {
        console.error('[encerrarPartidaComResultado] Erro ao processar aposta:', e);
      });
    }
  }

  // ✅ encerrarSala agora desvincula TODOS automaticamente
  await encerrarSala(salaId, vencedorDB as any);
  // ✅ Liberar código para reutilização
  await liberarCodigoPartida(salaId);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTO
// ─────────────────────────────────────────────────────────────────────────────

interface UsuarioAtual {
  id: string;
  nome: string;
  tag?: string;
  elo: string;
  role: string;
  avatar?: string;
  contaVinculada: boolean;
}

interface SalaRegrasContextType {
  sala: Sala | null;
  loading: boolean;
  erro: string | null;
  erroEntrada: string | null;

  // Timers (segundos restantes)
  timerConfirmacao:  number;
  timerCancelamento: number; // aguardando_inicio: 3 min → se zerar vai pra em_partida
  timerFinalizacao:  number; // finalizacao: 5 min → força resultado

  // Jogador desta sessão
  jogadorAtual: JogadorNaSala | null;

  // Votos
  votos: Voto[];
  meuVotoResultado: OpcaoVotoResultado | null;
  contagemVotosResultado: Record<OpcaoVotoResultado, number>;

  // Viewers (presença na página)
  viewers: number;

  // Se o usuário não tem conta Riot vinculada
  semContaRiot: boolean;

  // Verificação de ação permitida no estado atual
  podeExecutar: (acao: string) => boolean;

  // Ações
  acaoEntrarVaga:               (role: string, isTimeA: boolean) => Promise<void>;
  acaoSairVaga:                 () => Promise<void>;
  acaoConfirmarPresenca:        () => Promise<void>;
  acaoDenunciarNaoIniciou:      (motivo: string, descricao?: string) => Promise<void>;
  acaoVotarResultado:           (opcao: OpcaoVotoResultado) => Promise<void>;
  acaoSolicitarFinalizacao:     () => Promise<void>;
  acaoCancelarPartida:          () => Promise<void>;
  acaoApagarSala:               () => Promise<void>;
  acaoSairDaSala:               () => void;
}

const SalaRegrasContext = createContext<SalaRegrasContextType | null>(null);

export const useSalaRegras = (): SalaRegrasContextType => {
  const ctx = useContext(SalaRegrasContext);
  if (!ctx) throw new Error('useSalaRegras usado fora de SalaRegrasProvider');
  return ctx;
};

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

interface SalaRegrasProviderProps {
  salaId: number;
  usuarioAtual: UsuarioAtual;
  onSair: () => void;
  onEncerrada?: () => void;
  children: React.ReactNode;
}

export function SalaRegrasProvider({
  salaId,
  usuarioAtual,
  onSair,
  onEncerrada,
  children,
}: SalaRegrasProviderProps) {
  const [sala, setSala]       = useState<Sala | null>(null);
  const [votos, setVotos]     = useState<Voto[]>([]);
  const [loading]             = useState(false);
  const [erro]                = useState<string | null>(null);
  const [erroEntrada, setErroEntrada] = useState<string | null>(null);
  const [timerConfirmacao, setTimerConfirmacao] = useState(TIMER_CONFIRMACAO_S);
  const [timerFinalizacao, setTimerFinalizacao] = useState(TIMER_FINALIZACAO_S);
  const [viewers, setViewers] = useState(0);

  const [timerCancelamento, setTimerCancelamento] = useState(TIMER_CANCELAMENTO_S);

  const timerConfirmacaoRef  = useRef<NodeJS.Timeout | undefined>(undefined);
  const timerCancelamentoRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const timerFinalizacaoRef  = useRef<NodeJS.Timeout | undefined>(undefined);
  const erroEntradaTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const transicionandoRef   = useRef(false); // evita dupla transição concorrente
  const otimisticoRef       = useRef(false); // true = aguardando DB confirmar update local
  const entrandoVagaRef     = useRef(false); // evita double-click / requisições simultâneas
  const leaveTimeoutsRef    = useRef<Record<string, NodeJS.Timeout>>({}); // timeouts para remoção após leave
  const recarregarTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined); // debounce Realtime updates
  const salaRef             = useRef<Sala | null>(null); // rastreia estado atual para closures (não fica congelado)
  const cancelandoDraftRef  = useRef(false); // evita múltiplas chamadas simultâneas de acaoCancelarDraftPorTimeout

  // ── Carregamento e realtime ────────────────────────────────────────────────

  const recarregar = useCallback(async () => {
    const atualizada = await buscarSalaCompleta(salaId);
    if (atualizada) setSala(atualizada);
  }, [salaId]);

  // Debounce Realtime updates — agrupa múltiplas mudanças em uma única query (100ms)
  const recarregarComDebounce = useCallback(() => {
    if (recarregarTimeoutRef.current) clearTimeout(recarregarTimeoutRef.current);
    recarregarTimeoutRef.current = setTimeout(() => {
      recarregar();
      recarregarTimeoutRef.current = undefined;
    }, 100);
  }, [recarregar]);

  const recarregarVotos = useCallback(async (fase: 'aguardando_inicio' | 'finalizacao') => {
    const novosVotos = await buscarVotos(salaId, fase);
    setVotos(novosVotos);
  }, [salaId]);

  // ── Manter salaRef.current sincronizado para closures de timeout ────────────
  useEffect(() => {
    salaRef.current = sala;
  }, [sala]);

  useEffect(() => {
    recarregar();

    const channel = supabase
      .channel(`sala_regras_${salaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas',
          filter: `id=eq.${salaId}` }, () => recarregarComDebounce())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sala_jogadores',
          filter: `sala_id=eq.${salaId}` }, () => recarregarComDebounce())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sala_votos',
          filter: `sala_id=eq.${salaId}` }, (payload) => {
            console.log('[Realtime] sala_votos changed:', payload.eventType);
            if (sala?.estado === 'aguardando_inicio') recarregarVotos('aguardando_inicio');
            if (sala?.estado === 'finalizacao')       recarregarVotos('finalizacao');
          })
      .subscribe();

    // ── Canal de Presence — conta visualizadores + auto-remove quem saiu ────────
    const presenceChannel = supabase.channel(`sala_presenca_${salaId}`);

    presenceChannel
      .on('presence', { event: 'sync' }, async () => {
        const state = presenceChannel.presenceState();
        setViewers(Object.keys(state).length);

        // Cancela timeout de leave para usuarios que voltaram
        const presentIds = new Set(
          Object.values(state).flat().map((p: any) => p.user_id as string).filter(Boolean)
        );

        // ✅ Se usuário voltou (está em presentIds), cancela o timeout
        for (const userId of presentIds) {
          if (leaveTimeoutsRef.current[userId]) {
            console.log('[SalaRegras] Usuário reentrou, cancelando timeout:', userId);
            clearTimeout(leaveTimeoutsRef.current[userId]);
            delete leaveTimeoutsRef.current[userId];
          }
        }

        // Limpa jogadores fantasmas: estão no slot mas não estão no canal de presence
        // ⚠️ Apenas em estados de prévia (preenchendo/confirmacao)
        // Durante draft/partida, confiamos no timeout para dar chance de reconexão
        if (sala && ['preenchendo', 'confirmacao'].includes(sala.estado)) {
          const { data: slots } = await supabase
            .from('sala_jogadores')
            .select('user_id')
            .eq('sala_id', salaId)
            .eq('vinculado', false);
          if (slots) {
            for (const slot of slots) {
              // ❌ Se usuário saiu (não está em presentIds) E não tem timeout, remove imediatamente
              if (!presentIds.has(slot.user_id) && !leaveTimeoutsRef.current[slot.user_id]) {
                console.log('[SalaRegras] Removendo jogador fantasma:', slot.user_id);
                sairDaVaga(salaId, slot.user_id).catch(() => {});
              }
            }
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Quando alguém sai, aguarda 10 segundos antes de remover
        // Isso permite recarga rápida sem ser removido da vaga
        // ⚠️ NÃO remove durante draft/em_partida/finalizacao — apenas em preenchendo/confirmacao
        for (const p of (leftPresences as unknown as Array<{ user_id: string }>)) {
          if (p.user_id) {
            console.log('[SalaRegras] Presença deixou a sala, aguardando 10s:', p.user_id);

            // Cancela timeout anterior se existir
            if (leaveTimeoutsRef.current[p.user_id]) {
              clearTimeout(leaveTimeoutsRef.current[p.user_id]);
            }

            // Define novo timeout — mas SÓ remove se sala NÃO está em draft/partida
            leaveTimeoutsRef.current[p.user_id] = setTimeout(() => {
              // ✅ Só remove se sala estiver em estados de prévia (preenchendo/confirmacao)
              // Durante draft/partida, timeout é ignorado — presença vai resolver quando reconnectar
              // ⚠️ CRÍTICO: usar salaRef.current para pegar o estado ATUAL, não congelado na closure
              if (salaRef.current && ['travada', 'aguardando_inicio', 'em_partida', 'finalizacao'].includes(salaRef.current.estado)) {
                console.log('[SalaRegras] Usuário saiu durante', salaRef.current.estado, '— NÃO removendo, aguardando reconexão:', p.user_id);
                return;
              }

              console.log('[SalaRegras] Removendo usuário após 10s de ausência:', p.user_id);
              sairDaVaga(salaId, p.user_id).catch((err) => {
                console.error('[SalaRegras] Erro ao remover usuário:', err);
              });
              delete leaveTimeoutsRef.current[p.user_id];
            }, 10000); // 10 segundos
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[SalaRegras] Presence inscrito, rastreando usuário:', usuarioAtual.id);
          await presenceChannel.track({ user_id: usuarioAtual.id });
        }
      });

    return () => {
      // Limpar todos os timeouts de leave
      Object.values(leaveTimeoutsRef.current).forEach(timeout => clearTimeout(timeout));
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [salaId]);

  // Sincroniza votos ao mudar de estado
  useEffect(() => {
    if (!sala) return;
    if (sala.estado === 'aguardando_inicio') recarregarVotos('aguardando_inicio');
    if (sala.estado === 'finalizacao')       recarregarVotos('finalizacao');
  }, [sala?.estado]);

  // ── Timer de confirmação ───────────────────────────────────────────────────

  useEffect(() => {
    clearInterval(timerConfirmacaoRef.current);
    if (!sala || sala.estado !== 'confirmacao') {
      setTimerConfirmacao(TIMER_CONFIRMACAO_S);
      return;
    }

    // Usa o timestamp do banco se disponível, senão usa duração padrão
    const calcRestante = () => {
      if (sala.confirmacaoExpiresAt) {
        return Math.max(0, Math.round((sala.confirmacaoExpiresAt.getTime() - Date.now()) / 1000));
      }
      return TIMER_CONFIRMACAO_S;
    };

    setTimerConfirmacao(calcRestante());

    timerConfirmacaoRef.current = setInterval(async () => {
      const restante = calcRestante();
      setTimerConfirmacao(restante);

      // 🔴 BUG FIX #1: Verificar estado antes de fazer transição
      // Protege contra timer disparar DEPOIS de sala já ter transitado pra travada
      if (restante <= 0 && !transicionandoRef.current && sala?.estado === 'confirmacao') {
        clearInterval(timerConfirmacaoRef.current);
        // Timer expirado: volta pra preenchendo e reseta confirmações
        transicionandoRef.current = true;
        const ok = await transicionarEstado(salaId, 'preenchendo');
        if (ok) await resetarConfirmacoes(salaId);
        transicionandoRef.current = false;
      }
    }, 1000);

    return () => clearInterval(timerConfirmacaoRef.current);
  }, [sala?.estado, sala?.confirmacaoExpiresAt?.getTime()]);

  // ── Timer de aguardando_inicio (cancelamento — 3 min para denunciar, depois → em_partida) ──

  useEffect(() => {
    clearInterval(timerCancelamentoRef.current);
    if (!sala || sala.estado !== 'aguardando_inicio') {
      setTimerCancelamento(TIMER_CANCELAMENTO_S);
      return;
    }

    const calcRestante = () => {
      if (sala.aguardandoInicioExpiresAt) {
        return Math.max(0, Math.round((sala.aguardandoInicioExpiresAt.getTime() - Date.now()) / 1000));
      }
      // Fallback: 3 min para 1v1, 5 min para outros modos
      return sala.modo === '1v1' ? 180 : 300;
    };

    setTimerCancelamento(calcRestante());

    timerCancelamentoRef.current = setInterval(async () => {
      const restante = calcRestante();
      setTimerCancelamento(restante);

      if (restante <= 0 && !transicionandoRef.current) {
        clearInterval(timerCancelamentoRef.current);
        transicionandoRef.current = true;
        await transicionarEstado(salaId, 'em_partida');
        transicionandoRef.current = false;
      }
    }, 1000);

    return () => clearInterval(timerCancelamentoRef.current);
  }, [sala?.estado, sala?.aguardandoInicioExpiresAt?.getTime()]);

  // ── Timer de finalizacao (3 min para votar, depois força resultado) ──────

  useEffect(() => {
    clearInterval(timerFinalizacaoRef.current);
    if (!sala || sala.estado !== 'finalizacao') {
      setTimerFinalizacao(TIMER_FINALIZACAO_S);
      return;
    }

    // Calcular tempo restante baseado em finalizacaoExpiresAt (persistido no DB)
    const tempoRestante = sala.finalizacaoExpiresAt
      ? Math.ceil((new Date(sala.finalizacaoExpiresAt).getTime() - Date.now()) / 1000)
      : TIMER_FINALIZACAO_S;

    const timerInicial = Math.max(tempoRestante, 0);
    setTimerFinalizacao(timerInicial);

    timerFinalizacaoRef.current = setInterval(() => {
      setTimerFinalizacao((prev: number) => {
        if (prev <= 1) {
          clearInterval(timerFinalizacaoRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerFinalizacaoRef.current);
  }, [sala?.estado, sala?.finalizacaoExpiresAt]);

  // ── Auto-transições dirigidas por regras ───────────────────────────────────

  useEffect(() => {
    // Aguarda DB confirmar antes de disparar transições automáticas.
    // Sem isso, o update otimista dispara a transição cedo demais e o realtime
    // subsequente (com estado parcial no banco) desfaz tudo.
    if (!sala || transicionandoRef.current || otimisticoRef.current) return;

    const estado = sala.estado;
    const jogadores = sala.jogadores;
    const total = jogadores.length;
    const max   = sala.maxJogadores;

    console.log(`[Auto-transição] Estado: ${estado} | Total: ${total}/${max}`);

    // aberta → preenchendo: primeiro jogador entrou
    // (transição obrigatória antes de chegar em confirmacao)
    if (estado === 'aberta' && total > 0) {
      console.log(`[Auto-transição] Aberta → Preenchendo (${total} jogadores)`);
      transicionandoRef.current = true;
      transicionarEstado(salaId, 'preenchendo').finally(() => {
        transicionandoRef.current = false;
      });
      return;
    }

    // preenchendo → confirmacao: sala ficou cheia
    if (estado === 'preenchendo' && total === max) {
      console.log(`[Auto-transição] Preenchendo → Confirmação (sala cheia!)`);
      transicionandoRef.current = true;
      transicionarEstado(salaId, 'confirmacao').finally(() => {
        transicionandoRef.current = false;
      });
      return;
    }

    // preenchendo → aberta: sala ficou vazia
    if (estado === 'preenchendo' && total === 0) {
      console.log(`[Auto-transição] Preenchendo → Aberta (vazia)`);
      transicionandoRef.current = true;
      transicionarEstado(salaId, 'aberta').finally(() => {
        transicionandoRef.current = false;
      });
      return;
    }

    // confirmacao → preenchendo: alguém saiu durante confirmação
    // Quem não confirmou é removido da vaga; quem confirmou permanece com pronto resetado.
    if (estado === 'confirmacao' && total < max) {
      console.log(`[Auto-transição] Confirmação → Preenchendo (alguém saiu)`);
      transicionandoRef.current = true;
      const fazer = async () => {
        const ok = await transicionarEstado(salaId, 'preenchendo');
        if (ok) await resetarConfirmacoes(salaId);
      };
      fazer().finally(() => { transicionandoRef.current = false; });
      return;
    }

    // confirmacao → travada: todos confirmaram
    // Após travada, cria o draft e aguarda o draft finalizar para ir a aguardando_inicio.
    // A transição para aguardando_inicio é disparada por acaoDraftFinalizado (via DraftRoom).
    const todosConfirmaram = jogadores.length > 0 && jogadores.length === max && jogadores.every(j => j.confirmado);
    console.log(`[Auto-transição] Confirmacao check: total=${total}/${max}, confirmados=${jogadores.filter(j => j.confirmado).length}, todosConfirmaram=${todosConfirmaram}`);

    if (estado === 'confirmacao' && total === max && jogadores.length === max && todosConfirmaram) {
      console.log(`[Auto-transição] ✅ CONFIRMAÇÃO → AGUARDANDO_INICIO (pulando draft)`);
      transicionandoRef.current = true;
      const fazer = async () => {
        // ✅ Pular draft completamente — ir direto para aguardando_inicio
        await vincularJogadores(salaId);
        await atribuirCodigoPartida(salaId, sala!.modo);
        await transicionarEstado(salaId, 'aguardando_inicio');

        // Corrigir expires_at com tempo correto por modo (transicionarEstado seta sempre 3min)
        const duracaoMs = sala!.modo === '1v1' ? 3 * 60 * 1000 : 5 * 60 * 1000;
        await supabase.from('salas')
          .update({ aguardando_inicio_expires_at: new Date(Date.now() + duracaoMs).toISOString() })
          .eq('id', salaId);
      };
      fazer().finally(() => { transicionandoRef.current = false; });
      return;
    }

    // aguardando_inicio: transição para em_partida controlada por timerCancelamento (3 min)
    // Se ninguém denunciar "partida não iniciou" em 3 min, força em_partida automaticamente.
    // Handler no useEffect de timerCancelamento (linhas 430-440).

    // travada → preenchendo: jogador foi removido por timeout (ex: durante draft)
    // Se jogador tirou timeout, é removido; auto-transição detecta falta de jogador e volta
    if (estado === 'travada' && total < max) {
      console.log(`[Auto-transição] ⚠️ TRAVADA → PREENCHENDO (jogador saiu durante draft, total=${total}/${max})`);
      transicionandoRef.current = true;
      const fazer = async () => {
        // 1. Desvincula quem sobrou (set vinculado=false) e reseta confirmações
        await atualizarVinculacao(salaId, false);
        await supabase.from('sala_jogadores')
          .update({ confirmado: false })
          .eq('sala_id', salaId);
        // 2. Limpa draft_id, votos e votações antigas
        await supabase.from('salas').update({ draft_id: null }).eq('id', salaId);
        await supabase.from('sala_votos').delete().eq('sala_id', salaId);
        // 3. Volta pra preenchendo para buscar novo jogador
        await transicionarEstado(salaId, 'preenchendo');
      };
      fazer().finally(() => { transicionandoRef.current = false; });
      return;
    }

    // finalizacao: avalia quando todos os jogadores votaram
    if (estado === 'finalizacao') {
      const finVotos = votos.filter((v: Voto) => v.fase === 'finalizacao');

      // Auto-vitória com 7 votos — encerra sem esperar todos
      const votosA = finVotos.filter(v => v.opcao === 'time_a').length;
      const votosB = finVotos.filter(v => v.opcao === 'time_b').length;
      if ((votosA >= 7 || votosB >= 7) && !transicionandoRef.current) {
        console.log(`[SalaRegras] ⚠️ AUTO-VITÓRIA: Time ${votosA >= 7 ? 'A' : 'B'} com ${Math.max(votosA, votosB)} votos!`);
        transicionandoRef.current = true;
        encerrarPartidaComResultado(salaId, votosA >= 7 ? 'time_a' : 'time_b', sala).finally(() => {
          transicionandoRef.current = false;
        });
        return;
      }

      // Caminho normal: todos votaram
      if (finVotos.length >= sala.maxJogadores && finVotos.length > 0) {
        const decisao = avaliarVotosResultado(finVotos);
        if (decisao !== 'pendente') {
          transicionandoRef.current = true;
          encerrarPartidaComResultado(salaId, decisao, sala).finally(() => {
            transicionandoRef.current = false;
          });
        }
      }
    }
  }, [sala?.estado, sala?.jogadores, votos]);

  // ── Força resultado quando timer de finalizacao zera ──────────────────────

  useEffect(() => {
    if (timerFinalizacao !== 0) return;
    if (!sala || sala.estado !== 'finalizacao' || transicionandoRef.current) return;

    const fazer = async () => {
      try {
        // 1. Remover jogadores que NÃO votaram (5 min timeout)
        const finVotos = votos.filter((v: Voto) => v.fase === 'finalizacao');
        const idsPessoas = new Set(finVotos.map(v => v.userId));

        const jogadoresInativos = sala.jogadores.filter(j => !idsPessoas.has(j.id));
        console.log('[SalaRegras] Timeout votação - Removendo', jogadoresInativos.length, 'jogadores inativos');

        for (const jogador of jogadoresInativos) {
          await supabase
            .from('sala_jogadores')
            .delete()
            .eq('sala_id', salaId)
            .eq('user_id', jogador.id);
        }

        // 2. Forçar resultado com votos restantes
        const decisao: DecisaoResultado = finVotos.length > 0 ? avaliarVotosResultado(finVotos) : 'disputa';
        console.log('[SalaRegras] Encerando partida por timeout. Decisão:', decisao, 'Votos:', finVotos.length);

        transicionandoRef.current = true;
        await encerrarPartidaComResultado(salaId, decisao, sala);
      } catch (erro) {
        console.error('[SalaRegras] Erro ao forçar resultado:', erro);
      } finally {
        transicionandoRef.current = false;
      }
    };

    fazer();
  }, [timerFinalizacao, sala?.estado]);

  // ── Derivações ─────────────────────────────────────────────────────────────

  const jogadorAtual = useMemo(
    () => sala?.jogadores.find(j => j.id === usuarioAtual.id) ?? null,
    [sala?.jogadores, usuarioAtual.id]
  );

  const podeExecutar = useCallback((acao: string): boolean => {
    if (!sala) return false;
    return ACOES_POR_ESTADO[sala.estado]?.includes(acao) ?? false;
  }, [sala?.estado]);

  const meuVotoResultado = useMemo(
    () => (votos.find(v => v.userId === usuarioAtual.id && v.fase === 'finalizacao')?.opcao ?? null) as OpcaoVotoResultado | null,
    [votos, usuarioAtual.id]
  );

  const contagemVotosResultado = useMemo(() => ({
    time_a: votos.filter((v: Voto) => v.fase === 'finalizacao' && v.opcao === 'time_a').length,
    time_b: votos.filter((v: Voto) => v.fase === 'finalizacao' && v.opcao === 'time_b').length,
  }), [votos]);

  // ── Ações expostas ─────────────────────────────────────────────────────────

  const acaoEntrarVaga = useCallback(async (role: string, isTimeA: boolean) => {
    if (!sala || !podeExecutar('entrar_vaga')) return;
    // Conta Riot não vinculada → bloqueia entrada em vaga
    if (!usuarioAtual.contaVinculada) return;
    // Evita duplo-clique ou requisições simultâneas do mesmo cliente
    if (entrandoVagaRef.current) return;

    // Validar saldo MC se houver aposta
    const apostaValor = sala.mpoints ?? 0;
    console.log(`\n💳 [ENTRADA] Validando saldo - Aposta: ${apostaValor} MC`);
    if (apostaValor > 0) {
      try {
        const { data } = await supabase
          .from('saldos')
          .select('saldo')
          .eq('user_id', usuarioAtual.id)
          .maybeSingle();
        const saldoMC = data?.saldo ?? 0;
        console.log(`   Seu saldo: ${saldoMC} MC | Necessário: ${apostaValor} MC`);
        if (saldoMC < apostaValor) {
          console.log(`   ❌ BLOQUEADO - Saldo insuficiente!`);
          setErroEntrada(`Saldo insuficiente (${saldoMC} MC). Depósito de ${apostaValor} MC necessário para participar.`);
          if (erroEntradaTimeoutRef.current) clearTimeout(erroEntradaTimeoutRef.current);
          erroEntradaTimeoutRef.current = setTimeout(() => {
            setErroEntrada(null);
            erroEntradaTimeoutRef.current = undefined;
          }, 5000);
          return;
        }
        console.log(`   ✅ OK - Entrando na sala...\n`);
      } catch (e) {
        console.error('[acaoEntrarVaga] ❌ Erro ao validar saldo:', e);
      }
    }

    entrandoVagaRef.current = true;
    otimisticoRef.current = true;
    try {
      const resultado = await entrarNaVaga(salaId, usuarioAtual, role, isTimeA, sala?.modo);
      if (!resultado.sucesso && resultado.erro) {
        console.warn('[SalaRegras] Erro ao entrar na vaga:', resultado.erro);
        setErroEntrada(resultado.erro);
        // Auto-clear mensagem após 3.5 segundos
        if (erroEntradaTimeoutRef.current) clearTimeout(erroEntradaTimeoutRef.current);
        erroEntradaTimeoutRef.current = setTimeout(() => {
          setErroEntrada(null);
          erroEntradaTimeoutRef.current = undefined;
        }, 3500);
        return;
      }
    } finally {
      entrandoVagaRef.current = false;
      otimisticoRef.current = false;
      recarregar();
    }
  }, [sala, salaId, usuarioAtual, podeExecutar, recarregar]);

  const acaoSairVaga = useCallback(async () => {
    if (!sala || !podeExecutar('sair_vaga')) return;
    otimisticoRef.current = true;
    try {
      await sairDaVaga(salaId, usuarioAtual.id);
    } finally {
      otimisticoRef.current = false;
      recarregar();
    }
  }, [sala, salaId, usuarioAtual.id, podeExecutar, recarregar]);

  const acaoConfirmarPresenca = useCallback(async () => {
    if (!sala || !podeExecutar('confirmar_presenca') || !jogadorAtual) return;
    // Confirmação é irreversível: uma vez marcado como pronto, não pode voltar atrás.
    if (jogadorAtual.confirmado) return;
    // otimisticoRef bloqueia a auto-transição durante o gap DELETE/INSERT do confirmarPresencaDB
    otimisticoRef.current = true;
    try {
      await confirmarPresencaDB(salaId, usuarioAtual.id, true);
    } finally {
      otimisticoRef.current = false;
      await recarregar();
    }
  }, [sala, salaId, usuarioAtual.id, jogadorAtual, podeExecutar, recarregar]);

  const acaoDenunciarNaoIniciou = useCallback(async (motivo: string, descricao?: string) => {
    if (!sala || !jogadorAtual) return;

    // 🔴 BUG FIX #2: Proteger contra race condition com timerCancelamento
    if (transicionandoRef.current) return;

    // Comportamento diferente por estado
    if (sala.estado === 'confirmacao') {
      // Em confirmacao: reset reversível (desvincula primeiro, depois reseta)
      transicionandoRef.current = true;
      try {
        // 🔧 FIX: Desvincula ANTES de resetar (resetarConfirmacoes filtra vinculado=false)
        await atualizarVinculacao(salaId, false);
        await supabase.from('sala_jogadores')
          .update({ confirmado: false })
          .eq('sala_id', salaId);
        await resetarConfirmacoes(salaId);
        await transicionarEstado(salaId, 'preenchendo');
      } finally {
        transicionandoRef.current = false;
      }
      return;
    }

    if (sala.estado === 'aguardando_inicio') {
      // Em aguardando_inicio: reset total + denúncia (partida foi denunciada como não iniciou)
      transicionandoRef.current = true;
      try {
        await criarRequisicaoAdmin({
          sala_id:       salaId,
          reportado_por: usuarioAtual.id,
          motivo,
          descricao,
          jogadores:     sala.jogadores.map(j => ({ id: j.id, nome: j.nome, isTimeA: j.isTimeA })),
        });

        // 🔴 RESET COMPLETO: Garantir limpeza TOTAL, sem dados residuais
        // 🔧 FIX: Desvincula ANTES de deletar (remove o bloqueio de sairDaVaga)
        await atualizarVinculacao(salaId, false);
        await supabase.from('sala_jogadores')
          .update({ confirmado: false })
          .eq('sala_id', salaId);

        // 1. Deletar QUALQUER draft dessa sala (não confiar em sala.draft_id que pode ser stale)
        await supabase.from('drafts').delete().eq('sala_id', salaId);

        // 2. Garantir draft_id é null na sala
        await supabase.from('salas').update({ draft_id: null }).eq('id', salaId);

        // 3. Deletar TODOS os votos (confirmacao + aguardando_inicio)
        await supabase.from('sala_votos').delete().eq('sala_id', salaId);

        // 4. Transicionar para preenchendo ANTES de deletar (assim sairDaVaga não bloqueia)
        await transicionarEstado(salaId, 'preenchendo');

        // 5. Deletar TODOS os jogadores agora que sala está em preenchendo
        await deletarJogadoresDaSala(salaId);
      } finally {
        transicionandoRef.current = false;
      }
    }
  }, [sala, salaId, usuarioAtual.id, jogadorAtual]);

  const acaoVotarResultado = useCallback(async (opcao: OpcaoVotoResultado) => {
    if (!sala || !podeExecutar('votar_resultado') || !jogadorAtual) return;
    await registrarVoto(salaId, usuarioAtual.id, 'finalizacao', opcao, jogadorAtual.isTimeA);
    // NÃO desvincula aqui — deixa encerrarPartidaComResultado cuidar do cleanup
    recarregarVotos('finalizacao');
  }, [sala, salaId, usuarioAtual.id, jogadorAtual, podeExecutar, recarregarVotos]);

  const acaoSolicitarFinalizacao = useCallback(async () => {
    // Qualquer jogador da sala pode encerrar — não apenas o criador
    if (!sala || !podeExecutar('solicitar_finalizacao') || !jogadorAtual) return;
    if (!transicionandoRef.current) {
      transicionandoRef.current = true;
      await transicionarEstado(salaId, 'finalizacao');
      transicionandoRef.current = false;
    }
  }, [sala, salaId, podeExecutar, jogadorAtual]);

  const acaoCancelarPartida = useCallback(async () => {
    if (!sala || !jogadorAtual || transicionandoRef.current) return;
    transicionandoRef.current = true;
    try {
      // Salvar resultado como cancelada (sem MP/MC)
      const jogadores = sala.jogadores.map(j => ({ id: j.id, nome: j.nome, isTimeA: j.isTimeA, role: j.role }));
      await salvarResultadoPartida(salaId, 'cancelada', 'cancelada', jogadores);
      // ✅ encerrarSala agora desvincula TODOS automaticamente
      await encerrarSala(salaId, undefined);
      // ✅ Liberar código para reutilização
      await liberarCodigoPartida(salaId);
    } finally {
      transicionandoRef.current = false;
    }
  }, [sala, salaId, jogadorAtual]);

  // ❌ DEPRECATED: Draft foi descontinuado — deixando comentado para uso futuro
  const acaoDraftFinalizado = useCallback(async () => {
    if (!sala) return;
    await atribuirCodigoPartida(salaId, sala.modo);
    await transicionarEstado(salaId, 'aguardando_inicio');
  }, [sala, salaId]);

  // ❌ DEPRECATED: Draft foi descontinuado — função não é mais chamada
  // const acaoCancelarDraftPorTimeout = useCallback(async (userIdQueFalhou: string) => {
  //   // Guard: evita múltiplas chamadas simultâneas
  //   if (cancelandoDraftRef.current) {
  //     console.log('[SalaRegras] ⚠️ Cancelamento de draft já em andamento, ignorando chamada duplicada');
  //     return;
  //   }
  //
  //   if (!sala) return;
  //
  //   cancelandoDraftRef.current = true;
  //   try {
  //     console.log('[SalaRegras] ⏱️ Timeout de draft do jogador:', userIdQueFalhou);
  //     transicionandoRef.current = true;
  //
  //     // 1. Remover o jogador que tirou timeout (DELETE direto ignora vinculado = true, intencional)
  //     await supabase
  //       .from('sala_jogadores')
  //       .delete()
  //       .eq('sala_id', salaId)
  //       .eq('user_id', userIdQueFalhou);
  //
  //     // 2. Desvincullar todos os demais jogadores PRIMEIRO
  //     await atualizarVinculacao(salaId, false);
  //
  //     // 3. Resetar confirmações de todos
  //     await supabase.from('sala_jogadores')
  //       .update({ confirmado: false })
  //       .eq('sala_id', salaId);
  //
  //     // 4. Deletar QUALQUER draft dessa sala (não confiar em sala.draft_id que pode ser stale)
  //     await supabase.from('drafts').delete().eq('sala_id', salaId);
  //
  //     // 5. Limpar draft_id da sala garantidamente
  //     await supabase.from('salas').update({ draft_id: null }).eq('id', salaId);
  //
  //     // 6. Deletar votos da sala
  //     await supabase.from('sala_votos').delete().eq('sala_id', salaId);
  //
  //     // 7. FORÇA transição para preenchendo (não confia na auto-transição)
  //     console.log('[SalaRegras] ✅ Draft cancelado - voltando para PREENCHENDO');
  //     await transicionarEstado(salaId, 'preenchendo');
  //   } catch (error) {
  //     console.error('[SalaRegras] ❌ Erro ao cancelar draft por timeout:', error);
  //   } finally {
  //     cancelandoDraftRef.current = false;
  //     transicionandoRef.current = false;
  //   }
  // }, [sala, salaId]);

  const acaoApagarSala = useCallback(async () => {
    if (!sala) return;
    await deletarSala(salaId);
  }, [sala, salaId]);

  const acaoSairDaSala = useCallback(() => {
    // Em finalizacao, se já votou, pode sair mesmo que o realtime ainda não atualizou
    // (desvincularJogador já foi chamado em acaoVotarResultado, mas o estado local pode
    //  ainda ter jogadorAtual.vinculado = true enquanto o realtime não chega)
    if (sala?.estado === 'finalizacao' && meuVotoResultado) {
      onSair();
      return;
    }
    // Bloqueia saída quando vinculado (partida em andamento e não votou ainda)
    if (jogadorAtual?.vinculado) return;
    if (jogadorAtual) {
      sairDaVaga(salaId, usuarioAtual.id).catch(console.error);
    }
    onSair();
  }, [onSair, jogadorAtual, salaId, usuarioAtual.id, sala?.estado, meuVotoResultado]);

  // ── Valor do contexto ──────────────────────────────────────────────────────

  const value: SalaRegrasContextType = {
    sala,
    loading,
    erro,
    erroEntrada,
    timerConfirmacao,
    timerCancelamento,
    timerFinalizacao,
    jogadorAtual,
    semContaRiot: !usuarioAtual.contaVinculada,
    votos,
    meuVotoResultado,
    viewers,
    contagemVotosResultado,
    podeExecutar,
    acaoEntrarVaga,
    acaoSairVaga,
    acaoConfirmarPresenca,
    acaoDenunciarNaoIniciou,
    acaoVotarResultado,
    acaoSolicitarFinalizacao,
    acaoCancelarPartida,
    acaoApagarSala,
    acaoSairDaSala,
  };

  return (
    <SalaRegrasContext.Provider value={value}>
      {children}
    </SalaRegrasContext.Provider>
  );
}
