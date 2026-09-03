import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const scheduleSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  recipients: z.array(z.string().email()).min(1).max(5000),
  startAt: z.string().min(1),
  delaySeconds: z.number().int().min(0).max(3600),
  hourlyLimit: z.number().int().min(1).max(1000),
  senderId: z.string().uuid().optional(),
});

export const scheduleCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scheduleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let senderId = data.senderId;
    if (!senderId) {
      const { data: sender } = await supabase
        .from("senders")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      senderId = sender?.id;
    }
    if (!senderId) throw new Error("No active sender configured");

    const recipients = Array.from(
      new Set(data.recipients.map((r) => r.trim().toLowerCase()).filter(Boolean)),
    );

    const startAt = new Date(data.startAt);
    if (Number.isNaN(startAt.getTime())) throw new Error("Invalid start time");

    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        subject: data.subject,
        body: data.body,
        start_at: startAt.toISOString(),
        delay_seconds: data.delaySeconds,
        hourly_limit: data.hourlyLimit,
        total_recipients: recipients.length,
      })
      .select("id")
      .single();
    if (campErr || !campaign) throw new Error(campErr?.message ?? "Could not create campaign");

    const rows = recipients.map((recipient, index) => {
      const hourOffset = Math.floor(index / data.hourlyLimit) * 3600_000;
      const gap = index * data.delaySeconds * 1000;
      return {
        user_id: userId,
        campaign_id: campaign.id,
        sender_id: senderId!,
        recipient,
        subject: data.subject,
        body: data.body,
        status: "scheduled",
        scheduled_at: new Date(startAt.getTime() + gap + hourOffset).toISOString(),
        idempotency_key: `${campaign.id}:${recipient}`,
      };
    });

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("email_jobs").insert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }

    return { campaignId: campaign.id, scheduled: rows.length };
  });

export const listJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tab: z.enum(["scheduled", "sent"]),
        search: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const statuses =
      data.tab === "scheduled" ? ["scheduled", "processing"] : ["sent", "failed"];

    let query = context.supabase
      .from("email_jobs")
      .select(
        "id, recipient, subject, status, scheduled_at, sent_at, attempts, error_message, provider_message_id, senders(email)",
      )
      .eq("user_id", context.userId)
      .in("status", statuses)
      .order(data.tab === "scheduled" ? "scheduled_at" : "sent_at", {
        ascending: data.tab === "scheduled",
        nullsFirst: false,
      })
      .limit(200);

    const search = data.search?.trim();
    if (search) {
      query = query.or(
        `recipient.ilike.%${search.replace(/[%,]/g, "")}%,subject.ilike.%${search.replace(/[%,]/g, "")}%`,
      );
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r) => ({
      id: r.id,
      recipient: r.recipient,
      subject: r.subject,
      status: r.status,
      scheduled_at: r.scheduled_at,
      sent_at: r.sent_at,
      attempts: r.attempts,
      error_message: r.error_message,
      provider_message_id: r.provider_message_id,
      sender: (r as unknown as { senders?: { email: string } }).senders?.email ?? null,
    }));
  });

export const getQueueStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("email_jobs")
      .select("status, scheduled_at")
      .eq("user_id", context.userId)
      .limit(5000);
    if (error) throw new Error(error.message);

    const counts = { scheduled: 0, processing: 0, sent: 0, failed: 0 } as Record<string, number>;
    let next: string | null = null;
    for (const r of rows ?? []) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (r.status === "scheduled" && (!next || r.scheduled_at < next)) next = r.scheduled_at;
    }

    const { getSchedulerConfig } = await import("./scheduler-config");
    const { isSimulationMode } = await import("./email-transport.server");

    return {
      counts,
      nextRunAt: next,
      simulated: isSimulationMode(),
      config: getSchedulerConfig(),
    };
  });

export const listSenders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("senders")
      .select("id, email, display_name, is_active")
      .eq("user_id", context.userId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addSender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email(), displayName: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("senders").insert({
      user_id: context.userId,
      email: data.email.toLowerCase(),
      display_name: data.displayName ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSlackConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("slack_connections")
      .select("channel, team_name, connected_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data ?? null;
  });

export const connectSlack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        webhookUrl: z.string().url().startsWith("https://hooks.slack.com/"),
        channel: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const res = await fetch(data.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: ":white_check_mark: ReachInbox scheduler connected." }),
    });
    if (!res.ok) throw new Error("Slack rejected the webhook URL");

    const { error } = await context.supabase.from("slack_connections").upsert({
      user_id: context.userId,
      webhook_url: data.webhookUrl,
      channel: data.channel ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disconnectSlack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("slack_connections").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const tickWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { runWorker } = await import("./worker.server");
    return await runWorker();
  });
