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
  resetarSalaCompleta, criarRequisicaoAdmin,
  desvincularJogadores, desvincularJogador, salvarResultadoPartida,
  type Sala, type EstadoSala, type JogadorNaSala,
  type OpcaoVotoResultado, type Voto,
} from '../api/salas';

// ─────────────────────────────────────────────────────────────────────────────
// MÁQUINA DE ESTADOS
// ─────────────────────────────────────────────────────────────────────────────

/** Transições válidas: de qual estado pode ir para qual estado */
export const TRANSICOES_VALIDAS: Record<EstadoSala, EstadoSala[]> = {
  aberta:             ['preenchendo', 'encerrada'],
  preenchendo:        ['aberta', 'confirmacao', 'encerrada'],
  confirmacao:        ['preenchendo', 'travada'],
  travada:            ['aguardando_inicio'],
  aguardando_inicio:  ['em_partida', 'preenchendo'],
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
const TIMER_FINALIZACAO_S  = 300; // finalizacao: 5 min para votar

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
  sala: { timeANome?: string; timeBNome?: string; jogadores: JogadorNaSala[] }
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
  await encerrarSala(salaId, vencedorDB as any);
  await desvincularJogadores(salaId);
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
  acaoDraftFinalizado:          () => Promise<void>;
  acaoCancelarDraftPorTimeout:  (userIdQueFalhou: string) => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [erro]                = useState<string | null>(null);
  const [timerConfirmacao, setTimerConfirmacao] = useState(TIMER_CONFIRMACAO_S);
  const [timerFinalizacao, setTimerFinalizacao] = useState(TIMER_FINALIZACAO_S);
  const [viewers, setViewers] = useState(0);

  const [timerCancelamento, setTimerCancelamento] = useState(TIMER_CANCELAMENTO_S);

  const timerConfirmacaoRef  = useRef<NodeJS.Timeout | undefined>(undefined);
  const timerCancelamentoRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const timerFinalizacaoRef  = useRef<NodeJS.Timeout | undefined>(undefined);
  const transicionandoRef   = useRef(false); // evita dupla transição concorrente
  const otimisticoRef       = useRef(false); // true = aguardando DB confirmar update local
  const entrandoVagaRef     = useRef(false); // evita double-click / requisições simultâneas

  // ── Carregamento e realtime ────────────────────────────────────────────────

  const recarregar = useCallback(async () => {
    const atualizada = await buscarSalaCompleta(salaId);
    // Nota: NÃO reseta otimisticoRef aqui.
    // Quem gerencia o flag é a função de ação (acaoEntrarVaga, etc.) via try/finally.
    // Isso garante que o DELETE intermediário do confirmarPresencaDB não dispare
    // a auto-transição antes do INSERT chegar.
    if (atualizada) {
      setSala(atualizada);
      if (atualizada.estado === 'encerrada') onEncerrada?.();
    } else {
      // Sala removida do banco (deletada pelo criador) → trata como encerrada.
      onEncerrada?.();
    }
  }, [salaId, onEncerrada]);

  const recarregarVotos = useCallback(async (fase: 'aguardando_inicio' | 'finalizacao') => {
    const novosVotos = await buscarVotos(salaId, fase);
    setVotos(novosVotos);
  }, [salaId]);

  useEffect(() => {
    setLoading(true);
    recarregar().finally(() => setLoading(false));

    const channel = supabase
      .channel(`sala_regras_${salaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas',
          filter: `id=eq.${salaId}` }, recarregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sala_jogadores',
          filter: `sala_id=eq.${salaId}` }, recarregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sala_votos',
          filter: `sala_id=eq.${salaId}` }, () => {
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

        // Limpa jogadores fantasmas: estão no slot mas não estão no canal de presence
        const presentIds = new Set(
          Object.values(state).flat().map((p: any) => p.user_id as string).filter(Boolean)
        );
        const { data: slots } = await supabase
          .from('sala_jogadores')
          .select('user_id')
          .eq('sala_id', salaId)
          .eq('vinculado', false);
        if (slots) {
          for (const slot of slots) {
            if (!presentIds.has(slot.user_id)) {
              sairDaVaga(salaId, slot.user_id).catch(() => {});
            }
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Quando alguém fecha o navegador/aba, remove da vaga automaticamente
        for (const p of (leftPresences as unknown as Array<{ user_id: string }>)) {
          if (p.user_id) {
            sairDaVaga(salaId, p.user_id).catch(() => {});
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: usuarioAtual.id });
        }
      });

    return () => {
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

      if (restante <= 0 && !transicionandoRef.current) {
        clearInterval(timerConfirmacaoRef.current);
        // Timer expirado: expulsa não-confirmados, reseta pronto dos demais
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
      return TIMER_CANCELAMENTO_S;
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

  // ── Timer de finalizacao (5 min para votar, depois força resultado) ──────

  useEffect(() => {
    clearInterval(timerFinalizacaoRef.current);
    if (!sala || sala.estado !== 'finalizacao') {
      setTimerFinalizacao(TIMER_FINALIZACAO_S);
      return;
    }

    setTimerFinalizacao(TIMER_FINALIZACAO_S);
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
  }, [sala?.estado]);

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

    // aberta → preenchendo: primeiro jogador entrou
    // (transição obrigatória antes de chegar em confirmacao)
    if (estado === 'aberta' && total > 0) {
      transicionandoRef.current = true;
      transicionarEstado(salaId, 'preenchendo').finally(() => {
        transicionandoRef.current = false;
      });
      return;
    }

    // preenchendo → confirmacao: sala ficou cheia
    if (estado === 'preenchendo' && total === max) {
      transicionandoRef.current = true;
      transicionarEstado(salaId, 'confirmacao').finally(() => {
        transicionandoRef.current = false;
      });
      return;
    }

    // preenchendo → aberta: sala ficou vazia
    if (estado === 'preenchendo' && total === 0) {
      transicionandoRef.current = true;
      transicionarEstado(salaId, 'aberta').finally(() => {
        transicionandoRef.current = false;
      });
      return;
    }

    // confirmacao → preenchendo: alguém saiu durante confirmação
    // Quem não confirmou é removido da vaga; quem confirmou permanece com pronto resetado.
    if (estado === 'confirmacao' && total < max) {
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
    if (estado === 'confirmacao' && total === max && jogadores.every(j => j.confirmado)) {
      transicionandoRef.current = true;
      const fazer = async () => {
        const ok = await transicionarEstado(salaId, 'travada');
        if (ok) {
          await vincularJogadores(salaId);

          // Verificar se já existe draft antes de criar
          const { data: draftExistente } = await supabase
            .from('drafts')
            .select('id')
            .eq('sala_id', salaId)
            .maybeSingle();

          let draftId = draftExistente?.id;

          if (!draftId) {
            const { data: novoDraft } = await supabase
              .from('drafts')
              .insert({
                sala_id: salaId,
                blue_bans: [],
                blue_picks: [],
                red_bans: [],
                red_picks: [],
                current_phase: 'ban',
                current_team: 'blue',
                current_turn: 0,
                timer_end: Date.now() + 30000,
                status: 'ongoing',
                fearless_enabled: sala!.modo === 'time_vs_time',
                fearless_pool: [],
              })
              .select('id')
              .single();

            draftId = novoDraft?.id;
          }

          if (draftId) {
            // Vincula o draft_id à sala — a UI detecta isso e mostra o DraftRoom
            await supabase
              .from('salas')
              .update({ draft_id: draftId })
              .eq('id', salaId);
            // STOP: não transiciona para aguardando_inicio aqui.
            // acaoDraftFinalizado fará isso quando o draft terminar.
          } else {
            // Draft não pôde ser criado — avança sem draft
            await atribuirCodigoPartida(salaId, sala!.modo);
            await transicionarEstado(salaId, 'aguardando_inicio');
          }
        }
      };
      fazer().finally(() => { transicionandoRef.current = false; });
      return;
    }

    // aguardando_inicio: nenhuma transição automática aqui.
    // A transição para em_partida é feita pelo timerCancelamento quando zera.

    // finalizacao: avalia quando todos os jogadores votaram
    if (estado === 'finalizacao') {
      const finVotos = votos.filter((v: Voto) => v.fase === 'finalizacao');
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
    const finVotos = votos.filter((v: Voto) => v.fase === 'finalizacao');
    const decisao: DecisaoResultado = finVotos.length > 0 ? avaliarVotosResultado(finVotos) : 'disputa';
    transicionandoRef.current = true;
    encerrarPartidaComResultado(salaId, decisao, sala).finally(() => {
      transicionandoRef.current = false;
    });
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
    entrandoVagaRef.current = true;
    otimisticoRef.current = true;
    try {
      await entrarNaVaga(salaId, usuarioAtual, role, isTimeA);
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
      recarregar();
    }
  }, [sala, salaId, usuarioAtual.id, jogadorAtual, podeExecutar, recarregar]);

  const acaoDenunciarNaoIniciou = useCallback(async (motivo: string, descricao?: string) => {
    if (!sala || !jogadorAtual) return;
    await criarRequisicaoAdmin({
      sala_id:       salaId,
      reportado_por: usuarioAtual.id,
      motivo,
      descricao,
      jogadores:     sala.jogadores.map(j => ({ id: j.id, nome: j.nome, isTimeA: j.isTimeA })),
    });
    await resetarSalaCompleta(salaId);
  }, [sala, salaId, usuarioAtual.id, jogadorAtual]);

  const acaoVotarResultado = useCallback(async (opcao: OpcaoVotoResultado) => {
    if (!sala || !podeExecutar('votar_resultado') || !jogadorAtual) return;
    await registrarVoto(salaId, usuarioAtual.id, 'finalizacao', opcao, jogadorAtual.isTimeA);
    // Libera o jogador imediatamente após votar — pode entrar em nova sala
    await desvincularJogador(salaId, usuarioAtual.id);
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

  const acaoDraftFinalizado = useCallback(async () => {
    if (!sala) return;
    await atribuirCodigoPartida(salaId, sala.modo);
    await transicionarEstado(salaId, 'aguardando_inicio');
  }, [sala, salaId]);

  const acaoCancelarDraftPorTimeout = useCallback(async (userIdQueFalhou: string) => {
    if (!sala || !sala.draft_id) return;

    try {
      console.log(`[SalaRegras] Cancelando draft por timeout. Usuário que falhou: ${userIdQueFalhou}`);

      // 1. Deletar o draft
      const { error: erroDraft } = await supabase
        .from('drafts')
        .delete()
        .eq('id', sala.draft_id);

      if (erroDraft) {
        console.error('[SalaRegras] Erro ao deletar draft:', erroDraft);
      } else {
        console.log('[SalaRegras] Draft deletado com sucesso');
      }

      // 2. Limpar draft_id na sala e voltar para 'preenchendo'
      const { error: erroSala } = await supabase
        .from('salas')
        .update({
          draft_id: null,
          estado: 'preenchendo'
        })
        .eq('id', salaId);

      if (erroSala) {
        console.error('[SalaRegras] Erro ao atualizar sala:', erroSala);
      } else {
        console.log('[SalaRegras] Sala resetada para preenchendo');
      }

      // 3. Expulsar o jogador da vaga (manter na sala)
      const { error: erroExpulsao } = await supabase
        .from('sala_jogadores')
        .delete()
        .eq('sala_id', salaId)
        .eq('user_id', userIdQueFalhou);

      if (erroExpulsao) {
        console.error('[SalaRegras] Erro ao expulsar jogador:', erroExpulsao);
      } else {
        console.log('[SalaRegras] Jogador expulso da vaga:', userIdQueFalhou);
      }

      // 4. Desconfirmar TODOS os jogadores (inclusive os restantes)
      const { error: erroDesconfirma, data: dataDesconfirma } = await supabase
        .from('sala_jogadores')
        .update({ confirmado: false })
        .eq('sala_id', salaId)
        .select();

      if (erroDesconfirma) {
        console.error('[SalaRegras] Erro ao desconfirmar jogadores:', erroDesconfirma);
      } else {
        console.log('[SalaRegras] Jogadores desconfirmados:', dataDesconfirma?.length || 0);
      }

      console.log('[SalaRegras] Draft cancelado e sala resetada com sucesso');
    } catch (error) {
      console.error('[SalaRegras] Erro geral ao cancelar draft por timeout:', error);
    }
  }, [sala, salaId]);

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
    acaoDraftFinalizado,
    acaoCancelarDraftPorTimeout,
    acaoApagarSala,
    acaoSairDaSala,
  };

  return (
    <SalaRegrasContext.Provider value={value}>
      {children}
    </SalaRegrasContext.Provider>
  );
}
