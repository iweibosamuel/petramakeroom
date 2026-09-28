// Asks the server to email everyone in a group seed about their share
// (netlify/functions/send-group-emails.mts). The function looks the group up
// itself and only emails the people saved on it, so the browser can't use it
// to email arbitrary addresses.
//
// Fire-and-forget: a failed email never blocks the giver. In local `npm run
// dev` there's no Netlify function, so this quietly does nothing.
export function notifyGroupMembers(pledgeId: string): void {
  fetch("/.netlify/functions/send-group-emails", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pledgeId }),
  }).catch((err) => console.warn("[notifications] group emails not sent", err));
}

// Asks the server to email everyone giving on a pledge that a payment was
// recorded (netlify/functions/send-payment-confirmation.mts). The function
// checks the payment was just confirmed and looks the recipients up itself.
// Fire-and-forget, like notifyGroupMembers.
export function notifyPaymentConfirmed(pledgeId: string, installmentId: string): void {
  fetch("/.netlify/functions/send-payment-confirmation", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pledgeId, installmentId }),
  }).catch((err) => console.warn("[notifications] payment confirmation not sent", err));
}
