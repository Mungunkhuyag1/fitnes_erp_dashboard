"use client";

import { Loader2, Pencil, Plus, Power } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
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
import { useApi } from "@/hooks/use-api";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Page } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

type Audience = "standard" | "student" | "senior" | "resident" | "couple";

interface Pkg {
  id: string;
  name: string;
  days: number;
  price: number;
  audience: Audience;
  audienceLabel: string;
  requiresProof: boolean;
  firstTimeOnly: boolean;
  seats: number;
  online: boolean;
  active: boolean;
  sortOrder: number;
}

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: "standard", label: "Энгийн" },
  { value: "student", label: "Оюутан, сурагч" },
  { value: "senior", label: "Ахмад настан" },
  { value: "resident", label: "Хотхоны оршин суугч" },
  { value: "couple", label: "Хосын багц" },
];

export default function PackagesPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi<Page<Pkg>>(
    `/packages?page=${page}&limit=20`,
  );

  const [editing, setEditing] = useState<Pkg | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    days: "",
    price: "",
    sortOrder: "",
    audience: "standard" as Audience,
    requiresProof: false,
    firstTimeOnly: false,
    seats: 1,
    online: true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openCreate() {
    setForm({
      name: "",
      days: "30",
      price: "",
      sortOrder: "",
      audience: "standard",
      requiresProof: false,
      firstTimeOnly: false,
      seats: 1,
      online: true,
    });
    setErr(null);
    setCreating(true);
  }

  function openEdit(p: Pkg) {
    setForm({
      name: p.name,
      days: String(p.days),
      price: String(p.price),
      sortOrder: String(p.sortOrder),
      audience: p.audience,
      requiresProof: p.requiresProof,
      firstTimeOnly: p.firstTimeOnly,
      seats: p.seats,
      online: p.online,
    });
    setErr(null);
    setEditing(p);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const body = {
      name: form.name,
      days: Number(form.days),
      price: Number(form.price || 0),
      sortOrder: Number(form.sortOrder || 0),
      audience: form.audience,
      requiresProof: form.requiresProof,
      firstTimeOnly: form.firstTimeOnly,
      seats: form.seats,
      online: form.online,
    };
    try {
      if (editing) await api.patch(`/packages/${editing.id}`, body);
      else await api.post("/packages", body);
      toast.success(editing ? "Багц шинэчлэгдлээ" : "Багц үүслээ");
      setEditing(null);
      setCreating(false);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: Pkg) {
    try {
      if (p.active) await api.del(`/packages/${p.id}`);
      else await api.patch(`/packages/${p.id}`, { active: true });
      toast.success(p.active ? "Идэвхгүй болголоо" : "Идэвхжүүллээ");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа");
    }
  }

  const columns: Column<Pkg>[] = [
    {
      key: "name",
      header: "Нэр",
      cell: (p) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn("font-medium", !p.active && "text-muted-foreground")}
          >
            {p.name}
          </span>
          {p.firstTimeOnly && <Flag tone="accent">анх удаа</Flag>}
          {p.requiresProof && <Flag tone="warn">баримт</Flag>}
          {p.seats > 1 && <Flag>{p.seats} хүн</Flag>}
          {!p.online && <Flag>зөвхөн ресепшн</Flag>}
        </div>
      ),
    },
    {
      key: "audience",
      header: "Хэнд",
      cell: (p) => (
        <span
          className={cn(
            "text-sm",
            p.audience === "standard" && "text-muted-foreground",
          )}
        >
          {p.audienceLabel}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "days",
      header: "Хугацаа",
      cell: (p) => (
        <span className="font-mono text-sm tabular-nums">{p.days} хоног</span>
      ),
    },
    {
      key: "price",
      header: "Үнэ",
      cell: (p) => <span className="text-sm">{money(p.price)}</span>,
    },
    {
      key: "perday",
      header: "Хоногт",
      cell: (p) => (
        <span className="text-muted-foreground text-sm">
          {money(Math.round(p.price / p.days))}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "active",
      header: "Төлөв",
      cell: (p) =>
        p.active ? (
          <span className="rounded-md bg-emerald-500/12 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Идэвхтэй
          </span>
        ) : (
          <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
            Идэвхгүй
          </span>
        ),
    },
    {
      key: "act",
      header: "",
      cell: (p) =>
        can("manager") ? (
          <div className="flex justify-end gap-1">
            <Button size="icon-sm" variant="ghost" onClick={() => openEdit(p)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => toggleActive(p)}
            >
              <Power className="size-3.5" />
            </Button>
          </div>
        ) : null,
      className: "text-right",
    },
  ];

  const open = creating || !!editing;

  return (
    // `h-full` — хуудас дэлгэцийг ЯГ дүүргэнэ. Ингэснээр гадна талд
    // гүйх зүйл үлдэхгүй, зөвхөн хүснэгтийн бие дотроо гүйнэ.
    <div className="flex h-full flex-col gap-5">
      <PageHeader title="Багц" description="Гишүүнчлэлийн хугацаа ба үнэ">
        {can("manager") && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Багц нэмэх
          </Button>
        )}
      </PageHeader>

      <DataTable
        fill
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        rowKey={(p) => p.id}
        emptyText="Багц бүртгэгдээгүй"
        onPageChange={setPage}
      />

      <p className="text-muted-foreground text-xs">
        Багцын үнэ/хугацааг өөрчлөхөд <strong>аль хэдийн зарагдсан</strong>{" "}
        гишүүнчлэл хөндөгдөхгүй — худалдан авалтын дэвтэрт тухайн үеийн утга
        хуулбарлагдсан байдаг. Устгахын оронд идэвхгүй болгоно.
      </p>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Багц засах" : "Шинэ багц"}</DialogTitle>
            <DialogDescription>
              Зөвхөн хугацаа — цагийн хязгаар байхгүй
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pname">Нэр</Label>
              <Input
                id="pname"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="1 сарын багц"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pdays">Хоног</Label>
                <Input
                  id="pdays"
                  inputMode="numeric"
                  value={form.days}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      days: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pprice">Үнэ (₮)</Label>
                <Input
                  id="pprice"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paud">Хэнд зориулсан</Label>
              <Select
                value={form.audience}
                onValueChange={(v) => {
                  const a = v as Audience;
                  // Ангилал нь бусад талбарын БОДИТ анхдагчийг тодорхойлно —
                  // хосын багц 2 суудалтай, хөнгөлөлттэй нь баримт шаардана.
                  setForm({
                    ...form,
                    audience: a,
                    requiresProof: a !== "standard" && a !== "couple",
                    seats: a === "couple" ? 2 : 1,
                    online: a !== "couple",
                  });
                }}
              >
                <SelectTrigger id="paud">
                  {/*
                    Base UI нь `SelectValue`-д ТҮҮХИЙ утгыг дамжуулдаг тул
                    шошгыг өөрсдөө гаргана — эс бөгөөс «couple» гэж
                    харагдана (`filter-select.tsx`-д ижил тэмдэглэгээ бий).
                  */}
                  <SelectValue>
                    {AUDIENCES.find((a) => a.value === form.audience)?.label ??
                      form.audience}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <Label className="flex items-start gap-2.5 font-normal">
                <Checkbox
                  checked={form.requiresProof}
                  onCheckedChange={(c) =>
                    setForm({ ...form, requiresProof: c === true })
                  }
                  className="mt-0.5"
                />
                <span>
                  Баримт шалгана
                  <span className="text-muted-foreground block text-xs">
                    Онлайнаар төлсөн ч эрх автоматаар нээгдэхгүй — ресепшн дээр
                    үнэмлэх үзүүлж, ажилтан гараар нээнэ.
                  </span>
                </span>
              </Label>

              <Label className="flex items-start gap-2.5 font-normal">
                <Checkbox
                  checked={form.firstTimeOnly}
                  onCheckedChange={(c) =>
                    setForm({ ...form, firstTimeOnly: c === true })
                  }
                  className="mt-0.5"
                />
                <span>
                  Зөвхөн анх удаа
                  <span className="text-muted-foreground block text-xs">
                    Өмнө нь эрх авсан гишүүн энэ багцыг сонгож чадахгүй.
                  </span>
                </span>
              </Label>

              <Label className="flex items-start gap-2.5 font-normal">
                <Checkbox
                  checked={form.online}
                  onCheckedChange={(c) =>
                    setForm({ ...form, online: c === true })
                  }
                  className="mt-0.5"
                />
                <span>
                  Онлайнаар зарагдана
                  <span className="text-muted-foreground block text-xs">
                    Унтраавал зөвхөн ресепшнээс зарагдана.
                  </span>
                </span>
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pseats">Хэдэн хүний эрх</Label>
              <Input
                id="pseats"
                inputMode="numeric"
                className="w-24"
                value={String(form.seats)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    seats: Math.min(
                      2,
                      Math.max(1, Number(e.target.value) || 1),
                    ),
                  })
                }
              />
              <p className="text-muted-foreground text-xs">
                Хосын багц 2, бусад нь 1.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="psort">Дараалал</Label>
              <Input
                id="psort"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sortOrder: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="0"
              />
              <p className="text-muted-foreground text-xs">
                Бага нь эхэнд харагдана
              </p>
            </div>

            {err && (
              <p className="text-destructive bg-destructive/8 rounded-md px-3 py-2 text-sm">
                {err}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
              disabled={busy}
            >
              Цуцлах
            </Button>
            <Button
              onClick={save}
              disabled={busy || !form.name.trim() || Number(form.days) < 1}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Хадгалах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Багцын нөхцөлийг товч тэмдэглэнэ. */
function Flag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "accent" | "warn";
}) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium",
        tone === "accent" && "bg-primary/10 text-primary",
        tone === "warn" && "bg-amber-500/12 text-amber-700 dark:text-amber-400",
        !tone && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
