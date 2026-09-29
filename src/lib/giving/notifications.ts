// What the Netlify email functions reply with: { ok: true, sent, emailIds }
// on success, or { ok: false, error, detail? } explaining what went wrong.
type NotificationResult = {
  ok?: boolean;
  sent?: number;
  emailIds?: string[];
  reason?: string;
  error?: string;
  detail?: string;
};

// Fire-and-forget, but retried once after a network error or server error
// (e.g. a flaky mobile connection). Resend's idempotency key on the server
// means a retry can never send the same email twice.
function notify(path: string, label: string, payload: object, attempt = 1): void {
  const retry = () => {
    if (attempt < 2) setTimeout(() => notify(path, label, payload, attempt + 1), 2000);
  };
  fetch(path, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      const result = (await response.json().catch(() => null)) as NotificationResult | null;
      if (response.status >= 500) retry();
      if (!response.ok || !result || result.reason || result.error || result.sent === 0) {
        console.warn(
          `[notifications] ${label} email trigger returned ${response.status}`,
          result?.error ??
            result?.reason ??
            (result?.sent === 0 ? "no emails sent" : response.statusText || "unexpected response"),
          ...(result?.detail ? [result.detail] : []),
        );
      } else {
        console.info(`[notifications] ${label} email sent`, result.emailIds);
      }
    })
    .catch((err) => {
      console.warn(`[notifications] ${label} email trigger failed`, err);
      retry();
    });
}

// Welcome email for an individual pledge. The server looks the pledge up
// and only emails the giver saved on it.
export function notifyPledgeCreated(pledgeId: string): void {
  notify("/.netlify/functions/send-pledge-welcome", "welcome", { pledgeId });
}

// The server looks up the group itself and only emails its saved members.
export function notifyGroupMembers(pledgeId: string): void {
  notify("/.netlify/functions/send-group-emails", "group", { pledgeId });
}

// The server checks that the payment was just confirmed and looks up recipients.
export function notifyPaymentConfirmed(pledgeId: string, installmentId: string): void {
  notify("/.netlify/functions/send-payment-confirmation", "payment confirmation", {
    pledgeId,
    installmentId,
  });
}
