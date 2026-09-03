function num(name: string, fallback: number): number {
  const raw = typeof process !== "undefined" ? process.env?.[name] : undefined;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getSchedulerConfig() {
  return {
    batchSize: num("WORKER_BATCH_SIZE", 25),
    concurrency: num("WORKER_CONCURRENCY", 5),
    minSendGapMs: num("MIN_SEND_GAP_MS", 2000),
    maxPerHourPerSender: num("MAX_EMAILS_PER_HOUR_PER_SENDER", 200),
    leaseSeconds: num("WORKER_LEASE_SECONDS", 60),
    maxAttempts: 3,
  };
}

export type SchedulerConfig = ReturnType<typeof getSchedulerConfig>;
