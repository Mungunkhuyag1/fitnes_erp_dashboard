"use client";

import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  events: string[];
  active: boolean;
}

interface Data {
  configured: boolean;
  events: { value: string; label: string }[];
  recipients: Recipient[];
}

interface Digest {
  date: string;
  revenue: number;
  sales: number;
  cash: number;
  online: number;
  newMembers: number;
  visits: number;
  awaitingApproval: number;
}

interface LogRow {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  error: string | null;
  sentAt: string;
}

export default function MailSettings() {
  const { data, loading, reload } = useApi<Data>("/mail/recipients");
  const { data: digest } = useApi<Digest>("/mail/digest/preview");
  const { data: log, reload: reloadLog } = useApi<LogRow[]>("/mail/log");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>(["daily_income"]);
  const [busy, setBusy] = useState<string | null>(null);

  async function add() {
    setBusy("add");
    try {
      await api.post("/mail/recipients", {
        email: email.trim(),
        name: name.trim() || undefined,
        events: picked,
      });
      toast.success("Хүлээн авагч нэмэгдлээ");
      setEmail("");
      setName("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Нэмж чадсангүй");
    } finally {
      setBusy(null);
    }
  }

  async function toggleEvent(r: Recipient, ev: string) {
    const events = r.events.includes(ev)
      ? r.events.filter((x) => x !== ev)
      : [...r.events, ev];
    setBusy(r.id);
    try {
      await api.patch(`/mail/recipients/${r.id}`, { events });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

  async function remove(r: Recipient) {
    setBusy(r.id);
    try {
      await api.del(`/mail/recipients/${r.id}`);
      toast.success("Устгалаа");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Устгаж чадсангүй");
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    setBusy("test");
    try {
      const r = await api.post<{ ok: boolean; stub: boolean; detail?: string }>(
        "/mail/test",
        {},
      );
      if (r.stub) {
        toast.warning("Stub горим — жинхэнэ мэйл явсангүй", {
          description: "Серверт MAIL_MODE=live тохируулна.",
        });
      } else if (r.ok) {
        toast.success("Мэйл илгээгдлээ");
      } else {
        toast.error(r.detail ?? "Илгээж чадсангүй");
      }
      reloadLog();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Автомат мэйл</CardTitle>
          <CardDescription>
            Өдөр бүр 23:00-д орлогын хураангуй илгээнэ. Онцгой үед (том төлбөр,
            синк унасан) тэр даруй мэдэгдэнэ.
          </CardDescription>
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              onClick={sendTest}
              disabled={busy !== null || !data?.recipients.length}
            >
              {busy === "test" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Туршиж үзэх
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4">
          {!data?.configured && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
              <strong>Мэйл идэвхжээгүй.</strong> Хаяг бүртгэсэн ч жинхэнэ мэйл
              явахгүй. Серверт <code>MAIL_MODE=live</code>,{" "}
              <code>RESEND_API_KEY</code>, <code>MAIL_FROM</code> гурвыг
              тохируулна. Мөн <code>winfit.mn</code> домэйны DNS дээр SPF, DKIM
              бичлэг нэмэхгүй бол мэйл спам руу орно.
            </p>
          )}

          {loading && !data ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="space-y-2">
              {data?.recipients.map((r) => (
                <div key={r.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.email}</span>
                    {r.name && (
                      <span className="text-muted-foreground text-sm">
                        {r.name}
                      </span>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive ml-auto"
                      onClick={() => remove(r)}
                      disabled={busy !== null}
                    >
                      {busy === r.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                    {data.events.map((ev) => (
                      <Label
                        key={ev.value}
                        className="flex items-center gap-2 text-sm font-normal"
                      >
                        <Checkbox
                          checked={r.events.includes(ev.value)}
                          onCheckedChange={() => toggleEvent(r, ev.value)}
                          disabled={busy !== null}
                        />
                        {ev.label}
                      </Label>
                    ))}
                  </div>
                  {r.events.length === 0 && (
                    <p className="text-muted-foreground text-xs">
                      Нэг ч сонгоогүй — энэ хаяг руу юу ч явахгүй.
                    </p>
                  )}
                </div>
              ))}
              {data?.recipients.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Хүлээн авагч бүртгээгүй байна.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="mail">Мэйл хаяг</Label>
              <Input
                id="mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="erhem@winfit.mn"
                className="w-56"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mname">Нэр</Label>
              <Input
                id="mname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Эрхэм"
                className="w-40"
              />
            </div>
            <Button
              variant="outline"
              onClick={add}
              disabled={!email.includes("@") || !picked.length || busy !== null}
            >
              {busy === "add" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Нэмэх
            </Button>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pb-2">
              {data?.events.map((ev) => (
                <Label
                  key={ev.value}
                  className="flex items-center gap-2 text-sm font-normal"
                >
                  <Checkbox
                    checked={picked.includes(ev.value)}
                    onCheckedChange={(c) =>
                      setPicked((p) =>
                        c === true
                          ? [...p, ev.value]
                          : p.filter((x) => x !== ev.value),
                      )
                    }
                  />
                  {ev.label}
                </Label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {digest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Өнөөдрийн хураангуй</CardTitle>
            <CardDescription>
              23:00-д яг эдгээр тоо мэйлээр явна — {digest.date}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-x-8 gap-y-3">
            <Stat label="Нийт орлого" value={money(digest.revenue)} strong />
            <Stat label="Худалдан авалт" value={String(digest.sales)} />
            <Stat label="Бэлнээр" value={money(digest.cash)} />
            <Stat label="Онлайнаар" value={money(digest.online)} />
            <Stat label="Шинэ гишүүн" value={String(digest.newMembers)} />
            <Stat label="Ирц" value={String(digest.visits)} />
            {digest.awaitingApproval > 0 && (
              <Stat
                label="Баримт хүлээж буй"
                value={String(digest.awaitingApproval)}
                warn
              />
            )}
          </CardContent>
        </Card>
      )}

      {log && log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Илгээсэн мэйл</CardTitle>
            <CardDescription>Сүүлийн 50</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {log.slice(0, 12).map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs"
              >
                <span
                  className={cn(
                    "w-12 shrink-0 font-medium",
                    r.status === "sent" &&
                      "text-emerald-600 dark:text-emerald-400",
                    r.status === "failed" && "text-destructive",
                    r.status === "stub" && "text-muted-foreground",
                  )}
                >
                  {r.status}
                </span>
                <span className="text-muted-foreground shrink-0 font-mono">
                  {dateTime(r.sentAt)}
                </span>
                <span className="min-w-0 truncate">{r.toEmail}</span>
                <span className="text-muted-foreground min-w-0 truncate">
                  {r.error ?? r.subject}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  strong,
  warn,
}: {
  label: string;
  value: string;
  strong?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "tabular-nums",
          strong ? "text-lg font-semibold" : "text-base font-medium",
          warn && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}
