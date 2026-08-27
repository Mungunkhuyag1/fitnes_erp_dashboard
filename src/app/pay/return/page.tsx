'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PayHeader } from '@/components/pay-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { money } from '@/lib/format';

interface InvoiceStatus {
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  paidAt: string | null;
  packageName: string;
  days: number;
  amount: number;
  expiresAt: string;
}

/** Хэдэн секунд тутам шалгах. */
const POLL_MS = 5_000;
/**
 * Хамгийн ихдээ хэдэн удаа шалгах.
 *
 * Нэхэмжлэх 5 минутын дараа өөрөө хугацаа дуусдаг (invoice.scheduler).
 * Тиймээс 5 секунд × 72 ≈ 6 минут хүрэхэд шалгах утга үлдэхгүй —
 * төлбөр хийгдээгүй бол хуудас мөнхөд эргэлдэхгүй.
 */
const MAX_POLLS = 72;

function ReturnInner() {
  const params = useSearchParams();
  const invoiceId = params.get('invoice');

  const [inv, setInv] = useState<InvoiceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;

    /**
     * `setInterval` биш ДАВТАН `setTimeout`: хүсэлт удаашрахад дараагийнх
     * нь дээр овоорохгүй, мөн зогсоох нөхцөл нэг газар байна.
     */
    async function tick(): Promise<void> {
      try {
        const r = await api.anon.get<InvoiceStatus>(
          `/public/invoices/${invoiceId}`,
        );
        if (!alive) return;
        setInv(r);
        setError(null);
        // Эцсийн төлөвт хүрвэл давтахаа болино.
        if (r.status !== 'pending') return;
      } catch (e) {
        if (!alive) return;
        // Түр зуурын сүлжээний алдаа — давтсаар байна.
        setError(e instanceof Error ? e.message : 'Шалгаж чадсангүй');
      }
      if (++tries > MAX_POLLS) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(() => void tick(), POLL_MS);
    }

    // Эхний шалгалтыг ХҮЛЭЭЛГҮЙ — webhook ихэвчлэн аль хэдийн ирсэн байдаг
    // тул хэрэглэгч дэмий 5 секунд ширтэхгүй.
    void tick();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [invoiceId]);

  if (!invoiceId) {
    return (
      <State
        icon={<AlertTriangle className="text-destructive size-10" />}
        title="Нэхэмжлэх заагаагүй"
        text="Хаяг дутуу байна. Картаа дахин нээж «Эрх сунгах» дарна уу."
      />
    );
  }

  if (!inv && !error) {
    return (
      <State
        icon={<Loader2 className="text-muted-foreground size-10 animate-spin" />}
        title="Төлбөрийг шалгаж байна"
        text="Хэдхэн секунд хүлээнэ үү."
      />
    );
  }

  if (inv?.status === 'paid') {
    return (
      <State
        tone="ok"
        icon={<CheckCircle2 className="size-10 text-emerald-500" />}
        title="Төлбөр амжилттай"
        text={`${inv.packageName} — ${inv.days} хоног нэмэгдлээ. Терминал дээр шууд нэвтэрч болно.`}
        amount={inv.amount}
      />
    );
  }

  if (inv?.status === 'expired' || inv?.status === 'cancelled') {
    return (
      <State
        tone="bad"
        icon={<XCircle className="text-destructive size-10" />}
        title={
          inv.status === 'expired'
            ? 'Нэхэмжлэхийн хугацаа дууссан'
            : 'Нэхэмжлэх цуцлагдсан'
        }
        text="Төлбөр бүртгэгдээгүй. Картаа дахин нээж дахин оролдоно уу."
        amount={inv.amount}
      />
    );
  }

  if (gaveUp) {
    return (
      <State
        icon={<Clock className="text-muted-foreground size-10" />}
        title="Хариу хүлээгдсээр байна"
        text="Төлбөр таны данснаас гарсан бол хэдэн минутын дараа өөрөө бүртгэгдэнэ. Бүртгэгдэхгүй бол ресепшнд хандана уу."
        amount={inv?.amount}
      />
    );
  }

  // pending — банкнаас хариу хүлээж байна
  return (
    <State
      icon={<Loader2 className="text-muted-foreground size-10 animate-spin" />}
      title="Төлбөрийг баталгаажуулж байна"
      text={
        error
          ? `Түр зуурын алдаа: ${error}. Дахин оролдож байна…`
          : 'Банкнаас хариу ирэхийг хүлээж байна. Энэ хуудсыг хаахгүй байна уу.'
      }
      amount={inv?.amount}
      sub={inv?.packageName}
    />
  );
}

function State({
  icon,
  title,
  text,
  amount,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  amount?: number;
  sub?: string;
  tone?: 'ok' | 'bad';
}) {
  return (
    <Card
      className={
        tone === 'ok'
          ? 'border-emerald-500/40'
          : tone === 'bad'
            ? 'border-destructive/40'
            : undefined
      }
    >
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        {icon}
        <div>
          <p className="text-lg font-semibold">{title}</p>
          {sub && <p className="text-muted-foreground mt-0.5 text-sm">{sub}</p>}
          {amount !== undefined && (
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {money(amount)}
            </p>
          )}
          <p className="text-muted-foreground mt-2 text-sm">{text}</p>
        </div>
        <Button
          variant="outline"
          className="mt-2"
          nativeButton={false}
          render={<Link href="/pay" />}
        >
          Төлбөрийн хуудас руу
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Bonum-аас буцаж ирэх хуудас.
 *
 * ⚠ Төлбөр төлөгдсөн эсэхийг ЭНЭ ХУУДАС шийддэггүй — цорын ганц эх
 * сурвалж нь webhook. Энд зөвхөн санг давтан асууж, төлөв өөрчлөгдөхийг
 * хүлээнэ. Тиймээс хэрэглэгч хуудсыг хааж, дараа нээсэн ч үр дүн ижил.
 */
export default function PayReturnPage() {
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-10">
      <PayHeader gymName="WinFit" />
      {/* `useSearchParams` нь Suspense шаарддаг. */}
      <Suspense
        fallback={
          <Card>
            <CardContent className="flex justify-center py-10">
              <Loader2 className="text-muted-foreground size-8 animate-spin" />
            </CardContent>
          </Card>
        }
      >
        <ReturnInner />
      </Suspense>
    </main>
  );
}
