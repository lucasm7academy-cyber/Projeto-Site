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
  confirmarPresencaDB, resetarVagas, resetarConfirmacoes, vincularJogadores,
  registrarVoto, buscarVotos, deletarSala, encerrarSala,
  atribuirCodigoPartida, liberarCodigoPartida,
  type Sala, type EstadoSala, type JogadorNaSala,
  type OpcaoVotoInicio, type OpcaoVotoResultado, type Voto,
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
const TIMER_CONFIRMACAO_S      = 30;
const TIMER_AGUARDANDO_INICIO_S = 120;

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO DE VOTOS
// ─────────────────────────────────────────────────────────────────────────────

interface ResultadoVotacaoInicio {
  decisao: 'iniciou' | 'nao_iniciou' | 'pendente';
}

interface ResultadoVotacaoFinal {
  decisao: 'time_a' | 'time_b' | 'empate' | 'disputa' | 'pendente';
}

/**
 * Para votar "nao_iniciou" ser válido: maioria de cada time votou nao_iniciou.
 * Para "iniciou": ao menos 1 de cada time votou iniciou (ou timeout).
 */
function avaliarVotosInicio(
  votos: Voto[],
  jogadores: JogadorNaSala[],
  timedOut: boolean
): ResultadoVotacaoInicio {
  if (timedOut) return { decisao: 'iniciou' };

  const timeA = jogadores.filter(j => j.isTimeA);
  const timeB = jogadores.filter(j => !j.isTimeA);

  const votosA = votos.filter(v => v.isTimeA);
  const votosB = votos.filter(v => !v.isTimeA);

  const naoIniciouA = votosA.filter(v => v.opcao === 'nao_iniciou').length;
  const naoIniciouB = votosB.filter(v => v.opcao === 'nao_iniciou').length;

  const maioriaNaoA = naoIniciouA > timeA.length / 2;
  const maioriaNaoB = naoIniciouB > timeB.length / 2;

  if (maioriaNaoA && maioriaNaoB) return { decisao: 'nao_iniciou' };

  const iniciouA = votosA.some(v => v.opcao === 'iniciou');
  const iniciouB = votosB.some(v => v.opcao === 'iniciou');

  if (iniciouA && iniciouB) return { decisao: 'iniciou' };

  return { decisao: 'pendente' };
}

/**
 * Resultado final:
 * - Consenso: ambos os times elegem o mesmo vencedor → válido
 * - Conflito: cada time vota que o próprio time ganhou → disputa
 */
