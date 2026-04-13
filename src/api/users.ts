// src/api/users.ts
// Operações relacionadas a usuários e cargos

import { supabase } from '../lib/supabase';
import { type CargoAdmin } from '../config/adminPermissoes';

// ============================================================
// BUSCAR CARGO DO USUÁRIO
// ============================================================
export async function buscarCargoUsuario(userId: string): Promise<CargoAdmin | null> {
  try {
    const { data, error } = await supabase
      .from('admin_usuarios')
      .select('cargo')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      // Usuário não é admin — retorna 'jogador' como padrão
      return 'jogador';
    }

    return (data.cargo as CargoAdmin) ?? 'jogador';
  } catch (error) {
    console.error('Erro ao buscar cargo do usuário:', error);
    return 'jogador';
  }
}

// ============================================================
// VERIFICAR SE USUÁRIO TEM PERMISSÃO
// ============================================================
export async function temPermissaoPartida(
  userId: string,
  permissao: 'verCodigoPartida',
): Promise<boolean> {
  try {
    const { temPermissao } = await import('../config/adminPermissoes');
    const cargo = await buscarCargoUsuario(userId);
    return temPermissao(cargo, permissao);
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    return false;
  }
}
