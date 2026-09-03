export type SendResult = {
  providerMessageId: string;
  simulated: boolean;
};

export function isSimulationMode(): boolean {
  return !(process.env["EMAIL_SENDER_DOMAIN"] && process.env["LOVABLE_API_KEY"]);
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends one email. When no verified sending domain is configured the send is
 * simulated so the scheduler pipeline stays fully demoable end-to-end.
 */
export async function sendOneEmail(params: {
  to: string;
  subject: string;
  body: string;
  fromLocalPart: string;
  fromName?: string | null;
  idempotencyKey: string;
}): Promise<SendResult> {
  if (isSimulationMode()) {
    // Simulated transport: deterministic id, small latency.
    await new Promise((r) => setTimeout(r, 25));
    return {
      providerMessageId: `sim-${params.idempotencyKey.slice(0, 24)}`,
      simulated: true,
    };
  }

  const domain = process.env["EMAIL_SENDER_DOMAIN"]!;
  const res = await fetch("https://api.lovable.dev/v1/email/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "idempotency-key": params.idempotencyKey,
    },
    body: JSON.stringify({
      from: `${params.fromName ?? "ReachInbox"} <${params.fromLocalPart}@${domain}>`,
      to: [params.to],
      subject: params.subject,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.6">${escapeHtml(
        params.body,
      ).replace(/\n/g, "<br/>")}</div>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Email provider error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { providerMessageId: json.id ?? `sent-${Date.now()}`, simulated: false };
}
