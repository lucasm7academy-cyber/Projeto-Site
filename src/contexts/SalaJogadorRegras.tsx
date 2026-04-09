// src/contexts/SalaJogadorRegras.tsx
// Controle de jogadores e vagas dentro de uma sala.
//
// Responsabilidades:
//   1. Wrapper sobre acaoEntrarVaga / acaoSairVaga com validação rica e motivo de falha
//   2. Presença via Supabase Realtime → auto-remoção no disconnect (keepalive fetch)
//   3. Helpers de estado de vagas (quem ocupa cada slot, se é eu, se está livre)
//   4. Nenhuma lógica de transição de estado — delegada inteiramente a SalaRegras
//
// Uso: chamar useJogadorRegras(usuarioAtual) dentro de qualquer filho de SalaRegrasProvider

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSalaRegras } from './SalaRegras';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS PÚBLICOS
// ─────────────────────────────────────────────────────────────────────────────

/** Resultado de uma tentativa de ação (entrar/sair de vaga) */
export interface ResultadoAcao {
  ok: boolean;
  /** Razão legível quando ok === false */
  motivo?: string;
}

/** Estado de uma vaga individual na grade de times */
export interface StatusVaga {
  role: string;
  isTimeA: boolean;
  ocupada: boolean;
  ocupanteNome?: string;
  ocupanteId?: string;
  /** true se esta vaga pertence ao usuário atual */
  souEu: boolean;
}

interface UsuarioRef {
  id: string;
  nome: string;
  tag?: string;
  elo: string;
  role: string;
  avatar?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLES POR NÚMERO DE JOGADORES POR TIME
// ─────────────────────────────────────────────────────────────────────────────

/** Ordem padrão de roles para exibição nas vagas */
const ROLES_ORDENADAS = ['TOP', 'JNG', 'MID', 'ADC', 'SUP', 'RES'];

function rolesParaTime(vagasPorTime: number): string[] {
  return ROLES_ORDENADAS.slice(0, vagasPorTime);
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function useJogadorRegras(usuarioAtual: UsuarioRef) {
  const {
    sala,
    jogadorAtual,
    podeExecutar,
    acaoEntrarVaga,
    acaoSairVaga,
  } = useSalaRegras();

  // Ref para o token de sessão — populado no mount e mantido atualizado.
  // Necessário para o keepalive fetch no beforeunload (contexto síncrono).
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const atualizar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      tokenRef.current = session?.access_token ?? null;
    };
    atualizar();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      tokenRef.current = session?.access_token ?? null;
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Presença + auto-remoção no disconnect ──────────────────────────────────

  useEffect(() => {
    if (!sala) return;
    const salaId = sala.id;

    // Canal de presença: cada cliente rastreia o próprio user_id.
    // Outros clientes podem detectar desconexões via evento 'leave'.
    const channel = supabase.channel(`presenca_sala_${salaId}`, {
      config: { presence: { key: usuarioAtual.id } },
    });

    channel
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // Quando outro cliente sai, notificamos via console para debugging.
        // A limpeza real desse cliente foi feita via beforeunload no próprio cliente.
        if (import.meta.env.DEV) {
          for (const p of leftPresences) {
            const uid = (p as any).user_id;
            if (uid && uid !== usuarioAtual.id) {
              console.debug('[SalaJogadorRegras] presença saiu:', uid);
            }
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: usuarioAtual.id, sala_id: salaId });
        }
      });

