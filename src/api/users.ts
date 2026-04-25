// src/api/users.ts
// Operações relacionadas a usuários e cargos
// ✅ VERSÃO OTIMIZADA

import { supabase } from '../lib/supabase';
import { type CargoAdmin } from '../config/adminPermissoes';
import type { PerfilData } from '../contexts/PerfilContext';

const IS_DEV = import.meta.env.DEV;

// ============================================================
// BUSCAR CARGO DO USUÁRIO (com fallback e cache opcional)
// ============================================================
export async function buscarCargoUsuario(
  userId: string,
  perfil?: PerfilData | null
): Promise<CargoAdmin | null> {
  // ✅ Se já temos o perfil e ele tem cargo, usa cache
  if (perfil?.cargo && perfil.cargo !== 'jogador') {
    if (IS_DEV) console.log(`[buscarCargoUsuario] Usando cache do perfil: ${perfil.cargo}`);
    return perfil.cargo as CargoAdmin;
  }

  try {
    const { data, error } = await supabase
      .from('admin_usuarios')
      .select('cargo')
      .eq('user_id', userId)
      .maybeSingle();

    if (IS_DEV) console.log(`[buscarCargoUsuario] userId: ${userId}, cargo:`, data?.cargo);

    if (error || !data) {
      return 'jogador';
    }

    return (data.cargo as CargoAdmin) ?? 'jogador';
  } catch (error) {
    if (IS_DEV) console.error('Erro ao buscar cargo do usuário:', error);
    return 'jogador';
  }
}

// ============================================================
// VERIFICAR SE USUÁRIO TEM PERMISSÃO (com cache opcional)
// ============================================================
export async function temPermissaoPartida(
  userId: string,
  permissao: 'verCodigoPartida',
  perfil?: PerfilData | null
): Promise<boolean> {
  try {
    const { temPermissao } = await import('../config/adminPermissoes');
    const cargo = await buscarCargoUsuario(userId, perfil);
    return temPermissao(cargo, permissao);
  } catch (error) {
    if (IS_DEV) console.error('Erro ao verificar permissão:', error);
    return false;
  }
}