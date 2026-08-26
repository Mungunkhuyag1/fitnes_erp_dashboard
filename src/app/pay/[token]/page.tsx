'use client';

import { AlertTriangle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  PackagePicker,
  PayHeader,
  PayWaiting,
  type PayPackage,
  type PendingInvoice,
} from '@/components/pay-flow';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MemberView {
  gymName: string;
  name: string;
  phone: string;
  status: string;
  accessEndsAt: string | null;
  daysLeft: number | null;
  packages: PayPackage[];
  pendingInvoice: PendingInvoice | null;
}

/**
 * 2-Р ТҮВШИН — Wallet карт дээрх хувийн холбоосоор орсон.
 *
 * Токен нь гишүүн бүрд өөр тул бүрэн мэдээлэл харуулж болно: нэр, дуусах
 * огноо, үлдсэн хоног. Утсаар орсон 1-р түвшинд эдгээр ХАРАГДАХГҮЙ.
 */
export default function PayByTokenPage() {
  const { token } = useParams<{ token: string }>();
  const { data, loading, error, reload } = useApi<MemberView>(
    `/public/members/${token}`,
  );
  const [invoice, setInvoice] = useState<PendingInvoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function pay(packageId: string) {
    setBusy(true);
    setPayError(null);
    try {
      setInvoice(
        await api.anon.post<PendingInvoice>('/public/invoices', {
          token,
          packageId,
        }),
      );
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <main className="mx-auto max-w-md space-y-6 px-4 py-10">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-28" />
        <Skeleton className="h-56" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md items-center px-4">
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="text-muted-foreground size-8" />
            <div>
              <p className="font-medium">Холбоос хүчингүй байна</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Картаа дахин нээж «Эрх сунгах» дарна уу, эсвэл ресепшнд хандана уу.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }
  if (!data) return null;

  const active = data.daysLeft !== null && data.daysLeft >= 0;
  const pending = invoice ?? data.pendingInvoice;

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-4 py-10">
      <PayHeader gymName={data.gymName} />

      <Card>
        <CardContent className="space-y-3 py-5">
          <div>
            <p className="text-lg font-semibold">{data.name}</p>
            <p className="text-muted-foreground font-mono text-sm">
              {data.phone}
            </p>
          </div>
          <div className="border-t pt-3">
            <p className="text-muted-foreground text-xs">Гишүүнчлэлийн эрх</p>
            <p
              className={cn(
                'mt-0.5 font-medium',
                active
                  ? data.daysLeft! <= 7
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive',
              )}
            >
              {data.accessEndsAt
                ? active
                  ? `${date(data.accessEndsAt)} хүртэл · ${data.daysLeft} хоног үлдсэн`
                  : `${date(data.accessEndsAt)}-нд дууссан`
                : 'Эрх идэвхжээгүй'}
            </p>
          </div>
        </CardContent>
      </Card>

      {pending ? (
        <PayWaiting invoice={pending} onPaid={reload} />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {active
              ? 'Сунгавал үлдсэн хоног дээр нэмэгдэнэ — эрт төлсөн нь алдагдахгүй.'
              : 'Багцаа сонгоод төлбөрөө хийнэ үү.'}
          </p>
          <PackagePicker
            packages={data.packages}
            onPay={pay}
            busy={busy}
            error={payError}
          />
        </>
      )}

      <p className="text-muted-foreground mt-auto text-center text-xs">
        Төлбөр хийгдмэгц эрх шууд сунгагдаж, терминал автоматаар шинэчлэгдэнэ
      </p>
    </main>
  );
}
