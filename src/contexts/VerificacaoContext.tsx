import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { buscarJogadorCompleto } from '../api/riot';
import { supabase } from '../lib/supabase';

interface VerificacaoAtiva {
  id: string;
  riotId: string;
  puuid: string;
  summonerId: string;
  iconeAtual: number;
  iconeEsperado: number;
  nivel: number;
  nickname: string;
  iniciadoEm: number;
  status: 'pendente' | 'verificando' | 'concluido' | 'cancelado';
}

interface VerificacaoContextType {
  verificacaoAtiva: VerificacaoAtiva | null;
  iniciarVerificacao: (dados: Omit<VerificacaoAtiva, 'id' | 'iniciadoEm' | 'status'>) => void;
  cancelarVerificacao: () => void;
  tempoRestante: number | null;
}

const VerificacaoContext = createContext<VerificacaoContextType | undefined>(undefined);

const POLLING_INTERVAL_MS = 10000;
const TIMEOUT_SEGUNDOS = 240;

export function VerificacaoProvider({ children }: { children: ReactNode }) {
  const [verificacaoAtiva, setVerificacaoAtiva] = useState<VerificacaoAtiva | null>(null);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const pararTudo = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    const salva = localStorage.getItem('verificacao_ativa');
    if (salva) {
      try {
        const dados = JSON.parse(salva);
        const tempoPassado = (Date.now() - dados.iniciadoEm) / 1000;

        if (tempoPassado < TIMEOUT_SEGUNDOS && dados.status === 'pendente') {
          setVerificacaoAtiva({ ...dados, status: 'verificando' });
          iniciarPolling({ ...dados, status: 'verificando' });
        } else {
          localStorage.removeItem('verificacao_ativa');
        }
      } catch (e) {
        localStorage.removeItem('verificacao_ativa');
      }
    }

    return () => pararTudo();
  }, []);

  const salvarNoBanco = async (verificacao: VerificacaoAtiva, iconeId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const payload = {
        riot_id: verificacao.riotId,
        puuid: verificacao.puuid,
        nickname: verificacao.nickname,
        level: verificacao.nivel,
        profile_icon_id: iconeId,
        validado: true
      };

      const { data: existing } = await supabase
        .from('contas_riot')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error } = existing
        ? await supabase.from('contas_riot').update(payload).eq('user_id', user.id)
        : await supabase.from('contas_riot').insert({ user_id: user.id, ...payload });

      if (error) {
        console.error('❌ Erro ao salvar:', error);
        return false;
      }

      console.log('✅ Conta salva!');
      return true;

    } catch (error) {
      console.error('❌ Erro:', error);
      return false;
    }
  };

  const iniciarPolling = (verificacao: VerificacaoAtiva) => {
    pararTudo();

    const tempoPassado = (Date.now() - verificacao.iniciadoEm) / 1000;
    const segundosRestantes = Math.max(0, TIMEOUT_SEGUNDOS - tempoPassado);
    setTempoRestante(segundosRestantes);

    // Timer de countdown — ao zerar, cancela tudo e dispara timeout
    timerRef.current = setInterval(() => {
      setTempoRestante(prev => {
        if (prev === null || prev <= 1) {
          pararTudo();
          localStorage.removeItem('verificacao_ativa');
          setVerificacaoAtiva(null);
          setTempoRestante(null);
          window.dispatchEvent(new CustomEvent('verificacao_timeout', {
            detail: { riotId: verificacao.riotId }
          }));
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    let processando = false;

    // Polling que checa se o ícone foi trocado
    pollingRef.current = setInterval(async () => {
      if (processando) return;

      console.log(`🔍 Verificando (polling): ${verificacao.riotId}`);

      const resultado = await buscarJogadorCompleto(verificacao.riotId);

      if (resultado.success && resultado.data.iconeId === verificacao.iconeEsperado) {
        processando = true;
        console.log('✅ Verificação concluída!');

        pararTudo();

        const salvou = await salvarNoBanco(verificacao, resultado.data.iconeId);

        if (salvou) {
          const concluida = { ...verificacao, status: 'concluido' as const };
          setVerificacaoAtiva(concluida);
          localStorage.setItem('verificacao_ativa', JSON.stringify(concluida));

          window.dispatchEvent(new CustomEvent('verificacao_concluida', {
            detail: { riotId: verificacao.riotId }
          }));

          setTimeout(() => {
            setVerificacaoAtiva(prev => {
              if (prev?.status === 'concluido') {
                localStorage.removeItem('verificacao_ativa');
                setTempoRestante(null);
                return null;
              }
              return prev;
            });
          }, 10000);
        } else {
          localStorage.removeItem('verificacao_ativa');
          setVerificacaoAtiva(null);
          setTempoRestante(null);
          window.dispatchEvent(new CustomEvent('verificacao_erro_salvar', {
            detail: { riotId: verificacao.riotId }
          }));
        }
      }
    }, POLLING_INTERVAL_MS);
  };

  const iniciarVerificacao = (dados: Omit<VerificacaoAtiva, 'id' | 'iniciadoEm' | 'status'>) => {
    const novaVerificacao: VerificacaoAtiva = {
      ...dados,
      id: Date.now().toString(),
      iniciadoEm: Date.now(),
      status: 'pendente'
    };

    setVerificacaoAtiva(novaVerificacao);
    localStorage.setItem('verificacao_ativa', JSON.stringify(novaVerificacao));
    iniciarPolling({ ...novaVerificacao, status: 'verificando' });
  };

  const cancelarVerificacao = () => {
    pararTudo();
    setVerificacaoAtiva(null);
    setTempoRestante(null);
    localStorage.removeItem('verificacao_ativa');
  };

  return (
    <VerificacaoContext.Provider value={{
      verificacaoAtiva,
      iniciarVerificacao,
      cancelarVerificacao,
      tempoRestante
    }}>
      {children}
    </VerificacaoContext.Provider>
  );
}

export function useVerificacao() {
  const context = useContext(VerificacaoContext);
  if (context === undefined) {
    throw new Error('useVerificacao must be used within a VerificacaoProvider');
  }
  return context;
}
