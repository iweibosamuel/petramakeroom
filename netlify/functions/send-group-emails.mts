// Netlify Function: email everyone in a group seed their share.
//
// POST /.netlify/functions/send-group-emails  { "pledgeId": "<uuid>" }
//
// Called by the site right after a group seed is created. It looks the seed
// up in Supabase itself and only emails the people saved on that group, so it
// can't be used to email arbitrary addresses. It only acts on group seeds
// created in the last 30 minutes, and Resend's idempotency key stops repeat
// calls from sending twice.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   RESEND_API_KEY         required — server-only, never VITE_-prefixed
//   RESEND_FROM            optional — e.g. "Petra Make Room <giving@petracc.org>".
//                          Until a domain is verified in Resend this defaults to
//                          onboarding@resend.dev, which only delivers to the
//                          Resend account owner's inbox.
//   RESEND_REPLY_TO        optional — e.g. Finance@petracc.org
//   VITE_SUPABASE_URL      already set for the site
//   VITE_SUPABASE_ANON_KEY already set for the site (public key)
//   URL                    set automatically by Netlify (the site's address)

import {
  formatNaira,
  groupEmailSubject,
  renderGroupEmail,
  type GroupEmailPerson,
} from "../lib/groupEmail";

const TIERS: Record<string, { name: string; color: string }> = {
  burden_bearer: { name: "Burden Bearer", color: "#0339a1" },
  centurion: { name: "Centurion", color: "#a00238" },
};

const MAX_AGE_MS = 30 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const env = process.env;
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
  const resendKey = env.RESEND_API_KEY;
  if (!supabaseUrl || !supabaseKey) return json({ error: "Supabase not configured" }, 500);
  if (!resendKey) return json({ sent: 0, reason: "RESEND_API_KEY not set" });

  let pledgeId: unknown;
  try {
    ({ pledgeId } = await req.json());
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  if (typeof pledgeId !== "string" || !UUID.test(pledgeId)) {
    return json({ error: "invalid pledgeId" }, 400);
  }

  const rest = async (path: string) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res.json();
  };

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

  const today = new Date().toISOString().slice(0, 10);
  const whenText =
    installments.length === 1
      ? installments[0].due_date <= today
        ? "Today"
        : `By ${formatDate(installments[0].due_date)}`
      : `${installments.length} installments · first ${formatNaira(Number(installments[0]?.amount ?? 0))} due ${formatDate(installments[0]?.due_date ?? today)}`;

  const siteUrl = (env.SITE_URL || env.URL || "").replace(/\/$/, "");
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
      seedUrl: `${siteUrl}/give/schedule/${pledgeId}`,
      logoUrl: `${siteUrl}/images/petra-logo-email.png`,
    };
    return {
      from: env.RESEND_FROM || "Petra Make Room <onboarding@resend.dev>",
      to: [member.email],
      ...(env.RESEND_REPLY_TO ? { reply_to: env.RESEND_REPLY_TO } : {}),
      subject: groupEmailSubject(input),
      html: renderGroupEmail(input),
    };
  });

  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `group-seed-${pledgeId}`,
    },
    body: JSON.stringify(emails),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("[send-group-emails] Resend error", res.status, detail);
    return json({ error: "email provider error", status: res.status }, 502);
  }
  return json({ sent: emails.length });
};

