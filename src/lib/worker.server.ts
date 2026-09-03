import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSchedulerConfig } from "./scheduler-config";
import { sendOneEmail } from "./email-transport.server";

const LEASE = "email-worker";

type Job = {
  id: string;
  user_id: string;
  campaign_id: string;
  sender_id: string | null;
  recipient: string;
  subject: string;
  body: string;
  attempts: number;
  idempotency_key: string;
  scheduled_at: string;
};

async function notifySlack(userId: string, text: string) {
  const { data } = await supabaseAdmin
    .from("slack_connections")
    .select("webhook_url")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.webhook_url) return;
  try {
    await fetch(data.webhook_url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    /* notification failures must not break sending */
  }
}

export async function runWorker(): Promise<{
  ran: boolean;
  claimed: number;
  sent: number;
  failed: number;
  rescheduled: number;
}> {
  const cfg = getSchedulerConfig();
  const holder = crypto.randomUUID();

  const { data: leased } = await supabaseAdmin.rpc("acquire_lease", {
    p_name: LEASE,
    p_holder: holder,
    p_seconds: cfg.leaseSeconds,
  });
  if (!leased) return { ran: false, claimed: 0, sent: 0, failed: 0, rescheduled: 0 };

  let sent = 0;
  let failed = 0;
  let rescheduled = 0;
  let claimed = 0;

  try {
    const { data: jobs, error } = await supabaseAdmin.rpc("claim_due_jobs", {
      p_limit: cfg.batchSize,
    });
    if (error) throw error;
    const list = (jobs ?? []) as unknown as Job[];
    claimed = list.length;
    if (!claimed) return { ran: true, claimed: 0, sent: 0, failed: 0, rescheduled: 0 };

    const senderCache = new Map<string, { email: string; display_name: string | null }>();

    for (let i = 0; i < list.length; i += cfg.concurrency) {
      const chunk = list.slice(i, i + cfg.concurrency);
      await Promise.all(
        chunk.map(async (job) => {
          try {
            if (!job.sender_id) throw new Error("No sender assigned");

            let sender = senderCache.get(job.sender_id);
            if (!sender) {
              const { data } = await supabaseAdmin
                .from("senders")
                .select("email, display_name")
                .eq("id", job.sender_id)
                .maybeSingle();
              if (!data) throw new Error("Sender not found");
              sender = data;
              senderCache.set(job.sender_id, data);
            }

            const { data: slot } = await supabaseAdmin.rpc("reserve_send_slot", {
              p_sender_id: job.sender_id,
              p_limit: cfg.maxPerHourPerSender,
            });
            const reservation = slot as {
              allowed: boolean;
              first_hit?: boolean;
              next_window?: string;
            } | null;

            if (reservation && !reservation.allowed) {
              const next = reservation.next_window
                ? new Date(reservation.next_window)
                : new Date(Date.now() + 60 * 60 * 1000);
              await supabaseAdmin
                .from("email_jobs")
                .update({
                  status: "scheduled",
                  locked_at: null,
                  attempts: Math.max(0, job.attempts - 1),
                  scheduled_at: next.toISOString(),
                })
                .eq("id", job.id);
              rescheduled += 1;
              if (reservation.first_hit) {
                await notifySlack(
                  job.user_id,
                  `:hourglass: Sender *${sender.email}* hit its hourly limit (${cfg.maxPerHourPerSender}/hr). Remaining emails were rescheduled to the next window.`,
                );
              }
              return;
            }

            const result = await sendOneEmail({
              to: job.recipient,
              subject: job.subject,
              body: job.body,
              fromLocalPart: sender.email.split("@")[0] ?? "hello",
              fromName: sender.display_name,
              idempotencyKey: job.idempotency_key,
            });

            await supabaseAdmin
              .from("email_jobs")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                provider_message_id: result.simulated
                  ? `${result.providerMessageId} (simulated)`
                  : result.providerMessageId,
                error_message: null,
                locked_at: null,
              })
              .eq("id", job.id);
            sent += 1;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (job.attempts >= cfg.maxAttempts) {
              await supabaseAdmin
                .from("email_jobs")
                .update({ status: "failed", error_message: message, locked_at: null })
                .eq("id", job.id);
              failed += 1;
            } else {
              await supabaseAdmin
                .from("email_jobs")
                .update({
                  status: "scheduled",
                  error_message: message,
                  locked_at: null,
                  scheduled_at: new Date(Date.now() + job.attempts * 30_000).toISOString(),
                })
                .eq("id", job.id);
              rescheduled += 1;
            }
          }
        }),
      );

      if (i + cfg.concurrency < list.length) {
        await new Promise((r) => setTimeout(r, cfg.minSendGapMs));
      }
    }

    return { ran: true, claimed, sent, failed, rescheduled };
  } finally {
    await supabaseAdmin.rpc("release_lease", { p_name: LEASE });
  }
}
