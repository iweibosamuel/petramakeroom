import type { DataStore } from "./dataStore";
import { TIERS } from "./tiers";
import type { DonorProfile, Group, GroupMember, Installment, Pledge } from "./types";

// Mirrors every submission into a Google Sheet via a Google Apps Script web
// app (see google-sheets/apps-script.gs). Each record is upserted by ID into
// its tab, so a pledge's row updates in place when it's paid.
//
// Syncing is fire-and-forget: it never blocks or fails a giver's submission.

const SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK_URL;
const SHEET_TOKEN = import.meta.env.VITE_GOOGLE_SHEET_TOKEN;

export const isSheetSyncConfigured = Boolean(SHEET_URL);

type SheetName = "Pledges" | "Payments" | "Groups" | "Group members";
type Row = Record<string, string | number>;

function send(sheet: SheetName, id: string, row: Row) {
  if (!SHEET_URL) return;
  // text/plain keeps this a "simple" request, so the browser doesn't send a
  // CORS preflight that Apps Script can't answer. keepalive lets it finish
  // even if the page navigates straight after.
  fetch(SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: SHEET_TOKEN ?? "", sheet, id, row }),
  }).catch((err) => console.warn("[sheetSync] failed to sync", sheet, id, err));
}

function tierName(tier: Pledge["tier"] | undefined): string {
  return TIERS[tier ?? "burden_bearer"].name;
}

function profileColumns(profile: DonorProfile | undefined): Row {
  return {
    Location: profile?.location ?? "",
    "Petra member": profile ? (profile.isPetraMember ? "Yes" : "No") : "",
    Campus: profile?.campus ?? "",
  };
}

function pledgeRow(pledge: Pledge): Row {
  const { installments } = pledge.paymentPlan;
  const paidCount = installments.filter((i) => i.status === "paid").length;
  const status =
    paidCount === installments.length ? "Paid" : paidCount > 0 ? "Partly paid" : "Pending";
  const isGiveNow =
    installments.length === 1 && installments[0].dueDate === pledge.createdAt.slice(0, 10);
  return {
    "Pledge ID": pledge.id,
    "Created at": pledge.createdAt,
    Tier: tierName(pledge.tier),
    Type: pledge.kind === "group_member" ? "Group member" : "Individual",
    Name: pledge.donorName,
    Email: pledge.donorEmail,
    Phone: pledge.donorPhone ?? "",
    ...profileColumns(pledge.donorProfile),
    "Amount (₦)": pledge.amountNaira,
    "Paid (₦)": pledge.amountPaid,
    "Balance (₦)": pledge.amountNaira - pledge.amountPaid,
    Status: status,
    When: isGiveNow
      ? "Give now"
      : pledge.paymentPlan.type === "installments"
        ? `${installments.length} installments`
        : "One payment",
    "Due date": pledge.deadline,
    "Group ID": pledge.groupId ?? "",
  };
}

function paymentRow(pledge: Pledge, installment: Installment): Row {
  return {
    "Payment ID": installment.id,
    "Confirmed at": installment.paidAt ?? new Date().toISOString(),
    "Pledge ID": pledge.id,
    Tier: tierName(pledge.tier),
    Name: pledge.donorName,
    Email: pledge.donorEmail,
    Phone: pledge.donorPhone ?? "",
    "Amount (₦)": installment.amount,
    "Due date": installment.dueDate,
    Method: installment.paymentMethod ?? "",
    Reference: installment.paymentReference ?? "",
  };
}

function groupRow(group: Group): Row {
  return {
    "Group ID": group.id,
    "Created at": group.createdAt,
    Tier: tierName(group.tier),
    "Organiser name": group.organizerName,
    "Organiser email": group.organizerEmail,
    "Organiser phone": group.organizerPhone ?? "",
    ...profileColumns(group.organizerProfile),
    "Group total (₦)": Math.round(group.totalUnits * 1_000_000),
    Deadline: group.deadline,
    "Invite link": `${window.location.origin}/give/group/${group.id}/join`,
  };
}

function memberRow(member: GroupMember, group: Group | null): Row {
  return {
    "Member ID": member.id,
    "Joined at": member.createdAt,
    "Group ID": member.groupId,
    Organiser: group?.organizerName ?? "",
    Tier: tierName(group?.tier),
    Name: member.name,
    Email: member.email,
    Phone: member.phone ?? "",
    ...profileColumns(member.profile),
    "Share (₦)": member.committedAmountNaira,
    Status: member.pledgeId
      ? "Pledged"
      : member.status === "confirmed"
        ? "Confirmed"
        : "Awaiting email confirmation",
    "Pledge ID": member.pledgeId ?? "",
  };
}

// Wraps a DataStore so every write is also mirrored to the sheet.
export function withSheetSync(store: DataStore): DataStore {
  if (!isSheetSyncConfigured) return store;

  const syncMember = async (member: GroupMember) => {
    const group = await store.getGroup(member.groupId);
    send("Group members", member.id, memberRow(member, group));
  };

  return {
    getCampaignProgress: (...args) => store.getCampaignProgress(...args),
    getPledge: (...args) => store.getPledge(...args),
    getPledgesByEmail: (...args) => store.getPledgesByEmail(...args),
    getGroup: (...args) => store.getGroup(...args),
    getGroupByInviteCode: (...args) => store.getGroupByInviteCode(...args),
    getGroupMembers: (...args) => store.getGroupMembers(...args),
    getGroupMember: (...args) => store.getGroupMember(...args),
    getGroupMembershipsByEmail: (...args) => store.getGroupMembershipsByEmail(...args),

    async createIndividualPledge(input) {
      const pledge = await store.createIndividualPledge(input);
      send("Pledges", pledge.id, pledgeRow(pledge));
      return pledge;
    },

    async markInstallmentPaid(pledgeId, installmentId, confirmation) {
      await store.markInstallmentPaid(pledgeId, installmentId, confirmation);
      const pledge = await store.getPledge(pledgeId);
      const installment = pledge?.paymentPlan.installments.find((i) => i.id === installmentId);
      if (pledge && installment) {
        send("Payments", installment.id, paymentRow(pledge, installment));
        send("Pledges", pledge.id, pledgeRow(pledge));
      }
    },

    async createGroup(input) {
      const group = await store.createGroup(input);
      send("Groups", group.id, groupRow(group));
      return group;
    },

    async joinGroup(groupId, input) {
      const member = await store.joinGroup(groupId, input);
      void syncMember(member);
      return member;
    },

    async confirmGroupMemberByToken(token) {
      const member = await store.confirmGroupMemberByToken(token);
      void syncMember(member);
      return member;
    },

    async completeGroupMemberPledge(input) {
      const pledge = await store.completeGroupMemberPledge(input);
      send("Pledges", pledge.id, pledgeRow(pledge));
      const member = await store.getGroupMember(input.memberId);
      if (member) void syncMember(member);
      return pledge;
    },
  };
}
