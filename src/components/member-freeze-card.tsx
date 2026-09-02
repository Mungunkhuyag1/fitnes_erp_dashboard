"use client";

import { Loader2, PauseCircle, PlayCircle } from "lucide-react";
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
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { date } from "@/lib/format";

interface FreezeRow {
  id: string;
  reason: string;
  days: number;
  startsAt: string;
  endsAt: string;
  endedAt: string | null;
}

interface FreezeState {
  open: FreezeRow | null;
  usedDays: number;
  limitPerYear: number;
  history: FreezeRow[];
}

/**
 * Гишүүний чөлөө.
 *
 * ⚠ Чөлөөтэй үед гишүүн НЭВТЭРЧ ЧАДАХГҮЙ — эс бөгөөс чөлөөтэй байхдаа
 * дасгал хийгээд дараа нь нэмэгдсэн хоногоо авах болно.
 */
export function MemberFreezeCard({
  memberId,
  status,
  onChange,
}: {
  memberId: string;
  status: string;
  onChange?: () => void;
}) {
  const { can } = useAuth();
  const { data, reload } = useApi<FreezeState>(`/freezes/member/${memberId}`);
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const left = data ? Math.max(0, data.limitPerYear - data.usedDays) : 0;

  async function start() {
    setBusy(true);
    try {
      await api.post("/freezes/member", {
        memberId,
        days: Number(days),
        reason: reason.trim(),
      });
      toast.success(`${days} хоногийн чөлөө эхэллээ`);
      setOpen(false);
      setReason("");
      reload();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Чөлөө олгож чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!data?.open) return;
    setBusy(true);
    try {
      const r = await api.post<{ daysAdded: number }>(
        `/freezes/${data.open.id}/end`,
        {},
      );
      toast.success(
        r.daysAdded
          ? `Чөлөө дууслаа — ${r.daysAdded} хоног нэмэгдлээ`
          : "Чөлөө дууслаа",
      );
      reload();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Дуусгаж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Чөлөө</CardTitle>
          <CardDescription>
            {data.open ? (
              <>
                <strong>{date(data.open.endsAt)}</strong> хүртэл чөлөөтэй. Энэ
                хугацаанд нэвтэрч чадахгүй.
              </>
            ) : (
              <>
                Энэ жил {data.usedDays} хоног авсан
                {data.limitPerYear > 0 && ` · ${left} хоног үлдсэн`}.
              </>
            )}
          </CardDescription>
          {can("manager") && (
            <CardAction>
              {data.open ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={end}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <PlayCircle className="size-3.5" />
                  )}
                  Чөлөө дуусгах
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(true)}
                  disabled={status !== "active" || left === 0}
                >
                  <PauseCircle className="size-3.5" />
                  Чөлөө олгох
                </Button>
              )}
            </CardAction>
          )}
        </CardHeader>

        {(data.open || data.history.length > 0) && (
          <CardContent className="space-y-1 text-xs">
            {data.open && (
              <p className="text-muted-foreground">
                {data.open.reason} · {data.open.days} хоног ·{" "}
                {date(data.open.startsAt)}-нээс
              </p>
            )}
            {data.history
              .filter((h) => h.endedAt)
              .slice(0, 5)
              .map((h) => (
                <p key={h.id} className="text-muted-foreground">
                  {date(h.startsAt)} – {date(h.endedAt!)} · {h.reason}
                </p>
              ))}
          </CardContent>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Чөлөө олгох</DialogTitle>
            <DialogDescription>
              Чөлөөтэй хугацаанд гишүүн <strong>нэвтэрч чадахгүй</strong>.
              Дуусахад бодитоор өнгөрсөн хоногоор эрх нь уртасна — эрт буцаж
              ирвэл тэр хэмжээгээр л нэмэгдэнэ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fdays">Хэдэн хоног</Label>
              <Input
                id="fdays"
                inputMode="numeric"
                className="w-24"
                value={days}
                onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-muted-foreground text-xs">
                Энэ жил {left} хоног үлдсэн.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="freason">Шалтгаан</Label>
              <Input
                id="freason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Гадаадад явсан"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Болих
            </Button>
            <Button
              onClick={start}
              disabled={busy || reason.trim().length < 2 || Number(days) < 1}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Чөлөө эхлүүлэх
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
