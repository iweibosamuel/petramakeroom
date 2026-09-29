// The campaign runs in three phases of $1,000,000 each. Only one is open at
// a time: Phase 2 starts once Phase 1's goal is reached, then Phase 3.
// To move to the next phase, change CURRENT_PHASE. Progress currently counts
// every confirmed payment, so Phase 2 will also need a start point to count
// from when it opens.

export interface GivingPhase {
  number: number;
  title: string;
  goalUsd: number;
}

export const PHASES: GivingPhase[] = [
  { number: 1, title: "Giving Petra a Global Headquarters", goalUsd: 1_000_000 },
  { number: 2, title: "Phase 2", goalUsd: 1_000_000 },
  { number: 3, title: "Phase 3", goalUsd: 1_000_000 },
];

export const CURRENT_PHASE = PHASES[0];
