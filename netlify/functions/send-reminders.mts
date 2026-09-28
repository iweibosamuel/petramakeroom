// Netlify Scheduled Function: payment reminders, run every morning.
//
// For each pledge with payments not yet confirmed via "I've paid", it emails
// everyone giving on it (everyone in a group seed) when:
//   • a payment is due in 3 days            → "coming up"
//   • a payment is due today                → "due today"
//   • a payment is past due and unconfirmed → a reminder once a week, counted
//     from the oldest unconfirmed due date, until someone taps "I've paid"
// Pledges made today are skipped, so "give now" pledges don't get a reminder
// the same day. One pledge gets at most one email a day, with the most
// urgent reason. Environment variables: see ../lib/server.ts.
//
// Scheduled functions can't be called over HTTP once deployed; use "Run now"
// in the Netlify UI or `netlify functions:invoke send-reminders` to test.

import { reminderEmail, type ReminderKind } from "../lib/pledgeEmails";
import {
  PLEDGE_SELECT,
  addDays,
  daysBetween,
  getRecipients,
  lagosDate,
  lagosToday,
  sendEmails,
  supabaseRest,
  totals,
  type OutgoingEmail,
  type PledgeRow,
} from "../lib/server";

const UPCOMING_DAYS = 3;
const OVERDUE_EVERY_DAYS = 7;
const PAGE_SIZE = 1000;

// 07:00 UTC is 08:00 in Lagos.
export const config = { schedule: "0 7 * * *" };

function reminderFor(pledge: PledgeRow, today: string): ReminderKind | null {
  if (lagosDate(pledge.created_at) >= today) return null;
  const { pending } = totals(pledge);
  if (pending.length === 0) return null;

  const oldestOverdue = pending.find((i) => i.due_date < today);
  if (oldestOverdue && daysBetween(oldestOverdue.due_date, today) % OVERDUE_EVERY_DAYS === 0) {
    return "overdue";
  }
  if (pending.some((i) => i.due_date === today)) return "due";
  if (pending.some((i) => i.due_date === addDays(today, UPCOMING_DAYS))) return "upcoming";
  return null;
}

export default async (): Promise<Response> => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[send-reminders] RESEND_API_KEY not set, skipping");
    return new Response("skipped");
  }

  const rest = supabaseRest();
  const today = lagosToday();

  const pledges: PledgeRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page: PledgeRow[] = await rest(
      `pledges?select=${PLEDGE_SELECT}&order=id.asc&limit=${PAGE_SIZE}&offset=${offset}`,
    );
    pledges.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const due = pledges
    .map((pledge) => ({ pledge, kind: reminderFor(pledge, today) }))
    .filter((r): r is { pledge: PledgeRow; kind: ReminderKind } => r.kind !== null);
  if (due.length === 0) {
    console.log(`[send-reminders] ${today}: nothing to send`);
    return new Response("nothing to send");
  }

  const recipients = await getRecipients(
    rest,
    due.map((r) => r.pledge),
  );
  // Sorted by pledge id so a same-day retry builds identical batches and the
  // idempotency keys catch it.
  const emails: OutgoingEmail[] = due.flatMap(({ pledge, kind }) =>
    (recipients.get(pledge.id) ?? []).map((recipient) => ({
      to: recipient.email,
      ...reminderEmail(pledge, kind, today, recipient),
    })),
  );

  const sent = await sendEmails(emails, `reminders-${today}`);
  console.log(`[send-reminders] ${today}: sent ${sent} emails for ${due.length} pledges`);
  return new Response(`sent ${sent}`);
};
