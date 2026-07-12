export const UNIT_VALUE_NGN = 1_000_000;
export const MAX_DEADLINE_MONTHS = 2;

export type PaymentPlanType = "full" | "installments";

export interface Installment {
  id: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid";
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
  groupId?: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
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
  organizerName: string;
  organizerEmail: string;
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
