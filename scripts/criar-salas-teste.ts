// Script para criar salas de teste com diferentes estados
// Execute no console do navegador ou via Node.js com Supabase

import { supabase } from '../src/lib/supabase';

const ROLES_5V5 = ['TOP', 'JG', 'MID', 'ADC', 'SUP'];
const CHAMPIONS = ['Aatrox', 'Ahri', 'Akali', 'Akshan', 'Alistar', 'Amumu', 'Anivia', 'Annie', 'Aphelios', 'Ashe'];

async function criarSalasTeste() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return;
    }

    console.log('🔄 Criando salas de teste...');

    const estados = ['aberta', 'preenchendo', 'confirmacao', 'aguardando_inicio', 'em_partida', 'finalizacao', 'encerrada'];

    for (let i = 0; i < estados.length; i++) {
      const estado = estados[i];

      // Criar sala
      const { data: sala, error: erroSala } = await supabase
        .from('salas')
        .insert({
          nome: `Sala Teste - ${estado.toUpperCase()}`,
          criadorId: user.id,
          modo: '5v5',
          mpoints: 10,
          estado: estado as any,
          codigo: `TST${i + 1}`,
          codigoPartida: estado !== 'aberta' && estado !== 'preenchendo' ? `MATCH${i + 1}` : null,
        })
        .select()
        .single();

      if (erroSala) {
        console.error(`❌ Erro ao criar sala ${estado}:`, erroSala);
        continue;
      }

      console.log(`✅ Sala "${estado}" criada: ${sala.id}`);

      // Preencher vagas com jogadores
      const jogadores = [];
      for (let j = 0; j < ROLES_5V5.length; j++) {
        jogadores.push({
          sala_id: sala.id,
          user_id: user.id,
          role: ROLES_5V5[j],
          isTimeA: j < 3,
          confirmado: ['confirmacao', 'aguardando_inicio', 'em_partida', 'finalizacao', 'encerrada'].includes(estado),
          vinculado: ['em_partida', 'finalizacao', 'encerrada'].includes(estado),
        });
      }

      // Adicionar mais um jogador no time B
      jogadores.push({
        sala_id: sala.id,
        user_id: user.id,
        role: 'SUP',
        isTimeA: false,
        confirmado: ['confirmacao', 'aguardando_inicio', 'em_partida', 'finalizacao', 'encerrada'].includes(estado),
        vinculado: ['em_partida', 'finalizacao', 'encerrada'].includes(estado),
      });

      const { error: erroJogadores } = await supabase
        .from('sala_jogadores')
        .insert(jogadores);

      if (erroJogadores) {
        console.error(`❌ Erro ao adicionar jogadores:`, erroJogadores);
      } else {
        console.log(`✅ ${jogadores.length} jogadores adicionados`);
      }

      // Criar draft se necessário
      if (['aguardando_inicio', 'em_partida', 'finalizacao', 'encerrada'].includes(estado)) {
        const picks = {
          blue_picks: CHAMPIONS.slice(0, 5),
          red_picks: CHAMPIONS.slice(5, 10),
        };

        const { data: draft, error: erroDraft } = await supabase
          .from('drafts')
          .insert({
            sala_id: sala.id,
            ...picks,
          })
          .select()
          .single();

        if (erroDraft) {
          console.error(`❌ Erro ao criar draft:`, erroDraft);
        } else {
          // Atualizar sala com draft_id
          await supabase
            .from('salas')
            .update({ draft_id: draft.id })
            .eq('id', sala.id);

          console.log(`✅ Draft criado com picks`);
        }
      }

      console.log('---');
    }

    console.log('✅ TODAS AS SALAS CRIADAS COM SUCESSO!');
    console.log('\n📋 Salas criadas:');
    estados.forEach((e, i) => {
      console.log(`   ${i + 1}. Estado: ${e.toUpperCase()}`);
    });
  } catch (erro) {
    console.error('❌ Erro geral:', erro);
  }
}

// Executar
criarSalasTeste();
