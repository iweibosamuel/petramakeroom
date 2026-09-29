import { v4 as uuid } from "uuid";
import type {
  CreatedGroupPledge,
  CreateGroupPledgeInput,
  CreateIndividualPledgeInput,
  DataStore,
} from "./dataStore";
import type {
  Campaign,
  CampaignProgress,
  Group,
  GroupMember,
  PaymentConfirmation,
  Pledge,
} from "./types";
import { UNIT_VALUE_NGN } from "./types";

import { countGivers } from "./progress";

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

  // Records saved before currencies existed were all naira.
  for (const pledge of db.pledges) {
    pledge.currency ??= "NGN";
    pledge.amount ??= pledge.amountNaira;
    pledge.ngnRate ??= 1;
  }
  for (const member of db.groupMembers as Array<GroupMember & { committedAmountNaira?: number }>) {
    member.committedAmount ??= member.committedAmountNaira ?? 0;
  }

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
    // Only payments confirmed with "I've paid", summed from the installments.
    const confirmed = relevantPledges.map((p) => ({
      ...p,
      amountPaid: p.paymentPlan.installments
        .filter((i) => i.status === "paid")
        .reduce((sum, i) => sum + i.amount, 0),
    }));
    const raisedNaira = confirmed.reduce((sum, p) => sum + p.amountPaid * p.ngnRate, 0);
    const contributorCount = countGivers(confirmed, db.groupMembers);

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
      tier: input.tier,
      donorName: input.donorName,
      donorEmail: input.donorEmail,
      donorPhone: input.donorPhone,
      donorProfile: input.donorProfile,
      currency: input.currency,
      amount: input.amount,
      ngnRate: input.ngnRate,
      units: Math.round(input.amount * input.ngnRate) / UNIT_VALUE_NGN,
      amountNaira: Math.round(input.amount * input.ngnRate),
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
    const memberGroupIds = new Set(
      db.groupMembers
        .filter((m) => m.email.trim().toLowerCase() === normalized)
        .map((m) => m.groupId),
    );
    return db.pledges
      .filter(
        (p) =>
          p.donorEmail.trim().toLowerCase() === normalized ||
          (p.kind === "group" && p.groupId && memberGroupIds.has(p.groupId)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markInstallmentPaid(
    pledgeId: string,
    installmentId: string,
    confirmation: PaymentConfirmation,
  ): Promise<void> {
    const db = loadDb();
    const pledge = db.pledges.find((p) => p.id === pledgeId);
    if (!pledge) return;
    const installment = pledge.paymentPlan.installments.find(
      (i) => i.id === installmentId,
    );
    if (!installment || installment.status === "paid") return;
    installment.status = "paid";
    installment.paymentMethod = confirmation.method;
    installment.paymentReference = confirmation.reference;
    installment.paidAt = new Date().toISOString();
    pledge.amountPaid += installment.amount;
    saveDb(db);
  }

  async createGroupPledge(input: CreateGroupPledgeInput): Promise<CreatedGroupPledge> {
    const db = loadDb();
    const now = new Date().toISOString();
    const total = input.members.reduce((sum, m) => sum + m.amount, 0);
    const totalNaira = Math.round(total * input.ngnRate);

    const group: Group = {
      id: uuid(),
      campaignId: input.campaignId,
      tier: input.tier,
      organizerName: input.organizerName,
      organizerEmail: input.organizerEmail,
      organizerPhone: input.organizerPhone,
      organizerProfile: input.organizerProfile,
      totalUnits: totalNaira / UNIT_VALUE_NGN,
      deadline: input.deadline,
      createdAt: now,
    };
    const members: GroupMember[] = input.members.map((m, index) => ({
      id: uuid(),
      groupId: group.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      committedAmount: m.amount,
      isOrganizer: index === 0,
      createdAt: now,
    }));
    const pledge: Pledge = {
      id: uuid(),
      campaignId: input.campaignId,
      kind: "group",
      tier: input.tier,
      groupId: group.id,
      donorName: input.organizerName,
      donorEmail: input.organizerEmail,
      donorPhone: input.organizerPhone,
      donorProfile: input.organizerProfile,
      currency: input.currency,
      amount: total,
      ngnRate: input.ngnRate,
      units: totalNaira / UNIT_VALUE_NGN,
      amountNaira: totalNaira,
      deadline: input.deadline,
      paymentPlan: { type: input.paymentPlan, installments: input.installments },
      amountPaid: 0,
      createdAt: now,
    };

    db.groups.push(group);
    db.groupMembers.push(...members);
    db.pledges.push(pledge);
    saveDb(db);
    return { group, members, pledge };
  }

  async getGroup(groupId: string): Promise<Group | null> {
    const db = loadDb();
    return db.groups.find((g) => g.id === groupId) ?? null;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const db = loadDb();
    return db.groupMembers
      .filter((m) => m.groupId === groupId)
      .sort((a, b) => Number(b.isOrganizer ?? false) - Number(a.isOrganizer ?? false));
  }
}
