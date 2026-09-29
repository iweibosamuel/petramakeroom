import { v4 as uuid } from "uuid";
import { supabase } from "../supabaseClient";
import { countGivers } from "./progress";
import type {
  CreatedGroupPledge,
  CreateGroupPledgeInput,
  CreateIndividualPledgeInput,
  DataStore,
} from "./dataStore";
import type {
  Campaign,
  CampaignProgress,
  DonorProfile,
  Group,
  GroupMember,
  Installment,
  PaymentConfirmation,
  Pledge,
} from "./types";
import { UNIT_VALUE_NGN } from "./types";

// Naira equivalent of an amount in a pledge's currency.
function toNaira(amount: number, ngnRate: number): number {
  return Math.round(amount * ngnRate);
}

function requireClient() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

function mapProfile(
  location: string | null,
  isPetraMember: boolean | null,
  campus: string | null,
): DonorProfile | undefined {
  if (location == null && isPetraMember == null) return undefined;
  return {
    location: location ?? "",
    isPetraMember: Boolean(isPetraMember),
    campus: campus ?? undefined,
  };
}

function mapPledgeRow(row: any, installments: Installment[]): Pledge {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    kind: row.kind,
    tier: row.tier,
    groupId: row.group_id ?? undefined,
    donorName: row.donor_name,
    donorEmail: row.donor_email,
    donorPhone: row.donor_phone ?? undefined,
    donorProfile: mapProfile(row.location, row.is_petra_member, row.campus),
    currency: row.currency ?? "NGN",
    amount: Number(row.amount ?? row.amount_naira),
    ngnRate: Number(row.ngn_rate ?? 1),
    units: Number(row.units),
    amountNaira: Number(row.amount_naira),
    deadline: row.deadline,
    paymentPlan: { type: row.payment_plan_type, installments },
    amountPaid: Number(row.amount_paid),
    createdAt: row.created_at,
  };
}

function mapGroupRow(row: any): Group {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    tier: row.tier,
    organizerName: row.organizer_name,
    organizerEmail: row.organizer_email,
    organizerPhone: row.organizer_phone ?? undefined,
    organizerProfile: mapProfile(
      row.organizer_location,
      row.organizer_is_petra_member,
      row.organizer_campus,
    ),
    totalUnits: Number(row.total_units),
    deadline: row.deadline,
    createdAt: row.created_at,
  };
}

function mapGroupMemberRow(row: any): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    // Column name predates currencies; the amount is in the seed's currency.
    committedAmount: Number(row.committed_amount_naira),
    isOrganizer: Boolean(row.is_organizer),
    createdAt: row.created_at,
  };
}

async function fetchInstallments(
  client: ReturnType<typeof requireClient>,
  pledgeId: string,
): Promise<Installment[]> {
  const { data, error } = await client
    .from("installments")
    .select("*")
    .eq("pledge_id", pledgeId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    amount: Number(r.amount),
    dueDate: r.due_date,
    status: r.status,
    paymentMethod: r.payment_method ?? undefined,
    paymentReference: r.payment_reference ?? undefined,
    paidAt: r.paid_at ?? undefined,
  }));
}

async function insertInstallments(
  client: ReturnType<typeof requireClient>,
  pledgeId: string,
  installments: Installment[],
) {
  if (installments.length === 0) return;
  const { error } = await client.from("installments").insert(
    installments.map((i) => ({
      id: i.id,
      pledge_id: pledgeId,
      amount: i.amount,
      due_date: i.dueDate,
      status: i.status,
    })),
  );
  if (error) throw error;
}

