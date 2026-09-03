import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { scheduleCampaign } from "@/lib/scheduler.functions";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function localDefault() {
  const d = new Date(Date.now() + 60_000);
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ComposeDialog({
  open,
  onOpenChange,
  senders,
  onScheduled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  senders: { id: string; email: string }[];
  onScheduled: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [raw, setRaw] = useState("");
  const [startAt, setStartAt] = useState(localDefault());
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [senderId, setSenderId] = useState("");
  const [saving, setSaving] = useState(false);

  const recipients = Array.from(new Set((raw.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase())));

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRaw((prev) => (prev ? `${prev}\n${text}` : text));
    e.target.value = "";
  }

  async function submit() {
    if (!subject.trim() || !body.trim() || !recipients.length) {
      toast.error("Subject, body and at least one recipient are required");
      return;
    }
    setSaving(true);
    try {
      const res = await scheduleCampaign({
        data: {
          subject: subject.trim(),
          body,
          recipients,
          startAt: new Date(startAt).toISOString(),
          delaySeconds,
          hourlyLimit,
          ...(senderId ? { senderId } : {}),
        },
      });
      toast.success(`Scheduled ${res.scheduled} emails`);
      setSubject("");
      setBody("");
      setRaw("");
      onOpenChange(false);
      onScheduled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not schedule campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose new email</DialogTitle>
          <DialogDescription>
            Upload leads, write your message and queue it with rate-limited delivery.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leads">Leads (CSV / text / paste)</Label>
            <Textarea
              id="leads"
              rows={4}
              placeholder="lead@example.com, another@example.com"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFile}
                className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-xs"
              />
              <span className="text-xs text-muted-foreground">
                {recipients.length} unique recipient{recipients.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="start">Start at</Label>
              <Input
                id="start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay">Delay between sends (s)</Label>
              <Input
                id="delay"
                type="number"
                min={0}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit">Hourly limit</Label>
              <Input
                id="limit"
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
              />
            </div>
          </div>

          {senders.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="sender">Sender</Label>
              <select
                id="sender"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Default sender</option>
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.email}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Scheduling…" : "Schedule campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
