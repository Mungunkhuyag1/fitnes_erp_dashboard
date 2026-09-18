"use client";

import { Layers, Loader2, Pencil, Plus, Power, Tag, Trash2 } from "lucide-react";
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
  exclusive: boolean;
  sortOrder: number;
  active: boolean;
  stats: { uses: number; members: number; totalValue: number };
}

interface Pkg {
  id: string;
  name: string;
  days: number;
  price: number;
}

interface Data {
  kinds: { value: Kind; label: string }[];
  packages: Pkg[];
  promotions: Promo[];
}

interface Settings {
  promo_max_discount_pct: number;
}

/** Төрөл бүрд утга нь юуг илэрхийлэх вэ. */
const UNIT: Record<Kind, string> = {
  percent: "%",
  amount: "₮ хөнгөлнө",
  fixed_price: "₮ болгоно",
  bonus_days: "хоног нэмнэ",
};

interface Form {
  name: string;
  kind: Kind;
  value: string;
  packageIds: string[];
  startsAt: string;
  endsAt: string;
  exclusive: boolean;
  sortOrder: string;
  online: boolean;
  reception: boolean;
}

const BLANK: Form = {
  name: "",
  kind: "percent",
  value: "20",
  packageIds: [],
  startsAt: "",
  endsAt: "",
  exclusive: false,
  sortOrder: "0",
  online: true,
  reception: true,
};

/**
 * `2026-09-18` — `<input type="date">`-д тохирох хэлбэр.
 *
 * ⚠ ISO мөрийг таслаж болохгүй: `2026-09-18T16:00:00Z` нь Улаанбаатарт
 * 19-ний өглөө. `date()` нь заалны цагийн бүсээр хөрвүүлнэ.
 */
function dateInput(iso: string | null): string {
  return iso ? date(iso) : "";
}

/**
 * Огнооны талбарыг ISO болгоно — заалны цагийн бүсээр.
 *
 * ⚠ `new Date("2026-09-30")` нь UTC шөнө дунд = УБ-д 30-ны 08:00. Ийм
 * урамшуулал «9 сарын 30 хүртэл» гэж зарлагдаад тэр өдрийн өглөө
 * унтардаг байв. Эхлэх нь өдрийн ЭХЭНД, дуусах нь ТӨГСГӨЛД.
 *
 * Монгол улс 2017-оос хойш зуны цаг хэрэглэхгүй тул +08:00 тогтмол.
 */
function toIso(day: string, edge: "start" | "end"): string | null {
  if (!day) return null;
  const time = edge === "start" ? "00:00:00.000" : "23:59:59.999";
  return new Date(`${day}T${time}+08:00`).toISOString();
}

