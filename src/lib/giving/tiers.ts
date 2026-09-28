import type { GivingTier } from "./types";

export interface TierConfig {
  id: GivingTier;
  slug: string;
  name: string;
  description: string;
  amountHint: string;
  accent: string;
  minNaira: number;
  maxNaira?: number;
  quickAmountsNaira?: number[];
}

// Both tiers share one flow; they only differ in the amount rules below.
export const TIERS: Record<GivingTier, TierConfig> = {
  burden_bearer: {
    id: "burden_bearer",
    slug: "burden-bearer",
    name: "Burden Bearer",
    description:
      "Every seed makes a difference. Give any amount as you are led and join us in carrying the vision forward.",
    amountHint: "Any amount, as you are led",
    accent: "#0339a1",
    minNaira: 1,
  },
  centurion: {
    id: "centurion",
    slug: "centurion",
    name: "Centurion",
    description:
      "For members who want to give ₦10 million or more towards the vision and the work God is doing through this ministry.",
    amountHint: "₦10 million to ₦100 million",
    accent: "#a00238",
    minNaira: 10_000_000,
    maxNaira: 100_000_000,
    quickAmountsNaira: Array.from({ length: 10 }, (_, i) => (i + 1) * 10_000_000),
  },
};

export const PETRA_CAMPUSES = ["Lagos", "Abuja"];
