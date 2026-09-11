"use client";

import { Loader2, Plus, Power, Tag, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { date, money } from "@/lib/format";
import { cn } from "@/lib/utils";

type Kind = "percent" | "amount" | "fixed_price" | "bonus_days";

interface Promo {
  id: string;
  name: string;
  kind: Kind;
  value: number;
  packageIds: string[];
  startsAt: string | null;
  endsAt: string | null;
  channels: string[];
  active: boolean;
  stats: { uses: number; members: number; totalValue: number };
}

interface Data {
  kinds: { value: Kind; label: string }[];
  promotions: Promo[];
}

/** Төрөл бүрд утга нь юуг илэрхийлэх вэ. */
const UNIT: Record<Kind, string> = {
  percent: "%",
  amount: "₮ хөнгөлнө",
  fixed_price: "₮ болгоно",
  bonus_days: "хоног нэмнэ",
};

export default function PromotionSettings() {
  const { data, reload } = useApi<Data>("/promotions");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; kind: Kind; value: string }>(
    {
      name: "",
      kind: "percent",
      value: "20",
    },
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function create() {
    setBusy("create");
    try {
      await api.post("/promotions", {
        name: form.name.trim(),
        kind: form.kind,
        value: Number(form.value),
      });
      toast.success("Урамшуулал үүслээ", {
        description: "Идэвхжүүлэх хүртэл үйлчлэхгүй.",
      });
      setOpen(false);
      setForm({ name: "", kind: "percent", value: "20" });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Үүсгэж чадсангүй");
    } finally {
      setBusy(null);
    }
  }

  async function toggle(p: Promo) {
    setBusy(p.id);
    try {
      await api.post(
        `/promotions/${p.id}/${p.active ? "deactivate" : "activate"}`,
      );
      toast.success(
        p.active ? "Унтраалаа" : `«${p.name}» идэвхжлээ — бусад нь унтарлаа`,
      );
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: Promo) {
    setBusy(p.id);
    try {
      await api.del(`/promotions/${p.id}`);
      toast.success("Устгалаа");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Устгаж чадсангүй");
    } finally {
      setBusy(null);
    }
  }

  const active = data?.promotions.find((p) => p.active);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Урамшуулал</CardTitle>
          <CardDescription>
            <strong>Нэг үед нэг л</strong> урамшуулал үйлчилнэ. Шинийг
            идэвхжүүлэхэд өмнөх нь өөрөө унтарна — давхарлах дүрэм, «аль нь
            ашигтай вэ» гэсэн тооцоолол хэрэггүй.
          </CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus className="size-3.5" />
              Шинэ урамшуулал
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-2">
          {active ? (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/8 px-3 py-2.5 text-sm">
              <Tag className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>{active.name}</strong> үйлчилж байна — {active.value}
                {UNIT[active.kind]}
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Идэвхтэй урамшуулал алга. Багцууд энгийн үнээрээ зарагдана.
            </p>
          )}

          {data?.promotions.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5 text-sm",
                p.active && "border-emerald-500/40 bg-emerald-500/5",
              )}
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground">
                {p.value}
                {UNIT[p.kind]}
              </span>
              {(p.startsAt || p.endsAt) && (
                <span className="text-muted-foreground text-xs">
                  {p.startsAt ? date(p.startsAt) : "…"} –{" "}
                  {p.endsAt ? date(p.endsAt) : "…"}
                </span>
              )}
              <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                {p.stats.uses
                  ? `${p.stats.uses} удаа · ${p.stats.members} хүн${
                      p.kind === "bonus_days"
                        ? ` · ${p.stats.totalValue} хоног`
                        : ` · ${money(p.stats.totalValue)}`
                    }`
                  : "ашиглаагүй"}
              </span>
              <Button
                size="sm"
                variant={p.active ? "default" : "outline"}
                onClick={() => toggle(p)}
                disabled={busy !== null}
              >
                {busy === p.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Power className="size-3.5" />
                )}
                {p.active ? "Унтраах" : "Идэвхжүүлэх"}
              </Button>
              {p.stats.uses === 0 && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => remove(p)}
                  disabled={busy !== null}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}

          {data?.promotions.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Урамшуулал үүсгээгүй байна.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Шинэ урамшуулал</DialogTitle>
            <DialogDescription>
              Үүсгэсний дараа <strong>идэвхжүүлэх</strong> хүртэл үйлчлэхгүй —
              санамсаргүй хямдрал явахаас сэргийлнэ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pn">Нэр</Label>
              <Input
                id="pn"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Наадмын хямдрал"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pk">Төрөл</Label>
              <Select
                value={form.kind}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    kind: v as Kind,
                    value:
                      v === "percent" ? "20" : v === "bonus_days" ? "30" : "",
                  })
                }
              >
                <SelectTrigger id="pk">
                  {/* Base UI нь ТҮҮХИЙ утга дамжуулдаг тул шошгыг
                      өөрсдөө гаргана. */}
                  <SelectValue>
                    {data?.kinds.find((k) => k.value === form.kind)?.label ??
                      form.kind}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {data?.kinds.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pv">Утга</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pv"
                  inputMode="numeric"
                  className="w-32"
                  value={form.value}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      value: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
                <span className="text-muted-foreground text-sm">
                  {UNIT[form.kind]}
                </span>
              </div>
              {form.kind === "percent" && (
                <p className="text-muted-foreground text-xs">
                  1–90 хооронд. Хөнгөлөлтийг 100₮ хүртэл тэгшитгэнэ.
                </p>
              )}
              {form.kind === "bonus_days" && (
                <p className="text-muted-foreground text-xs">
                  Худалдан авах агшинд хоног нэмэгдэнэ — хойшлуулахгүй.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={busy !== null}
            >
              Болих
            </Button>
            <Button
              onClick={create}
              disabled={
                busy !== null || form.name.trim().length < 2 || !form.value
              }
            >
              {busy === "create" && <Loader2 className="size-4 animate-spin" />}
              Үүсгэх
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
