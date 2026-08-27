'use client';

import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import {
  PackagePicker,
  PayHeader,
  PayWaiting,
  type PayPackage,
  type PendingInvoice,
} from '@/components/pay-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';

interface Lookup {
  found: boolean;
  maskedName?: string;
}

/**
 * 1-Р ТҮВШИН — утасны дугаараар төлөх.
 *
 * Хэн ч дугаар бичиж болох тул энд ЗӨВХӨН далдалсан нэр харагдана
 * («зөв хүн мөн үү» гэдгийг батлахад хангалттай). Эрхийн огноо, ирц, түүхийг
 * харахын тулд Wallet карт дээрх хувийн линкээр орно
 * (docs/01-integration-model.md §6.6).
 */
export default function PayByPhonePage() {
  const { data: cfg } = useApi<{ gymName: string; packages: PayPackage[] }>(
    '/public/packages',
  );
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState<Lookup | null>(null);
  const [invoice, setInvoice] = useState<PendingInvoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.anon.post<Lookup>('/public/lookup', { phone });
      setFound(res);
      if (!res.found) {
        setError('Энэ дугаараар бүртгэл олдсонгүй. Ресепшнд хандана уу.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function pay(packageId: string) {
    setBusy(true);
    setError(null);
    try {
      const inv = await api.anon.post<PendingInvoice>('/public/invoices', {
        phone,
        packageId,
      });
      setInvoice(inv);
      // ★ Bonum-ын хуудас руу ШУУД шилжинэ — нэмэлт дарах алхам хэрэггүй.
      // `payUrl` ирээгүй бол хүлээлтийн дэлгэц дээрх товч нөөц болж үлдэнэ.
      if (inv.payUrl) window.location.href = inv.payUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col gap-6 px-4 py-10">
      <PayHeader gymName={cfg?.gymName ?? 'WinFit'} />

      {invoice ? (
        <PayWaiting invoice={invoice} onPaid={() => undefined} />
      ) : !found?.found ? (
        <Card>
          <CardContent className="py-6">
            <form onSubmit={lookup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Утасны дугаар</Label>
                <div className="relative">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="phone"
                    inputMode="tel"
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="99112233"
                    className="h-12 pl-9 text-base"
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Фитнест бүртгүүлсэн дугаараа оруулна уу
                </p>
              </div>

              {error && (
                <p className="text-destructive bg-destructive/8 rounded-lg px-3 py-2.5 text-sm">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full text-base"
                disabled={busy || phone.trim().length < 8}
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Үргэлжлүүлэх
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-muted-foreground text-xs">Бүртгэл олдлоо</p>
              <p className="mt-0.5 text-lg font-semibold">{found.maskedName}</p>
            </CardContent>
          </Card>

          <PackagePicker
            packages={cfg?.packages ?? []}
            onPay={pay}
            busy={busy}
            error={error}
          />

          <button
            type="button"
            onClick={() => {
              setFound(null);
              setError(null);
            }}
            className="text-muted-foreground hover:text-foreground w-full text-center text-sm"
          >
            Өөр дугаар оруулах
          </button>
        </div>
      )}

      <p className="text-muted-foreground mt-auto text-center text-xs">
        Эрхийн дэлгэрэнгүйг Wallet карт дээрх «Эрх сунгах» холбоосоор харна
      </p>
    </main>
  );
}
