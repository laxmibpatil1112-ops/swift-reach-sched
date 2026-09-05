import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Gauge, Inbox, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReachInbox Scheduler — Reliable Cold Email Scheduling" },
      {
        name: "description",
        content:
          "Schedule, rate-limit and track cold email campaigns with a persistent queue, multi-sender delivery and live dashboard.",
      },
      { property: "og:title", content: "ReachInbox Scheduler" },
      {
        property: "og:description",
        content: "Queue-backed email scheduling with rate limits, retries and a live dashboard.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Clock, title: "Delayed jobs", copy: "Persistent queue survives restarts — no cron." },
  { icon: Gauge, title: "Rate limits", copy: "Safe hourly caps per sender with auto-reschedule." },
  { icon: ShieldCheck, title: "Idempotent", copy: "Duplicate sends are impossible by design." },
  { icon: Inbox, title: "Live dashboard", copy: "Scheduled and sent views with instant search." },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
    }
  }

  async function signInWithEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // If the account doesn't exist yet, create it
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) toast.error(signUpError.message);
      else toast.success("Account created — you're signed in");
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center">
        <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
          Outbox Labs
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          ReachInbox Email Scheduler
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Production-grade scheduling for cold outreach: durable delayed jobs, multi-sender
          delivery, per-sender hourly limits, retries and full visibility.
        </p>
        <Button className="mt-8" size="lg" onClick={signIn} disabled={busy}>
          {busy ? "Redirecting…" : "Continue with Google"}
        </Button>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5 text-left">
              <f.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold text-foreground">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
