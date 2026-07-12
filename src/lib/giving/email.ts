import { supabase } from "../supabaseClient";

export interface GroupConfirmationEmailInput {
  to: string;
  name: string;
  groupOrganizerName: string;
  confirmationToken: string;
  committedAmountNaira: number;
}

const OUTBOX_KEY = "petra_giving_outbox_v1";

export interface OutboxEntry {
  to: string;
  subject: string;
  confirmationUrl: string;
  createdAt: string;
}

function confirmationUrl(token: string): string {
  return `${window.location.origin}/give/group/confirm/${token}`;
}

function recordToLocalOutbox(entry: OutboxEntry) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(OUTBOX_KEY);
  const outbox: OutboxEntry[] = raw ? JSON.parse(raw) : [];
  outbox.unshift(entry);
  window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox.slice(0, 50)));
}

export function getLocalOutbox(): OutboxEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(OUTBOX_KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Sends the "confirm your pledge" email to a group member.
 *
 * If Supabase is configured, this invokes the `send-group-confirmation` edge
 * function (see supabase/functions/send-group-confirmation), which sends the
 * real email via SendGrid. Until SENDGRID_API_KEY is set as a function secret,
 * that function itself falls back to logging instead of sending.
 *
 * With no Supabase project configured at all (local/dev mode), the email is
 * recorded to a local outbox instead so the flow stays testable end-to-end
 * without a real mailbox.
 */
export async function sendGroupConfirmationEmail(
  input: GroupConfirmationEmailInput,
): Promise<void> {
  const url = confirmationUrl(input.confirmationToken);
  const subject = `Confirm your pledge for ${input.groupOrganizerName}'s group`;

  if (supabase) {
    const { error } = await supabase.functions.invoke(
      "send-group-confirmation",
      {
        body: {
          to: input.to,
          name: input.name,
          groupOrganizerName: input.groupOrganizerName,
          committedAmountNaira: input.committedAmountNaira,
          confirmationUrl: url,
        },
      },
    );
    if (error) {
      console.error("Failed to send group confirmation email", error);
    }
    return;
  }

  console.info(`[dev] Group confirmation email to ${input.to}: ${url}`);
  recordToLocalOutbox({
    to: input.to,
    subject,
    confirmationUrl: url,
    createdAt: new Date().toISOString(),
  });
}
