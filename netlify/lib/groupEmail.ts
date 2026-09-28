// The "you're part of a group seed" email.

import { FONT, escapeHtml, formatNaira, renderEmail } from "./emailLayout";

export interface GroupEmailPerson {
  name: string;
  amountNaira: number;
  isOrganizer: boolean;
}

export interface GroupEmailInput {
  recipient: GroupEmailPerson;
  organizerName: string;
  everyone: GroupEmailPerson[];
  totalNaira: number;
  tierName: string;
  tierColor: string;
  whenText: string;
  seedUrl: string;
  logoUrl: string;
}

export function groupEmailSubject(input: GroupEmailInput): string {
  return input.recipient.isOrganizer
    ? `Your ${input.tierName} group seed of ${formatNaira(input.totalNaira)} is set up`
    : `${input.organizerName} added you to a Make Room group seed`;
}

export function renderGroupEmail(input: GroupEmailInput): string {
  const name = escapeHtml(input.recipient.name);
  const organizer = escapeHtml(input.organizerName);
  const isOrganizer = input.recipient.isOrganizer;
  const others = input.everyone.length - 1;

  const headline = isOrganizer ? "Your group seed is set up" : "You're part of a group seed";
  const intro = isOrganizer
    ? `Thank you, ${name}. We've emailed everyone their amount. Anyone in the group can pay the full ${formatNaira(input.totalNaira)}, then tap “I’ve paid” on the seed page.`
    : `Hi ${name}, ${organizer} has added you to a ${escapeHtml(input.tierName)} group seed for Make Room, given together with ${others} other ${others === 1 ? "person" : "people"}.`;

  const everyoneRows = input.everyone
    .map(
      (person) => `<tr>
        <td style="padding:10px 0; border-bottom:1px solid #e7e1d9; font-family:${FONT}; font-size:15px; color:#000000;">
          ${escapeHtml(person.name)}${person.isOrganizer ? ' <span style="color:#64748b;">· organiser</span>' : ""}
        </td>
        <td align="right" style="padding:10px 0; border-bottom:1px solid #e7e1d9; font-family:${FONT}; font-size:15px; font-weight:700; color:#000000;">
          ${formatNaira(person.amountNaira)}
        </td>
      </tr>`,
    )
    .join("");

  return renderEmail({
    title: headline,
    preheader: isOrganizer
      ? "Everyone in your group has been emailed their amount."
      : `Your part: ${formatNaira(input.recipient.amountNaira)} of a ${formatNaira(input.totalNaira)} group seed.`,
    headline,
    intro,
    amountLabel: isOrganizer ? "Your group is giving" : "Your part",
    amount: formatNaira(isOrganizer ? input.totalNaira : input.recipient.amountNaira),
    badge: { text: `${input.tierName} · Group`, color: input.tierColor },
    rows: [
      isOrganizer
        ? { label: "Your part", value: formatNaira(input.recipient.amountNaira) }
        : { label: "Group total", value: formatNaira(input.totalNaira) },
      ...(isOrganizer ? [] : [{ label: "Organised by", value: organizer }]),
      { label: "When", value: escapeHtml(input.whenText) },
    ],
    extraHtml: isOrganizer
      ? `<p style="margin:0 0 4px 0; font-family:${FONT}; font-size:14px; color:#64748b;">Who's giving</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${everyoneRows}</table>`
      : undefined,
    button: { label: "View group seed & pay", href: input.seedUrl },
    buttonNote:
      "Pay by Paystack, Flutterwave, bank transfer or Zelle — all on the seed page. Anyone in the group can pay the full amount; after paying, tap <strong style=\"color:#000000;\">“I’ve paid”</strong>.",
    footerReason: `You're receiving this because ${isOrganizer ? "you set up" : `${organizer} listed you in`} a Make Room group seed.`,
    logoUrl: input.logoUrl,
  });
}
