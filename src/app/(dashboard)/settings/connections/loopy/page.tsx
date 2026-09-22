'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { LoopyProgramCard } from '@/components/loopy-program-card';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Loopy — Wallet картын үйлчилгээ.
 *
 * ⚠ Нууц түлхүүрүүд `.env`-д байдаг тул ЭНД засварлахгүй — зөвхөн
 * ажиллаж байгаа эсэхийг шалгана. Тохиргоо буруу бол алдааны текстийг
 * ИЛ харуулна: «холбогдсонгүй» гэхээс шалтгаан нь хамаагүй хэрэгтэй.
 */
export default function LoopyConnectionSettings() {
  const [result, setResult] = useState<{ ok: boolean; detail?: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    try {
      setResult(await api.get<{ ok: boolean; detail?: string }>('/loyalty/ping'));
    } catch (e) {
      setResult({
        ok: false,
        detail: e instanceof Error ? e.message : 'Алдаа',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Холболтын байдал</CardTitle>
          <CardDescription>
            Карт үүсгэх зөвшөөрөл, эрхийн огноо, push мэдэгдэл
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={check} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Шалгах
          </Button>

          {result && (
            <div
              className={cn(
                'flex items-center gap-2 text-sm',
                result.ok
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive',
              )}
            >
              {result.ok ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <XCircle className="size-4" />
              )}
              {result.ok ? 'Холбогдлоо' : (result.detail ?? 'Холбогдсонгүй')}
            </div>
          )}
        </CardContent>
      </Card>

      <LoopyProgramCard />
    </div>
  );
}