export default function PromotionSettings() {
  const { data, reload } = useApi<Data>("/promotions");
  const { data: cfg, reload: reloadCfg } = useApi<Settings>("/settings");
  /** `null` = хаалттай, `"new"` = шинэ, бусад нь засах ID. */
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const [cap, setCap] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const packages = data?.packages ?? [];

  function openNew() {
    setForm(BLANK);
    setEditing("new");
  }

  function openEdit(p: Promo) {
    setForm({
      name: p.name,
      kind: p.kind,
      value: String(p.value),
      packageIds: p.packageIds,
      startsAt: dateInput(p.startsAt),
      endsAt: dateInput(p.endsAt),
      exclusive: p.exclusive,
      sortOrder: String(p.sortOrder),
      online: p.channels.includes("online"),
      reception: p.channels.includes("reception"),
    });
    setEditing(p.id);
  }

  async function save() {
    setBusy("save");
    const body = {
      name: form.name.trim(),
      kind: form.kind,
      value: Number(form.value),
      packageIds: form.packageIds,
      // Хоосон талбар = хязгааргүй. `null` илгээж байж хуучин огноо арилна.
      startsAt: toIso(form.startsAt, "start"),
      endsAt: toIso(form.endsAt, "end"),
      exclusive: form.exclusive,
      sortOrder: Number(form.sortOrder) || 0,
      channels: [
        ...(form.online ? ["online"] : []),
        ...(form.reception ? ["reception"] : []),
      ],
    };
    try {
      if (editing === "new") {
        await api.post("/promotions", body);
        toast.success("Урамшуулал үүслээ", {
          description: "Идэвхжүүлэх хүртэл үйлчлэхгүй.",
        });
      } else {
        await api.patch(`/promotions/${editing}`, body);
        toast.success("Хадгаллаа");
      }
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Хадгалж чадсангүй");
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
      toast.success(p.active ? "Унтраалаа" : `«${p.name}» идэвхжлээ`);
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

  async function saveCap() {
    setBusy("cap");
    try {
      await api.patch("/settings", {
        promo_max_discount_pct: Number(cap),
      });
      toast.success("Хадгаллаа");
      setCap(null);
      reloadCfg();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

  const live = data?.promotions.filter((p) => p.active) ?? [];
  const stacking = live.filter((p) => !p.exclusive);
  const exclusive = live.find((p) => p.exclusive);
  const maxPct = cfg?.promo_max_discount_pct ?? 60;

  /** Аль багцад үйлчлэх вэ — хоосон бол бүгдэд. */
  function scope(p: Promo): string {
    if (!p.packageIds.length) return "Бүх багц";
    const names = p.packageIds
      .map((id) => packages.find((x) => x.id === id)?.name)
      .filter(Boolean);
    if (!names.length) return `${p.packageIds.length} багц`;
    return names.length > 2
      ? `${names.slice(0, 2).join(", ")} +${names.length - 2}`
      : names.join(", ");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Урамшуулал</CardTitle>
          <CardDescription>
            Идэвхтэй урамшууллуудаас <strong>багцад нь тохирсон</strong> нь
            бүгд давхарлана. Хөнгөлөлт бүрийг <strong>анхны үнээс</strong>{" "}
            тооцоод нийлбэрээр хасна. <strong>Онцгой</strong> гэж тэмдэглэсэн
            урамшуулал тохирвол зөвхөн тэр үйлчилнэ.
          </CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" onClick={openNew}>
              <Plus className="size-3.5" />
              Шинэ урамшуулал
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-2">
          {exclusive ? (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/8 px-3 py-2.5 text-sm">
              <Tag className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>{exclusive.name}</strong> нь онцгой урамшуулал —
                тохирсон багцад зөвхөн энэ үйлчилнэ.
                {stacking.length > 0 &&
                  ` Бусад ${stacking.length} урамшуулал зөвхөн энэ нь хамаарахгүй багцад ажиллана.`}
              </span>
            </p>
          ) : live.length ? (
            <p className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/8 px-3 py-2.5 text-sm">
              <Layers className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>{live.length}</strong> урамшуулал идэвхтэй — нэг багцад
                хэд нь тохирвол тэд давхарлана. Нийт хөнгөлөлт{" "}
                <strong>{maxPct}%</strong>-иас хэтрэхгүй.
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
              {p.exclusive && (
                <span className="rounded bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  онцгой
                </span>
              )}
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
                {scope(p)}
              </span>
              {p.channels.length === 1 && (
                <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
                  {p.channels[0] === "online" ? "зөвхөн онлайн" : "зөвхөн ресепшн"}
                </span>
              )}
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
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => openEdit(p)}
                disabled={busy !== null}
              >
                <Pencil className="size-3.5" />
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

      {/* ── Давхарлалтын хамгаалалт ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Хөнгөлөлтийн дээд хязгаар</CardTitle>
          <CardDescription>
            Давхарласан урамшууллын нийт хөнгөлөлт багцын үнийн энэ хувиас
            хэтрэхгүй. Санамсаргүй давхцалаас болж багц бараг үнэгүй
            зарагдахаас сэргийлнэ — <strong>ганц</strong> урамшуулалд ч
            үйлчилнэ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="cap">Дээд хязгаар (%)</Label>
              <Input
                id="cap"
                inputMode="numeric"
                className="w-24"
                value={cap ?? String(maxPct)}
                onChange={(e) =>
                  setCap(e.target.value.replace(/\D/g, "").slice(0, 3))
                }
              />
            </div>
            <Button
              variant="outline"
              onClick={saveCap}
              disabled={
                busy !== null ||
                cap === null ||
                cap === "" ||
                Number(cap) > 100 ||
                Number(cap) === maxPct
              }
            >
              {busy === "cap" && <Loader2 className="size-4 animate-spin" />}
              Хадгалах
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Шинэ урамшуулал" : "Урамшуулал засах"}
            </DialogTitle>
            <DialogDescription>
              {editing === "new" ? (
                <>
                  Үүсгэсний дараа <strong>идэвхжүүлэх</strong> хүртэл
                  үйлчлэхгүй — санамсаргүй хямдрал явахаас сэргийлнэ.
                </>
              ) : (
                <>
                  Өөрчлөлт нь ШИНЭ нэхэмжлэхэд үйлчилнэ. Аль хэдийн үүссэн
                  нэхэмжлэх хуучин үнээрээ үлдэнэ.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto px-0.5">
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
                onValueChange={(v) => {
                  const kind = v as Kind;
                  setForm({
                    ...form,
                    kind,
                    value:
                      kind === "percent"
                        ? "20"
                        : kind === "bonus_days"
                          ? "30"
                          : "",
                    // Тогтмол үнэ нь давхарлахгүй — заавал онцгой.
                    exclusive:
                      kind === "fixed_price" ? true : form.exclusive,
                  });
                }}
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
                  {Number(form.value) > maxPct && (
                    <span className="text-amber-700 dark:text-amber-400">
                      {" "}
                      Дээд хязгаар {maxPct}% тул {maxPct}%-иар л хэрэглэгдэнэ.
                    </span>
                  )}
                </p>
              )}
              {form.kind === "bonus_days" && (
                <p className="text-muted-foreground text-xs">
                  Худалдан авах агшинд хоног нэмэгдэнэ — хойшлуулахгүй. Хоног
                  нь хөнгөлөлтийн хязгаарт хамаарахгүй.
                </p>
              )}
            </div>

            {/* ── Аль багцад ── */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Аль багцад</Label>
                {form.packageIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm({ ...form, packageIds: [] })}
                  >
                    Цэвэрлэх
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                {form.packageIds.length
                  ? `${form.packageIds.length} багц сонгосон`
                  : "Юу ч сонгоогүй = БҮХ багцад үйлчилнэ."}
              </p>
              <div className="max-h-44 space-y-1.5 overflow-y-auto">
                {packages.map((pkg) => {
                  const on = form.packageIds.includes(pkg.id);
                  return (
                    <Label
                      key={pkg.id}
                      className="flex items-center gap-2.5 font-normal"
                    >
                      <Checkbox
                        checked={on}
                        onCheckedChange={(c) =>
                          setForm({
                            ...form,
                            packageIds:
                              c === true
                                ? [...form.packageIds, pkg.id]
                                : form.packageIds.filter((x) => x !== pkg.id),
                          })
                        }
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {pkg.name}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {pkg.days} хоног · {money(pkg.price)}
                      </span>
                    </Label>
                  );
                })}
                {packages.length === 0 && (
                  <p className="text-muted-foreground text-xs">
                    Идэвхтэй багц алга.
                  </p>
                )}
              </div>
            </div>

            {/* ── Суваг ── */}
            <div className="space-y-3 rounded-lg border p-3">
              <Label className="font-medium">Хаана үйлчлэх</Label>
              <Label className="flex items-start gap-2.5 font-normal">
                <Checkbox
                  checked={form.online}
                  onCheckedChange={(c) =>
                    setForm({ ...form, online: c === true })
                  }
                  className="mt-0.5"
                />
                <span>
                  Онлайн төлбөр
                  <span className="text-muted-foreground block text-xs">
                    Гишүүн /pay хуудаснаас өөрөө төлөхөд хөнгөлөгдөнө.
                  </span>
                </span>
              </Label>
              <Label className="flex items-start gap-2.5 font-normal">
                <Checkbox
                  checked={form.reception}
                  onCheckedChange={(c) =>
                    setForm({ ...form, reception: c === true })
                  }
                  className="mt-0.5"
                />
                <span>
                  Ресепшн дээр
                  <span className="text-muted-foreground block text-xs">
                    Хосын багц зэрэг онлайнаар зарагддаггүй багцын{" "}
                    <strong>зарлах үнэд</strong> тусна (нүүр хуудсанд
                    харагдана). ⚠ Ресепшний гар сунгалтыг систем автоматаар
                    хямдруулахгүй — ажилтан өөрөө тооцно.
                  </span>
                </span>
              </Label>
            </div>

            {/* ── Хугацаа ── */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="ps">Эхлэх</Label>
                <Input
                  id="ps"
                  type="date"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pe">Дуусах</Label>
                <Input
                  id="pe"
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Хоосон = хязгааргүй. <strong>Дуусах өдөр нь ОРНО</strong> —
              тухайн өдрийн 23:59 хүртэл үйлчилнэ. Огноо нь идэвхжүүлэлтээс
              ТУСДАА: идэвхтэй ч огноо нь ирээгүй бол үйлчлэхгүй.
            </p>

            {/* ── Давхарлалт ── */}
            <div className="space-y-3 rounded-lg border p-3">
              <Label className="flex items-start gap-2.5 font-normal">
                <Checkbox
                  checked={form.exclusive}
                  disabled={form.kind === "fixed_price"}
                  onCheckedChange={(c) =>
                    setForm({ ...form, exclusive: c === true })
                  }
                  className="mt-0.5"
                />
                <span>
                  Онцгой — давхарлахгүй
                  <span className="text-muted-foreground block text-xs">
                    {form.kind === "fixed_price"
                      ? "Тогтмол үнэ нь ҮРГЭЛЖ онцгой: «үнэ нь 500,000₮» гэж зарлаад дээрээс нь дахин хямдруулах нь өөрийгөө няцаана."
                      : "Тохирсон багцад зөвхөн энэ урамшуулал үйлчилнэ — бусад нь тооцогдохгүй."}
                  </span>
                </span>
              </Label>

              <div className="space-y-1.5">
                <Label htmlFor="po">Дараалал</Label>
                <Input
                  id="po"
                  inputMode="numeric"
                  className="w-24"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sortOrder: e.target.value.replace(/[^\d-]/g, ""),
                    })
                  }
                />
                <p className="text-muted-foreground text-xs">
                  ИХ нь түрүүлж хэрэглэгдэнэ. Нийт хөнгөлөлт {maxPct}%-д
                  хүрэхэд үлдсэн нь таслагдах тул «аль нь бүтнээрээ орох вэ»
                  гэдгийг энэ шийднэ.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditing(null)}
              disabled={busy !== null}
            >
              Болих
            </Button>
            <Button
              onClick={save}
              disabled={
                busy !== null ||
                form.name.trim().length < 2 ||
                !form.value ||
                (!form.online && !form.reception)
              }
            >
              {busy === "save" && <Loader2 className="size-4 animate-spin" />}
              {editing === "new" ? "Үүсгэх" : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
