// Netlify Function: email everyone in a group seed their share.
//
// POST /.netlify/functions/send-group-emails  { "pledgeId": "<uuid>" }
//
// Called by the site right after a group seed is created. It looks the seed
// up in Supabase itself and only emails the people saved on that group, so it
// can't be used to email arbitrary addresses. It only acts on group seeds
// created in the last 30 minutes, and Resend's idempotency key stops repeat
// calls from sending twice. Environment variables: see ../lib/server.ts.

import { formatDate, formatNaira } from "../lib/emailLayout";
import { groupEmailSubject, renderGroupEmail, type GroupEmailPerson } from "../lib/groupEmail";
import {
  TIERS,
  UUID,
  json,
  lagosToday,
  logoUrl,
  pledgeUrl,
  sendEmails,
  supabaseRest,
} from "../lib/server";

const MAX_AGE_MS = 30 * 60 * 1000;

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!process.env.RESEND_API_KEY) return json({ sent: 0, reason: "RESEND_API_KEY not set" });

  let pledgeId: unknown;
  try {
    ({ pledgeId } = await req.json());
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  if (typeof pledgeId !== "string" || !UUID.test(pledgeId)) {
    return json({ error: "invalid pledgeId" }, 400);
  }

  const rest = supabaseRest();
  const [pledge] = await rest(
    `pledges?id=eq.${pledgeId}&kind=eq.group&select=id,tier,group_id,amount_naira,created_at`,
  );
  if (!pledge) return json({ error: "group seed not found" }, 404);
  if (Date.now() - new Date(pledge.created_at).getTime() > MAX_AGE_MS) {
    return json({ error: "group seed is too old to send emails for" }, 409);
  }

  const [group] = await rest(`groups?id=eq.${pledge.group_id}&select=organizer_name`);
  const members: Array<{ name: string; email: string; committed_amount_naira: number; is_organizer: boolean }> =
    await rest(
      `group_members?group_id=eq.${pledge.group_id}&select=name,email,committed_amount_naira,is_organizer&order=is_organizer.desc,name.asc`,
    );
  const installments: Array<{ amount: number; due_date: string }> = await rest(
    `installments?pledge_id=eq.${pledgeId}&select=amount,due_date&order=due_date.asc`,
  );
  if (!group || members.length === 0) return json({ error: "group not found" }, 404);

  const today = lagosToday();
  const whenText =
    installments.length === 1
      ? installments[0].due_date <= today
        ? "Today"
        : `By ${formatDate(installments[0].due_date)}`
      : `${installments.length} installments · first ${formatNaira(Number(installments[0]?.amount ?? 0))} due ${formatDate(installments[0]?.due_date ?? today)}`;

  const tier = TIERS[pledge.tier] ?? TIERS.burden_bearer;
  const everyone: GroupEmailPerson[] = members.map((m) => ({
    name: m.name,
    amountNaira: Number(m.committed_amount_naira),
    isOrganizer: m.is_organizer,
  }));

  const emails = members.map((member, index) => {
    const input = {
      recipient: everyone[index],
      organizerName: group.organizer_name,
      everyone,
      totalNaira: Number(pledge.amount_naira),
      tierName: tier.name,
      tierColor: tier.color,
      whenText,
      seedUrl: pledgeUrl(pledgeId as string),
      logoUrl: logoUrl(),
    };
    return { to: member.email, subject: groupEmailSubject(input), html: renderGroupEmail(input) };
  });

  try {
    return json({ sent: await sendEmails(emails, `group-seed-${pledgeId}`) });
  } catch (err) {
    console.error("[send-group-emails]", err);
    return json({ error: "email provider error" }, 502);
  }
};
