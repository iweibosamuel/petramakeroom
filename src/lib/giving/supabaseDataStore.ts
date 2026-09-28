import { v4 as uuid } from "uuid";
import { supabase } from "../supabaseClient";
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
  DonorProfile,
  Group,
  GroupMember,
  Installment,
  PaymentConfirmation,
  Pledge,
} from "./types";

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
    inviteCode: row.invite_code,
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
    profile: mapProfile(row.location, row.is_petra_member, row.campus),
    committedAmountNaira: Number(row.committed_amount_naira),
    status: row.status,
    confirmationToken: row.confirmation_token,
    pledgeId: row.pledge_id ?? undefined,
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

    const { data: pledgeRows, error: pledgeError } = await client
      .from("pledges")
      .select("amount_naira, amount_paid")
      .eq("campaign_id", campaignId);
    if (pledgeError) throw pledgeError;

    const pledgedNaira = (pledgeRows ?? []).reduce(
      (sum: number, r: any) => sum + Number(r.amount_naira),
      0,
    );
    const raisedNaira = (pledgeRows ?? []).reduce(
      (sum: number, r: any) => sum + Number(r.amount_paid),
      0,
    );

    return {
      campaign,
      pledgedNaira,
      raisedNaira,
      contributorCount: pledgeRows?.length ?? 0,
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
        units: input.units,
        amount_naira: Math.round(input.units * 1_000_000),
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
    const { data, error } = await client
      .from("pledges")
      .select("*")
      .ilike("donor_email", email.trim())
      .order("created_at", { ascending: false });
    if (error) throw error;

    return Promise.all(
      (data ?? []).map(async (row: any) => {
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

  async createGroup(input: CreateGroupInput): Promise<Group> {
    const client = requireClient();
    const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await client
      .from("groups")
      .insert({
        id: uuid(),
        campaign_id: input.campaignId,
        tier: input.tier,
        organizer_name: input.organizerName,
        organizer_email: input.organizerEmail,
        organizer_phone: input.organizerPhone,
        organizer_location: input.organizerProfile.location,
        organizer_is_petra_member: input.organizerProfile.isPetraMember,
        organizer_campus: input.organizerProfile.campus ?? null,
        total_units: input.totalUnits,
        deadline: input.deadline,
        invite_code: inviteCode,
      })
      .select()
      .single();
    if (error) throw error;
    return mapGroupRow(data);
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

  async getGroupByInviteCode(inviteCode: string): Promise<Group | null> {
    const client = requireClient();
    const { data, error } = await client
      .from("groups")
      .select("*")
      .ilike("invite_code", inviteCode)
      .maybeSingle();
    if (error) throw error;
    return data ? mapGroupRow(data) : null;
  }

  async joinGroup(
    groupId: string,
    input: JoinGroupInput,
  ): Promise<GroupMember> {
    const client = requireClient();
    const { data: group, error: groupErr } = await client
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();
    if (groupErr) throw groupErr;

    const { data, error } = await client
      .from("group_members")
      .insert({
        id: uuid(),
        group_id: groupId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        location: input.profile.location,
        is_petra_member: input.profile.isPetraMember,
        campus: input.profile.campus ?? null,
        committed_amount_naira: input.committedAmountNaira,
        status: "pending",
        confirmation_token: uuid(),
      })
      .select()
      .single();
    if (error) throw error;

    const member = mapGroupMemberRow(data);
    await sendGroupConfirmationEmail({
      to: member.email,
      name: member.name,
      groupOrganizerName: group.organizer_name,
      confirmationToken: member.confirmationToken,
      committedAmountNaira: member.committedAmountNaira,
    });

    return member;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const client = requireClient();
    const { data, error } = await client
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapGroupMemberRow);
  }

  async getGroupMember(memberId: string): Promise<GroupMember | null> {
    const client = requireClient();
    const { data, error } = await client
      .from("group_members")
      .select("*")
      .eq("id", memberId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapGroupMemberRow(data) : null;
  }

  async getGroupMembershipsByEmail(email: string): Promise<GroupMember[]> {
    const client = requireClient();
    const { data, error } = await client
      .from("group_members")
      .select("*")
      .ilike("email", email.trim())
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapGroupMemberRow);
  }

  async confirmGroupMemberByToken(token: string): Promise<GroupMember> {
    const client = requireClient();
    const { data, error } = await client
      .from("group_members")
      .update({ status: "confirmed" })
      .eq("confirmation_token", token)
      .select()
      .single();
    if (error) throw error;
    return mapGroupMemberRow(data);
  }

  async completeGroupMemberPledge(
    input: CompleteGroupMemberPledgeInput,
  ): Promise<Pledge> {
    const client = requireClient();
    const { data: member, error: memberErr } = await client
      .from("group_members")
      .select("*")
      .eq("id", input.memberId)
      .single();
    if (memberErr) throw memberErr;

    const { data: group, error: groupErr } = await client
      .from("groups")
      .select("*")
      .eq("id", member.group_id)
      .single();
    if (groupErr) throw groupErr;

    const pledgeId = uuid();
    const { data: pledgeRow, error: pledgeErr } = await client
      .from("pledges")
      .insert({
        id: pledgeId,
        campaign_id: group.campaign_id,
        kind: "group_member",
        tier: group.tier,
        group_id: group.id,
        donor_name: member.name,
        donor_email: member.email,
        donor_phone: member.phone,
        location: member.location,
        is_petra_member: member.is_petra_member,
        campus: member.campus,
        units: Number(member.committed_amount_naira) / 1_000_000,
        amount_naira: member.committed_amount_naira,
        deadline: input.deadline,
        payment_plan_type: input.paymentPlan,
        amount_paid: 0,
      })
      .select()
      .single();
    if (pledgeErr) throw pledgeErr;

    await insertInstallments(client, pledgeId, input.installments);

    const { error: updateErr } = await client
      .from("group_members")
      .update({ pledge_id: pledgeId })
      .eq("id", input.memberId);
    if (updateErr) throw updateErr;

    return mapPledgeRow(pledgeRow, input.installments);
  }
}
