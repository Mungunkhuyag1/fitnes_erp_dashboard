"use client";

import { Loader2, Pencil, Percent, Plus, Power, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { FilterSelect } from "@/components/filter-select";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
import { useAuth } from "@/lib/auth";
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

/** Диалог доторх утгын нэгж. */
const UNIT: Record<Kind, string> = {
  percent: "%",
  amount: "₮ хөнгөлнө",
  fixed_price: "₮ болгоно",
  bonus_days: "хоног нэмнэ",
};

/**
 * Урамшуулал ЮУ хийхийг нэг мөрөөр.
 *
 * Жагсаалт хармагц «энэ хэдээр хямдруулдаг вэ» гэдгийг уншилгүйгээр
 * ойлгох ёстой — тиймээс төрөл бүрд өөр бичиглэл.
 */
function effect(p: Promo): string {
  switch (p.kind) {
    case "percent":
      return `−${p.value}%`;
    case "amount":
      return `−${money(p.value)}`;
    case "fixed_price":
      return money(p.value);
    case "bonus_days":
      return `+${p.value} хоног`;
  }
}

function channelText(ch: string[]): string {
  const on = ch.includes("online");
  const rec = ch.includes("reception");
  if (on && rec) return "Онлайн ба ресепшн";
  if (on) return "Зөвхөн онлайн";
  if (rec) return "Зөвхөн ресепшн";
  return "Хаана ч биш";
}

function periodText(p: Promo): string {
  if (!p.startsAt && !p.endsAt) return "Хязгааргүй";
  return `${p.startsAt ? date(p.startsAt) : "…"} – ${p.endsAt ? date(p.endsAt) : "…"}`;
}

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

export default function PromotionsPage() {
  const { can } = useAuth();
  const { data, reload } = useApi<Data>("/promotions");
  const { data: cfg, reload: reloadCfg } = useApi<Settings>("/settings");
  /** `null` = хаалттай, `"new"` = шинэ, бусад нь засах ID. */
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const [status, setStatus] = useState("");
  const [capOpen, setCapOpen] = useState(false);
  const [cap, setCap] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const admin = can("admin");
  const packages = data?.packages ?? [];
  const promos = data?.promotions ?? [];
  const live = promos.filter((p) => p.active);
  const idle = promos.filter((p) => !p.active);
  /*
   * ⚠ Идэвхтэй нь ЭХЭНД. Хоёр тусдаа блок болгож хуваавал ижил зүйлийг
   * хоёр өөр хэлбэрээр зурах шаардлага гарч, нүд нь дасахгүй байв.
   * Нэг жагсаалт — төлөвийг нь шошгоор ялгана.
   */
  const shown = promos
    .filter((p) =>
      status === "active" ? p.active : status === "idle" ? !p.active : true,
    )
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        b.sortOrder - a.sortOrder ||
        a.name.localeCompare(b.name),
    );
  const exclusive = live.find((p) => p.exclusive);
  const maxPct = cfg?.promo_max_discount_pct ?? 60;

  const totals = promos.reduce(
    (a, p) => ({
      uses: a.uses + p.stats.uses,
      /** ⚠ Хоног нэмэх урамшууллыг ₮ дүнд НЭМЭХГҮЙ — өөр нэгж. */
      value: a.value + (p.kind === "bonus_days" ? 0 : p.stats.totalValue),
      days: a.days + (p.kind === "bonus_days" ? p.stats.totalValue : 0),
    }),
    { uses: 0, value: 0, days: 0 },
  );

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
      await api.patch("/settings", { promo_max_discount_pct: Number(cap) });
      toast.success("Хадгаллаа");
      setCapOpen(false);
      reloadCfg();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

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

  const kindLabel = (k: Kind) =>
    data?.kinds.find((x) => x.value === k)?.label ?? k;

  /** Нэг урамшууллын хайрцаг — идэвхтэй бүлэгт. */
  function PromoCard({ p }: { p: Promo }) {
    return (
      <Card
        className={cn(
          "gap-3",
          !p.active
            ? // Идэвхгүй нь ТАСАРХАЙ хүрээтэй: нэг жагсаалтад байсан ч
              // «одоо ажиллахгүй байна» гэдэг нь харцаар ялгарна.
              "border-dashed bg-card"
            : p.exclusive
              ? "border-amber-500/40 from-amber-500/5 bg-gradient-to-t to-card"
              : "from-primary/5 to-card bg-gradient-to-t",
        )}
      >
        <CardHeader>
          <CardDescription>{kindLabel(p.kind)}</CardDescription>
          <CardTitle
            className={cn(
              "text-lg leading-tight",
              !p.active && "text-muted-foreground",
            )}
          >
            {p.name}
          </CardTitle>
          <CardAction className="flex gap-1.5">
            {p.exclusive && (
              <span className="rounded-md bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                онцгой
              </span>
            )}
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                p.active
                  ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {p.active ? "Идэвхтэй" : "Идэвхгүй"}
            </span>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-3">
          <p
            className={cn(
              "text-3xl font-semibold tabular-nums",
              !p.active && "text-muted-foreground",
            )}
          >
            {effect(p)}
          </p>

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Багц</dt>
              <dd className="min-w-0 truncate text-right">{scope(p)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Хугацаа</dt>
              <dd className="text-right">{periodText(p)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Хаана</dt>
              <dd className="text-right">{channelText(p.channels)}</dd>
            </div>
          </dl>
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-3 border-t pt-3">
          <p className="text-muted-foreground text-xs tabular-nums">
            {p.stats.uses
              ? `${p.stats.uses} удаа · ${p.stats.members} хүн · ${
                  p.kind === "bonus_days"
                    ? `${p.stats.totalValue} хоног`
                    : money(p.stats.totalValue)
                }`
              : "Хараахан ашиглаагүй"}
          </p>
          {admin && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={p.active ? "outline" : "default"}
                className="flex-1"
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
              {/* Ашигласан урамшууллыг устгахгүй — статистик нь эзэнгүй
                  болно. Тиймээс товч нь ч гарахгүй. */}
              {!p.active && p.stats.uses === 0 && (
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
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Урамшуулал"
        description="Хөнгөлөлт, бэлэг — багц бүрд чиглүүлж болно"
      >
        {admin && (
          <Button onClick={openNew}>
            <Plus className="size-4" />
            Шинэ урамшуулал
          </Button>
        )}
      </PageHeader>

      {/* ── Үзүүлэлт ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Идэвхтэй урамшуулал"
          value={live.length}
          suffix={promos.length ? `/ ${promos.length}` : undefined}
          sub={
            exclusive
              ? `«${exclusive.name}» онцгой — бусад нь тооцогдохгүй`
              : live.length > 1
                ? "Багцад нь тохирсон нь бүгд давхарлана"
                : "Багцууд энгийн үнээрээ зарагдана"
          }
        />
        <StatCard
          label="Нийт хөнгөлсөн"
          value={money(totals.value)}
          sub={
            totals.uses
              ? `${totals.uses} удаа${totals.days ? ` · ${totals.days} хоног бэлэглэсэн` : ""}`
              : "Хараахан ашиглаагүй"
          }
        />
        <StatCard
          label="Хөнгөлөлтийн дээд хязгаар"
          value={`${maxPct}%`}
          sub="Давхарласан хөнгөлөлт үүнээс хэтрэхгүй"
          footL={admin ? "Дарж өөрчилнө" : undefined}
          onClick={
            admin
              ? () => {
                  setCap(String(maxPct));
                  setCapOpen(true);
                }
              : undefined
          }
        />
      </div>

      {/* ── Шүүлтүүр ── */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: `Бүх төлөв (${promos.length})` },
            {
              value: "active",
              label: `Идэвхтэй (${live.length})`,
              dot: "bg-emerald-500",
            },
            {
              value: "idle",
              label: `Идэвхгүй (${idle.length})`,
              dot: "bg-muted-foreground",
            },
          ]}
          placeholder="Төлөв"
        />
      </div>

      {/* ── Жагсаалт: НЭГ grid, төлөвийг шошгоор ялгана ── */}
      {shown.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <PromoCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              icon={Percent}
              title={
                promos.length
                  ? "Энэ шүүлтүүрт таарах урамшуулал алга"
                  : "Урамшуулал үүсгээгүй байна"
              }
              hint={
                promos.length
                  ? "Шүүлтүүрээ «Бүх төлөв» болгож бүгдийг харна уу."
                  : "Багцууд энгийн үнээрээ зарагдаж байна. Урамшуулал үүсгээд идэвхжүүлснээр нүүр хуудас болон төлбөрийн дэлгэцэд шууд тусна."
              }
              action={
                admin && !promos.length ? (
                  <Button size="sm" onClick={openNew}>
                    <Plus className="size-3.5" />
                    Шинэ урамшуулал
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-xs">
        Идэвхтэй урамшууллуудаас <strong>багцад нь тохирсон</strong> нь бүгд
        давхарлана. Хөнгөлөлт бүрийг <strong>анхны үнээс</strong> тооцоод
        нийлбэрээр хасна; нийт дүн дээд хязгаараас хэтрэхгүй.{" "}
        <strong>Онцгой</strong> гэж тэмдэглэсэн урамшуулал тохирвол зөвхөн тэр
        үйлчилнэ. Аль хэдийн үүссэн нэхэмжлэх хуучин үнээрээ үлдэнэ.
      </p>

      {/* ── Дээд хязгаар ── */}
      <Dialog open={capOpen} onOpenChange={setCapOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Хөнгөлөлтийн дээд хязгаар</DialogTitle>
            <DialogDescription>
              Давхарласан урамшууллын нийт хөнгөлөлт багцын үнийн энэ хувиас
              хэтрэхгүй. Санамсаргүй давхцалаас болж багц бараг үнэгүй
              зарагдахаас сэргийлнэ — <strong>ганц</strong> урамшуулалд ч
              үйлчилнэ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cap">Дээд хязгаар (%)</Label>
            <Input
              id="cap"
              inputMode="numeric"
              className="w-24"
              value={cap}
              onChange={(e) =>
                setCap(e.target.value.replace(/\D/g, "").slice(0, 3))
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCapOpen(false)}
              disabled={busy !== null}
            >
              Болих
            </Button>
            <Button
              onClick={saveCap}
              disabled={
                busy !== null ||
                cap === "" ||
                Number(cap) > 100 ||
                Number(cap) === maxPct
              }
            >
              {busy === "cap" && <Loader2 className="size-4 animate-spin" />}
              Хадгалах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Үүсгэх / засах ── */}
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
                    exclusive: kind === "fixed_price" ? true : form.exclusive,
                  });
                }}
              >
                <SelectTrigger id="pk">
                  {/* Base UI нь ТҮҮХИЙ утга дамжуулдаг тул шошгыг
                      өөрсдөө гаргана. */}
                  <SelectValue>{kindLabel(form.kind)}</SelectValue>
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
              Хоосон = хязгааргүй. <strong>Дуусах өдөр нь ОРНО</strong> — тухайн
              өдрийн 23:59 хүртэл үйлчилнэ. Огноо нь идэвхжүүлэлтээс ТУСДАА:
              идэвхтэй ч огноо нь ирээгүй бол үйлчлэхгүй.
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
                  ИХ нь түрүүлж хэрэглэгдэнэ. Нийт хөнгөлөлт {maxPct}%-д хүрэхэд
                  үлдсэн нь таслагдах тул «аль нь бүтнээрээ орох вэ» гэдгийг энэ
                  шийднэ.
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
