// Shared helpers for the Netlify email functions: reading from Supabase,
// sending through Resend, and working out who a pledge's emails go to.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   RESEND_API_KEY         required — server-only, never VITE_-prefixed
//   VITE_SUPABASE_URL      already set for the site
//   VITE_SUPABASE_ANON_KEY already set for the site (public key)
//   URL                    set automatically by Netlify (the site's address)

import { Resend, type CreateBatchOptions } from "resend";

// Every system email comes from info@ with replies pointed at a no-reply
// address, so givers can't reply to them. petramakeroom.com must be a
// verified domain in Resend for these to send.
const SENDER = "Make Room <info@petramakeroom.com>";
const NO_REPLY = "no-reply@petramakeroom.com";

// Resend accepts at most 100 emails per batch request.
const BATCH_LIMIT = 100;

export const TIERS: Record<string, { name: string; color: string }> = {
  burden_bearer: { name: "Burden Bearer", color: "#0339a1" },
  centurion: { name: "Centurion", color: "#a00238" },
};

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function siteUrl(): string {
  return (process.env.SITE_URL || process.env.URL || "").replace(/\/$/, "");
}

export function logoUrl(): string {
  return `${siteUrl()}/images/petra-logo-email.png`;
}

export function pledgeUrl(pledgeId: string): string {
  return `${siteUrl()}/give/schedule/${pledgeId}`;
}

// Today's date (YYYY-MM-DD) in Lagos, where the campaign runs.
export function lagosToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

export function lagosDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

export function supabaseRest(): (path: string) => Promise<any> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return async (path: string) => {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res.json();
  };
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
}

// Sends emails in batches of up to 100. The idempotency key (suffixed with
// the batch number) stops a retried call from sending the same batch twice.
export async function sendEmails(emails: OutgoingEmail[], idempotencyKey: string): Promise<number> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const resend = new Resend(apiKey);

  let sent = 0;
  for (let start = 0; start < emails.length; start += BATCH_LIMIT) {
    const batch: CreateBatchOptions = emails.slice(start, start + BATCH_LIMIT).map((email) => ({
      from: SENDER,
      replyTo: NO_REPLY,
      to: [email.to],
      subject: email.subject,
      html: email.html,
    }));
    const { error } = await resend.batch.send(batch, {
      idempotencyKey: `${idempotencyKey}-${start / BATCH_LIMIT}`,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
    sent += batch.length;
  }
  return sent;
}

export interface PledgeRow {
  id: string;
  kind: "individual" | "group" | "group_member";
  tier: string;
  group_id: string | null;
  donor_name: string;
  donor_email: string;
  amount_naira: number;
  created_at: string;
  installments: InstallmentRow[];
}

export interface InstallmentRow {
  id: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid";
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
}

export const PLEDGE_SELECT =
  "id,kind,tier,group_id,donor_name,donor_email,amount_naira,created_at," +
  "installments(id,amount,due_date,status,payment_method,payment_reference,paid_at)";

export interface Recipient {
  name: string;
  email: string;
}

// Everyone giving on a pledge: every member of a group seed, otherwise the
// giver themselves. Duplicate addresses get one email.
export async function getRecipients(
  rest: (path: string) => Promise<any>,
  pledges: PledgeRow[],
): Promise<Map<string, Recipient[]>> {
  const groupIds = [
    ...new Set(pledges.filter((p) => p.kind === "group" && p.group_id).map((p) => p.group_id!)),
  ];
  const members: Array<{ group_id: string; name: string; email: string }> = groupIds.length
    ? await rest(`group_members?group_id=in.(${groupIds.join(",")})&select=group_id,name,email`)
    : [];

  const result = new Map<string, Recipient[]>();
  for (const pledge of pledges) {
    const candidates =
      pledge.kind === "group"
        ? members.filter((m) => m.group_id === pledge.group_id)
        : [];
    if (candidates.length === 0) {
      candidates.push({ group_id: "", name: pledge.donor_name, email: pledge.donor_email });
    }
    const seen = new Set<string>();
    result.set(
      pledge.id,
      candidates
        .filter((c) => {
          const key = c.email.trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((c) => ({ name: c.name, email: c.email.trim() })),
    );
  }
  return result;
}

export function totals(pledge: PledgeRow) {
  const paid = pledge.installments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const pending = pledge.installments
    .filter((i) => i.status !== "paid")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  return { paid, remaining: Number(pledge.amount_naira) - paid, pending };
}
