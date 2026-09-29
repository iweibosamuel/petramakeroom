// Shared HTML shell for every system email, styled like the giving site
// (cream background, heavy headline, big naira amount, pill button).
// Email apps can't load NaN Drum, so headlines fall back to Arial Black.

export const FONT = "Inter,'Helvetica Neue',Helvetica,Arial,sans-serif";
export const HEAVY = "'NaN Drum Extended','Arial Black','Helvetica Neue',Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type Currency = "NGN" | "USD" | "GBP" | "EUR";

// How to pay in each currency (matches the seed page's options).
const PAY_OPTIONS: Record<Currency, string> = {
  NGN: "Paystack, Flutterwave or GTBank transfer",
  USD: "Paystack, Flutterwave, GTBank, Bank of America or Zelle",
  GBP: "Flutterwave or GTBank transfer",
  EUR: "Flutterwave or GTBank transfer",
};

export function payOptions(currency: Currency = "NGN"): string {
  return PAY_OPTIONS[currency] ?? PAY_OPTIONS.NGN;
}
const SYMBOLS: Record<Currency, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

// Whole amounts in a pledge's currency: ₦50,000, $1,200, £900, €750.
export function formatMoney(amount: number, currency: Currency = "NGN"): string {
  return `${SYMBOLS[currency] ?? SYMBOLS.NGN}${Math.round(amount).toLocaleString("en-NG")}`;
}

export function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface EmailRow {
  label: string;
  // Already-escaped HTML.
  value: string;
}

// Every email has a "Track giving" button under its main button.
const TRACK_GIVING_URL = "https://petramakeroom.com/trackgiving";

export interface EmailContent {
  title: string;
  preheader: string;
  headline: string;
  // Already-escaped HTML.
  intro: string;
  amountLabel: string;
  amount: string;
  badge?: { text: string; color: string };
  rows: EmailRow[];
  // Already-escaped HTML, e.g. a list of who's giving.
  extraHtml?: string;
  button: { label: string; href: string };
  // Already-escaped HTML shown under the button.
  buttonNote?: string;
  // Already-escaped HTML: "You're receiving this because …".
  footerReason: string;
  logoUrl: string;
}

function detailRow(row: EmailRow, last: boolean): string {
  return `<tr><td style="padding:14px 0;${last ? "" : " border-bottom:1px solid #e7e1d9;"} font-family:${FONT};">
    <p style="margin:0; font-size:14px; color:#64748b;">${escapeHtml(row.label)}</p>
    <p style="margin:2px 0 0 0; font-size:18px; font-weight:700; color:#000000;">${row.value}</p>
  </td></tr>`;
}

export function renderEmail(content: EmailContent): string {
  const rows = content.rows.map((row, i) => detailRow(row, i === content.rows.length - 1)).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(content.title)}</title>
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
  <div style="display:none; max-height:0; overflow:hidden;">${escapeHtml(content.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffaf4;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

        <tr><td align="center" style="padding:0 0 28px 0;">
          <img src="${content.logoUrl}" width="64" height="64" alt="Petra" style="display:block; width:64px; height:64px; border:0;" />
        </td></tr>

        <tr><td class="px" style="padding:0 32px;">
          <h1 class="headline" style="margin:0; font-family:${HEAVY}; font-size:34px; line-height:1.1; font-weight:900; color:#000000;">${escapeHtml(content.headline)}</h1>
          <p style="margin:12px 0 0 0; font-family:${FONT}; font-size:16px; line-height:24px; color:#64748b;">${content.intro}</p>
        </td></tr>

        <tr><td class="px" style="padding:28px 32px 0 32px;">
          <p style="margin:0; font-family:${FONT}; font-size:15px; color:#64748b;">${escapeHtml(content.amountLabel)}</p>
          <p class="amount" style="margin:6px 0 0 0; font-family:${HEAVY}; font-size:46px; line-height:1; font-weight:900; color:#000000;">${escapeHtml(content.amount)}</p>
          ${
            content.badge
              ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr>
            <td style="background:${content.badge.color}; border-radius:999px; padding:6px 14px; font-family:${FONT}; font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#ffffff;">
              ${escapeHtml(content.badge.text)}
            </td>
          </tr></table>`
              : ""
          }
        </td></tr>

        ${
          rows
            ? `<tr><td class="px" style="padding:24px 32px 0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e7e1d9; border-bottom:1px solid #e7e1d9;">${rows}</table>
        </td></tr>`
            : ""
        }

        ${content.extraHtml ? `<tr><td class="px" style="padding:28px 32px 0 32px;">${content.extraHtml}</td></tr>` : ""}

        <tr><td class="px" style="padding:28px 32px 0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" bgcolor="#000000" style="border-radius:999px;">
              <a href="${content.button.href}" style="display:block; padding:17px 24px; font-family:${HEAVY}; font-size:15px; font-weight:900; color:#ffffff; text-decoration:none; border-radius:999px;">${escapeHtml(content.button.label)}</a>
            </td>
          </tr></table>
          ${
            content.buttonNote
              ? `<p style="margin:12px 0 0 0; font-family:${FONT}; font-size:14px; line-height:21px; color:#64748b; text-align:center;">${content.buttonNote}</p>`
              : ""
          }
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr>
            <td align="center" style="border:2px solid #000000; border-radius:999px;">
              <a href="${TRACK_GIVING_URL}" style="display:block; padding:14px 24px; font-family:${HEAVY}; font-size:14px; font-weight:900; color:#000000; text-decoration:none; border-radius:999px;">Track giving</a>
            </td>
          </tr></table>
        </td></tr>

        <tr><td align="center" class="px" style="padding:48px 32px 0 32px;">
          <p style="margin:0; font-family:${HEAVY}; font-size:30px; line-height:0.95; font-weight:900; color:#000000;">MAKE<br />ROOM</p>
          <p style="margin:10px 0 0 0; font-family:'Arial Black','Helvetica Neue',Arial,sans-serif; font-size:14px; font-weight:900; color:#280084; letter-spacing:0.04em;">LAGOS</p>
          <p style="margin:20px auto 0 auto; max-width:420px; font-family:${FONT}; font-size:13px; line-height:20px; color:#64748b; font-style:italic;">
            “Clear lots of ground for your tents! Make your tents large. Spread out! Think big!”
            <span style="font-style:normal; font-weight:700; color:#161b26;">Isaiah 54:2 MSG</span>
          </p>
        </td></tr>
        <tr><td align="center" class="px" style="padding:28px 32px 8px 32px; font-family:${FONT}; font-size:12px; line-height:18px; color:#94a3b8;">
          Petra Christian Centre · ${content.footerReason}<br />
          This is an automated email from a no-reply address, so replies aren't received.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
