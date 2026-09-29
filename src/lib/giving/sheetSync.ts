import type { DataStore } from "./dataStore";
import { TIERS } from "./tiers";
import type { DonorProfile, Group, GroupMember, Installment, Pledge } from "./types";

// Mirrors every submission into a Google Sheet via a Google Apps Script web
// app (see google-sheets/apps-script.gs). Each record is upserted by ID into
// its tab, so a pledge's row updates in place when it's paid.
//
// Syncing is fire-and-forget: it never blocks or fails a giver's submission.

// Built-in defaults so the live site syncs without any hosting setup. VITE_
// values are bundled into the public JS anyway, so these aren't secrets;
// setting the env vars overrides them (e.g. to point a test build elsewhere).
const DEFAULT_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbyJEF0WyqyABg5rxRiXx6wxreNWiGg-lY8OsT0c4UzN2U6_tzmjoC0KS4lfp4qx8UiDmA/exec";
const DEFAULT_SHEET_TOKEN = "546";

const SHEET_URL = import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK_URL || DEFAULT_SHEET_URL;
const SHEET_TOKEN = import.meta.env.VITE_GOOGLE_SHEET_TOKEN || DEFAULT_SHEET_TOKEN;

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
    Type:
      pledge.kind === "group"
        ? "Group"
        : pledge.kind === "group_member"
          ? "Group member (old flow)"
          : "Individual",
    // For group seeds this is the organiser; everyone giving is listed on
    // the Group members tab.
    Name: pledge.donorName,
    Email: pledge.donorEmail,
    Phone: pledge.donorPhone ?? "",
    ...profileColumns(pledge.donorProfile),
    // ₦ columns are naira (converted at the pledge's locked rate for other
    // currencies), so totals across the sheet stay comparable.
    "Amount (₦)": pledge.amountNaira,
    "Paid (₦)": toNaira(pledge, pledge.amountPaid),
    "Balance (₦)": pledge.amountNaira - toNaira(pledge, pledge.amountPaid),
    Currency: pledge.currency,
    "Amount (currency)": pledge.amount,
    "Paid (currency)": pledge.amountPaid,
    "Rate (₦ per 1)": pledge.ngnRate,
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

function toNaira(pledge: Pledge, amount: number): number {
  return Math.round(amount * pledge.ngnRate);
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
    "Amount (₦)": toNaira(pledge, installment.amount),
    Currency: pledge.currency,
    "Amount (currency)": installment.amount,
    "Due date": installment.dueDate,
    Method: installment.paymentMethod ?? "",
    Reference: installment.paymentReference ?? "",
  };
}

function groupRow(group: Group, memberCount: number): Row {
  return {
    "Group ID": group.id,
    "Created at": group.createdAt,
    Tier: tierName(group.tier),
    "Organiser name": group.organizerName,
    "Organiser email": group.organizerEmail,
    "Organiser phone": group.organizerPhone ?? "",
    ...profileColumns(group.organizerProfile),
    "Group total (₦)": Math.round(group.totalUnits * 1_000_000),
    People: memberCount,
    "Due date": group.deadline,
  };
}

function memberRow(member: GroupMember, group: Group, pledge: Pledge): Row {
  return {
    "Member ID": member.id,
    "Added at": member.createdAt,
    "Group ID": member.groupId,
    "Pledge ID": pledge.id,
    Organiser: group.organizerName,
    Tier: tierName(group.tier),
    Role: member.isOrganizer ? "Organiser" : "Member",
    Name: member.name,
    Email: member.email,
    Phone: member.phone ?? "",
    "Share (₦)": toNaira(pledge, member.committedAmount),
    "Group total (₦)": pledge.amountNaira,
    Currency: pledge.currency,
    "Share (currency)": member.committedAmount,
  };
}

// Wraps a DataStore so every write is also mirrored to the sheet.
export function withSheetSync(store: DataStore): DataStore {
  if (!isSheetSyncConfigured) return store;

  return {
    getCampaignProgress: (...args) => store.getCampaignProgress(...args),
    getPledge: (...args) => store.getPledge(...args),
    getPledgesByEmail: (...args) => store.getPledgesByEmail(...args),
    getGroup: (...args) => store.getGroup(...args),
    getGroupMembers: (...args) => store.getGroupMembers(...args),

    async createIndividualPledge(input) {
      const pledge = await store.createIndividualPledge(input);
      send("Pledges", pledge.id, pledgeRow(pledge));
      return pledge;
    },

    async createGroupPledge(input) {
      const created = await store.createGroupPledge(input);
      const { group, members, pledge } = created;
      send("Groups", group.id, groupRow(group, members.length));
      for (const member of members) {
        send("Group members", member.id, memberRow(member, group, pledge));
      }
      send("Pledges", pledge.id, pledgeRow(pledge));
      return created;
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
  };
}
