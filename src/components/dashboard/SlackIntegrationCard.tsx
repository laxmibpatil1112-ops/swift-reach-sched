import { useCallback, useEffect, useState } from "react";
import { Slack, Loader2, Unlink, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  connectSlack,
  disconnectSlack,
  getSlackConnection,
} from "@/lib/scheduler.functions";

type SlackConnection = {
  channel: string | null;
  team_name: string | null;
  connected_at: string | null;
} | null;

export function SlackIntegrationCard() {
  const [connection, setConnection] = useState<SlackConnection>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channel, setChannel] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await getSlackConnection({});
      setConnection(data as SlackConnection);
    } catch {
      toast.error("Could not load Slack connection");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      toast.error("Enter a Slack webhook URL");
      return;
    }
    setBusy(true);
    try {
      await connectSlack({
        data: {
          webhookUrl: webhookUrl.trim(),
          channel: channel.trim() || undefined,
        },
      });
      toast.success("Slack connected — test message sent");
      setWebhookUrl("");
      setChannel("");
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Slack connection failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectSlack({});
      toast.success("Slack disconnected");
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="panel">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Slack className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">Slack alerts</CardTitle>
        </div>
        <CardDescription>
          Get notified in Slack when a sender hits its hourly rate limit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading connection…
          </div>
        ) : connection ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/50 p-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Connected</p>
                <p className="text-xs text-muted-foreground">
                  {connection.team_name ? `Team: ${connection.team_name}` : "Incoming Webhook"}
                  {connection.channel ? ` · Channel: ${connection.channel}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="mr-1 h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Paste an incoming webhook URL from your Slack workspace. A test
                message will be sent when you connect.
              </p>
            </div>
            <Input
              placeholder="https://hooks.slack.com/services/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              disabled={busy}
            />
            <Input
              placeholder="#reachinbox-alerts (optional channel name)"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              disabled={busy}
            />
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Slack className="mr-1 h-4 w-4" />
              )}
              Connect Slack
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
