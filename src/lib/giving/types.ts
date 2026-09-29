export const UNIT_VALUE_NGN = 1_000_000;
// Latest date anyone can schedule a payment for.
export const LAST_DUE_DATE = "2026-12-21";

// Currencies someone can give in. Amounts on a pledge are in its currency;
// ngnRate converts them to naira for the campaign goal and tier limits.
export const CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type PaymentPlanType = "full" | "installments";

export type GivingTier = "burden_bearer" | "centurion";

// Who the giver is, collected the same way in every flow.
export interface DonorProfile {
  location: string;
  isPetraMember: boolean;
  campus?: string;
}

// How a giver says they paid. There's no payment gateway integration, so
// givers confirm payments themselves and finance reconciles against statements.
export const PAYMENT_METHODS = [
  "Paystack",
  "Flutterwave",
  "GTBank transfer",
  "Bank of America transfer",
  "Zelle",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentConfirmation {
  method: PaymentMethod;
  reference?: string;
}

export interface Installment {
  id: string;
  // In the pledge's currency.
  amount: number;
  dueDate: string;
  status: "pending" | "paid";
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paidAt?: string;
}

export interface PaymentPlan {
  type: PaymentPlanType;
  installments: Installment[];
}

// "group" is one seed given together by several people. "group_member" is a
// legacy kind from the old join-link flow, kept so older pledges still load.
export type PledgeKind = "individual" | "group" | "group_member";

export interface Pledge {
  id: string;
  campaignId: string;
  kind: PledgeKind;
  tier: GivingTier;
  groupId?: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  donorProfile?: DonorProfile;
  currency: Currency;
  // Amount pledged, in `currency`.
  amount: number;
  // Naira value of 1 unit of `currency`, locked when the pledge was made.
  ngnRate: number;
  // Naira equivalents (amount × ngnRate), for the goal and tier limits.
  units: number;
  amountNaira: number;
  deadline: string;
  paymentPlan: PaymentPlan;
  // Confirmed as paid so far, in `currency`.
  amountPaid: number;
  createdAt: string;
}

// A group records that several people are giving one seed together. The
// organiser lists everyone and their share; the seed itself is a single
// pledge (kind "group") that anyone in the group can pay.
export interface Group {
  id: string;
  campaignId: string;
  tier: GivingTier;
  organizerName: string;
  organizerEmail: string;
  organizerPhone?: string;
  organizerProfile?: DonorProfile;
  totalUnits: number;
  deadline: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  name: string;
  email: string;
  phone?: string;
  // This person's share, in the group seed's currency.
  committedAmount: number;
  isOrganizer: boolean;
  createdAt: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  goalNaira: number;
}

export interface CampaignProgress {
  campaign: Campaign;
  pledgedNaira: number;
  // Total confirmed as paid ("I've paid"), converted to naira.
  raisedNaira: number;
  // People who have confirmed a payment, counted once each (see countGivers).
  contributorCount: number;
}
