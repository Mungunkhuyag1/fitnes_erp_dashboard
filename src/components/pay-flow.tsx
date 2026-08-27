'use client';

import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { date, money } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface PayPackage {
  id: string;
  name: string;
  days: number;
  price: number;
}

export interface PendingInvoice {
  id: string;
  packageName: string;
  amount: number;
  payUrl: string | null;
  expiresAt: string;
}

/** Хуудасны толгой — фитнесийн нэр. */
/**
 * Нийтэд харагдах төлбөрийн хуудасны толгой.
 *
 * ЯАГААД ЛОГО ХЭРЭГТЭЙ ВЭ: гишүүн банкны апп руу шилжихийн өмнө «зөв
 * газар байна уу» гэдгээ хормын зуур батлах ёстой. Ерөнхий дүрсээс
 * илүү брэндийн тэмдэг итгэл төрүүлнэ.
 *
 * ⚠ Тэмдгийг ашиглана, БҮТЭН wordmark-ыг биш: фитнесийн нэр нь
 * тохиргооноос ирдэг (`gym_name`) тул зурган дээрх «WIN FIT» бичигтэй
 * зөрөх эрсдэлтэй.
 */
export function PayHeader({ gymName }: { gymName: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-950 shadow-sm">
        <Image
          src="/brand/mark.png"
          alt=""
          width={56}
          height={56}
          className="size-10"
          priority
        />
      </div>
      <div>
        <p className="text-xl font-semibold tracking-tight">{gymName}</p>
        <p className="text-muted-foreground text-xs">Гишүүнчлэлийн төлбөр</p>
      </div>
    </div>
  );
}

/**
 * Багц сонгож төлөх.
 *
 * Дүнг клиентээс илгээхгүй — зөвхөн `packageId`. Сервер өөрийн үнээр
 * нэхэмжлэх үүсгэнэ.
 */
export function PackagePicker({
  packages,
  onPay,
  busy,
  error,
}: {
  packages: PayPackage[];
  onPay: (packageId: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {packages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p.id)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors',
              selected === p.id
                ? 'border-primary bg-primary/5'
                : 'hover:bg-accent/50',
            )}
          >
            <span>
              <span className="block font-medium">{p.name}</span>
              <span className="text-muted-foreground text-sm">
                {p.days} хоног
              </span>
            </span>
            <span className="text-base font-semibold tabular-nums">
              {money(p.price)}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-destructive bg-destructive/8 rounded-lg px-3 py-2.5 text-sm">
          {error}
        </p>
      )}

      <Button
        size="lg"
        className="h-12 w-full text-base"
        disabled={!selected || busy}
        onClick={() => selected && onPay(selected)}
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        Төлбөр төлөх
      </Button>
    </div>
  );
}

/**
 * Төлбөрийн хүлээлт.
 *
 * Банкны апп руу шилжсэний дараа энэ хуудас нээлттэй үлдэнэ — 3 секунд тутам
 * төлөв шалгаж, төлөгдмөгц баталгааг харуулна. Төлөгдсөн эсэхийг ЗӨВХӨН
 * webhook шийддэг тул энэ нь зөвхөн дэлгэц шинэчлэх зорилготой.
 */
export function PayWaiting({
  invoice,
  onPaid,
}: {
  invoice: PendingInvoice;
  onPaid: () => void;
}) {
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (paid) return;
    const id = setInterval(() => {
      api
        .anon.get<{ status: string }>(`/public/invoices/${invoice.id}`)
        .then((r) => {
          if (r.status === 'paid') {
            setPaid(true);
            onPaid();
          }
        })
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(id);
  }, [invoice.id, paid, onPaid]);

  if (paid) {
    return (
      <Card className="border-emerald-500/40">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-emerald-500" />
          <div>
            <p className="text-lg font-semibold">Төлбөр амжилттай</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Таны эрх сунгагдлаа. Терминал дээр шууд нэвтэрч болно.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">{invoice.packageName}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {money(invoice.amount)}
          </p>
        </div>

        {invoice.payUrl && (
          <Button
            size="lg"
            className="h-12 w-full text-base"
            nativeButton={false}
            render={
              <a href={invoice.payUrl} target="_blank" rel="noopener noreferrer" />
            }
          >
            Банкны аппаар төлөх
            <ExternalLink className="size-4" />
          </Button>
        )}

        <div className="flex items-center justify-center gap-2">
          <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
          <p className="text-muted-foreground text-xs">
            Төлбөр хийгдмэгц энэ хуудас өөрөө шинэчлэгдэнэ
          </p>
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Нэхэмжлэх {date(invoice.expiresAt)}-ны дотор хүчинтэй
        </p>
      </CardContent>
    </Card>
  );
}