export class SupabaseDataStore implements DataStore {
  async getCampaignProgress(campaignId: string): Promise<CampaignProgress> {
    const client = requireClient();
    const { data: campaignRow, error: campaignError } = await client
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();
    if (campaignError) throw campaignError;

    const campaign: Campaign = {
      id: campaignRow.id,
      title: campaignRow.title,
      description: campaignRow.description,
      goalNaira: Number(campaignRow.goal_naira),
    };

    // Progress counts only payments confirmed with "I've paid", summed from
    // the confirmed installments themselves rather than the pledge's running
    // amount_paid total, so it can never drift from what was confirmed.
    const { data: pledgeRows, error: pledgeError } = await client
      .from("pledges")
      .select("amount_naira, ngn_rate, kind, group_id, donor_email, installments(amount, status)")
      .eq("campaign_id", campaignId);
    if (pledgeError) throw pledgeError;

    const pledges = (pledgeRows ?? []).map((r: any) => ({
      kind: r.kind,
      groupId: r.group_id ?? undefined,
      donorEmail: r.donor_email,
      amountNaira: Number(r.amount_naira),
      ngnRate: Number(r.ngn_rate ?? 1),
      // In the pledge's currency.
      amountPaid: (r.installments ?? [])
        .filter((i: any) => i.status === "paid")
        .reduce((sum: number, i: any) => sum + Number(i.amount), 0),
    }));

    const paidGroupIds = [
      ...new Set(
        pledges.filter((p) => p.kind === "group" && p.groupId && p.amountPaid > 0).map((p) => p.groupId!),
      ),
    ];
    const { data: memberRows, error: memberError } = paidGroupIds.length
      ? await client.from("group_members").select("group_id, email").in("group_id", paidGroupIds)
      : { data: [], error: null };
    if (memberError) throw memberError;

    return {
      campaign,
      pledgedNaira: pledges.reduce((sum, p) => sum + p.amountNaira, 0),
      raisedNaira: pledges.reduce((sum, p) => sum + p.amountPaid * p.ngnRate, 0),
      contributorCount: countGivers(
        pledges,
        (memberRows ?? []).map((m: any) => ({ groupId: m.group_id, email: m.email })),
      ),
    };
  }

  async createIndividualPledge(
    input: CreateIndividualPledgeInput,
  ): Promise<Pledge> {
    const client = requireClient();
    const pledgeId = uuid();
    const { data, error } = await client
      .from("pledges")
      .insert({
        id: pledgeId,
        campaign_id: input.campaignId,
        kind: "individual",
        tier: input.tier,
        donor_name: input.donorName,
        donor_email: input.donorEmail,
        donor_phone: input.donorPhone,
        location: input.donorProfile.location,
        is_petra_member: input.donorProfile.isPetraMember,
        campus: input.donorProfile.campus ?? null,
        currency: input.currency,
        amount: input.amount,
        ngn_rate: input.ngnRate,
        units: toNaira(input.amount, input.ngnRate) / UNIT_VALUE_NGN,
        amount_naira: toNaira(input.amount, input.ngnRate),
        deadline: input.deadline,
        payment_plan_type: input.paymentPlan,
        amount_paid: 0,
      })
      .select()
      .single();
    if (error) throw error;

    await insertInstallments(client, pledgeId, input.installments);
    return mapPledgeRow(data, input.installments);
  }

