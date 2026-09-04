import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LogOut, Mail, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ComposeDialog } from "@/components/ComposeDialog";
import { EmailTable, type JobRow } from "@/components/EmailTable";
import { SlackIntegrationCard } from "@/components/dashboard/SlackIntegrationCard";
import { useAuth } from "@/hooks/useAuth";
import {
  getQueueStats,
  listJobs,
  listSenders,
  tickWorker,
} from "@/lib/scheduler.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ReachInbox Scheduler" },
      { name: "description", content: "Schedule campaigns and track scheduled and sent emails." },
      { property: "og:title", content: "ReachInbox Scheduler Dashboard" },
      {
        property: "og:description",
        content: "Schedule campaigns and track scheduled and sent emails in real time.",
      },
    ],
  }),
  component: Dashboard,
});

type Stats = {
  counts: Record<string, number>;
  nextRunAt: string | null;
  simulated: boolean;
};

function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<JobRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [senders, setSenders] = useState<{ id: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [jobs, s] = await Promise.all([
          listJobs({ data: { tab, search } }),
          getQueueStats({}),
        ]);
        setRows(jobs as JobRow[]);
        setStats(s as Stats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [tab, search],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    listSenders({})
      .then((s) => setSenders(s as { id: string; email: string }[]))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        await tickWorker({});
      } catch {
        /* ignore */
      }
      void refresh(true);
    }, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function runNow() {
    try {
      const res = await tickWorker({});
      toast.success(res.ran ? `Worker ran: ${res.sent} sent, ${res.claimed} claimed` : "Worker busy");
      void refresh(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Worker failed");
    }
  }

  const counts = stats?.counts ?? {};

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">ReachInbox Scheduler</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                void navigate({ to: "/" });
              }}
            >
              <LogOut className="mr-1 h-4 w-4" /> Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              {stats?.simulated
                ? "Simulation mode — delivery is mocked until a sending domain is verified."
                : "Live delivery enabled."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={runNow}>
              <RefreshCw className="mr-1 h-4 w-4" /> Run worker
            </Button>
            <Button onClick={() => setComposeOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Compose new email
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {(["scheduled", "processing", "sent", "failed"] as const).map((k) => (
            <div key={k} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{counts[k] ?? 0}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                  {(["scheduled", "sent"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                        tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      {t} emails
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search recipient or subject"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <EmailTable rows={rows} loading={loading} error={error} tab={tab} />
            </div>
          </div>

          <div className="space-y-6">
            <SlackIntegrationCard />
          </div>
        </div>
      </main>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        senders={senders}
        onScheduled={() => void refresh(true)}
      />
    </div>
  );
}
