import type {
  CampaignProgress,
  Group,
  GroupMember,
  Installment,
  PaymentPlanType,
  Pledge,
} from "./types";

export interface CreateIndividualPledgeInput {
  campaignId: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  units: number;
  deadline: string;
  paymentPlan: PaymentPlanType;
  installments: Installment[];
}

export interface CreateGroupInput {
  campaignId: string;
  organizerName: string;
  organizerEmail: string;
  totalUnits: number;
  deadline: string;
}

export interface JoinGroupInput {
  name: string;
  email: string;
  phone?: string;
  committedAmountNaira: number;
}

export interface CompleteGroupMemberPledgeInput {
  memberId: string;
  deadline: string;
  paymentPlan: PaymentPlanType;
  installments: Installment[];
}

export interface DataStore {
  getCampaignProgress(campaignId: string): Promise<CampaignProgress>;

  createIndividualPledge(input: CreateIndividualPledgeInput): Promise<Pledge>;
  getPledge(pledgeId: string): Promise<Pledge | null>;
  getPledgesByEmail(email: string): Promise<Pledge[]>;
  markInstallmentPaid(pledgeId: string, installmentId: string): Promise<void>;

  createGroup(input: CreateGroupInput): Promise<Group>;
  getGroup(groupId: string): Promise<Group | null>;
  getGroupByInviteCode(inviteCode: string): Promise<Group | null>;

  joinGroup(groupId: string, input: JoinGroupInput): Promise<GroupMember>;
  getGroupMembers(groupId: string): Promise<GroupMember[]>;
  getGroupMember(memberId: string): Promise<GroupMember | null>;
  getGroupMembershipsByEmail(email: string): Promise<GroupMember[]>;
  confirmGroupMemberByToken(token: string): Promise<GroupMember>;
  completeGroupMemberPledge(
    input: CompleteGroupMemberPledgeInput,
  ): Promise<Pledge>;
}
