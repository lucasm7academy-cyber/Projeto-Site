// src/hooks/useSalaSimples.ts
// ✅ VERSÃO CORRIGIDA - SEM LOOP INFINITO
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    buscarsalas,
    buscarJogadores,
    entrarNaVaga,
    confirmarPresenca,
    sairDaVaga,
    registrarVoto,
    buscarVotos,
    encerrarSala,
} from '../api/salamod1';

export function useSalaSimples(
    salaId: number,
    usuarioAtual: {
        id: string;
        nome: string;
        tag: string;
        elo: string;
        avatar?: string;
    }
) {
    const [sala, setSala] = useState<any>(null);
    const [jogadores, setJogadores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [timer, setTimer] = useState(40);
    const [codigoPartida, setCodigoPartida] = useState<string | null>(null);
    const [meuVoto, setMeuVoto] = useState<string | null>(null);
    const [votos, setVotos] = useState<any[]>([]);
    const [timerFinalizacao, setTimerFinalizacao] = useState(180);
    const [mostrarFalha, setMostrarFalha] = useState(false);

    // Refs para controle de loops
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const timerFinRef = useRef<NodeJS.Timeout | null>(null);
    const transicionandoRef = useRef(false);
    const entrandoRef = useRef(false);
    const jogadoresRef = useRef<any[]>([]);
    const resetandoRef = useRef(false);
    const confirmacaoResolvidaRef = useRef(false);
    const falhaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const processandoRealtimeRef = useRef(false); // ✅ NOVO: trava do Realtime
    const carregandoVotosRef = useRef(false); // ✅ NOVO: trava de votos

    useEffect(() => { jogadoresRef.current = jogadores; }, [jogadores]);

    // ── SAIR DA VAGA AO DESMONTAR ────────────────────
    useEffect(() => {
        return () => {
            const jogador = jogadoresRef.current.find((j: any) => j.user_id === usuarioAtual.id);
            if (jogador && !jogador.vinculado && !jogador.confirmado) {
                sairDaVaga(salaId, usuarioAtual.id).catch(() => {});
            }
            if (timerRef.current) clearInterval(timerRef.current);
            if (timerFinRef.current) clearInterval(timerFinRef.current);
            if (falhaTimeoutRef.current) clearTimeout(falhaTimeoutRef.current);
        };
    }, [salaId, usuarioAtual.id]);

    // ── CARREGAR DADOS INICIAIS ──────────────────────
    useEffect(() => {
        let mounted = true;
        async function carregar() {
            const dadosSala = await buscarsalas(salaId);
            if (!mounted) return;
            if (!dadosSala) {
                setErro('Sala não encontrada');
                setLoading(false);
                return;
            }
            setSala(dadosSala);
            setCodigoPartida(dadosSala.codigo_partida || null);

            if (dadosSala.estado === 'confirmacao' && dadosSala.confirmacao_expires_at) {
                const restante = Math.max(0, Math.round(
                    (new Date(dadosSala.confirmacao_expires_at).getTime() - Date.now()) / 1000
                ));
                setTimer(restante > 0 ? restante : 40);
            } else {
                setTimer(40);
            }

            if (dadosSala.estado !== 'confirmacao') {
                confirmacaoResolvidaRef.current = false;
            }

            const dadosJogadores = await buscarJogadores(salaId);
            if (mounted) {
                setJogadores(dadosJogadores);
                setLoading(false);
            }
        }
        carregar();
        return () => { mounted = false; };
    }, [salaId]);

    // ── REALTIME (COM TRAVA DE LOOP) ─────────────────
    useEffect(() => {
        const channel = supabase
            .channel(`sala_${salaId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'sala_jogadores', filter: `sala_id=eq.${salaId}` },
                async () => {
                    // ✅ TRAVA: evita loop infinito
                    if (processandoRealtimeRef.current) return;
                    processandoRealtimeRef.current = true;
                    
                    try {
                        const dadosJogadores = await buscarJogadores(salaId);
                        // ✅ Só atualiza se realmente mudou
                        setJogadores(prev => {
                            if (JSON.stringify(prev) === JSON.stringify(dadosJogadores)) return prev;
                            return dadosJogadores;
                        });
                    } finally {
                        setTimeout(() => { processandoRealtimeRef.current = false; }, 300);
                    }
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'salas', filter: `id=eq.${salaId}` },
                (payload: any) => {
                    if (transicionandoRef.current) return; // ✅ evita loop de transição
                    setSala(payload.new);
                    setCodigoPartida(payload.new.codigo_partida || null);
                    if (payload.new.estado === 'confirmacao' && payload.new.confirmacao_expires_at) {
                        const restante = Math.max(0, Math.round(
                            (new Date(payload.new.confirmacao_expires_at).getTime() - Date.now()) / 1000
                        ));
                        setTimer(restante > 0 ? restante : 40);
                    }
                    if (payload.new.estado !== 'confirmacao') {
                        confirmacaoResolvidaRef.current = false;
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [salaId]);

    // ── TIMER DE CONFIRMAÇÃO ──────────────────────────
    useEffect(() => {
        const max = sala?.max_jogadores ?? 10;
        const todosOcupados = jogadores.length === max;
        const estadoConfirmacao = sala?.estado === 'confirmacao';

        if (todosOcupados && estadoConfirmacao && !timerRef.current) {
            timerRef.current = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                        if (!resetandoRef.current) {
                            resetarNaoConfirmados();
                        }
                        return 40;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        if (!todosOcupados || !estadoConfirmacao) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [jogadores.length, sala?.estado, sala?.max_jogadores]);

    // ── TIMER DE FINALIZAÇÃO ──────────────────────────
    useEffect(() => {
        if (sala?.estado !== 'finalizacao') {
            setTimerFinalizacao(180);
            return;
        }

        const votosA = votos.filter(v => v.opcao === 'time_a').length;
        const votosB = votos.filter(v => v.opcao === 'time_b').length;

        if (votosA >= 6) { encerrarPartida('A'); return; }
        if (votosB >= 6) { encerrarPartida('B'); return; }

        if (!timerFinRef.current) {
            timerFinRef.current = setInterval(() => {
                setTimerFinalizacao(prev => {
                    if (prev <= 1) {
                        if (timerFinRef.current) {
                            clearInterval(timerFinRef.current);
                            timerFinRef.current = null;
                        }
                        encerrarPartida('empate');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerFinRef.current) {
                clearInterval(timerFinRef.current);
                timerFinRef.current = null;
            }
        };
    }, [sala?.estado, votos]);

    // ── AUTO-TRANSIÇÕES (COM TRAVA) ───────────────────
    useEffect(() => {
        if (!sala || transicionandoRef.current) return;

        const estado = sala.estado;
        const total = jogadores.length;
        const max = sala.max_jogadores ?? 10;
        const todosConfirmaram = total === max && total > 0 && jogadores.every(j => j.confirmado);

        async function transicionar(novoEstado: string, extras?: Record<string, any>) {
            if (transicionandoRef.current) return;
            transicionandoRef.current = true;
            const update: Record<string, any> = { estado: novoEstado, updated_at: new Date().toISOString(), ...extras };
            await supabase.from('salas').update(update).eq('id', salaId);
            setTimeout(() => { transicionandoRef.current = false; }, 500);
        }

        if (estado === 'aberta' && total > 0 && !transicionandoRef.current) {
            transicionar('preenchendo');
        }

        if (estado === 'preenchendo' && total === max && !transicionandoRef.current) {
            const expiresAt = new Date(Date.now() + 40 * 1000).toISOString();
            transicionar('confirmacao', { confirmacao_expires_at: expiresAt });
            setTimer(40);
            confirmacaoResolvidaRef.current = false;
        }

        if (estado === 'preenchendo' && total === 0 && !transicionandoRef.current) {
            transicionar('aberta');
        }

        if (estado === 'confirmacao' && total < max && !confirmacaoResolvidaRef.current && !transicionandoRef.current) {
            confirmacaoResolvidaRef.current = true;
            transicionar('preenchendo');
            setTimer(40);
        }

        if (estado === 'confirmacao' && todosConfirmaram && !confirmacaoResolvidaRef.current && !transicionandoRef.current) {
            confirmacaoResolvidaRef.current = true;
            transicionar('aguardando_inicio');
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            supabase.from('sala_jogadores').update({ vinculado: true }).eq('sala_id', salaId);
            if (!codigoPartida) {
                const codigo = 'LOL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                supabase.from('salas').update({ codigo_partida: codigo }).eq('id', salaId);
            }
        }

        if (estado === 'finalizacao' && votos.length === 0 && !carregandoVotosRef.current) {
            carregarVotos();
        }
    }, [sala?.estado, jogadores]);

    // ── RESETAR NÃO CONFIRMADOS ───────────────────────
    async function resetarNaoConfirmados() {
        if (resetandoRef.current) return;
        resetandoRef.current = true;

        try {
            const naoConfirmados = jogadores.filter(j => !j.confirmado);
            const confirmados = jogadores.filter(j => j.confirmado).map(j => ({ ...j, confirmado: false }));
            setJogadores(confirmados);

            for (const j of naoConfirmados) {
                await sairDaVaga(salaId, j.user_id);
            }

            await supabase.from('sala_jogadores')
                .update({ confirmado: false })
                .eq('sala_id', salaId)
                .eq('vinculado', false);

            await supabase.from('salas').update({
                estado: 'preenchendo',
                updated_at: new Date().toISOString(),
            }).eq('id', salaId);

            setMostrarFalha(true);
            if (falhaTimeoutRef.current) clearTimeout(falhaTimeoutRef.current);
            falhaTimeoutRef.current = setTimeout(() => setMostrarFalha(false), 4000);

            confirmacaoResolvidaRef.current = false;
        } finally {
            resetandoRef.current = false;
        }
    }

    // ── ENCERRAR PARTIDA ─────────────────────────────
    async function encerrarPartida(vencedor: 'A' | 'B' | 'empate') {
        if (timerFinRef.current) { clearInterval(timerFinRef.current); timerFinRef.current = null; }
        await encerrarSala(salaId, vencedor);
        await supabase.from('sala_jogadores').update({ vinculado: false }).eq('sala_id', salaId);
    }

    // ── CARREGAR VOTOS (COM TRAVA) ────────────────────
    async function carregarVotos() {
        if (carregandoVotosRef.current) return;
        carregandoVotosRef.current = true;
        
        try {
            const dadosVotos = await buscarVotos(salaId);
            setVotos(dadosVotos);
            const meu = dadosVotos.find((v: any) => v.user_id === usuarioAtual.id);
            if (meu) setMeuVoto(meu.opcao);
        } finally {
            setTimeout(() => { carregandoVotosRef.current = false; }, 500);
        }
    }

    // ── AÇÕES ────────────────────────────────────────
    const entrar = async (role: string, isTimeA: boolean) => {
        if (entrandoRef.current) return;
        entrandoRef.current = true;

        try {
            const { data: vinculo } = await supabase
                .from('sala_jogadores')
                .select('sala_id')
                .eq('user_id', usuarioAtual.id)
                .eq('vinculado', true)
                .maybeSingle();

            if (vinculo && vinculo.sala_id !== salaId) {
                setErro('Você já está em uma partida em andamento.');
                return;
            }

            const minhaVaga = jogadores.find((j: any) => j.user_id === usuarioAtual.id);
            if (minhaVaga) {
                if (minhaVaga.role === role && minhaVaga.is_time_a === isTimeA) return;
                await sairDaVaga(salaId, usuarioAtual.id);
            }

            const sucesso = await entrarNaVaga(
                salaId, usuarioAtual.id, usuarioAtual.nome,
                usuarioAtual.tag, usuarioAtual.elo, role, isTimeA, usuarioAtual.avatar
            );

            if (sucesso) {
                const dadosJogadores = await buscarJogadores(salaId);
                setJogadores(dadosJogadores);
            } else {
                setErro('Erro ao entrar na vaga');
            }
        } finally {
            entrandoRef.current = false;
        }
    };

    const sair = async () => {
        const jogador = jogadores.find((j: any) => j.user_id === usuarioAtual.id);
        if (jogador?.confirmado) { setErro('Você já confirmou presença e não pode sair.'); return; }
        if (jogador?.vinculado) { setErro('Você está em partida e não pode sair.'); return; }

        const sucesso = await sairDaVaga(salaId, usuarioAtual.id);
        if (sucesso) {
            const dadosJogadores = await buscarJogadores(salaId);
            setJogadores(dadosJogadores);
        }
    };

    const confirmar = async () => {
        const sucesso = await confirmarPresenca(salaId, usuarioAtual.id);
        if (sucesso) {
            const dadosJogadores = await buscarJogadores(salaId);
            setJogadores(dadosJogadores);
        }
    };

    const votar = async (opcao: 'time_a' | 'time_b') => {
        const jogador = jogadores.find((j: any) => j.user_id === usuarioAtual.id);
        const sucesso = await registrarVoto(salaId, usuarioAtual.id, opcao, jogador?.is_time_a || false);
        if (sucesso) { setMeuVoto(opcao); await carregarVotos(); }
    };

    const solicitarFinalizacao = async () => {
        await supabase.from('salas').update({
            estado: 'finalizacao',
            updated_at: new Date().toISOString()
        }).eq('id', salaId);
    };

    return {
        sala, jogadores, loading, erro,
        timer, codigoPartida,
        meuVoto, votos, timerFinalizacao,
        mostrarFalha,
        entrar, sair, confirmar, votar, solicitarFinalizacao,
    };
}