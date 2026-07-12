// Supabase Edge Function: send-group-confirmation
//
// Sends the "confirm your pledge" email to someone who just joined a group,
// via SendGrid. Deploy with: supabase functions deploy send-group-confirmation
// Then set the secret: supabase secrets set SENDGRID_API_KEY=... SENDGRID_FROM_EMAIL=...
//
// Until SENDGRID_API_KEY is set, this just logs the email instead of sending
// it, so the rest of the app keeps working while the gateway is pending.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  to: string;
  name: string;
  groupOrganizerName: string;
  committedAmountNaira: number;
  confirmationUrl: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
    const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "no-reply@example.com";

    const amountFormatted = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(body.committedAmountNaira);

    if (!sendgridKey) {
      console.info(
        `[send-group-confirmation] SENDGRID_API_KEY not set — would send to ${body.to}: ${body.confirmationUrl}`,
      );
      return new Response(JSON.stringify({ sent: false, reason: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: body.to, name: body.name }] }],
        from: { email: fromEmail, name: "Petra — Make Room" },
        subject: `Confirm your pledge for ${body.groupOrganizerName}'s group`,
        content: [
          {
            type: "text/plain",
            value: `Hi ${body.name},\n\nYou're joining ${body.groupOrganizerName}'s group, covering ${amountFormatted}.\n\nConfirm your pledge here: ${body.confirmationUrl}\n\nUntil you confirm, this amount won't count toward the group's total.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("SendGrid error", res.status, errText);
      return new Response(JSON.stringify({ sent: false, error: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-group-confirmation failed", err);
    return new Response(JSON.stringify({ sent: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
