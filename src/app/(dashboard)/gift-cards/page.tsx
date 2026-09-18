"use client";

import {
  Check,
  Copy,
  Gift,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/data-table";
import { FilterSelect } from "@/components/filter-select";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { dateTime, money, phone as fmtPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

type Status = "issued" | "enrolled" | "used" | "cancelled";

interface GiftRow {
  id: string;
  amount: number;
  recipientName: string;
  recipientPhone: string;
  buyerName: string | null;
  note: string | null;
  status: Status;
  loopyCardSerial: string | null;
  issuedAt: string;
  usedAt: string | null;
}

interface Data {
  ready: boolean;
  enrollUrl: string | null;
  cards: GiftRow[];
  statuses: { value: Status; label: string }[];
}

/** Шүүлтүүрийн өмнөх цэгийн өнгө — хүснэгтийн шошготой ижил утга. */
const DOT: Record<string, string> = {
  issued: "bg-amber-500",
  enrolled: "bg-primary",
  used: "bg-muted-foreground",
  cancelled: "bg-destructive",
};

const TONE: Record<Status, string> = {
  issued: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  enrolled: "bg-primary/10 text-primary",
  used: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function GiftCardsPage() {
  const { can } = useAuth();
  const { data, reload } = useApi<Data>("/gift-cards");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    recipientName: "",
    recipientPhone: "",
    buyerName: "",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  async function copyLink() {
    if (!data?.enrollUrl) return;
    await navigator.clipboard.writeText(data.enrollUrl);
    setCopied(true);
    toast.success("Холбоос хуулагдлаа");
    // Товчны төлөвийг буцаана — «хуулсан» гэж үүрд үлдэх нь эргэлзээ төрүүлнэ.
    setTimeout(() => setCopied(false), 2000);
  }

  const label = (s: Status) =>
    data?.statuses.find((x) => x.value === s)?.label ?? s;

  const cards = data?.cards ?? [];
  const needle = q.trim().toLowerCase();
  const shown = cards.filter(
    (c) =>
      (!status || c.status === status) &&
      (!needle ||
        c.recipientName.toLowerCase().includes(needle) ||
        c.recipientPhone.includes(needle) ||
        (c.buyerName ?? "").toLowerCase().includes(needle)),
  );

  /*
   * ⚠ Сервер тал хуудаслалтгүй (сүүлийн 200 карт) тул `Page` бүтцийг
   * ЭНД угсарна. Хүснэгт нь нэг хэлбэртэй өгөгдөл хүлээдэг бөгөөд
   * шүүлт нь клиент талд хийгдэж байгааг далдлах нь буруу байх байсан.
   */
  const page = data
    ? {
        items: shown,
        total: shown.length,
        page: 1,
        limit: shown.length || 1,
        totalPages: 1,
      }
    : null;

  const columns: Column<GiftRow>[] = [
    {
      key: "recipient",
      header: "Хүлээн авагч",
      cell: (c) => (
        <div className="flex items-center gap-2">
          <Gift className="text-muted-foreground size-4 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-medium">{c.recipientName}</p>
            <p className="text-muted-foreground font-mono text-xs">
              {fmtPhone(c.recipientPhone)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Дүн",
      cell: (c) => (
        <span className="font-medium tabular-nums">{money(c.amount)}</span>
      ),
    },
    {
      key: "buyer",
      header: "Бэлэглэсэн",
      cell: (c) => (
        <span className="text-muted-foreground text-sm">
          {c.buyerName ?? "—"}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Төлөв",
      cell: (c) => (
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            TONE[c.status],
          )}
        >
          {label(c.status)}
        </span>
      ),
    },
    {
      key: "at",
      header: "Огноо",
      cell: (c) => (
        <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          {c.usedAt ? dateTime(c.usedAt) : dateTime(c.issuedAt)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "act",
      header: "",
      cell: (c) => (
        <div className="flex justify-end gap-1">
          {c.status === "enrolled" && can("reception") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => act(c.id, "use")}
              disabled={busy !== null}
            >
              {busy === c.id && <Loader2 className="size-3.5 animate-spin" />}
              Ашигласан
            </Button>
          )}
          {(c.status === "issued" || c.status === "enrolled") &&
            can("manager") && (
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => act(c.id, "cancel")}
                disabled={busy !== null}
              >
                <XCircle className="size-3.5" />
              </Button>
            )}
        </div>
      ),
      className: "text-right",
    },
  ];

  async function create() {
    setBusy("create");
    try {
      await api.post("/gift-cards", {
        amount: Number(form.amount),
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim(),
        buyerName: form.buyerName.trim() || undefined,
      });
      toast.success("Бэлгийн карт үүслээ", {
        description: "Хүлээн авагч enroll линкээр Wallet-даа авна.",
      });
      setOpen(false);
      setForm({
        amount: "",
        recipientName: "",
        recipientPhone: "",
        buyerName: "",
      });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Үүсгэж чадсангүй");
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("sync");
    try {
      const r = await api.post<{ linked: number; checked: number }>(
        "/gift-cards/sync",
      );
      toast.success(
        r.linked
          ? `${r.linked} карт холбогдлоо`
          : "Шинээр Wallet-д авсан карт алга",
      );
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

  async function act(id: string, action: "use" | "cancel") {
    setBusy(id);
    try {
      await api.post(`/gift-cards/${id}/${action}`, {});
      toast.success(
        action === "use" ? "Ашигласан гэж тэмдэглэлээ" : "Цуцаллаа",
      );
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Бэлгийн карт" description="Loopy Wallet дээрх бэлэг">
        {can("manager") && (
          <>
            <Button variant="outline" onClick={sync} disabled={busy !== null}>
              {busy === "sync" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Wallet шалгах
            </Button>
            <Button onClick={() => setOpen(true)} disabled={!data?.ready}>
              <Plus className="size-4" />
              Шинэ карт
            </Button>
          </>
        )}
      </PageHeader>

      {data && !data.ready && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <strong>Бэлгийн картын программ сонгоогүй байна.</strong> Loopy дээр
          гишүүнчлэлийнхээс <strong>тусдаа</strong> программ үүсгээд Тохиргоо →
          Холболт хэсгээс сонгоно уу. Нэг программд хоёуланг нь багтаах гэвэл
          талбар, дизайн, хугацаа зөрчилдөнө.
        </p>
      )}

      {data?.enrollUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Бүртгэлийн холбоос</CardTitle>
            <CardDescription>
              Хүлээн авагчид илгээнэ — зөвшөөрөгдсөн дугаар л карт авч чадна.
            </CardDescription>
          </CardHeader>
          {/*
            ⚠ `min-w-0` ба `break-all` ХОЁУЛАА хэрэгтэй. Холбоос нь урт
            токонтой: `truncate` нь `white-space: nowrap` тавьдаг ба Card
            нь flex багана тул хүүхдийн `min-width: auto` дээр хайрцаг
            өөрөө сунаж, БҮХ хуудас дэлгэцээс хальж байв.
          */}
          <CardContent className="flex flex-wrap items-start gap-2">
            <code className="bg-muted min-w-0 flex-1 rounded px-3 py-2 text-xs break-all">
              {data.enrollUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              Хуулах
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Шүүлтүүр ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Нэр, утас, бэлэглэсэн хүн"
            className="pl-9"
          />
        </div>
        <FilterSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: `Бүх төлөв (${cards.length})` },
            ...(data?.statuses ?? []).map((st) => ({
              value: st.value,
              label: `${st.label} (${cards.filter((c) => c.status === st.value).length})`,
              dot: DOT[st.value],
            })),
          ]}
          placeholder="Төлөв"
        />
      </div>

      <DataTable
        data={page}
        columns={columns}
        loading={!data}
        rowKey={(c) => c.id}
        emptyText={
          cards.length
            ? "Энэ шүүлтүүрт таарах карт алга"
            : "Бэлгийн карт үүсгээгүй байна"
        }
        onPageChange={() => undefined}
      />

      <p className="text-muted-foreground text-xs">
        Хүлээн авагч Wallet-даа авмагц <strong>«Wallet шалгах»</strong> дарж
        холбоно. Ресепшн дээр уншуулаад эрхийг <strong>гараар</strong> сунгасны
        дараа «Ашигласан» гэж тэмдэглэнэ. Картын дуусах хугацааг Loopy дээр
        программд тохируулсанаар үйлчилнэ.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Шинэ бэлгийн карт</DialogTitle>
            <DialogDescription>
              Хүлээн авагчийн дугаарыг Loopy-гийн зөвшөөрөгдсөн жагсаалтад
              нэмнэ. <strong>Дугаар зөв байх нь чухал</strong> — карт нь хэнийх
              болохыг зөвхөн дугаараар таньдаг.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ga">Дүн (₮)</Label>
              <Input
                id="ga"
                inputMode="numeric"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="600000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gn">Хүлээн авагч</Label>
              <Input
                id="gn"
                value={form.recipientName}
                onChange={(e) =>
                  setForm({ ...form, recipientName: e.target.value })
                }
                placeholder="Болор"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gp">Утас</Label>
              <Input
                id="gp"
                inputMode="numeric"
                className="font-mono"
                value={form.recipientPhone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    recipientPhone: e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 8),
                  })
                }
                placeholder="99112233"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gb">Бэлэглэсэн хүн</Label>
              <Input
                id="gb"
                value={form.buyerName}
                onChange={(e) =>
                  setForm({ ...form, buyerName: e.target.value })
                }
                placeholder="Дорж"
              />
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
                busy !== null ||
                Number(form.amount) < 1000 ||
                form.recipientName.trim().length < 2 ||
                form.recipientPhone.length !== 8
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
