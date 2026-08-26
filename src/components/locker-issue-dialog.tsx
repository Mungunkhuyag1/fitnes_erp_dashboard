'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MemberPicker, type PickedMember } from '@/components/member-picker';
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
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

export function LockerIssueDialog({
  open,
  onOpenChange,
  zones,
  defaultZone,
  defaultNumber,
  rentalPrice,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  zones: string[];
  defaultZone?: string;
  defaultNumber?: number;
  rentalPrice: number;
  onDone: () => void;
}) {
  /**
   * ⚠ Эхний утгыг lazy initializer-ээр авна, effect-ээр СИНХРОНООР
   * `setState` хийхгүй (cascading render). Самбараас өөр шүүгээ дарж орж
   * ирэхэд эцэг компонент `key`-г сольж, энэ компонентыг дахин mount хийдэг
   * тул шинэ анхны утга автоматаар хүчинтэй болно.
   */
  const [member, setMember] = useState<PickedMember | null>(null);
  const [zone, setZone] = useState(() => defaultZone ?? zones[0] ?? '');
  const [number, setNumber] = useState(() =>
    defaultNumber ? String(defaultNumber) : '',
  );
  const [type, setType] = useState<'daily' | 'rental'>('daily');
  const [days, setDays] = useState('30');
  const [amount, setAmount] = useState(String(rentalPrice));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Зөвлөмжийг ГИШҮҮНТЭЙ нь хамт хадгална: ингэснээр өөр гишүүн сонгоход
  // хуучин зөвлөмж харагдахгүй бөгөөд effect дотор цэвэрлэх шаардлагагүй.
  const [hint, setHint] = useState<{
    memberId: string;
    source: 'history' | 'gender';
  } | null>(null);

  // Гишүүн сонгогдоход өрөөг урьдчилан бөглөнө: сүүлд ашигласнаар, эс
  // бөгөөс хүйсээр. Аль эх сурвалжаас гарсныг доор нь бичнэ — ажилтан
  // яагаад ийм өрөө сонгогдсоныг мэдэж, шаардвал өөрчилнө.
  useEffect(() => {
    if (!member || defaultZone) return;
    let live = true;
    api
      .get<{ zone: string | null; source: 'history' | 'gender' | null }>(
        `/members/${member.id}/locker-zone`,
      )
      .then((r) => {
        if (!live || !r.zone) return;
        setZone(r.zone);
        if (r.source) setHint({ memberId: member.id, source: r.source });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [member, defaultZone]);

  async function submit() {
    if (!member) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ zone: string; number: number }>(
        '/lockers/issue',
        {
          memberId: member.id,
          zone,
          number: Number(number),
          type,
          days: type === 'rental' ? Number(days) : undefined,
          amount: type === 'rental' ? Number(amount || 0) : undefined,
        },
      );
      toast.success(`${res.zone} №${res.number} олгов`, {
        description: member.name,
      });
      onOpenChange(false);
      setMember(null);
      setNumber('');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  const valid = !!member && !!zone && Number(number) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Түлхүүр олгох</DialogTitle>
          <DialogDescription>
            Эрэгтэй/эмэгтэй өрөөний дугаарлалт тусдаа — өрөөг заавал сонгоно
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Гишүүн</Label>
            <MemberPicker value={member} onChange={setMember} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Өрөө</Label>
              <div className="flex gap-1">
                {zones.map((z) => (
                  <Button
                    key={z}
                    type="button"
                    size="sm"
                    variant={zone === z ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setZone(z)}
                  >
                    {z}
                  </Button>
                ))}
              </div>
              {hint && hint.memberId === member?.id && (
                <p className="text-muted-foreground text-xs">
                  {hint.source === 'history'
                    ? 'Сүүлд ашигласан өрөө'
                    : 'Хүйсээр санал болгов'}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lnum">Шүүгээний дугаар</Label>
              <Input
                id="lnum"
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="42"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Хэлбэр</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('daily')}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left transition-colors',
                  type === 'daily' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50',
                )}
              >
                <span className="block text-sm font-medium">Өдрийн</span>
                <span className="text-muted-foreground block text-xs">
                  Явахдаа буцаана
                </span>
              </button>
              <button
                type="button"
                onClick={() => setType('rental')}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left transition-colors',
                  type === 'rental' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50',
                )}
              >
                <span className="block text-sm font-medium">Түрээс</span>
                <span className="text-muted-foreground block text-xs">
                  {money(rentalPrice)} / сар
                </span>
              </button>
            </div>
          </div>

          {type === 'rental' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ldays">Хоног</Label>
                <Input
                  id="ldays"
                  inputMode="numeric"
                  value={days}
                  onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lamount">Төлбөр (₮)</Label>
                <Input
                  id="lamount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          )}

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
            Олгох
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
