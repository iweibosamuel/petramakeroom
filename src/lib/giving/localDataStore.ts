import { v4 as uuid } from "uuid";
import { sendGroupConfirmationEmail } from "./email";
import type {
  CompleteGroupMemberPledgeInput,
  CreateGroupInput,
  CreateIndividualPledgeInput,
  DataStore,
  JoinGroupInput,
} from "./dataStore";
import type {
  Campaign,
  CampaignProgress,
  Group,
  GroupMember,
  Pledge,
} from "./types";

const STORAGE_KEY = "petra_giving_db_v1";

interface Db {
  campaigns: Campaign[];
  pledges: Pledge[];
  groups: Group[];
  groupMembers: GroupMember[];
}

const seedCampaign: Campaign = {
  id: "make-room-2026",
  title: "Make Room — Lagos x Abuja",
  description:
    "Help us clear ground, make room, and welcome the multitudes God is bringing across Lagos and Abuja.",
  goalNaira: 1_000_000_000,
};

function loadDb(): Db {
  if (typeof window === "undefined") {
    return { campaigns: [seedCampaign], pledges: [], groups: [], groupMembers: [] };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const fresh: Db = {
      campaigns: [seedCampaign],
      pledges: [],
      groups: [],
      groupMembers: [],
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  const db = JSON.parse(raw) as Db;

  // Keep the seeded campaign's static fields (goal, title, description) in
  // sync with the source of truth above, without wiping stored pledges/groups.
  const existingIdx = db.campaigns.findIndex((c) => c.id === seedCampaign.id);
  if (existingIdx === -1) {
    db.campaigns.push(seedCampaign);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } else if (
    JSON.stringify(db.campaigns[existingIdx]) !== JSON.stringify(seedCampaign)
  ) {
    db.campaigns[existingIdx] = seedCampaign;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  return db;
}

function saveDb(db: Db) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export class LocalDataStore implements DataStore {
  async getCampaignProgress(campaignId: string): Promise<CampaignProgress> {
    const db = loadDb();
    const campaign = db.campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

    const relevantPledges = db.pledges.filter(
      (p) => p.campaignId === campaignId,
    );
    const pledgedNaira = relevantPledges.reduce(
      (sum, p) => sum + p.amountNaira,
      0,
    );
    const raisedNaira = relevantPledges.reduce(
      (sum, p) => sum + p.amountPaid,
      0,
    );
    const contributorCount = relevantPledges.length;

    return { campaign, pledgedNaira, raisedNaira, contributorCount };
  }

  async createIndividualPledge(
    input: CreateIndividualPledgeInput,
  ): Promise<Pledge> {
    const db = loadDb();
    const pledge: Pledge = {
      id: uuid(),
      campaignId: input.campaignId,
      kind: "individual",
      donorName: input.donorName,
      donorEmail: input.donorEmail,
      donorPhone: input.donorPhone,
      units: input.units,
      amountNaira: input.units * 1_000_000,
      deadline: input.deadline,
      paymentPlan: { type: input.paymentPlan, installments: input.installments },
      amountPaid: 0,
      createdAt: new Date().toISOString(),
    };
    db.pledges.push(pledge);
    saveDb(db);
    return pledge;
  }

  async getPledge(pledgeId: string): Promise<Pledge | null> {
    const db = loadDb();
    return db.pledges.find((p) => p.id === pledgeId) ?? null;
  }

  async getPledgesByEmail(email: string): Promise<Pledge[]> {
    const db = loadDb();
    const normalized = email.trim().toLowerCase();
    return db.pledges
      .filter((p) => p.donorEmail.trim().toLowerCase() === normalized)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markInstallmentPaid(
    pledgeId: string,
    installmentId: string,
  ): Promise<void> {
    const db = loadDb();
    const pledge = db.pledges.find((p) => p.id === pledgeId);
    if (!pledge) return;
    const installment = pledge.paymentPlan.installments.find(
      (i) => i.id === installmentId,
    );
    if (!installment || installment.status === "paid") return;
    installment.status = "paid";
    pledge.amountPaid += installment.amount;
    saveDb(db);
  }

  async createGroup(input: CreateGroupInput): Promise<Group> {
    const db = loadDb();
    const group: Group = {
      id: uuid(),
      campaignId: input.campaignId,
      organizerName: input.organizerName,
      organizerEmail: input.organizerEmail,
      totalUnits: input.totalUnits,
      deadline: input.deadline,
      inviteCode: generateInviteCode(),
      createdAt: new Date().toISOString(),
    };
    db.groups.push(group);
    saveDb(db);
    return group;
  }

  async getGroup(groupId: string): Promise<Group | null> {
    const db = loadDb();
    return db.groups.find((g) => g.id === groupId) ?? null;
  }

  async getGroupByInviteCode(inviteCode: string): Promise<Group | null> {
    const db = loadDb();
    return (
      db.groups.find(
        (g) => g.inviteCode.toUpperCase() === inviteCode.toUpperCase(),
      ) ?? null
    );
  }

  async joinGroup(
    groupId: string,
    input: JoinGroupInput,
  ): Promise<GroupMember> {
    const db = loadDb();
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) throw new Error(`Group ${groupId} not found`);

    const member: GroupMember = {
      id: uuid(),
      groupId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      committedAmountNaira: input.committedAmountNaira,
      status: "pending",
      confirmationToken: uuid(),
      createdAt: new Date().toISOString(),
    };
    db.groupMembers.push(member);
    saveDb(db);

    await sendGroupConfirmationEmail({
      to: member.email,
      name: member.name,
      groupOrganizerName: group.organizerName,
      confirmationToken: member.confirmationToken,
      committedAmountNaira: member.committedAmountNaira,
    });

    return member;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const db = loadDb();
    return db.groupMembers.filter((m) => m.groupId === groupId);
  }

  async getGroupMember(memberId: string): Promise<GroupMember | null> {
    const db = loadDb();
    return db.groupMembers.find((m) => m.id === memberId) ?? null;
  }

  async getGroupMembershipsByEmail(email: string): Promise<GroupMember[]> {
    const db = loadDb();
    const normalized = email.trim().toLowerCase();
    return db.groupMembers
      .filter((m) => m.email.trim().toLowerCase() === normalized)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async confirmGroupMemberByToken(token: string): Promise<GroupMember> {
    const db = loadDb();
    const member = db.groupMembers.find((m) => m.confirmationToken === token);
    if (!member) throw new Error("Invalid or expired confirmation link");
    member.status = "confirmed";
    saveDb(db);
    return member;
  }

  async completeGroupMemberPledge(
    input: CompleteGroupMemberPledgeInput,
  ): Promise<Pledge> {
    const db = loadDb();
    const member = db.groupMembers.find((m) => m.id === input.memberId);
    if (!member) throw new Error(`Group member ${input.memberId} not found`);
    const group = db.groups.find((g) => g.id === member.groupId);
    if (!group) throw new Error(`Group ${member.groupId} not found`);

    const pledge: Pledge = {
      id: uuid(),
      campaignId: group.campaignId,
      kind: "group_member",
      groupId: group.id,
      donorName: member.name,
      donorEmail: member.email,
      donorPhone: member.phone,
      units: member.committedAmountNaira / 1_000_000,
      amountNaira: member.committedAmountNaira,
      deadline: input.deadline,
      paymentPlan: { type: input.paymentPlan, installments: input.installments },
      amountPaid: 0,
      createdAt: new Date().toISOString(),
    };
    db.pledges.push(pledge);
    member.pledgeId = pledge.id;
    saveDb(db);
    return pledge;
  }
}
