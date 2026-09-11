"use client";

import { Gift, Loader2, Plus, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

  const label = (s: Status) =>
    data?.statuses.find((x) => x.value === s)?.label ?? s;

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
          <CardContent>
            <code className="bg-muted block truncate rounded px-3 py-2 text-xs">
              {data.enrollUrl}
            </code>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Картууд</CardTitle>
          <CardDescription>
            Хүлээн авагч Wallet-даа авмагц «Wallet шалгах» дарж холбоно. Ресепшн
            дээр уншуулаад эрхийг <strong>гараар</strong> сунгасны дараа
            «Ашигласан» гэж тэмдэглэнэ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {data?.cards.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5 text-sm"
            >
              <Gift className="text-muted-foreground size-4 shrink-0" />
              <span className="font-medium">{c.recipientName}</span>
              <span className="text-muted-foreground font-mono text-xs">
                {fmtPhone(c.recipientPhone)}
              </span>
              <span className="font-semibold tabular-nums">
                {money(c.amount)}
              </span>
              {c.buyerName && (
                <span className="text-muted-foreground text-xs">
                  {c.buyerName}-оос
                </span>
              )}
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  TONE[c.status],
                )}
              >
                {label(c.status)}
              </span>
              <span className="text-muted-foreground ml-auto shrink-0 font-mono text-xs">
                {c.usedAt ? dateTime(c.usedAt) : dateTime(c.issuedAt)}
              </span>
              {c.status === "enrolled" && can("reception") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => act(c.id, "use")}
                  disabled={busy !== null}
                >
                  {busy === c.id && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
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
          ))}
          {data?.cards.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Бэлгийн карт үүсгээгүй байна.
            </p>
          )}
        </CardContent>
      </Card>

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
