// src/components/draft/DraftRoom.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDDRVersion, buildChampionIconUrl } from '../../api/riot';
import {
  buscarDraftDaSala,
  criarDraft,
  banirCampeao,
  pickarCampeao,
  podeControlarDraft,
  inscreverDraftRealtime,
} from '../../api/draft';
import { getTurnOrder, type DraftState, type Champion } from './draftTypes';

// ============================================================
// TIPOS
// ============================================================
interface DraftRoomProps {
  salaId: number;
  usuarioId: string;
  modo: string;
  onDraftFinalizado?: (draft: DraftState) => void;
  onSair?: () => void;
}


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export const DraftRoom: React.FC<DraftRoomProps> = ({
  salaId,
  usuarioId,
  modo,
  onDraftFinalizado,
  onSair,
}) => {
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [champions, setChampions] = useState<Record<string, Champion>>({});
  const [loading, setLoading] = useState(true);
  const [selectedChamp, setSelectedChamp] = useState<Champion | null>(null);
  const [meuTime, setMeuTime] = useState<'blue' | 'red' | null>(null);
  const [possoJogar, setPossoJogar] = useState(false);
  const [timer, setTimer] = useState(30);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');

  // ============================================================
  // CARREGAR DADOS INICIAIS
  // ============================================================
  useEffect(() => {
    const inicializar = async () => {
      setLoading(true);

      // 1. Verificar se usuário pode controlar o draft
      const permissao = await podeControlarDraft(salaId, usuarioId, modo);
      setMeuTime(permissao.team);
      setPossoJogar(permissao.pode);

      // 2. Buscar campeões da Riot
      try {
        const version = await getDDRVersion();
        const res = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/champion.json`
        );
        const data = await res.json();
        setChampions(data.data);
      } catch (error) {
        console.error('Erro ao buscar campeões:', error);
      }

      // 3. Buscar ou criar draft
      let draftAtual = await buscarDraftDaSala(salaId);
      if (!draftAtual) {
        draftAtual = await criarDraft(salaId, false);
      }
      setDraft(draftAtual);

      // Se o draft já estava finalizado ao carregar (ex: reload após término), avança imediatamente
      if (draftAtual?.status === 'finished') {
        onDraftFinalizado?.(draftAtual);
        return;
      }

      setLoading(false);
    };

    inicializar();
  }, [salaId, usuarioId]);

  // ============================================================
  // REALTIME - ATUALIZAR EM TEMPO REAL
  // ============================================================
  useEffect(() => {
    if (!draft) return;

    const channel = inscreverDraftRealtime(salaId, (novoDraft) => {
      setDraft(novoDraft);
      
      // Verificar se finalizou
      if (novoDraft.status === 'finished') {
        onDraftFinalizado?.(novoDraft);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salaId, draft?.id, onDraftFinalizado]);

  // ============================================================
  // TIMER
  // ============================================================
  useEffect(() => {
    if (!draft || draft.status !== 'ongoing') return;

    const interval = setInterval(() => {
      const agora = Date.now();
      const restante = Math.max(0, Math.floor(((draft.timer_end || agora) - agora) / 1000));
      setTimer(restante);

      if (restante <= 0) {
        // Timer expirou - auto-banir campeão aleatório?
        console.log('Timer expirou!');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [draft]);

  // ============================================================
  // VERIFICAR SE É MEU TURNO
  // ============================================================
  const isMeuTurno = useCallback((): boolean => {
    if (!draft || !possoJogar || !meuTime) return false;
    if (draft.status !== 'ongoing') return false;
    const turnoAtual = getTurnOrder(modo)[draft.current_turn];
    return turnoAtual?.team === meuTime;
  }, [draft, possoJogar, meuTime, modo]);

  // ============================================================
  // AÇÕES DO DRAFT
  // ============================================================
  const handleBanir = async (champion: Champion) => {
    if (!draft || !meuTime || !isMeuTurno()) return;
    if (draft.current_phase !== 'ban') return;

    const sucesso = await banirCampeao(draft, champion.id, meuTime, modo);
    if (sucesso) {
      setSelectedChamp(null);
    }
  };

  const handlePickar = async (champion: Champion) => {
    if (!draft || !meuTime || !isMeuTurno()) return;
    if (draft.current_phase !== 'pick') return;

    const sucesso = await pickarCampeao(draft, champion.id, meuTime, modo);
    if (sucesso) {
      setSelectedChamp(null);
    }
  };

  const handleChampionClick = (champion: Champion) => {
    if (!isMeuTurno()) return;
    setSelectedChamp(champion);
  };

  const confirmarAcao = () => {
    if (!selectedChamp || !draft) return;

    if (draft.current_phase === 'ban') {
      handleBanir(selectedChamp);
    } else {
      handlePickar(selectedChamp);
    }
  };

  // ============================================================
  // FILTRAR CAMPEÕES
  // ============================================================
  const filteredChampions = Object.values(champions).filter((champ) => {
    const matchSearch = champ.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Aqui poderia filtrar por role também
    return matchSearch;
  });

  // ============================================================
  // RENDERIZAR SLOT DE BAN/PICK
  // ============================================================
  const renderSlot = (championId: string | null, index: number, type: 'ban' | 'pick') => {
    const champion = championId ? champions[championId] : null;
    const isActive = draft?.current_turn === index &&
                     getTurnOrder(modo)[index]?.phase === type;

    return (
      <div
        key={index}
        className={`
          w-[6vmin] h-[6vmin] rounded border-2 transition-all duration-300
          ${isActive ? 'border-[#FFB700] shadow-[0_0_20px_rgba(255,183,0,0.5)]' : 'border-white/10'}
          ${champion ? 'bg-black/60' : 'bg-black/20'}
        `}
      >
        {champion ? (
          <img
            src={buildChampionIconUrl(champion.image.full.split('.')[0])}
            alt={champion.name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-[2vmin] font-black">
            {type === 'ban' ? '🚫' : '?'}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="flex-1 bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent" />
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="flex-1 w-full bg-[#050505] flex flex-col h-screen overflow-hidden">
      
      {/* TOP BAR - TIMER E STATUS */}
      <div className="h-[10vmin] bg-black/50 border-b border-white/10 flex items-center justify-between px-[4vmin]">
        <div className="flex items-center gap-[2vmin]">
          <span className="text-white/40 text-[1.5vmin] font-black uppercase tracking-widest">
            {draft?.current_phase === 'ban' ? 'FASE DE BANS' : 'FASE DE PICKS'}
          </span>
          <div className={`px-[2vmin] py-[0.5vmin] rounded border ${
            draft?.current_team === 'blue' 
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-400' 
              : 'border-red-500/40 bg-red-500/10 text-red-400'
          }`}>
            <span className="text-[1.5vmin] font-black uppercase">
              VEZ DO TIME {draft?.current_team === 'blue' ? 'AZUL' : 'VERMELHO'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-[1vmin]">
          <Clock className="w-[2vmin] h-[2vmin] text-[#FFB700]" />
          <span className={`text-[2.5vmin] font-black tabular-nums ${
            timer <= 10 ? 'text-red-500' : 'text-white'
          }`}>
            {timer}s
          </span>
        </div>

        {onSair && (
          <button
            onClick={onSair}
            className="px-[3vmin] py-[1vmin] rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
          >
            Sair
          </button>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex">
        
        {/* TIME AZUL (ESQUERDA) */}
        <div className="w-[20vmin] bg-gradient-to-r from-blue-500/5 to-transparent border-r border-white/5 p-[2vmin]">
          <h3 className="text-blue-400 text-[2vmin] font-black uppercase tracking-widest mb-[2vmin]">
            TIME AZUL
          </h3>
          
          {/* BANS */}
          <div className="mb-[3vmin]">
            <p className="text-white/30 text-[1vmin] font-bold mb-[1vmin]">BANS</p>
            <div className="flex flex-wrap gap-[0.5vmin]">
              {draft?.blue_bans.map((ban, i) => renderSlot(ban, i, 'ban'))}
            </div>
          </div>

          {/* PICKS */}
          <div>
            <p className="text-white/30 text-[1vmin] font-bold mb-[1vmin]">PICKS</p>
            <div className="flex flex-col gap-[1vmin]">
              {draft?.blue_picks.map((pick, i) => (
                <div key={i} className="flex items-center gap-[1vmin]">
                  {renderSlot(pick, i + 6, 'pick')}
                  <span className="text-white/40 text-[1.2vmin]">
                    {pick ? champions[pick]?.name : 'Vazio'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GRID DE CAMPEÕES (CENTRO) */}
        <div className="flex-1 p-[2vmin] overflow-y-auto">
          {/* BARRA DE PESQUISA */}
          <div className="mb-[2vmin]">
            <input
              type="text"
              placeholder="Buscar campeão..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-[40vmin] px-[2vmin] py-[1vmin] bg-black/50 border border-white/10 rounded text-white text-[1.5vmin] outline-none focus:border-[#FFB700]/50"
            />
          </div>

          {/* CAMPEÕES */}
          <div className="grid grid-cols-8 gap-[0.5vmin]">
            {filteredChampions.map((champion) => {
              const isBanned = draft?.blue_bans.includes(champion.id) || 
                              draft?.red_bans.includes(champion.id);
              const isPicked = draft?.blue_picks.includes(champion.id) || 
                              draft?.red_picks.includes(champion.id);
              const isDisabled = isBanned || isPicked;
              const isSelected = selectedChamp?.id === champion.id;

              return (
                <motion.div
                  key={champion.id}
                  whileHover={{ scale: isDisabled ? 1 : 1.05 }}
                  whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                  onClick={() => !isDisabled && handleChampionClick(champion)}
                  className={`
                    relative cursor-pointer rounded overflow-hidden border-2 transition-all
                    ${isDisabled ? 'opacity-30 grayscale cursor-not-allowed border-white/5' : ''}
                    ${isSelected ? 'border-[#FFB700] shadow-[0_0_20px_rgba(255,183,0,0.5)]' : 'border-transparent'}
                    ${!isDisabled && !isSelected ? 'hover:border-white/30' : ''}
                  `}
                >
                  <img
                    src={buildChampionIconUrl(champion.image.full.split('.')[0])}
                    alt={champion.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-[0.5vmin]">
                    <p className="text-white text-[1vmin] font-bold truncate">
                      {champion.name}
                    </p>
                  </div>
                  {isBanned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                      <X className="w-[3vmin] h-[3vmin] text-red-500" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* TIME VERMELHO (DIREITA) */}
        <div className="w-[20vmin] bg-gradient-to-l from-red-500/5 to-transparent border-l border-white/5 p-[2vmin]">
          <h3 className="text-red-400 text-[2vmin] font-black uppercase tracking-widest mb-[2vmin]">
            TIME VERMELHO
          </h3>
          
          {/* BANS */}
          <div className="mb-[3vmin]">
            <p className="text-white/30 text-[1vmin] font-bold mb-[1vmin]">BANS</p>
            <div className="flex flex-wrap gap-[0.5vmin]">
              {draft?.red_bans.map((ban, i) => renderSlot(ban, i + 1, 'ban'))}
            </div>
          </div>

          {/* PICKS */}
          <div>
            <p className="text-white/30 text-[1vmin] font-bold mb-[1vmin]">PICKS</p>
            <div className="flex flex-col gap-[1vmin]">
              {draft?.red_picks.map((pick, i) => (
                <div key={i} className="flex items-center justify-end gap-[1vmin]">
                  <span className="text-white/40 text-[1.2vmin]">
                    {pick ? champions[pick]?.name : 'Vazio'}
                  </span>
                  {renderSlot(pick, i + 7, 'pick')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      <AnimatePresence>
        {selectedChamp && isMeuTurno() && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelectedChamp(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-[4vmin] max-w-[50vmin]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-[3vmin]">
                <img
                  src={buildChampionIconUrl(selectedChamp.image.full.split('.')[0])}
                  alt={selectedChamp.name}
                  className="w-[10vmin] h-[10vmin] rounded border-2 border-[#FFB700]"
                />
                <div>
                  <h3 className="text-[2.5vmin] font-black text-white">
                    {selectedChamp.name}
                  </h3>
                  <p className="text-white/40 text-[1.5vmin]">
                    {selectedChamp.title}
                  </p>
                </div>
              </div>

              <p className="text-white/60 text-[1.5vmin] text-center my-[3vmin]">
                Confirmar {draft?.current_phase === 'ban' ? 'BAN' : 'PICK'}?
              </p>

              <div className="flex gap-[2vmin]">
                <button
                  onClick={() => setSelectedChamp(null)}
                  className="flex-1 py-[1.5vmin] rounded-xl bg-white/5 border border-white/10 text-white/60 font-black uppercase tracking-widest hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAcao}
                  className={`
                    flex-1 py-[1.5vmin] rounded-xl font-black uppercase tracking-widest
                    ${draft?.current_phase === 'ban'
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                      : 'bg-green-500 hover:bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                    }
                  `}
                >
                  <Check className="inline w-[2vmin] h-[2vmin] mr-[1vmin]" />
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AVISO DE NÃO É SEU TURNO */}
      {!possoJogar && (
        <div className="absolute bottom-[2vmin] left-1/2 -translate-x-1/2 px-[4vmin] py-[1.5vmin] bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <p className="text-yellow-400 text-[1.5vmin] font-bold">
            👀 Você está como espectador. Apenas os {modo === '1v1' || modo === 'aram' ? 'Midlaners' : 'Junglers'} podem banir/pickar.
          </p>
        </div>
      )}

      {possoJogar && !isMeuTurno() && draft?.status === 'ongoing' && (
        <div className="absolute bottom-[2vmin] left-1/2 -translate-x-1/2 px-[4vmin] py-[1.5vmin] bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <p className="text-blue-400 text-[1.5vmin] font-bold">
            ⏳ Aguarde seu turno...
          </p>
        </div>
      )}
    </div>
  );
};