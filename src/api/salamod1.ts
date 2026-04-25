// src/api/salamod1.ts
import { supabase } from '../lib/supabase';

export async function buscarsalas(salaId: number) {
    const { data, error } = await supabase
        .from('salas')
        .select('*')
        .eq('id', salaId)
        .single();

    if (error) {
        console.error('Erro ao buscar sala:', error);
        return null;
    }

    return data;
}

export async function buscarJogadores(salaId: number) {
    const { data, error } = await supabase
        .from('sala_jogadores')
        .select('*')
        .eq('sala_id', salaId);

    if (error) {
        console.error('Erro ao buscar jogadores:', error);
        return [];
    }

    return data;
}

export async function entrarNaVaga(
    salaId: number,
    userId: string,
    nome: string,
    tag: string,
    elo: string,
    role: string,
    isTimeA: boolean
) {
    const { error } = await supabase
        .from('sala_jogadores')
        .insert({
            sala_id: salaId,
            user_id: userId,
            nome: nome,
            tag: tag,
            elo: elo,
            role: role,
            is_time_a: isTimeA,
            confirmado: false,
            vinculado: false,
        });

    if (error) {
        console.error('Erro ao entrar na vaga:', error);
        return false;
    }

    return true;
}

export async function confirmarPresenca(salaId: number, userId: string) {
    const { error } = await supabase
        .from('sala_jogadores')
        .update({ confirmado: true })
        .eq('sala_id', salaId)
        .eq('user_id', userId);

    if (error) {
        console.error('Erro ao confirmar presença:', error);
        return false;
    }

    return true;
}

export async function sairDaVaga(salaId: number, userId: string) {
    const { error } = await supabase
        .from('sala_jogadores')
        .delete()
        .eq('sala_id', salaId)
        .eq('user_id', userId);

    if (error) {
        console.error('Erro ao sair da vaga:', error);
        return false;
    }

    return true;
}

// ── VOTAÇÃO ──────────────────────────────────────────

export async function registrarVoto(
    salaId: number,
    userId: string,
    opcao: 'time_a' | 'time_b',
     isTimeA: boolean,
) {
    const { error } = await supabase
        .from('sala_votos')
        .upsert(
            {
                sala_id: salaId,
                user_id: userId,
                fase: 'finalizacao',
                opcao: opcao,
                 is_time_a: isTimeA,
            },
            {
                onConflict: 'sala_id,user_id,fase',
            }
        );

    if (error) {
        console.error('Erro ao registrar voto:', error);
        return false;
    }
    return true;
}

export async function buscarVotos(salaId: number) {
    const { data, error } = await supabase
        .from('sala_votos')
        .select('*')
        .eq('sala_id', salaId)
        .eq('fase', 'finalizacao');

    if (error) {
        console.error('Erro ao buscar votos:', error);
        return [];
    }
    return data || [];
}

export async function encerrarSala(salaId: number, vencedor: 'A' | 'B' | 'empate') {
    const { error } = await supabase
        .from('salas')
        .update({
            estado: 'encerrada',
            vencedor: vencedor,
            updated_at: new Date().toISOString(),
        })
        .eq('id', salaId);

    if (error) {
        console.error('Erro ao encerrar sala:', error);
        return false;
    }
    return true;
}

// ── CRIAR SALA ──────────────────────────────────────
export async function criarSala(
    dados: {
        nome: string;
        descricao: string;
        modo: string;
        mpoints: number;
        temSenha: boolean;
        senha?: string;
        maxJogadores: number;
        eloMinimo?: string;
        timeANome?: string;
        timeATag?: string;
        timeALogo?: string;
    },
    usuario: { id: string; nome: string; tag?: string; elo: string; role: string }
) {
    const { data, error } = await supabase
        .from('salas')
        .insert({
            nome: dados.nome,
            descricao: dados.descricao,
            criador_id: usuario.id,
            criador_nome: usuario.nome,
            modo: dados.modo,
            mpoints: dados.mpoints,
            tem_senha: dados.temSenha,
            senha: dados.temSenha ? dados.senha : null,
            max_jogadores: dados.maxJogadores,
            elo_minimo: dados.eloMinimo || null,
            time_a_nome: dados.timeANome || null,
            time_a_tag: dados.timeATag || null,
            time_a_logo: dados.timeALogo || null,
            estado: 'aberta',
        })
        .select('*')
        .single();

    if (error || !data) {
        console.error('[criarSala]', error);
        return null;
    }

    return {
        ...data,
        codigo: `#${String(data.id).padStart(6, '0')}`,
        jogadores: [],
        criadorId: data.criador_id,
        criadorNome: data.criador_nome,
        timeANome: data.time_a_nome,
        timeBNome: data.time_b_nome,
        temSenha: data.tem_senha,
        mpoints: data.mpoints,
        modo: data.modo,
        estado: data.estado,
        nome: data.nome,
        descricao: data.descricao || '',
        maxJogadores: data.max_jogadores,
        eloMinimo: data.elo_minimo,
        vencedor: data.vencedor,
        createdAt: new Date(data.created_at),
    };
}