  async getPledge(pledgeId: string): Promise<Pledge | null> {
    const client = requireClient();
    const { data, error } = await client
      .from("pledges")
      .select("*")
      .eq("id", pledgeId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const installments = await fetchInstallments(client, pledgeId);
    return mapPledgeRow(data, installments);
  }

  async getPledgesByEmail(email: string): Promise<Pledge[]> {
    const client = requireClient();
    const normalized = email.trim();

    const { data: ownRows, error: ownError } = await client
      .from("pledges")
      .select("*")
      .ilike("donor_email", normalized);
    if (ownError) throw ownError;

    // Group seeds this person was listed in by the organiser.
    const { data: memberRows, error: memberError } = await client
      .from("group_members")
      .select("group_id")
      .ilike("email", normalized);
    if (memberError) throw memberError;
    const groupIds = [...new Set((memberRows ?? []).map((r: any) => r.group_id))];

    let groupRows: any[] = [];
    if (groupIds.length > 0) {
      const { data, error } = await client
        .from("pledges")
        .select("*")
        .eq("kind", "group")
        .in("group_id", groupIds);
      if (error) throw error;
      groupRows = data ?? [];
    }

    const rows = [...(ownRows ?? []), ...groupRows]
      .filter((row, i, all) => all.findIndex((r) => r.id === row.id) === i)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

    return Promise.all(
      rows.map(async (row: any) => {
        const installments = await fetchInstallments(client, row.id);
        return mapPledgeRow(row, installments);
      }),
    );
  }

  async markInstallmentPaid(
    pledgeId: string,
    installmentId: string,
    confirmation: PaymentConfirmation,
  ): Promise<void> {
    const client = requireClient();
    const { data: installment, error: fetchErr } = await client
      .from("installments")
      .select("*")
      .eq("id", installmentId)
      .single();
    if (fetchErr) throw fetchErr;
    if (installment.status === "paid") return;

    const { error: updateErr } = await client
      .from("installments")
      .update({
        status: "paid",
        payment_method: confirmation.method,
        payment_reference: confirmation.reference ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq("id", installmentId);
    if (updateErr) throw updateErr;

    const { error: rpcErr } = await client.rpc("increment_pledge_amount_paid", {
      p_pledge_id: pledgeId,
      p_amount: Number(installment.amount),
    });
    if (rpcErr) throw rpcErr;
  }

  async createGroupPledge(input: CreateGroupPledgeInput): Promise<CreatedGroupPledge> {
    const client = requireClient();
    const total = input.members.reduce((sum, m) => sum + m.amount, 0);
    const totalNaira = toNaira(total, input.ngnRate);
    const groupId = uuid();

    const { data: groupRow, error: groupError } = await client
      .from("groups")
      .insert({
        id: groupId,
        campaign_id: input.campaignId,
        tier: input.tier,
        organizer_name: input.organizerName,
        organizer_email: input.organizerEmail,
        organizer_phone: input.organizerPhone,
        organizer_location: input.organizerProfile.location,
        organizer_is_petra_member: input.organizerProfile.isPetraMember,
        organizer_campus: input.organizerProfile.campus ?? null,
        total_units: totalNaira / UNIT_VALUE_NGN,
        deadline: input.deadline,
        // Required by the original schema; invite links are no longer used.
        invite_code: groupId.slice(0, 8).toUpperCase(),
      })
      .select()
      .single();
    if (groupError) throw groupError;

    const { data: memberRows, error: memberError } = await client
      .from("group_members")
      .insert(
        input.members.map((m, index) => ({
          id: uuid(),
          group_id: groupId,
          name: m.name,
          email: m.email,
          phone: m.phone,
          committed_amount_naira: m.amount,
          is_organizer: index === 0,
          status: "confirmed",
        })),
      )
      .select();
    if (memberError) throw memberError;

    const pledgeId = uuid();
    const { data: pledgeRow, error: pledgeError } = await client
      .from("pledges")
      .insert({
        id: pledgeId,
        campaign_id: input.campaignId,
        kind: "group",
        tier: input.tier,
        group_id: groupId,
        donor_name: input.organizerName,
        donor_email: input.organizerEmail,
        donor_phone: input.organizerPhone,
        location: input.organizerProfile.location,
        is_petra_member: input.organizerProfile.isPetraMember,
        campus: input.organizerProfile.campus ?? null,
        currency: input.currency,
        amount: total,
        ngn_rate: input.ngnRate,
        units: totalNaira / UNIT_VALUE_NGN,
        amount_naira: totalNaira,
        deadline: input.deadline,
        payment_plan_type: input.paymentPlan,
        amount_paid: 0,
      })
      .select()
      .single();
    if (pledgeError) throw pledgeError;

    await insertInstallments(client, pledgeId, input.installments);

    return {
      group: mapGroupRow(groupRow),
      members: (memberRows ?? [])
        .map(mapGroupMemberRow)
        .sort((a, b) => Number(b.isOrganizer) - Number(a.isOrganizer)),
      pledge: mapPledgeRow(pledgeRow, input.installments),
    };
  }

  async getGroup(groupId: string): Promise<Group | null> {
    const client = requireClient();
    const { data, error } = await client
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapGroupRow(data) : null;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const client = requireClient();
    const { data, error } = await client
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .order("is_organizer", { ascending: false })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapGroupMemberRow);
  }
}
