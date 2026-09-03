import { StatusPill } from "./StatusPill";

export type JobRow = {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  attempts: number;
  error_message: string | null;
  provider_message_id: string | null;
  sender: string | null;
};

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function EmailTable({
  rows,
  loading,
  error,
  tab,
}: {
  rows: JobRow[];
  loading: boolean;
  error: string | null;
  tab: "scheduled" | "sent";
}) {
  if (loading)
    return (
      <div className="space-y-2 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );

  if (error)
    return (
      <div className="p-10 text-center text-sm text-destructive">Could not load emails: {error}</div>
    );

  if (!rows.length)
    return (
      <div className="p-12 text-center">
        <p className="text-sm font-medium text-foreground">
          No {tab === "scheduled" ? "scheduled" : "sent"} emails yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {tab === "scheduled"
            ? "Compose a campaign to queue your first send."
            : "Sent emails will appear here once the worker processes the queue."}
        </p>
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Recipient</th>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">Sender</th>
            <th className="px-4 py-3 font-medium">
              {tab === "scheduled" ? "Scheduled for" : "Sent at"}
            </th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3 font-medium text-foreground">{r.recipient}</td>
              <td className="max-w-[260px] truncate px-4 py-3 text-muted-foreground">{r.subject}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.sender ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {fmt(tab === "scheduled" ? r.scheduled_at : r.sent_at)}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={r.status} />
                {r.error_message ? (
                  <div className="mt-1 max-w-[220px] truncate text-xs text-destructive">
                    {r.error_message}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
