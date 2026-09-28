// HTML for the "you're part of a group seed" email, styled like the giving
// site (cream background, heavy headline, big naira amount, pill button).
// Email apps can't load NaN Drum, so headlines fall back to Arial Black.

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

const FONT = "Inter,'Helvetica Neue',Helvetica,Arial,sans-serif";
const HEAVY = "'NaN Drum Extended','Arial Black','Helvetica Neue',Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatNaira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

function detailRow(label: string, value: string, last = false): string {
  return `<tr><td style="padding:14px 0;${last ? "" : " border-bottom:1px solid #e7e1d9;"} font-family:${FONT};">
    <p style="margin:0; font-size:14px; color:#64748b;">${label}</p>
    <p style="margin:2px 0 0 0; font-size:18px; font-weight:700; color:#000000;">${value}</p>
  </td></tr>`;
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

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(headline)}</title>
  <style>
    @media (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .headline { font-size: 28px !important; }
      .amount { font-size: 38px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#fffaf4;">
  <div style="display:none; max-height:0; overflow:hidden;">
    ${isOrganizer ? "Everyone in your group has been emailed their amount." : `Your part: ${formatNaira(input.recipient.amountNaira)} of a ${formatNaira(input.totalNaira)} group seed.`}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffaf4;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

        <tr><td align="center" style="padding:0 0 28px 0;">
          <img src="${input.logoUrl}" width="64" height="64" alt="Petra" style="display:block; width:64px; height:64px; border:0;" />
        </td></tr>

        <tr><td class="px" style="padding:0 32px;">
          <h1 class="headline" style="margin:0; font-family:${HEAVY}; font-size:34px; line-height:1.1; font-weight:900; color:#000000;">${headline}</h1>
          <p style="margin:12px 0 0 0; font-family:${FONT}; font-size:16px; line-height:24px; color:#64748b;">${intro}</p>
        </td></tr>

        <tr><td class="px" style="padding:28px 32px 0 32px;">
          <p style="margin:0; font-family:${FONT}; font-size:15px; color:#64748b;">${isOrganizer ? "Your group is giving" : "Your part"}</p>
          <p class="amount" style="margin:6px 0 0 0; font-family:${HEAVY}; font-size:46px; line-height:1; font-weight:900; color:#000000;">
            ${formatNaira(isOrganizer ? input.totalNaira : input.recipient.amountNaira)}
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr>
            <td style="background:${input.tierColor}; border-radius:999px; padding:6px 14px; font-family:${FONT}; font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#ffffff;">
              ${escapeHtml(input.tierName)} · Group
            </td>
          </tr></table>
        </td></tr>

        <tr><td class="px" style="padding:24px 32px 0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e7e1d9; border-bottom:1px solid #e7e1d9;">
            ${isOrganizer ? detailRow("Your part", formatNaira(input.recipient.amountNaira)) : detailRow("Group total", formatNaira(input.totalNaira))}
            ${isOrganizer ? "" : detailRow("Organised by", organizer)}
            ${detailRow("When", escapeHtml(input.whenText), true)}
          </table>
        </td></tr>

        ${
          isOrganizer
            ? `<tr><td class="px" style="padding:28px 32px 0 32px;">
          <p style="margin:0 0 4px 0; font-family:${FONT}; font-size:14px; color:#64748b;">Who's giving</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${everyoneRows}</table>
        </td></tr>`
            : ""
        }

        <tr><td class="px" style="padding:28px 32px 0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" bgcolor="#000000" style="border-radius:999px;">
              <a href="${input.seedUrl}" style="display:block; padding:17px 24px; font-family:${HEAVY}; font-size:15px; font-weight:900; color:#ffffff; text-decoration:none; border-radius:999px;">View group seed &amp; pay</a>
            </td>
          </tr></table>
          <p style="margin:12px 0 0 0; font-family:${FONT}; font-size:14px; line-height:21px; color:#64748b; text-align:center;">
            Pay by Paystack, Flutterwave, bank transfer or Zelle — all on the seed page. Anyone in the group can pay the full amount; after paying, tap <strong style="color:#000000;">“I’ve paid”</strong>.
          </p>
        </td></tr>

        <tr><td align="center" class="px" style="padding:48px 32px 0 32px;">
          <p style="margin:0; font-family:${HEAVY}; font-size:30px; line-height:0.95; font-weight:900; color:#000000;">MAKE<br />ROOM</p>
          <p style="margin:10px 0 0 0; font-family:'Arial Black','Helvetica Neue',Arial,sans-serif; font-size:14px; font-weight:900; color:#280084; letter-spacing:0.04em;">LAGOS X ABUJA</p>
          <p style="margin:20px auto 0 auto; max-width:420px; font-family:${FONT}; font-size:13px; line-height:20px; color:#64748b; font-style:italic;">
            “Clear lots of ground for your tents! Make your tents large. Spread out! Think big!”
            <span style="font-style:normal; font-weight:700; color:#161b26;">Isaiah 54:2 MSG</span>
          </p>
        </td></tr>
        <tr><td align="center" class="px" style="padding:28px 32px 8px 32px; font-family:${FONT}; font-size:12px; line-height:18px; color:#94a3b8;">
          Petra Christian Centre · You're receiving this because ${isOrganizer ? "you set up" : `${organizer} listed you in`} a Make Room group seed.<br />
          Questions? Just reply to this email.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
