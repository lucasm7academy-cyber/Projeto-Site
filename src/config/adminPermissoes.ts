// src/config/adminPermissoes.ts
// Definição de cargos e permissões do painel administrativo.
// Adicione novos cargos e permissões aqui — a UI lê este arquivo automaticamente.

// ─────────────────────────────────────────────────────────────────────────────
// CARGOS
// ─────────────────────────────────────────────────────────────────────────────

/** Hierarquia de cargos: proprietario > admin > organizador */
export type CargoAdmin = 'proprietario' | 'admin' | 'organizador';

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSÕES
// ─────────────────────────────────────────────────────────────────────────────

export interface PermissoesAdmin {
  /** Pode adicionar / remover MPoints de jogadores */
  gerenciarSaldos: boolean;
  /** Pode votar no vencedor de partidas em disputa */
  resolverPartidas: boolean;
  /** Pode cancelar uma partida (sem declarar vencedor) */
  cancelarPartidas: boolean;
  /** Pode promover / rebaixar / remover admins e organizadores */
  gerenciarAdmins: boolean;
  /** Pode expulsar jogadores da plataforma */
  expulsarJogadores: boolean;
  /** Pode criar salas manualmente pelo painel */
  criarSalas: boolean;
  /** Pode ver todos os logs de ações administrativas */
  verTodosLogs: boolean;
}

export const PERMISSOES_POR_CARGO: Record<CargoAdmin, PermissoesAdmin> = {
  proprietario: {
    gerenciarSaldos:   true,
    resolverPartidas:  true,
    cancelarPartidas:  true,
    gerenciarAdmins:   true,
    expulsarJogadores: true,
    criarSalas:        true,
    verTodosLogs:      true,
  },
  admin: {
    gerenciarSaldos:   false,
    resolverPartidas:  true,
    cancelarPartidas:  true,
    gerenciarAdmins:   false,   // pode ver mas não alterar (UI desabilita botões)
    expulsarJogadores: true,
    criarSalas:        true,
    verTodosLogs:      true,
  },
  organizador: {
    gerenciarSaldos:   false,
    resolverPartidas:  true,
    cancelarPartidas:  true,
    gerenciarAdmins:   false,
    expulsarJogadores: false,
    criarSalas:        true,
    verTodosLogs:      false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Verifica se um cargo tem determinada permissão. */
export function temPermissao(
  cargo: CargoAdmin | null | undefined,
  permissao: keyof PermissoesAdmin,
): boolean {
  if (!cargo) return false;
  return PERMISSOES_POR_CARGO[cargo]?.[permissao] ?? false;
}

/** Verifica se cargoA pode gerenciar cargoB (hierarquia). */
export function podeGerenciar(cargoA: CargoAdmin, cargoB: CargoAdmin): boolean {
  const ordem: CargoAdmin[] = ['organizador', 'admin', 'proprietario'];
  return ordem.indexOf(cargoA) > ordem.indexOf(cargoB);
}

// ─────────────────────────────────────────────────────────────────────────────
// LABELS E CORES (para UI)
// ─────────────────────────────────────────────────────────────────────────────

export const CARGO_LABELS: Record<CargoAdmin, string> = {
  proprietario: 'Proprietário',
  admin:        'Admin',
  organizador:  'Organizador',
};

export const CARGO_COLORS: Record<CargoAdmin, { text: string; bg: string; border: string }> = {
  proprietario: { text: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20' },
  admin:        { text: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20'    },
  organizador:  { text: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20'   },
};
