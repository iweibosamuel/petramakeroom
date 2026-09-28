export const UNIT_VALUE_NGN = 1_000_000;
export const MAX_DEADLINE_MONTHS = 2;

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

export type PledgeKind = "individual" | "group_member";

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
  units: number;
  amountNaira: number;
  deadline: string;
  paymentPlan: PaymentPlan;
  amountPaid: number;
  createdAt: string;
}

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
  inviteCode: string;
  createdAt: string;
}

export type GroupMemberStatus = "pending" | "confirmed";

export interface GroupMember {
  id: string;
  groupId: string;
  name: string;
  email: string;
  phone?: string;
  profile?: DonorProfile;
  committedAmountNaira: number;
  status: GroupMemberStatus;
  confirmationToken: string;
  pledgeId?: string;
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
  raisedNaira: number;
  contributorCount: number;
}
