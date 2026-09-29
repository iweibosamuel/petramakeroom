// The campaign runs in three phases of $1,000,000 each, three months apart.
// Only one is open at a time. The current phase's last day is the latest date
// anyone can schedule a payment for.
// To move to the next phase, change CURRENT_PHASE. Progress currently counts
// every confirmed payment, so Phase 2 will also need a start point to count
// from when it opens.

export interface GivingPhase {
  number: number;
  title: string;
  goalUsd: number;
  // Giving window (YYYY-MM-DD).
  startDate: string;
  endDate: string;
  // What this phase's giving pays for, shown on the tracker.
  goals?: string[];
}

export const PHASES: GivingPhase[] = [
  {
    number: 1,
    title: "Giving Petra a Global Headquarters",
    goalUsd: 1_000_000,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    goals: ["Land", "Leases", "Acquisitions & Permits", "Preparatory civil works"],
  },
  { number: 2, title: "Phase 2", goalUsd: 1_000_000, startDate: "2027-01-01", endDate: "2027-03-31" },
  { number: 3, title: "Phase 3", goalUsd: 1_000_000, startDate: "2027-04-01", endDate: "2027-06-30" },
];

export const CURRENT_PHASE = PHASES[0];
