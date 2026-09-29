// Netlify Function: welcome email when someone makes an individual pledge.
//
// POST /.netlify/functions/send-pledge-welcome  { "pledgeId": "<uuid>" }
//
// Called by the site right after an individual pledge is created (group
// seeds get send-group-emails instead). It looks the pledge up in Supabase
// itself and only emails the giver saved on it, so it can't be used to email
// arbitrary addresses. It only acts on pledges created in the last 30
// minutes, and Resend's idempotency key stops repeat calls from sending
// twice. Environment variables: see ../lib/server.ts.

import { welcomeEmail } from "../lib/pledgeEmails";
import {
  PLEDGE_SELECT,
  UUID,
  json,
  lagosToday,
  sendEmails,
  supabaseRest,
  withJsonErrors,
  type PledgeRow,
} from "../lib/server";

const MAX_AGE_MS = 30 * 60 * 1000;

export default withJsonErrors("send-pledge-welcome", async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!process.env.RESEND_API_KEY) return json({ ok: false, error: "RESEND_API_KEY not set" }, 503);

  let pledgeId: unknown;
  try {
    ({ pledgeId } = await req.json());
  } catch {
    return json({ ok: false, error: "invalid JSON" }, 400);
  }
  if (typeof pledgeId !== "string" || !UUID.test(pledgeId)) {
    return json({ ok: false, error: "invalid pledgeId" }, 400);
  }

  const rest = supabaseRest();
  const [pledge]: PledgeRow[] = await rest(
    `pledges?id=eq.${pledgeId}&kind=eq.individual&select=${PLEDGE_SELECT}`,
  );
  if (!pledge) return json({ ok: false, error: "pledge not found" }, 404);
  if (Date.now() - new Date(pledge.created_at).getTime() > MAX_AGE_MS) {
    return json({ ok: false, error: "pledge is too old to send a welcome email for" }, 409);
  }

  const recipient = { name: pledge.donor_name, email: pledge.donor_email.trim() };
  const emailIds = await sendEmails(
    [{ to: recipient.email, ...welcomeEmail(pledge, lagosToday(), recipient) }],
    `pledge-welcome-${pledgeId}`,
  );
  return json({ ok: true, sent: emailIds.length, emailIds });
});
