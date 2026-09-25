'use client';

import { HandCoins, Loader2, Undo2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorToast } from '@/lib/errors';
import { date, money } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Гишүүний дэлгэц дэх худалдан авалтын мөр (тэндхийн төрлийн дэд хэсэг). */
export interface UnpaidRow {
  id: string;
  packageName: string | null;
  days: number;
  amount: number;
  endsAt: string;
  paidAt: string | null;
  reversedAt: string | null;
  createdAt: string;
}

/** Хуанлийн өдрөөр — цагийн зөрүүгээр биш. */
function daysAgo(iso: string): number {
  const day = (d: Date): number =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  // ⚠ `toLocaleDateString`-оор УБ-ийн огноо болгоно: браузер өөр цагийн
  // бүсэд байвал «өчигдөр» нь «өнөөдөр» болж харагдана.
  const ub = (v: Date): Date =>
    new Date(v.toLocaleString('en-US', { timeZone: 'Asia/Ulaanbaatar' }));
  return Math.max(0, Math.round((day(ub(new Date())) - day(ub(new Date(iso)))) / 86_400_000));
}

const ago = (n: number): string =>
  n === 0 ? 'өнөөдөр' : n === 1 ? 'өчигдөр' : `${n} хоногийн өмнө`;

/**
 * ГИШҮҮНИЙ АВЛАГА — профайлын дээд хэсэгт.
 *
 * ★ ЯАГААД ЭНД ВЭ
 *
 * Нүүр дэлгэцийн авлагын жагсаалтаас товшвол энэ профайл руу орно.
 * Тэгээд ажилтан юу хийх вэ? Худалдан авалтын дэвтэр нь хуудасны ДООД
 * талд, тэндээс «аль мөр нь төлөгдөөгүй вэ» гэдгийг ялгах ч арга
 * байгаагүй. Өөрөөр хэлбэл жагсаалт нь хүн рүү хөтөлдөг ч тэнд
 * ХИЙХ ЮМ байхгүй байлаа.
 *
 * ★ ХОЁР ҮЙЛДЭЛ — ТЭС ӨӨР ҮР ДАГАВАРТАЙ
 *
 * • «Төлбөр авлаа» — мөнгө ирсэн. Эрх ХЭВЭЭР, орлогод бүртгэгдэнэ.
 *
 * • «Авлагыг цуцлах» — худалдан авалтыг БУЦААНА. ⚠ Энэ нь өрийг
 *   уучлах биш: эрхийн хоног мөн ХАСАГДАНА (`recompute` нь дэвтрээс
 *   дахин тооцно) ба гишүүн тэр хугацаагаар заалаар орж чадахгүй
 *   болно. Мөнгө аваагүй атлаа эрхийг үлдээх нь бэлэг — тийм
 *   сонголт ЗОРИУДААР байхгүй: тэгвэл кассын тайлан «зарсан ч
 *   төлөгдөөгүй» мөнгийг мөнхөд авлага гэж тоолсоор байна.
 *
 * Тиймээс баталгаажуулах цонх нь ЯГ ЮУ болохыг бичнэ, шалтгаан
 * шаардана — аудитад тэр үлдэнэ.
 */
