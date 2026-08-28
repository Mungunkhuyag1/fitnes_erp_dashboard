"use client";

import { BadgeCheck, Loader2 } from "lucide-react";
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
import { useAuth } from "@/lib/auth";
import { dateTime, money } from "@/lib/format";

interface Awaiting {
  id: string;
  memberId: string;
  memberName: string | null;
  memberNo: number | null;
  packageName: string;
  amount: number;
  paidAt: string | null;
}

/**
 * Баримт шалгуулахаар хүлээж буй төлбөрүүд.
 *
 * ★ ЯАГААД ЭНЭ ДЭЛГЭЦ ЗААВАЛ ХЭРЭГТЭЙ ВЭ
 *
 * Хөнгөлөлттэй багц онлайнаар төлөгдсөн ч эрх нь нээгдээгүй байна.
 * Хэрэглэгч мөнгөө өгчихөөд зааланд орж чадахгүй байгаа — хэн нэгэн
 * үүнийг ХАРААГҮЙ бол тэр хүн шууд гомдол болно. Тиймээс жагсаалт нь
 * хоосон үедээ огт харагдахгүй, гарч ирвэл анхаарал татна.
 */
export function AwaitingApprovalCard() {
  const { can } = useAuth();
  const { data, reload } = useApi<Awaiting[]>("/invoices/awaiting-approval", {
    refreshMs: 60_000,
  });
  const [pending, setPending] = useState<Awaiting | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function approve() {
    if (!pending) return;
    setBusy(true);
    try {
      await api.post(`/invoices/${pending.id}/approve`, { note });
      toast.success(`${pending.memberName ?? "Гишүүн"} — эрх нээгдлээ`);
      setPending(null);
      setNote("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Батлаж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  // Хоосон бол огт харагдахгүй — ажилтны дэлгэцийг чимээгүй байлгана.
  if (!data || data.length === 0) return null;

  return (
    <>
      <Card className="border-amber-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BadgeCheck className="size-4 text-amber-500" />
            Баримт шалгуулахаар хүлээж буй
            <span className="text-amber-600 tabular-nums dark:text-amber-400">
              {data.length}
            </span>
          </CardTitle>
          <CardDescription>
            Хөнгөлөлттэй багц төлөгдсөн ч эрх нээгдээгүй. Гишүүн ирж үнэмлэхээ
            үзүүлмэгц баталж, эрхийг нээнэ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {data.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5 text-sm"
            >
              <span className="text-muted-foreground shrink-0 font-mono text-xs">
                №{r.memberNo ?? "—"}
              </span>
              <span className="min-w-0 truncate font-medium">
                {r.memberName ?? "—"}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {r.packageName}
              </span>
              <span className="ml-auto shrink-0 tabular-nums">
                {money(r.amount)}
              </span>
              {r.paidAt && (
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  {dateTime(r.paidAt)}
                </span>
              )}
              {can("reception") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => {
                    setPending(r);
                    setNote("");
                  }}
                >
                  Баталж нээх
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.memberName} — эрхийг нээх үү?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.packageName} · {pending && money(pending.amount)}.
              Баримтыг нүдээр шалгасны дараа л батална уу — хөнгөлөлт нь жинхэнэ
              эсэхийг систем шалгаж чадахгүй.
              <br />
              <br />
              Эрхийн хугацаа <strong>өнөөдрөөс</strong> эхэлнэ.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="note">Юу шалгасан бэ</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Оюутны үнэмлэх, ЩУТИС 2027"
            />
            <p className="text-muted-foreground text-xs">
              Аудитад бичигдэнэ. Маргаан гарвал хэн юуг харснаа тайлбарлана.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                approve();
              }}
              disabled={busy}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Баталж нээх
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
