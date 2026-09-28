import type {
  CampaignProgress,
  DonorProfile,
  GivingTier,
  Group,
  GroupMember,
  Installment,
  PaymentConfirmation,
  PaymentPlanType,
  Pledge,
} from "./types";

export interface CreateIndividualPledgeInput {
  campaignId: string;
  tier: GivingTier;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  donorProfile: DonorProfile;
  units: number;
  deadline: string;
  paymentPlan: PaymentPlanType;
  installments: Installment[];
}

export interface NewGroupMember {
  name: string;
  email: string;
  phone: string;
  amountNaira: number;
}

export interface CreateGroupPledgeInput {
  campaignId: string;
  tier: GivingTier;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  organizerProfile: DonorProfile;
  // Everyone giving, organiser first. Shares add up to the group's total.
  members: NewGroupMember[];
  deadline: string;
  paymentPlan: PaymentPlanType;
  installments: Installment[];
}

export interface CreatedGroupPledge {
  group: Group;
  members: GroupMember[];
  pledge: Pledge;
}

export interface DataStore {
  getCampaignProgress(campaignId: string): Promise<CampaignProgress>;

  createIndividualPledge(input: CreateIndividualPledgeInput): Promise<Pledge>;
  createGroupPledge(input: CreateGroupPledgeInput): Promise<CreatedGroupPledge>;
  getPledge(pledgeId: string): Promise<Pledge | null>;
  // Pledges made with this email, plus group seeds this email is part of.
  getPledgesByEmail(email: string): Promise<Pledge[]>;
  markInstallmentPaid(
    pledgeId: string,
    installmentId: string,
    confirmation: PaymentConfirmation,
  ): Promise<void>;

  getGroup(groupId: string): Promise<Group | null>;
  getGroupMembers(groupId: string): Promise<GroupMember[]>;
}
