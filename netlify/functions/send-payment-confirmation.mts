// Netlify Function: email a confirmation after someone taps "I've paid".
//
// POST /.netlify/functions/send-payment-confirmation
//   { "pledgeId": "<uuid>", "installmentId": "<uuid>" }
//
// Called by the site right after a payment is marked paid. It looks the
// payment up in Supabase itself and only emails the people giving on that
// pledge (everyone in a group seed), so it can't be used to email arbitrary
// addresses. It only acts on payments confirmed in the last 30 minutes, and
// Resend's idempotency key stops repeat calls from sending twice.
// Environment variables: see ../lib/server.ts.

import { paymentConfirmedEmail } from "../lib/pledgeEmails";
import {
  PLEDGE_SELECT,
  UUID,
  getRecipients,
  json,
  sendEmails,
  supabaseRest,
  withJsonErrors,
  type PledgeRow,
} from "../lib/server";

const MAX_AGE_MS = 30 * 60 * 1000;

export default withJsonErrors("send-payment-confirmation", async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);
  if (!process.env.RESEND_API_KEY) return json({ ok: false, error: "RESEND_API_KEY not set" }, 503);

  let pledgeId: unknown;
  let installmentId: unknown;
  try {
    ({ pledgeId, installmentId } = await req.json());
  } catch {
    return json({ ok: false, error: "invalid JSON" }, 400);
  }
  if (
    typeof pledgeId !== "string" ||
    !UUID.test(pledgeId) ||
    typeof installmentId !== "string" ||
    !UUID.test(installmentId)
  ) {
    return json({ ok: false, error: "invalid pledgeId or installmentId" }, 400);
  }

  const rest = supabaseRest();
  const [pledge]: PledgeRow[] = await rest(`pledges?id=eq.${pledgeId}&select=${PLEDGE_SELECT}`);
  const installment = pledge?.installments.find((i) => i.id === installmentId);
  if (!pledge || !installment) return json({ ok: false, error: "payment not found" }, 404);
  if (installment.status !== "paid" || !installment.paid_at) {
    return json({ ok: false, error: "payment has not been confirmed" }, 409);
  }
  if (Date.now() - new Date(installment.paid_at).getTime() > MAX_AGE_MS) {
    return json({ ok: false, error: "payment was confirmed too long ago to send emails for" }, 409);
  }

  const recipients = (await getRecipients(rest, [pledge])).get(pledge.id) ?? [];
  const emails = recipients.map((recipient) => ({
    to: recipient.email,
    ...paymentConfirmedEmail(pledge, installment, recipient),
  }));

  const emailIds = await sendEmails(emails, `payment-confirmed-${installmentId}`);
  return json({ ok: true, sent: emailIds.length, emailIds });
});