function avaliarVotosResultado(
  votos: Voto[],
  jogadores: JogadorNaSala[]
): ResultadoVotacaoFinal {
  const timeA = jogadores.filter(j => j.isTimeA);
  const timeB = jogadores.filter(j => !j.isTimeA);
  if (timeA.length === 0 || timeB.length === 0) return { decisao: 'pendente' };

  const votosA = votos.filter(v => v.isTimeA);
  const votosB = votos.filter(v => !v.isTimeA);

  // Só avalia se todos os jogadores com vaga votaram
  if (votosA.length < timeA.length || votosB.length < timeB.length) {
    return { decisao: 'pendente' };
  }

  // Maioria de cada time
  const majoriaA = (opc: string) =>
    votosA.filter(v => v.opcao === opc).length > timeA.length / 2;
  const majoriaB = (opc: string) =>
    votosB.filter(v => v.opcao === opc).length > timeB.length / 2;

  for (const res of ['time_a', 'time_b', 'empate'] as const) {
    if (majoriaA(res) && majoriaB(res)) return { decisao: res };
  }

  // Conflito: A acha que ganhou, B acha que ganhou
  if (majoriaA('time_a') && majoriaB('time_b')) return { decisao: 'disputa' };
  if (majoriaA('time_b') && majoriaB('time_a')) return { decisao: 'disputa' };

  return { decisao: 'pendente' };
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
  timerConfirmacao: number;
  timerAguardando: number;

  // Jogador desta sessão
  jogadorAtual: JogadorNaSala | null;

  // Votos
  votos: Voto[];
  meuVotoInicio: OpcaoVotoInicio | null;
  meuVotoResultado: OpcaoVotoResultado | null;
  contagemVotosInicio: Record<OpcaoVotoInicio, number>;
  contagemVotosResultado: Record<OpcaoVotoResultado, number>;

  // Viewers (presença na página)
  viewers: number;

  // Se o usuário não tem conta Riot vinculada
  semContaRiot: boolean;

  // Verificação de ação permitida no estado atual
  podeExecutar: (acao: string) => boolean;

  // Ações
  acaoEntrarVaga:        (role: string, isTimeA: boolean) => Promise<void>;
  acaoSairVaga:          () => Promise<void>;
  acaoConfirmarPresenca: () => Promise<void>;
  acaoVotarInicio:           (opcao: OpcaoVotoInicio) => Promise<void>;
  acaoVotarResultado:        (opcao: OpcaoVotoResultado) => Promise<void>;
  acaoSolicitarFinalizacao:  () => Promise<void>;
  acaoApagarSala:            () => Promise<void>;
  acaoSairDaSala:            () => void;
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
  const [timerAguardando, setTimerAguardando]   = useState(TIMER_AGUARDANDO_INICIO_S);
  const [viewers, setViewers] = useState(0);

  const timerConfirmacaoRef = useRef<NodeJS.Timeout>();
  const timerAguardandoRef  = useRef<NodeJS.Timeout>();
  const transicionandoRef   = useRef(false); // evita dupla transição concorrente
  const otimisticoRef       = useRef(false); // true = aguardando DB confirmar update local

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

  // ── Timer de aguardando_inicio ─────────────────────────────────────────────

  useEffect(() => {
    clearInterval(timerAguardandoRef.current);
    if (!sala || sala.estado !== 'aguardando_inicio') {
      setTimerAguardando(TIMER_AGUARDANDO_INICIO_S);
      return;
    }

    const calcRestante = () => {
      if (sala.aguardandoInicioExpiresAt) {
        return Math.max(0, Math.round((sala.aguardandoInicioExpiresAt.getTime() - Date.now()) / 1000));
      }
      return TIMER_AGUARDANDO_INICIO_S;
    };

    setTimerAguardando(calcRestante());

    timerAguardandoRef.current = setInterval(async () => {
      const restante = calcRestante();
      setTimerAguardando(restante);

      if (restante <= 0 && !transicionandoRef.current) {
        clearInterval(timerAguardandoRef.current);
        // Timeout: assume que a partida iniciou
        transicionandoRef.current = true;
        await transicionarEstado(salaId, 'em_partida');
        transicionandoRef.current = false;
      }
    }, 1000);

    return () => clearInterval(timerAguardandoRef.current);
  }, [sala?.estado, sala?.aguardandoInicioExpiresAt?.getTime()]);

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

    // confirmacao → travada → aguardando_inicio: todos confirmaram
    if (estado === 'confirmacao' && total === max && jogadores.every(j => j.confirmado)) {
      transicionandoRef.current = true;
      const fazer = async () => {
        const ok = await transicionarEstado(salaId, 'travada');
        if (ok) {
          await vincularJogadores(salaId);
          await atribuirCodigoPartida(salaId, sala!.modo); // atribui código FIFO do modo correto
          await transicionarEstado(salaId, 'aguardando_inicio');
        }
      };
      fazer().finally(() => { transicionandoRef.current = false; });
      return;
    }

    // aguardando_inicio: avalia votos
    if (estado === 'aguardando_inicio' && votos.length > 0) {
      const resultado = avaliarVotosInicio(votos, jogadores, false);
      if (resultado.decisao === 'iniciou') {
        transicionandoRef.current = true;
        transicionarEstado(salaId, 'em_partida').finally(() => {
          transicionandoRef.current = false;
        });
        return;
      }
      if (resultado.decisao === 'nao_iniciou') {
        transicionandoRef.current = true;
        const fazer = async () => {
          const ok = await transicionarEstado(salaId, 'preenchendo');
          if (ok) await resetarVagas(salaId);
        };
        fazer().finally(() => { transicionandoRef.current = false; });
        return;
      }
    }

    // finalizacao: avalia votos de resultado
    if (estado === 'finalizacao' && votos.length > 0) {
      const resultado = avaliarVotosResultado(votos, jogadores);
      if (resultado.decisao !== 'pendente') {
        transicionandoRef.current = true;
        const vencedor = resultado.decisao === 'time_a' ? 'A'
          : resultado.decisao === 'time_b' ? 'B'
          : resultado.decisao === 'empate' ? 'empate'
          : undefined;
        encerrarSala(salaId, vencedor as any)
          .then(() => liberarCodigoPartida(salaId))
          .finally(() => { transicionandoRef.current = false; });
      }
    }
  }, [sala?.estado, sala?.jogadores, votos]);

  // ── Derivações ─────────────────────────────────────────────────────────────

  const jogadorAtual = useMemo(
    () => sala?.jogadores.find(j => j.id === usuarioAtual.id) ?? null,
    [sala?.jogadores, usuarioAtual.id]
  );

  const podeExecutar = useCallback((acao: string): boolean => {
    if (!sala) return false;
    return ACOES_POR_ESTADO[sala.estado]?.includes(acao) ?? false;
  }, [sala?.estado]);

  const meuVotoInicio = useMemo(
    () => (votos.find(v => v.userId === usuarioAtual.id && v.fase === 'aguardando_inicio')?.opcao ?? null) as OpcaoVotoInicio | null,
    [votos, usuarioAtual.id]
  );

  const meuVotoResultado = useMemo(
    () => (votos.find(v => v.userId === usuarioAtual.id && v.fase === 'finalizacao')?.opcao ?? null) as OpcaoVotoResultado | null,
    [votos, usuarioAtual.id]
  );

  const contagemVotosInicio = useMemo(() => ({
    iniciou:     votos.filter(v => v.fase === 'aguardando_inicio' && v.opcao === 'iniciou').length,
    nao_iniciou: votos.filter(v => v.fase === 'aguardando_inicio' && v.opcao === 'nao_iniciou').length,
  }), [votos]);

  const contagemVotosResultado = useMemo(() => ({
    time_a: votos.filter(v => v.fase === 'finalizacao' && v.opcao === 'time_a').length,
    time_b: votos.filter(v => v.fase === 'finalizacao' && v.opcao === 'time_b').length,
    empate: votos.filter(v => v.fase === 'finalizacao' && v.opcao === 'empate').length,
  }), [votos]);

  // ── Ações expostas ─────────────────────────────────────────────────────────

  const acaoEntrarVaga = useCallback(async (role: string, isTimeA: boolean) => {
    if (!sala || !podeExecutar('entrar_vaga')) return;
    // Conta Riot não vinculada → bloqueia entrada em vaga
    if (!usuarioAtual.contaVinculada) return;
    otimisticoRef.current = true;
    try {
      await entrarNaVaga(salaId, usuarioAtual, role, isTimeA);
    } finally {
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

  const acaoVotarInicio = useCallback(async (opcao: OpcaoVotoInicio) => {
    if (!sala || !podeExecutar('votar_inicio') || !jogadorAtual) return;
    await registrarVoto(salaId, usuarioAtual.id, 'aguardando_inicio', opcao, jogadorAtual.isTimeA);
    recarregarVotos('aguardando_inicio');
  }, [sala, salaId, usuarioAtual.id, jogadorAtual, podeExecutar, recarregarVotos]);

  const acaoVotarResultado = useCallback(async (opcao: OpcaoVotoResultado) => {
    if (!sala || !podeExecutar('votar_resultado') || !jogadorAtual) return;
    await registrarVoto(salaId, usuarioAtual.id, 'finalizacao', opcao, jogadorAtual.isTimeA);
    recarregarVotos('finalizacao');
  }, [sala, salaId, usuarioAtual.id, jogadorAtual, podeExecutar, recarregarVotos]);

  const acaoSolicitarFinalizacao = useCallback(async () => {
    if (!sala || !podeExecutar('solicitar_finalizacao')) return;
    if (!transicionandoRef.current) {
      transicionandoRef.current = true;
      await transicionarEstado(salaId, 'finalizacao');
      transicionandoRef.current = false;
    }
  }, [sala, salaId, podeExecutar]);

  const acaoApagarSala = useCallback(async () => {
    if (!sala) return;
    await deletarSala(salaId);
  }, [sala, salaId]);

  const acaoSairDaSala = useCallback(() => {
    // Bloqueia saída quando o jogador está vinculado à partida.
    // O único caminho válido é seguir o fluxo até o estado "encerrada".
    if (jogadorAtual?.vinculado) return;
    // Remove a vaga do banco antes de navegar (fire-and-forget)
    if (jogadorAtual) {
      sairDaVaga(salaId, usuarioAtual.id).catch(console.error);
    }
    onSair();
  }, [onSair, jogadorAtual, salaId, usuarioAtual.id]);

  // ── Valor do contexto ──────────────────────────────────────────────────────

  const value: SalaRegrasContextType = {
    sala,
    loading,
    erro,
    timerConfirmacao,
    timerAguardando,
    jogadorAtual,
    semContaRiot: !usuarioAtual.contaVinculada,
    votos,
    meuVotoInicio,
    meuVotoResultado,
    viewers,
    contagemVotosInicio,
    contagemVotosResultado,
    podeExecutar,
    acaoEntrarVaga,
    acaoSairVaga,
    acaoConfirmarPresenca,
    acaoVotarInicio,
    acaoVotarResultado,
    acaoSolicitarFinalizacao,
    acaoApagarSala,
    acaoSairDaSala,
  };

  return (
    <SalaRegrasContext.Provider value={value}>
      {children}
    </SalaRegrasContext.Provider>
  );
}
