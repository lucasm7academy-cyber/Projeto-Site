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