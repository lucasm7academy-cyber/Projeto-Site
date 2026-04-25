import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface PerfilData {
  id: string;
  nome: string;
  tag: string;
  elo: string;
  avatar?: string;
  riotId?: string;
  iconId?: number;
  contaVinculada: boolean;
  isVip: boolean;
  saldo: number;
}

interface PerfilContextType {
  perfil: PerfilData | null;
  loading: boolean;
  refetch: () => void;
  desvincular: () => void;
}

// Hook com fallback seguro para consumidores
export function usePerfilSafe(): PerfilContextType {
  const context = useContext(PerfilContext);
  if (!context) {
    return {
      perfil: null,
      loading: true,
      refetch: () => {},
      desvincular: () => {},
    };
  }
  return context;
}

const PerfilContext = createContext<PerfilContextType | null>(null);

export function PerfilProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarPerfil = useCallback(async () => {
    if (!user) {
      setPerfil(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [{ data: contaRiot }, { data: profile }, { data: saldoData }] = await Promise.all([
        supabase
          .from('contas_riot')
          .select('riot_id, profile_icon_id, elo_cache')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('is_vip')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('saldos')
          .select('saldo')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (contaRiot) {
        const [nome, tag] = (contaRiot.riot_id || '').split('#');
        setPerfil({
          id: user.id,
          nome: nome || user.email?.split('@')[0] || 'Jogador',
          tag: tag ? `#${tag}` : '',
          elo: contaRiot.elo_cache?.soloQ?.tier || 'Sem Elo',
          avatar: contaRiot.profile_icon_id
            ? `https://ddragon.leagueoflegends.com/cdn/14.8.1/img/profileicon/${contaRiot.profile_icon_id}.png`
            : undefined,
          riotId: contaRiot.riot_id,
          iconId: contaRiot.profile_icon_id,
          contaVinculada: true,
          isVip: profile?.is_vip ?? false,
          saldo: saldoData?.saldo ?? 0,
        });
      } else {
        // Conta não vinculada - use dados do auth user
        setPerfil({
          id: user.id,
          nome: user.email?.split('@')[0] || 'Jogador',
          tag: '',
          elo: 'Sem Elo',
          contaVinculada: false,
          isVip: profile?.is_vip ?? false,
          saldo: saldoData?.saldo ?? 0,
        });
      }

      // Realtime subscription em saldos para manter saldo atualizado
      const channel = supabase
        .channel(`saldos-user-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'saldos',
          filter: `user_id=eq.${user.id}`,
        }, (payload: any) => {
          setPerfil((prev) => prev ? { ...prev, saldo: payload.new.saldo } : null);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('[PerfilContext] Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    carregarPerfil().then((cleanup) => {
      unsubscribe = cleanup;
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarPerfil]);

  const desvincular = useCallback(() => {
    if (!user) return;
    setPerfil({
      id: user.id,
      nome: user.email?.split('@')[0] || 'Jogador',
      tag: '',
      elo: 'Sem Elo',
      contaVinculada: false,
      isVip: false,
      saldo: 0,
    });
  }, [user]);

  return (
    <PerfilContext.Provider value={{ perfil, loading, refetch: carregarPerfil, desvincular }}>
      {children}
    </PerfilContext.Provider>
  );
}

export function usePerfil() {
  const context = useContext(PerfilContext);
  if (!context) {
    throw new Error('usePerfil deve ser usado dentro de PerfilProvider');
  }
  return context;
}
