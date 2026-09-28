// Payment confirmation and reminder emails for a pledge. Group seeds go to
// everyone in the group, so wording says "your group seed" there.

import { escapeHtml, formatDate, formatNaira, renderEmail, type EmailRow } from "./emailLayout";
import {
  TIERS,
  logoUrl,
  pledgeUrl,
  totals,
  type InstallmentRow,
  type PledgeRow,
  type Recipient,
} from "./server";

const PAY_NOTE =
  "Pay by Paystack, Flutterwave, bank transfer or Zelle — all on the seed page. After paying, tap <strong style=\"color:#000000;\">“I’ve paid”</strong> so we can record it.";

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
    { label: "Paid so far", value: `${formatNaira(paid)} of ${formatNaira(Number(pledge.amount_naira))}` },
    ...(remaining > 0 ? [{ label: "Still to give", value: formatNaira(remaining) }] : []),
  ];
}

// ─── "I've paid" confirmation ──────────────────────────────────────────────

export function paymentConfirmedEmail(
  pledge: PledgeRow,
  installment: InstallmentRow,
  recipient: Recipient,
): { subject: string; html: string } {
  const { remaining, pending } = totals(pledge);
  const complete = remaining <= 0;
  const amount = formatNaira(Number(installment.amount));
  const name = escapeHtml(recipient.name);
  const isGroup = pledge.kind === "group";
  const next = pending[0];

  const headline = complete ? "Your seed is complete" : "We've recorded your payment";
  const intro = complete
    ? `Thank you, ${name}. With this payment of ${amount}, ${seedName(pledge)} of ${formatNaira(Number(pledge.amount_naira))} is fully given. God bless you${isGroup ? " all" : ""}.`
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
      ? [{ label: "Next payment", value: `${formatNaira(Number(next.amount))} due ${formatDate(next.due_date)}` }]
      : []),
  ];

  return {
    subject: complete
      ? "Thank you — your Make Room seed is complete"
      : `We've recorded your ${amount} Make Room payment`,
    html: renderEmail({
      title: headline,
      preheader: complete
        ? `${pledge.kind === "group" ? "Your group seed" : "Your seed"} of ${formatNaira(Number(pledge.amount_naira))} is fully given.`
        : `${amount} recorded. ${formatNaira(remaining)} still to give.`,
      headline,
      intro,
      amountLabel: complete ? "Total given" : "Payment recorded",
      amount: complete ? formatNaira(Number(pledge.amount_naira)) : amount,
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
    subject = `Reminder: ${formatNaira(amount)} for your Make Room seed is still open`;
    headline = "A gentle reminder";
    intro = `Hi ${name}, we haven't yet had confirmation of ${formatNaira(amount)} for ${seed}, which was due on ${formatDate(oldest.due_date)}.${anyone} If it's already paid, please tap “I’ve paid” on the seed page so we can record it.`;
    amountLabel = "Waiting for confirmation";
  } else if (kind === "due") {
    amount = outstandingTotal;
    subject = `Your ${formatNaira(amount)} Make Room payment is due today`;
    headline = "Your payment is due today";
    intro = `Hi ${name}, a payment of ${formatNaira(amount)} for ${seed} is due today.${anyone}`;
    amountLabel = "Due today";
  } else {
    const next = upcoming!;
    amount = Number(next.amount);
    subject = `Your ${formatNaira(amount)} Make Room payment is due on ${formatDate(next.due_date)}`;
    headline = "Your next payment is coming up";
    intro = `Hi ${name}, a payment of ${formatNaira(amount)} for ${seed} is due on ${formatDate(next.due_date)}.${anyone}`;
    amountLabel = `Due ${formatDate(next.due_date)}`;
  }

  const scheduleRows: EmailRow[] = pending.map((i) => ({
    label: i.due_date < today ? `Was due ${formatDate(i.due_date)}` : i.due_date === today ? "Due today" : `Due ${formatDate(i.due_date)}`,
    value: formatNaira(Number(i.amount)),
  }));

  return {
    subject,
    html: renderEmail({
      title: headline,
      preheader: `${formatNaira(amount)} · ${amountLabel}`,
      headline,
      intro,
      amountLabel,
      amount: formatNaira(amount),
      badge: badge(pledge),
      rows: [...scheduleRows, ...progressRows(pledge)],
      button: { label: "Pay & confirm", href: pledgeUrl(pledge.id) },
      buttonNote: PAY_NOTE,
      footerReason: `You're receiving this because ${pledge.kind === "group" ? "you're part of a Make Room group seed" : "you made a Make Room seed"} with payments still to confirm.`,
      logoUrl: logoUrl(),
    }),
  };
}