export function MemberReceivable({
  rows,
  onDone,
}: {
  /** Гишүүний БҮХ худалдан авалт — шүүлтийг энэ доторх хийнэ. */
  rows: UnpaidRow[];
  onDone: () => void;
}) {
  const { can } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [cancel, setCancel] = useState<UnpaidRow | null>(null);
  const [reason, setReason] = useState('');

  /*
   * ⚠ `amount > 0` шалгана. Чөлөө, бэлгийн 0₮ мөр нь `paid_at = null`
   * байж болох ч тэдгээр нь «төлөөгүй» биш, ТӨЛӨХ ЮМ БАЙХГҮЙ.
   * Авлагад тоолбол профайл бүр улаан анхааруулгатай болно.
   */
  const unpaid = rows.filter(
    (r) => r.paidAt === null && r.reversedAt === null && r.amount > 0,
  );
  if (unpaid.length === 0) return null;

  const owed = unpaid.reduce((a, b) => a + b.amount, 0);
  // Хамгийн ЭРТ өр — «хэр удсан» гэдгийг тэрээр хэмжинэ.
  const oldest = unpaid.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
  const age = daysAgo(oldest.createdAt);

  async function pay(r: UnpaidRow) {
    setBusy(r.id);
    try {
      const res = await api.post<{ alreadyPaid: boolean }>(
        `/memberships/${r.id}/pay`,
        {},
      );
      toast.success(
        res.alreadyPaid ? 'Аль хэдийн төлөгдсөн байсан' : `${money(r.amount)} хүлээн авав`,
      );
      onDone();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  async function doCancel() {
    // ⚠ Backend нь `@MinLength(3)` — эндээс ч ижил хязгаар тавина,
    // эс бөгөөс ажилтан «уу» гэж бичээд ойлгомжгүй 400 алдаа авна.
    if (!cancel || reason.trim().length < 3) return;
    setBusy(cancel.id);
    try {
      await api.post(`/memberships/${cancel.id}/reverse`, {
        reason: reason.trim(),
      });
      toast.success('Худалдан авалт буцаагдлаа', {
        description: 'Эрхийн хугацаа дахин тооцоологдож, терминал руу бичигдэнэ',
      });
      setCancel(null);
      setReason('');
      onDone();
    } catch (e) {
      errorToast(e, 'Буцаагдсангүй');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div
        className={cn(
          'rounded-lg border px-4 py-3',
          // 30 хоногоос хэтэрсэн өр нь «мартагдсан» — тод улаан.
          age >= 30
            ? 'border-destructive/40 bg-destructive/8'
            : 'border-amber-500/40 bg-amber-500/8',
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <HandCoins
            className={cn(
              'size-4 shrink-0',
              age >= 30 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400',
            )}
          />
          <p className="text-sm font-medium">
            Авлага{' '}
            <span
              className={cn(
                'tabular-nums',
                age >= 30 ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
              )}
            >
              {money(owed)}
            </span>
          </p>
          <span className="text-muted-foreground text-xs">
            {unpaid.length > 1 && `${unpaid.length} мөр · `}
            хамгийн эрт нь {ago(age)}
          </span>
        </div>

        {/*
          Мөр бүрийг ТУСАД нь — гишүүн 2 удаа «дараа төлье» гэсэн бол
          нэгийг нь авч, нөгөөг нь цуцлах шаардлага гарч болно.
        */}
        <ul className="mt-2.5 space-y-1.5">
          {unpaid.map((r) => (
            <li
              key={r.id}
              className="bg-background/60 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  {r.packageName ?? `${r.days} хоног (гараар)`}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {date(r.createdAt)}-нд зарсан · {date(r.endsAt)} хүртэл ·{' '}
                  {ago(daysAgo(r.createdAt))}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {money(r.amount)}
              </span>
              <Button
                size="sm"
                onClick={() => void pay(r)}
                disabled={busy !== null}
                className="shrink-0"
              >
                {busy === r.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Wallet className="size-3.5" />
                )}
                Төлбөр авлаа
              </Button>
              {/*
                ⚠ ЗӨВХӨН МЕНЕЖЕР. Буцаалт нь эрхийг хасдаг тул ресепшн
                андуурч дарвал гишүүн хаалганаас гарцаагүй буцаагдана.
                (Backend ч `@Roles(MANAGER)`-оор хамгаалсан — энд нуух
                нь зөвхөн ойлгомжтой байхын тулд.)
              */}
              {can('manager') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCancel(r);
                    setReason('');
                  }}
                  disabled={busy !== null}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  <Undo2 className="size-3.5" />
                  Цуцлах
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <AlertDialog
        open={cancel !== null}
        onOpenChange={(o) => !o && setCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancel && money(cancel.amount)}-ийн авлагыг цуцлах уу?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancel?.packageName ?? `${cancel?.days} хоног`} —{' '}
              {cancel && date(cancel.createdAt)}-нд зарсан.
              <br />
              <br />
              <strong>⚠ Өр арилахаас гадна ЭРХ нь ч хасагдана.</strong> Энэ
              худалдан авалтын {cancel?.days} хоног дэвтрээс гарч, гишүүний
              нэвтрэх хугацаа богиносно. Терминал руу шинэ хугацаа бичигдэнэ.
              <br />
              <br />
              Мөнгө аваагүй атлаа эрхийг үлдээх бол оронд нь{' '}
              <strong>«Төлбөр авлаа»</strong> биш, менежерээс 0₮-ийн бэлэг
              болгон дахин сунгана уу.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rv-reason">Шалтгаан</Label>
            <Input
              id="rv-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Төлөхөөс татгалзсан, андуурч зарсан…"
              minLength={3}
              autoFocus
            />
            <p className="text-muted-foreground text-xs">
              Аудитад бичигдэнэ. Маргаан гарвал хэн, юуны учир цуцалсныг
              тайлбарлана.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void doCancel();
              }}
              disabled={busy !== null || reason.trim().length < 3}
              variant="destructive"
            >
              {busy !== null && <Loader2 className="size-4 animate-spin" />}
              Тийм, цуцал
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
