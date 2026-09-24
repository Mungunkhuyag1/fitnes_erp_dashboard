'use client';

import { ArrowRight, Bell, KeyRound, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { errorToast } from '@/lib/errors';
import { dateTime, money } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Нэг түлхүүрийн олголтын дэлгэрэнгүй.
 *
 * ★ ЯАГААД НИЙТЛЭГ БҮРДЭЛ ВЭ
 *
 * Шүүгээ ХОЁР газар харагдана: самбарын доорх «гарсан түлхүүр»
 * жагсаалт ба «Түүх» табын хүснэгт. Хоёулангийнх нь ард ижил
 * асуултууд байдаг — хэн авсан, хэзээ, хэр удсан, сануулга илгээх үү,
 * тэр хүн рүү очих уу. Тусад нь бичвэл аль нэг нь л шинэчлэгдэнэ.
 *
 * ★ ЯАГААД ДАХИН ТАТАХГҮЙ ВЭ
 *
 * Олголтод тусдаа `GET /:id` байхгүй бөгөөд хэрэггүй ч: дуудагч тал
 * харуулах БҮХ утгыг аль хэдийн агуулж байгаа. Зөвхөн өргөнд
 * багтахгүй тул жагсаалт дээр нуугддаг.
 */
export interface LockerDetailData {
  /** Сануулга илгээхэд шаардлагатай. Байхгүй бол товч харагдахгүй. */
  assignmentId: string | null;
  zone: string;
  number: number;
  type: 'daily' | 'rental' | null;
  memberId: string | null;
  memberName: string | null;
  memberNo: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  amount: number | null;
  overdue: boolean;
  note: string | null;
}

/** «3 цаг 20 мин» — түлхүүр хэр удаан гарсан бэ. */
export function duration(fromIso: string, toIso: string | null): string {
  const min = Math.max(
    0,
    Math.round(
      ((toIso ? new Date(toIso).getTime() : Date.now()) -
        new Date(fromIso).getTime()) /
        60_000,
    ),
  );
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} ц ${min % 60} мин` : `${h} цаг`;
  return `${Math.floor(h / 24)} хоног`;
}

export function LockerDetail({
  row,
  onClose,
  onReturn,
  onDone,
  canRemind,
}: {
  row: LockerDetailData | null;
  onClose: () => void;
  /** Байвал «Буцаах» товч гарна — самбар дээрээс. */
  onReturn?: (row: LockerDetailData) => void;
  /** Сануулга илгээсний дараа жагсаалтыг шинэчлэх. */
  onDone?: () => void;
  canRemind: boolean;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  if (!row) return null;

  const out = !row.returnedAt;

  async function remind() {
    if (!row?.assignmentId) return;
    setSending(true);
    try {
      const r = await api.post<{ queued: boolean; reason?: string }>(
        `/locker-assignments/${row.assignmentId}/remind`,
      );
      if (r.queued) {
        toast.success(`${row.memberName ?? 'Гишүүн'} рүү сануулга илгээв`, {
          description: `${row.zone} №${row.number} шүүгээ`,
        });
      } else {
        // Картгүй гишүүнд push хүрэх газар байхгүй — залгах хэрэгтэй.
        toast.warning('Илгээгдсэнгүй', { description: r.reason });
      }
      onDone?.();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      {/*
        ⚠ Анхдагч `sm:max-w-sm` (384px) нь ГУРВАН товчийг багтаадаггүй:
        «Сануулах» + «Буцаах» + «Гишүүн рүү очих» нь хамтдаа ~390px
        бөгөөд цонхны хүрээнээс халина.
      */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="text-muted-foreground size-4" />
            {row.zone} №{row.number}
          </DialogTitle>
          <DialogDescription>
            {row.type === 'daily'
              ? 'Өдрийн түлхүүр'
              : row.type === 'rental'
                ? 'Түрээс'
                : 'Олголт'}{' '}
            · {out ? 'гарсан хэвээр' : 'буцаагдсан'}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground text-xs">Гишүүн</dt>
          <dd>
            {row.memberName ?? '—'}
            {row.memberNo && (
              <span className="text-muted-foreground ml-1.5 text-xs">
                №{row.memberNo}
              </span>
            )}
          </dd>

          {row.issuedAt && (
            <>
              <dt className="text-muted-foreground text-xs">Олгосон</dt>
              <dd className="font-mono text-xs">{dateTime(row.issuedAt)}</dd>

              <dt className="text-muted-foreground text-xs">
                {out ? 'Гарснаас хойш' : 'Гарсан хугацаа'}
              </dt>
              <dd>{duration(row.issuedAt, row.returnedAt)}</dd>
            </>
          )}

          {row.dueAt && (
            <>
              <dt className="text-muted-foreground text-xs">Буцаах ёстой</dt>
              <dd
                className={cn(
                  'font-mono text-xs',
                  row.overdue && 'text-destructive',
                )}
              >
                {dateTime(row.dueAt)}
                {row.overdue && ' · хэтэрсэн'}
              </dd>
            </>
          )}

          {row.returnedAt && (
            <>
              <dt className="text-muted-foreground text-xs">Буцаасан</dt>
              <dd className="font-mono text-xs">{dateTime(row.returnedAt)}</dd>
            </>
          )}

          {row.amount !== null && row.amount > 0 && (
            <>
              <dt className="text-muted-foreground text-xs">Дүн</dt>
              <dd className="tabular-nums">{money(row.amount)}</dd>
            </>
          )}

          {row.note && (
            <>
              <dt className="text-muted-foreground text-xs">Тэмдэглэл</dt>
              <dd className="break-words">{row.note}</dd>
            </>
          )}
        </dl>

        {/*
          ⚠ `flex-wrap` — товчны тоо нөхцөлөөс хамаарч 1-3 болж
          өөрчлөгддөг тул хамгийн өргөн хувилбар нь багтахгүй байж
          болно. Мөр таслах нь халихаас дээр.
        */}
        <DialogFooter className="flex-wrap">
          {/*
            ⚠ Сануулга зөвхөн ГАРСАН хэвээр байгаа түлхүүрт. Буцаагдсаны
            дараа илгээх нь утгагүй бөгөөд гишүүнийг төөрөгдүүлнэ.
          */}
          {out && canRemind && row.assignmentId && (
            <Button variant="outline" disabled={sending} onClick={remind}>
              <Bell className="size-4" />
              Сануулах
            </Button>
          )}
          {out && onReturn && (
            <Button variant="outline" onClick={() => onReturn(row)}>
              <RotateCcw className="size-4" />
              Буцаах
            </Button>
          )}
          {row.memberId && (
            <Button onClick={() => router.push(`/members/${row.memberId}`)}>
              Гишүүн рүү очих
              <ArrowRight className="size-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
