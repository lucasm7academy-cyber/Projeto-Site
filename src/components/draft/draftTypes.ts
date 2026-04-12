// src/types/draft.types.ts

export type DraftPhase = 'ban' | 'pick';
export type DraftTeam = 'blue' | 'red';
export type DraftStatus = 'waiting' | 'ongoing' | 'finished';

export interface DraftState {
  id: string;
  sala_id: number;
  
  // Bans e Picks
  blue_bans: string[];
  blue_picks: string[];
  red_bans: string[];
  red_picks: string[];
  
  // Estado atual
  current_phase: DraftPhase;
  current_team: DraftTeam;
  current_turn: number;
  timer_end: number | null;
  status: DraftStatus;
  
  // Fearless
  fearless_enabled: boolean;
  fearless_pool: string[];
  
  created_at: string;
  updated_at: string;
}

export interface Champion {
  id: string;      // Nome interno (ex: "Aatrox")
  key: string;     // ID numérico (ex: "266")
  name: string;    // Nome display (ex: "Aatrox")
  title: string;
  image: {
    full: string;
    sprite: string;
    group: string;
  };
}

export interface TurnOrder {
  turn: number;
  team: DraftTeam;
  phase: DraftPhase;
  description: string;
}

// ─── Draft tournament 5v5 / time_vs_time (20 turnos) ─────────────────────────
// Fase 1 bans (6) → Fase 1 picks (6) → Fase 2 bans (4) → Fase 2 picks (4)
// Blue bans: 0,2,4,13,15 = 5  |  Red bans: 1,3,5,12,14 = 5
// Blue picks: 6,9,10,17,18 = 5 | Red picks: 7,8,11,16,19 = 5
export const TURN_ORDER_5V5: { team: DraftTeam; phase: DraftPhase }[] = [
  { team: 'blue', phase: 'ban'  }, // 0  — ban fase 1
  { team: 'red',  phase: 'ban'  }, // 1
  { team: 'blue', phase: 'ban'  }, // 2
  { team: 'red',  phase: 'ban'  }, // 3
  { team: 'blue', phase: 'ban'  }, // 4
  { team: 'red',  phase: 'ban'  }, // 5
  { team: 'blue', phase: 'pick' }, // 6  — pick fase 1
  { team: 'red',  phase: 'pick' }, // 7
  { team: 'red',  phase: 'pick' }, // 8
  { team: 'blue', phase: 'pick' }, // 9
  { team: 'blue', phase: 'pick' }, // 10
  { team: 'red',  phase: 'pick' }, // 11
  { team: 'red',  phase: 'ban'  }, // 12 — ban fase 2
  { team: 'blue', phase: 'ban'  }, // 13
  { team: 'red',  phase: 'ban'  }, // 14
  { team: 'blue', phase: 'ban'  }, // 15
  { team: 'red',  phase: 'pick' }, // 16 — pick fase 2
  { team: 'blue', phase: 'pick' }, // 17
  { team: 'blue', phase: 'pick' }, // 18
  { team: 'red',  phase: 'pick' }, // 19
];

// ─── Draft 1v1 / ARAM (4 turnos) ─────────────────────────────────────────────
// 1 ban por lado + 1 pick por lado
export const TURN_ORDER_1V1: { team: DraftTeam; phase: DraftPhase }[] = [
  { team: 'blue', phase: 'ban'  }, // 0
  { team: 'red',  phase: 'ban'  }, // 1
  { team: 'blue', phase: 'pick' }, // 2
  { team: 'red',  phase: 'pick' }, // 3
];

// ─── Seleciona a ordem correta pelo modo de jogo ──────────────────────────────
export function getTurnOrder(modo: string): { team: DraftTeam; phase: DraftPhase }[] {
  return modo === '1v1' || modo === 'aram' ? TURN_ORDER_1V1 : TURN_ORDER_5V5;
}

// Mantém export legado para código que ainda importa TURN_ORDER diretamente
export const TURN_ORDER = TURN_ORDER_5V5;