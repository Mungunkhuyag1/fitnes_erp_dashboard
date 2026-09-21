"use client";

import { CalendarOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { date, dateTime } from "@/lib/format";

interface Settings {
  freeze_days_per_year: number;
  freeze_max_once: number;
  freeze_min_days: number;
}

interface FreezeRow {
  id: string;
  scope: "global" | "member";
  memberId: string | null;
  reason: string;
  days: number;
  startsAt: string;
  endsAt: string;
  endedAt: string | null;
  createdAt: string;
}

export default function FreezeSettings() {
  const { data: cfg, reload: reloadCfg } = useApi<Settings>("/settings");
  const { data: list, reload } = useApi<FreezeRow[]>("/freezes");
  const [form, setForm] = useState({ reason: "", startsAt: "", endsAt: "" });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const days =
    form.startsAt && form.endsAt
      ? Math.round(
          (new Date(form.endsAt).getTime() -
            new Date(form.startsAt).getTime()) /
            86_400_000,
        ) + 1
      : 0;

  async function saveLimit(key: keyof Settings, value: number) {
    setBusy(key);
    try {
      await api.patch("/settings", { [key]: value });
      toast.success("Хадгаллаа");
      reloadCfg();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

  async function grant() {
    setBusy("grant");
    try {
      const r = await api.post<{
        applied: number;
        days: number;
        already?: boolean;
      }>("/freezes/global", form);
      if (r.already) {
        toast.warning("Ижил хугацаатай чөлөө аль хэдийн олгогдсон", {
          description: r.applied ? `${r.applied} гишүүнд нөхөв` : undefined,
        });
      } else {
        toast.success(`${r.applied} гишүүнд ${r.days} хоног нэмэгдлээ`);
      }
      setConfirm(false);
      setForm({ reason: "", startsAt: "", endsAt: "" });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Олгож чадсангүй");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Баярын чөлөө</CardTitle>
          <CardDescription>
            Заалан хаагдсан өдрүүдийг <strong>бүх идэвхтэй гишүүнд</strong>{" "}
            нөхөн олгоно. Нэвтрэлт хаагдахгүй — заалан хаалттай байсан.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gr">Шалтгаан</Label>
              <Input
                id="gr"
                className="w-52"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Наадмын амралт"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gs">Эхлэх</Label>
              <Input
                id="gs"
                type="date"
                className="w-40"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ge">Дуусах</Label>
              <Input
                id="ge"
                type="date"
                className="w-40"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </div>
            <Button
              variant="outline"
              className="mb-0.5"
              onClick={() => setConfirm(true)}
              disabled={
                busy !== null ||
                form.reason.trim().length < 2 ||
                days < 1 ||
                days > 90
              }
            >
              <CalendarOff className="size-4" />
              {days > 0 ? `${days} хоног олгох` : "Олгох"}
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            Ижил хугацаатай чөлөөг дахин олгох гэвэл систем зогсооно — товчийг
            хоёр удаа дарахад гишүүн бүр давхар хоног авахгүй.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Хувь хүний чөлөөний хязгаар</CardTitle>
          <CardDescription>
            Хязгааргүй чөлөө нь үнэгүй гишүүнчлэл болно — жилийн багц авчихаад
            тасралтгүй чөлөө авбал хугацаа хэзээ ч дуусахгүй.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {cfg &&
            (
              [
                ["freeze_days_per_year", "Жилд хамгийн ихдээ"],
                ["freeze_max_once", "Нэг удаад дээд тал"],
                ["freeze_min_days", "Хамгийн багадаа"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key}>{label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={key}
                    inputMode="numeric"
                    className="w-20"
                    defaultValue={String(cfg[key])}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== cfg[key] && v >= 0) saveLimit(key, v);
                    }}
                  />
                  <span className="text-muted-foreground text-sm">хоног</span>
                  {busy === key && (
                    <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
                  )}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {list && list.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Сүүлийн чөлөөнүүд</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {list.slice(0, 15).map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs"
              >
                <span
                  className={
                    f.scope === "global"
                      ? "text-primary w-16 shrink-0 font-medium"
                      : "text-muted-foreground w-16 shrink-0"
                  }
                >
                  {f.scope === "global" ? "Баяр" : "Хувь хүн"}
                </span>
                <span className="min-w-0 truncate">{f.reason}</span>
                <span className="text-muted-foreground tabular-nums">
                  {f.days} хоног
                </span>
                <span className="text-muted-foreground ml-auto shrink-0 font-mono">
                  {date(f.startsAt)} – {date(f.endsAt)}
                </span>
                <span className="text-muted-foreground w-28 shrink-0 text-right">
                  {f.endedAt ? dateTime(f.endedAt) : "үргэлжилж буй"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Бүх идэвхтэй гишүүнд {days} хоног нэмэх үү?
            </AlertDialogTitle>
            <AlertDialogDescription>
              «{form.reason}» — {form.startsAt} – {form.endsAt}.
              <br />
              <br />
              Идэвхтэй гишүүн бүрийн эрхийн хугацаа {days} хоногоор уртасна. Энэ
              үйлдэл нь дэвтэрт бичигдэх тул буцаахад гар ажил шаардана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>
              Болих
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                grant();
              }}
              disabled={busy !== null}
            >
              {busy === "grant" && <Loader2 className="size-4 animate-spin" />}
              Олгох
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
