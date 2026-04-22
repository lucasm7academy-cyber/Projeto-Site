import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowRight } from 'lucide-react';

interface Partida {
  id: number;
  modo: string;
  vencedor: string | null;
  created_at: string;
  timeANome?: string;
  timeBNome?: string;
  jogadores: Array<{ id: string; nome: string; isTimeA: boolean }>;
}

export default function MinhasPartidas() {
  const { user } = useAuth();
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const carregarPartidas = async () => {
      try {
        const { data, error } = await supabase
          .from('salas')
          .select(`
            id,
            modo,
            vencedor,
            created_at,
            time_a_nome,
            time_b_nome,
            sala_jogadores (id, user_id, nome, is_time_a)
          `)
          .eq('estado', 'encerrada')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[MinhasPartidas] Erro:', error);
          return;
        }

        if (data) {
          // Filtrar apenas partidas que o usuário participou
          const minhasPartidas = data
            .filter((sala: any) =>
              sala.sala_jogadores.some((j: any) => j.user_id === user.id)
            )
            .map((sala: any) => ({
              id: sala.id,
              modo: sala.modo,
              vencedor: sala.vencedor,
              created_at: sala.created_at,
              timeANome: sala.time_a_nome,
              timeBNome: sala.time_b_nome,
              jogadores: sala.sala_jogadores,
            }));

          setPartidas(minhasPartidas);
        }
      } catch (err) {
        console.error('[MinhasPartidas] Exception:', err);
      } finally {
        setLoading(false);
      }
    };

    carregarPartidas();
  }, [user]);

  const isVitoria = (partida: Partida, userId: string): boolean => {
    const jogador = partida.jogadores.find((j) => j.user_id === userId);
    if (!jogador || !partida.vencedor) return false;

    const venceuTimeA = partida.vencedor === 'A';
    return jogador.is_time_a === venceuTimeA;
  };

  const getModoLabel = (modo: string): string => {
    const labels: Record<string, string> = {
      '1v1': '1v1',
      'time_vs_time': '5v5',
      '2v2': '2v2',
      '3v3': '3v3',
    };
    return labels[modo] || modo;
  };

  if (loading) {
    return (
      <div className="flex-1 bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#050505] p-[3vmin] overflow-y-auto">
      <div className="max-w-[100vmin] mx-auto">
        {/* Header */}
        <div className="mb-[4vmin]">
          <h1 className="text-[4vmin] font-black text-white uppercase tracking-tight mb-[0.5vmin]">
            Minhas Partidas
          </h1>
          <p className="text-[1.2vmin] text-white/40">
            {partidas.length} {partidas.length === 1 ? 'partida' : 'partidas'} encontrada{partidas.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Lista de Partidas */}
        {partidas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-[10vmin] text-center">
            <div className="text-[3vmin] mb-[2vmin]">🎮</div>
            <p className="text-[1.5vmin] font-black text-white/60 uppercase tracking-tight">
              Nenhuma partida encontrada
            </p>
            <p className="text-[1.1vmin] text-white/40 mt-[1vmin]">
              Suas partidas finalizadas aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-[2vmin]">
            {partidas.map((partida) => {
              const vitoria = isVitoria(partida, user!.id);
              const jogador = partida.jogadores.find((j) => j.user_id === user!.id);
              const nomeTimeVencedor =
                partida.vencedor === 'A'
                  ? partida.timeANome || 'Time Azul'
                  : partida.vencedor === 'B'
                  ? partida.timeBNome || 'Time Vermelho'
                  : 'Empate';

              return (
                <div
                  key={partida.id}
                  className={`rounded-xl border p-[2vmin] transition-all hover:shadow-lg ${
                    vitoria
                      ? 'bg-yellow-500/15 border-yellow-500/40 hover:bg-yellow-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/8'
                  }`}
                >
                  <div className="flex items-center justify-between gap-[2vmin]">
                    {/* Esquerda */}
                    <div className="flex-1">
                      <div className="flex items-center gap-[1.5vmin] mb-[1vmin]">
                        <div className={`px-[1vmin] py-[0.5vmin] rounded font-black uppercase text-[0.9vmin] ${
                          vitoria
                            ? 'bg-yellow-500/30 text-yellow-300'
                            : 'bg-white/10 text-white/60'
                        }`}>
                          {vitoria ? '✓ VITÓRIA' : '✗ DERROTA'}
                        </div>
                        <span className="text-[1vmin] font-black text-white/40 uppercase">
                          {getModoLabel(partida.modo)}
                        </span>
                        <span className="text-[0.9vmin] text-white/30">
                          {new Date(partida.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-[1vmin]">
                        <p className="text-[1.3vmin] font-black text-white">
                          {jogador?.nome}
                        </p>
                        <span className={`text-[1.1vmin] font-bold ${
                          vitoria ? 'text-yellow-400' : 'text-white/40'
                        }`}>
                          vs {nomeTimeVencedor}
                        </span>
                      </div>
                    </div>

                    {/* Direita */}
                    <div className="flex items-center gap-[1.5vmin]">
                      <div className="text-right">
                        <p className={`text-[1.5vmin] font-black ${
                          vitoria ? 'text-yellow-400' : 'text-white/60'
                        }`}>
                          {vitoria ? 'GANHOU' : 'PERDEU'}
                        </p>
                        <p className="text-[0.9vmin] text-white/40 font-mono">
                          Sala #{partida.id}
                        </p>
                      </div>
                      <ArrowRight className="w-[2vmin] h-[2vmin] text-white/20" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