    // beforeunload: melhor esforço via fetch keepalive.
    // Só remove se o jogador não está vinculado (vagas vinculadas são permanentes).
    const handleUnload = () => {
      const token = tokenRef.current;
      if (!token || !jogadorAtual || jogadorAtual.vinculado) return;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/sala_jogadores` +
        `?sala_id=eq.${salaId}&user_id=eq.${usuarioAtual.id}&vinculado=eq.false`;

      // keepalive garante que o fetch completa mesmo após o unload da página
      fetch(url, {
        method: 'DELETE',
        keepalive: true,
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(() => { /* silencioso — página já fechando */ });
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      // Ao desmontar o componente (navegar para outra página), sai da presença.
      // Isso NÃO remove o jogador da vaga automaticamente — o usuário deve usar
      // o botão "Sair da Vaga" explicitamente enquanto a partida não começou.
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [sala?.id, usuarioAtual.id, jogadorAtual?.vinculado]);

  // ── Status de todas as vagas da sala ──────────────────────────────────────

  const statusVagas = useMemo((): StatusVaga[] => {
    if (!sala) return [];

    const vagasPorTime = sala.maxJogadores / 2;
    const roles = rolesParaTime(vagasPorTime);
    const resultado: StatusVaga[] = [];

    for (const isTimeA of [true, false]) {
      for (const role of roles) {
        const ocupante = sala.jogadores.find(
          j => j.isTimeA === isTimeA && j.role === role
        );
        resultado.push({
          role,
          isTimeA,
          ocupada: !!ocupante,
          ocupanteNome: ocupante?.nome,
          ocupanteId:   ocupante?.id,
          souEu:        ocupante?.id === usuarioAtual.id,
        });
      }
    }

    return resultado;
  }, [sala?.jogadores, sala?.maxJogadores, usuarioAtual.id]);

  // ── Vaga atual do usuário ──────────────────────────────────────────────────

  const minhaVaga = useMemo(
    () => statusVagas.find(v => v.souEu) ?? null,
    [statusVagas]
  );

  // ── Validações ricas para entrar na vaga ──────────────────────────────────

  const entrar = useCallback(async (
    role: string,
    isTimeA: boolean
  ): Promise<ResultadoAcao> => {
    if (!sala) return { ok: false, motivo: 'Sala não carregada.' };

    // 1. Verifica se o estado permite entrada
    if (!podeExecutar('entrar_vaga')) {
      const estado = sala.estado;
      const mensagens: Record<string, string> = {
        confirmacao:       'A sala está na fase de confirmação. Aguarde.',
        travada:           'A sala está travada para a partida.',
        aguardando_inicio: 'A partida já está em andamento.',
        em_partida:        'A partida já está em andamento.',
        finalizacao:       'A partida está sendo finalizada.',
        encerrada:         'Esta sala está encerrada.',
      };
      return {
        ok: false,
        motivo: mensagens[estado] ?? `Entrada bloqueada no estado "${estado}".`,
      };
    }

    // 2. Verifica se a vaga está ocupada por outro
    const ocupante = sala.jogadores.find(
      j => j.role === role && j.isTimeA === isTimeA
    );
    if (ocupante && ocupante.id !== usuarioAtual.id) {
      return {
        ok: false,
        motivo: `Esta vaga já está ocupada por ${ocupante.nome}.`,
      };
    }

    // 3. Verifica se já está na mesma vaga (clique duplo)
    if (
      jogadorAtual?.role === role &&
      jogadorAtual?.isTimeA === isTimeA
    ) {
      return { ok: false, motivo: 'Você já está nesta vaga.' };
    }

    // 4. Verificações adicionais de DB (vinculado em outra sala, etc.) são
    //    feitas dentro de entrarNaVaga() em api/salas.ts — se falhar, retornamos
    //    um erro genérico.
    await acaoEntrarVaga(role, isTimeA);

    // Verificamos se a entrada foi efetivada via jogadorAtual (não é instantâneo
    // pois depende do realtime), mas a ação foi disparada com sucesso.
    return { ok: true };
  }, [sala, podeExecutar, jogadorAtual, usuarioAtual.id, acaoEntrarVaga]);

  // ── Validações ricas para sair da vaga ────────────────────────────────────

  const sair = useCallback(async (): Promise<ResultadoAcao> => {
    if (!sala) return { ok: false, motivo: 'Sala não carregada.' };

    if (!jogadorAtual) {
      return { ok: false, motivo: 'Você não está em nenhuma vaga.' };
    }

    if (jogadorAtual.vinculado) {
      return {
        ok: false,
        motivo: 'Você está vinculado à partida e não pode sair da vaga.',
      };
    }

    if (!podeExecutar('sair_vaga')) {
      return {
        ok: false,
        motivo: `Não é possível sair de vagas no estado "${sala.estado}".`,
      };
    }

    await acaoSairVaga();
    return { ok: true };
  }, [sala, jogadorAtual, podeExecutar, acaoSairVaga]);

  // ── Derivações booleanas para uso direto na UI ─────────────────────────────

  /** Usuário tem uma vaga na sala */
  const estouNaSala = !!jogadorAtual;

  /** É possível entrar/trocar de vaga agora */
  const podeEntrar = podeExecutar('entrar_vaga');

  /** É possível sair da vaga agora */
  const podeSair =
    !!jogadorAtual &&
    !jogadorAtual.vinculado &&
    podeExecutar('sair_vaga');

  /** Usuário está vinculado (partida confirmada) */
  const estouVinculado = jogadorAtual?.vinculado ?? false;

  return {
    // Estado das vagas
    statusVagas,
    minhaVaga,

    // Flags rápidas para a UI
    estouNaSala,
    estouVinculado,
    podeEntrar,
    podeSair,

    // Ações com retorno rico
    entrar,
    sair,
  };
}
