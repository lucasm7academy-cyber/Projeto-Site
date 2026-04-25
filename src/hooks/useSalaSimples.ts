// src/hooks/useSalaSimples.ts
import { useState, useEffect, useRef } from 'react';
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
    const [timer, setTimer] = useState(30);
    const [codigoPartida, setCodigoPartida] = useState<string | null>(null);
    const [meuVoto, setMeuVoto] = useState<string | null>(null);
    const [votos, setVotos] = useState<any[]>([]);
    const [timerFinalizacao, setTimerFinalizacao] = useState(180);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const timerFinRef = useRef<NodeJS.Timeout | null>(null);
    const transicionandoRef = useRef(false);

    // ── CARREGAR DADOS INICIAIS ──────────────────────
    useEffect(() => {
        async function carregar() {
            const dadosSala = await buscarsalas(salaId);
            if (!dadosSala) {
                setErro('Sala não encontrada');
                setLoading(false);
                return;
            }
            setSala(dadosSala);
            setCodigoPartida(dadosSala.codigo_partida || null);

            const dadosJogadores = await buscarJogadores(salaId);
            setJogadores(dadosJogadores);
            setLoading(false);
        }
        carregar();
    }, [salaId]);

    // ── REALTIME ──────────────────────────────────────
    useEffect(() => {
        const channel = supabase
            .channel(`sala_${salaId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'sala_jogadores', filter: `sala_id=eq.${salaId}` },
                async () => {
                    const dadosJogadores = await buscarJogadores(salaId);
                    setJogadores(dadosJogadores);
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'salas', filter: `id=eq.${salaId}` },
                (payload: any) => {
                    setSala(payload.new);
                    setCodigoPartida(payload.new.codigo_partida || null);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [salaId]);

    // ── TIMER DE CONFIRMAÇÃO ──────────────────────────
    useEffect(() => {
        const todosOcupados = jogadores.length === sala?.max_jogadores;
        const estadoConfirmacao = sala?.estado === 'confirmacao';

        if (todosOcupados && estadoConfirmacao && timer > 0) {
            timerRef.current = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        resetarNaoConfirmados();
                        return 30;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [jogadores.length, sala?.estado]);

    // ── TIMER DE FINALIZAÇÃO ──────────────────────────
    useEffect(() => {
        if (sala?.estado !== 'finalizacao') {
            setTimerFinalizacao(180);
            return;
        }

        // Se já tem 6 votos em um time, encerra imediatamente
        const votosA = votos.filter(v => v.opcao === 'time_a').length;
        const votosB = votos.filter(v => v.opcao === 'time_b').length;

        if (votosA >= 6) {
            encerrarPartida('A');
            return;
        }
        if (votosB >= 6) {
            encerrarPartida('B');
            return;
        }

        timerFinRef.current = setInterval(() => {
            setTimerFinalizacao(prev => {
                if (prev <= 1) {
                    clearInterval(timerFinRef.current!);
                    // Timer zerou → vai pro admin
                    encerrarPartida('empate');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerFinRef.current) clearInterval(timerFinRef.current);
        };
    }, [sala?.estado, votos]);

    // ── AUTO-TRANSIÇÕES ──────────────────────────────
    useEffect(() => {
        if (!sala || transicionandoRef.current) return;

        const estado = sala.estado;
        const total = jogadores.length;
        const max = sala.max_jogadores;
        const todosConfirmaram = total === max && jogadores.every(j => j.confirmado);

        async function transicionar(novoEstado: string) {
            transicionandoRef.current = true;
            await supabase.from('salas').update({
                estado: novoEstado,
                updated_at: new Date().toISOString()
            }).eq('id', salaId);
            transicionandoRef.current = false;
        }

        // aberta → preenchendo
        if (estado === 'aberta' && total > 0) {
            transicionar('preenchendo');
        }

        // preenchendo → confirmacao
        if (estado === 'preenchendo' && total === max) {
            transicionar('confirmacao');
            setTimer(30);
        }

        // preenchendo → aberta
        if (estado === 'preenchendo' && total === 0) {
            transicionar('aberta');
        }

        // confirmacao → preenchendo (alguém saiu)
        if (estado === 'confirmacao' && total < max) {
            transicionar('preenchendo');
            setTimer(30);
        }

        // confirmacao → aguardando_inicio (todos confirmaram)
        if (estado === 'confirmacao' && todosConfirmaram) {
            transicionar('aguardando_inicio');
            if (timerRef.current) clearInterval(timerRef.current);

            // Vincular jogadores
            supabase.from('sala_jogadores').update({ vinculado: true }).eq('sala_id', salaId);

            // Gerar código se não existir
            if (!codigoPartida) {
                const codigo = 'LOL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                supabase.from('salas').update({ codigo_partida: codigo }).eq('id', salaId);
            }
        }

        // Iniciar votação (quando partir para finalizacao)
        if (estado === 'finalizacao' && votos.length === 0) {
            carregarVotos();
        }

    }, [sala?.estado, jogadores]);

    // ── RESETAR NÃO CONFIRMADOS ──────────────────────
    async function resetarNaoConfirmados() {
        const naoConfirmados = jogadores.filter(j => !j.confirmado);
        for (const j of naoConfirmados) {
            await sairDaVaga(salaId, j.user_id);
        }
        await supabase.from('salas').update({
            estado: 'preenchendo',
            updated_at: new Date().toISOString()
        }).eq('id', salaId);
    }

    // ── ENCERRAR PARTIDA ─────────────────────────────
    async function encerrarPartida(vencedor: 'A' | 'B' | 'empate') {
        if (timerFinRef.current) clearInterval(timerFinRef.current);
        await encerrarSala(salaId, vencedor);
        // Desvincular todos
        await supabase.from('sala_jogadores').update({ vinculado: false }).eq('sala_id', salaId);
    }

    // ── CARREGAR VOTOS ───────────────────────────────
    async function carregarVotos() {
        const dadosVotos = await buscarVotos(salaId);
        setVotos(dadosVotos);
        const meu = dadosVotos.find((v: any) => v.user_id === usuarioAtual.id);
        if (meu) setMeuVoto(meu.opcao);
    }

    // ── AÇÕES ────────────────────────────────────────
    const entrar = async (role: string, isTimeA: boolean) => {
    // Verificar se já está em OUTRA sala vinculado
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

    // 🆕 Se já está em OUTRA vaga na MESMA sala, SAI primeiro
    const minhaVaga = jogadores.find((j: any) => j.user_id === usuarioAtual.id);
        if (minhaVaga) {
            // Se já está na MESMA vaga, não faz nada
            if (minhaVaga.role === role && minhaVaga.is_time_a === isTimeA) {
                return;
            }
            // Sai da vaga atual antes de entrar na nova
            await sairDaVaga(salaId, usuarioAtual.id);
        }

        // Agora entra na nova vaga
        const sucesso = await entrarNaVaga(
            salaId, usuarioAtual.id, usuarioAtual.nome,
            usuarioAtual.tag, usuarioAtual.elo, role, isTimeA
        );

        if (sucesso) {
            const dadosJogadores = await buscarJogadores(salaId);
            setJogadores(dadosJogadores);
        } else {
            setErro('Erro ao entrar na vaga');
        }
    };

    const sair = async () => {
        const jogador = jogadores.find((j: any) => j.user_id === usuarioAtual.id);

        // Só pode sair se NÃO confirmou e NÃO está vinculado
        if (jogador?.confirmado) {
            setErro('Você já confirmou presença e não pode sair.');
            return;
        }

        if (jogador?.vinculado) {
            setErro('Você está em partida e não pode sair.');
            return;
        }

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
        const sucesso = await registrarVoto(
            salaId,
            usuarioAtual.id,
            opcao,
            jogador?.is_time_a || false
        );
        if (sucesso) {
            setMeuVoto(opcao);
            await carregarVotos();
        }
    };

    const solicitarFinalizacao = async () => {
        await supabase.from('salas').update({
            estado: 'finalizacao',
            updated_at: new Date().toISOString()
        }).eq('id', salaId);
    };

    // ── RETORNO ──────────────────────────────────────
    return {
        sala, jogadores, loading, erro,
        timer, codigoPartida,
        meuVoto, votos, timerFinalizacao,
        entrar, sair, confirmar, votar, solicitarFinalizacao,
    };
}