// Welcome, payment confirmation and reminder emails for a pledge. Group seeds go to
// everyone in the group, so wording says "your group seed" there.

import { escapeHtml, formatDate, formatMoney, payOptions, renderEmail, type EmailRow } from "./emailLayout";
import {
  TIERS,
  logoUrl,
  pledgeUrl,
  totals,
  type InstallmentRow,
  type PledgeRow,
  type Recipient,
} from "./server";

// How to pay, per currency (matches the seed page's options).
function payNote(pledge: PledgeRow): string {
  return `Pay by ${payOptions(pledge.currency)} — all on the seed page. After paying, tap <strong style="color:#000000;">“I’ve paid”</strong> so we can record it.`;
}

function money(pledge: PledgeRow, amount: number): string {
  return formatMoney(amount, pledge.currency);
}

function seedName(pledge: PledgeRow): string {
  return pledge.kind === "group" ? "your group seed" : "your seed";
}

function badge(pledge: PledgeRow) {
  const tier = TIERS[pledge.tier] ?? TIERS.burden_bearer;
  return { text: pledge.kind === "group" ? `${tier.name} · Group` : tier.name, color: tier.color };
}

function progressRows(pledge: PledgeRow): EmailRow[] {
  const { paid, remaining } = totals(pledge);
  return [
    { label: "Paid so far", value: `${money(pledge, paid)} of ${money(pledge, Number(pledge.amount))}` },
    ...(remaining > 0 ? [{ label: "Still to give", value: money(pledge, remaining) }] : []),
  ];
}

// ─── Welcome, when someone makes a pledge ──────────────────────────────────

export function welcomeEmail(
  pledge: PledgeRow,
  today: string,
  recipient: Recipient,
): { subject: string; html: string } {
  const { pending } = totals(pledge);
  const name = escapeHtml(recipient.name);
  const total = money(pledge, Number(pledge.amount));
  const payNow = pending.length > 0 && pending[0].due_date <= today;
  const installments = pledge.installments.length > 1;

  const headline = payNow ? "Complete your seed" : "You're in";
  const intro = payNow
    ? `Thank you for sowing into Make Room, ${name}. Pay ${money(pledge, Number(pending[0].amount))} using any of the options on your seed page, then tap “I’ve paid” so we can record it.`
    : `Thank you for sowing into Make Room, ${name}. Here's your seed. We'll email you a reminder before each payment is due, and you can pay early any time.`;

  const scheduleRows: EmailRow[] = pledge.installments
    .slice()
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .map((i, idx) => ({
      label: `${installments ? `Payment ${idx + 1} · ` : ""}${i.due_date <= today ? "Due today" : `Due ${formatDate(i.due_date)}`}`,
      value: money(pledge, Number(i.amount)),
    }));

  return {
    subject: payNow
      ? `Complete your ${total} Make Room seed`
      : `You're in — your ${total} Make Room seed`,
    html: renderEmail({
      title: headline,
      preheader: payNow
        ? `Pay ${money(pledge, Number(pending[0].amount))} and tap “I’ve paid”.`
        : `Your ${total} seed is set up. First payment due ${formatDate(pending[0]?.due_date ?? today)}.`,
      headline,
      intro,
      amountLabel: "Your seed",
      amount: total,
      badge: badge(pledge),
      rows: scheduleRows,
      button: { label: payNow ? "Pay & confirm" : "View your seed", href: pledgeUrl(pledge.id) },
      buttonNote: payNote(pledge),
      footerReason: "You're receiving this because you made a Make Room seed.",
      logoUrl: logoUrl(),
    }),
  };
}

// ─── "I've paid" confirmation ──────────────────────────────────────────────

