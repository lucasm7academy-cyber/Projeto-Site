import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch session + user once at app startup (SINGLE call, not getSession + getUser separately)
    let isMounted = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          console.log('🔐 AuthContext - Sessão inicial:', session?.user?.email);
          setUser(session?.user || null);
          setIsLoading(false);
        }
      } catch (e) {
        console.error('[AuthContext] Erro ao buscar sessão:', e);
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    })();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        console.log('🔄 AuthContext - Auth mudou:', _event, session?.user?.email);
        setUser(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}

// Helper para substituir getUser() calls
export function useAuthUser() {
  const { user } = useAuth();
  return user;
}

// Cache para evitar múltiplas chamadas concorrentes a getUser()
let userCache: any = null;
let userCachePromise: Promise<any> | null = null;
let cacheHits = 0;
let cacheMisses = 0;

export async function getCachedUser() {
  // Se já tem user em cache, retornar imediatamente
  if (userCache) {
    cacheHits++;
    console.log(`🟢 [getCachedUser] Cache HIT #${cacheHits} - ${userCache?.email}`);
    return userCache;
  }

  // Se já está buscando, esperar a promise
  if (userCachePromise) {
    console.log(`🟡 [getCachedUser] Aguardando promise em andamento...`);
    return userCachePromise;
  }

  // Fazer a busca UMA VEZ
  cacheMisses++;
  console.log(`🔴 [getCachedUser] Cache MISS #${cacheMisses} - fazendo fetch...`);

  userCachePromise = (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userCache = user;
      console.log(`✅ [getCachedUser] Fetch concluído - ${user?.email}`);
      return user;
    } finally {
      userCachePromise = null;
    }
  })();

  return userCachePromise;
}
