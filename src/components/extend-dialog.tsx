'use client';

import { Loader2, ScanFace } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApi } from '@/hooks/use-api';
import { api, type Page } from '@/lib/api';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Pkg {
  id: string;
  name: string;
  days: number;
  price: number;
}

/**
 * Эрх сунгах.
 *
 * Backend-ийн `POST /members/:id/extend` нь бүх сунгалтын ганц гарц. Давхар
 * илгээхээс `idempotencyKey`-ээр хамгаална — сүлжээ тасарч дахин дарсан ч
 * НЭГ л удаа бүртгэгдэнэ.
 */
export function ExtendDialog({
  memberId,
  memberName,
  cancelled = false,
  open,
  onOpenChange,
  onDone,
}: {
  memberId: string;
  memberName: string;
  /** Гишүүн цуцлагдсан эсэх — сунгалт нь эрхийг нь сэргээнэ. */
  cancelled?: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { data: packages } = useApi<Page<Pkg>>(
    open ? '/packages?active=true&limit=50' : null,
  );
  /**
   * `package` (анхдагч) — багц сонгоно. `custom` — дурын хоногоор.
   *
   * Тусдаа `mode` барих шалтгаан: `pkgId === null`-ыг «дурын хоног» гэж
   * тайлбарлавал диалог онгойхдоо тэр сонголт СОНГОГДСОН мэт харагдана.
   * Ресепшн ихэвчлэн багц сонгодог тул анхдагч нь тэр байх ёстой.
   */
  const [mode, setMode] = useState<'package' | 'custom'>('package');
  const [pkgId, setPkgId] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Дахин дарахад ижил түлхүүр явахын тулд нэг л удаа үүсгэнэ.
  const idemKey = useMemo(() => (open ? crypto.randomUUID() : ''), [open]);

  const custom = mode === 'custom';
  const selected = packages?.items.find((p) => p.id === pkgId);

  function pick(p: Pkg) {
    setMode('package');
    setPkgId(p.id);
    setAmount(String(p.price));
    setCustomDays('');
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/members/${memberId}/extend`, {
        packageId: custom ? undefined : (pkgId ?? undefined),
        days: custom ? Number(customDays) : undefined,
        amount: Number(amount || 0),
        method: custom ? 'manual' : 'cash',
        reason: reason || undefined,
        idempotencyKey: idemKey,
      });
      toast.success('Эрх сунгагдлаа', {
        description: 'Терминал руу автоматаар бичигдэнэ',
      });
      onOpenChange(false);
      setMode('package');
      setPkgId(null);
      setCustomDays('');
      setAmount('');
      setReason('');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  const valid = custom
    ? Number(customDays) > 0 && reason.trim().length > 0
    : !!pkgId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cancelled ? 'Сэргээж сунгах' : 'Эрх сунгах'}</DialogTitle>
          <DialogDescription>
            {memberName} — бэлнээр хүлээн авсан төлбөр
          </DialogDescription>
        </DialogHeader>

        {cancelled && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5">
            <ScanFace className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-muted-foreground text-xs">
              Энэ гишүүний эрх цуцлагдсан. Сунгалт хийвэл{' '}
              <span className="text-foreground font-medium">
                хуучин бүртгэл дээрээ сэргэнэ
              </span>{' '}
              — түүх, ирц хэвээр үлдэнэ. Цуцлах үед терминалаас устсан тул{' '}
              <span className="text-foreground font-medium">
                царайгаа дахин уншуулах
              </span>{' '}
              шаардлагатай.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Багц</Label>
            <div className="grid gap-2">
              {packages?.items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors',
                    pkgId === p.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent/50',
                  )}
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {p.days} хоног · {money(p.price)}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMode('custom');
                  setPkgId(null);
                  setAmount('');
                }}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                  custom ? 'border-primary bg-primary/5' : 'hover:bg-accent/50',
                )}
              >
                Хоногоор (багцгүй)
              </button>
            </div>
          </div>

          {custom && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="days">Хоног *</Label>
                <Input
                  id="days"
                  inputMode="numeric"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, ''))}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Дүн (₮)</Label>
                <Input
                  id="amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {!custom && selected && (
            <div className="space-y-2">
              <Label htmlFor="amount2">Хүлээн авсан дүн (₮)</Label>
              <Input
                id="amount2"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Тайлбар {custom && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={custom ? 'Урамшуулал, засвар…' : 'Заавал биш'}
            />
            {custom && (
              <p className="text-muted-foreground text-xs">
                Багцгүй сунгалт аудитад бичигдэнэ — тайлбар шаардлагатай.
              </p>
            )}
          </div>

          {error && (
            <p className="text-destructive bg-destructive/8 rounded-md px-3 py-2 text-sm">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Цуцлах
          </Button>
          <Button onClick={submit} disabled={busy || !valid}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Сунгах
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