export function paymentConfirmedEmail(
  pledge: PledgeRow,
  installment: InstallmentRow,
  recipient: Recipient,
): { subject: string; html: string } {
  const { remaining, pending } = totals(pledge);
  const complete = remaining <= 0;
  const amount = money(pledge, Number(installment.amount));
  const name = escapeHtml(recipient.name);
  const isGroup = pledge.kind === "group";
  const next = pending[0];

  const headline = complete ? "Your seed is complete" : "We've recorded your payment";
  const intro = complete
    ? `Thank you, ${name}. With this payment of ${amount}, ${seedName(pledge)} of ${money(pledge, Number(pledge.amount))} is fully given. God bless you${isGroup ? " all" : ""}.`
    : `Thank you, ${name}. We've recorded a payment of ${amount} towards ${seedName(pledge)}. Our finance team will match it against our statements.`;

  const rows: EmailRow[] = [
    { label: "Paid on", value: formatDate(installment.paid_at ?? new Date().toISOString()) },
    ...(installment.payment_method
      ? [{ label: "Paid with", value: escapeHtml(installment.payment_method) }]
      : []),
    ...(installment.payment_reference
      ? [{ label: "Reference", value: escapeHtml(installment.payment_reference) }]
      : []),
    ...progressRows(pledge),
    ...(next
      ? [{ label: "Next payment", value: `${money(pledge, Number(next.amount))} due ${formatDate(next.due_date)}` }]
      : []),
  ];

  return {
    subject: complete
      ? "Thank you — your Make Room seed is complete"
      : `We've recorded your ${amount} Make Room payment`,
    html: renderEmail({
      title: headline,
      preheader: complete
        ? `${pledge.kind === "group" ? "Your group seed" : "Your seed"} of ${money(pledge, Number(pledge.amount))} is fully given.`
        : `${amount} recorded. ${money(pledge, remaining)} still to give.`,
      headline,
      intro,
      amountLabel: complete ? "Total given" : "Payment recorded",
      amount: complete ? money(pledge, Number(pledge.amount)) : amount,
      badge: badge(pledge),
      rows,
      button: { label: complete ? "View your seed" : "View your schedule", href: pledgeUrl(pledge.id) },
      footerReason: `You're receiving this because a payment was confirmed for ${isGroup ? "a group seed you're part of" : "your Make Room seed"}.`,
      logoUrl: logoUrl(),
    }),
  };
}

// ─── Reminders ─────────────────────────────────────────────────────────────

// "upcoming": due in a few days. "due": due today. "overdue": past due and
// not yet confirmed (sent weekly).
export type ReminderKind = "upcoming" | "due" | "overdue";

export function reminderEmail(
  pledge: PledgeRow,
  kind: ReminderKind,
  today: string,
  recipient: Recipient,
): { subject: string; html: string } {
  const { pending } = totals(pledge);
  const name = escapeHtml(recipient.name);
  const seed = seedName(pledge);
  const anyone = pledge.kind === "group" ? " Anyone in the group can pay." : "";

  const outstanding = pending.filter((i) => i.due_date <= today);
  const outstandingTotal = outstanding.reduce((sum, i) => sum + Number(i.amount), 0);
  const upcoming = pending.find((i) => i.due_date > today);

  let subject: string;
  let headline: string;
  let intro: string;
  let amountLabel: string;
  let amount: number;

  if (kind === "overdue") {
    const oldest = outstanding[0];
    amount = outstandingTotal;
    subject = `Reminder: ${money(pledge, amount)} for your Make Room seed is still open`;
    headline = "A gentle reminder";
    intro = `Hi ${name}, we haven't yet had confirmation of ${money(pledge, amount)} for ${seed}, which was due on ${formatDate(oldest.due_date)}.${anyone} If it's already paid, please tap “I’ve paid” on the seed page so we can record it.`;
    amountLabel = "Waiting for confirmation";
  } else if (kind === "due") {
    amount = outstandingTotal;
    subject = `Your ${money(pledge, amount)} Make Room payment is due today`;
    headline = "Your payment is due today";
    intro = `Hi ${name}, a payment of ${money(pledge, amount)} for ${seed} is due today.${anyone}`;
    amountLabel = "Due today";
  } else {
    const next = upcoming!;
    amount = Number(next.amount);
    subject = `Your ${money(pledge, amount)} Make Room payment is due on ${formatDate(next.due_date)}`;
    headline = "Your next payment is coming up";
    intro = `Hi ${name}, a payment of ${money(pledge, amount)} for ${seed} is due on ${formatDate(next.due_date)}.${anyone}`;
    amountLabel = `Due ${formatDate(next.due_date)}`;
  }

  const scheduleRows: EmailRow[] = pending.map((i) => ({
    label: i.due_date < today ? `Was due ${formatDate(i.due_date)}` : i.due_date === today ? "Due today" : `Due ${formatDate(i.due_date)}`,
    value: money(pledge, Number(i.amount)),
  }));

  return {
    subject,
    html: renderEmail({
      title: headline,
      preheader: `${money(pledge, amount)} · ${amountLabel}`,
      headline,
      intro,
      amountLabel,
      amount: money(pledge, amount),
      badge: badge(pledge),
      rows: [...scheduleRows, ...progressRows(pledge)],
      button: { label: "Pay & confirm", href: pledgeUrl(pledge.id) },
      buttonNote: payNote(pledge),
      footerReason: `You're receiving this because ${pledge.kind === "group" ? "you're part of a Make Room group seed" : "you made a Make Room seed"} with payments still to confirm.`,
      logoUrl: logoUrl(),
    }),
  };
}
