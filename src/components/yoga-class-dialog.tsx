'use client';

import {
  Ban,
  Check,
  Loader2,
  Plus,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import type { YogaClassRow } from '@/app/(dashboard)/yoga/page';
import {
  MemberPicker,
  type PickedMember,
} from '@/components/member-picker';
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
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorToast } from '@/lib/errors';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  memberId: string | null;
  name: string;
  phone: string | null;
  amount: number;
  paidAt: string | null;
  attendedAt: string | null;
  note: string | null;
  createdAt: string;
}

/**
 * Нэг хичээлийн оролцогчид.
 *
 * ★ ГАРААР БҮРТГЭНЭ
 *
 * Йогт заалны гишүүн БИШ хүн ирж болно — гаднаас ирсэн хүнийг зүгээр
 * нэрээр нь бүртгэнэ. Гишүүн бол холбовол нэр нь бүртгэлээс автоматаар
 * орж, түүний дэлгэц рүү шилжих холбоос гарна.
 *
 * ⚠ Терминал оролцохгүй — хаалгыг админ өөрөө нээж өгдөг.
 */
export function YogaClassDialog({
  row,
  onClose,
  onDone,
}: {
  row: YogaClassRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { can } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Шинэ оролцогчийн талбарууд.
  const [member, setMember] = useState<PickedMember | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [payLater, setPayLater] = useState(false);

  const { data: list, reload } = useApi<Booking[]>(
    row ? `/yoga/classes/${row.id}/bookings` : null,
  );

  if (!row) return null;

  function refresh() {
    reload();
    onDone();
  }

  async function add() {
    if (!row) return;
    if (!member && !name.trim()) return;
    setAdding(true);
    try {
      await api.post(`/yoga/classes/${row.id}/bookings`, {
        memberId: member?.id ?? undefined,
        name: member ? undefined : name.trim(),
        phone: phone.trim() || undefined,
        amount: amount ? Number(amount) : undefined,
        payLater: payLater || undefined,
      });
      toast.success('Бүртгэлээ');
      setMember(null);
      setName('');
      setPhone('');
      setAmount('');
      setPayLater(false);
      refresh();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setAdding(false);
    }
  }

  async function patch(b: Booking, body: Record<string, unknown>) {
    setBusy(b.id);
    try {
      await api.patch(`/yoga/bookings/${b.id}`, body);
      refresh();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  async function remove(b: Booking) {
    setBusy(b.id);
    try {
      await api.del(`/yoga/bookings/${b.id}`);
      toast.success(`${b.name} хасагдлаа`);
      refresh();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  async function toggleCancel() {
    if (!row) return;
    setBusy('class');
    try {
      await api.patch(`/yoga/classes/${row.id}`, {
        cancelled: !row.cancelledAt,
      });
      toast.success(row.cancelledAt ? 'Цуцлалт буцаагдлаа' : 'Хичээл цуцлагдлаа');
      onClose();
      onDone();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  const full = row.capacity !== null && row.booked >= row.capacity;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row.title}</DialogTitle>
          <DialogDescription>
            {new Date(row.startsAt).toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}{' '}
            · {row.durationMin} мин
            {row.instructor ? ` · ${row.instructor}` : ''}
            {row.cancelledAt ? ' · ЦУЦАЛСАН' : ''}
          </DialogDescription>
        </DialogHeader>

        {/* ── Оролцогчид ── */}
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {(list ?? []).length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Оролцогч алга
            </p>
          ) : (
            (list ?? []).map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
              >
                <UserRound className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  {b.memberId ? (
                    // Гишүүн бол дэлгэц рүү нь шууд очно.
                    <Link
                      href={`/members/${b.memberId}`}
                      className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {b.name}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm font-medium">
                      {b.name}
                    </span>
                  )}
                  <span className="text-muted-foreground block truncate text-xs">
                    {b.phone ?? 'утасгүй'} · {money(b.amount)}
                    {!b.paidAt && ' · авлага'}
                  </span>
                </span>

                {/* Төлбөр */}
                <Button
                  size="sm"
                  variant={b.paidAt ? 'ghost' : 'outline'}
                  disabled={busy !== null}
                  onClick={() => void patch(b, { paid: !b.paidAt })}
                  title={b.paidAt ? 'Төлбөрийг буцаах' : 'Төлбөр авах'}
                >
                  <Wallet
                    className={cn(
                      'size-3.5',
                      b.paidAt && 'text-emerald-600 dark:text-emerald-400',
                    )}
                  />
                  {b.paidAt ? 'Төлсөн' : 'Төлбөр авах'}
                </Button>

                {/* Ирц */}
                <Button
                  size="sm"
                  variant={b.attendedAt ? 'ghost' : 'outline'}
                  disabled={busy !== null}
                  onClick={() => void patch(b, { attended: !b.attendedAt })}
                  title={b.attendedAt ? 'Ирээгүй болгох' : 'Ирсэн гэж тэмдэглэх'}
                >
                  <Check
                    className={cn(
                      'size-3.5',
                      b.attendedAt && 'text-emerald-600 dark:text-emerald-400',
                    )}
                  />
                  {b.attendedAt ? 'Ирсэн' : 'Ирц'}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => void remove(b)}
                  aria-label="Хасах"
                >
                  {busy === b.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="text-destructive size-3.5" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>

        {/* ── Нэмэх ── */}
        {!row.cancelledAt && (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-medium">Оролцогч нэмэх</p>

            {/*
              ⚠ Гишүүн сонговол нэрийг гишүүний бүртгэлээс авна —
              гараар бичсэн нэр зөрвөл аль нь үнэн болох нь
              тодорхойгүй болно.
            */}
            <MemberPicker value={member} onChange={setMember} />

            {!member && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Нэр (гишүүн биш бол)"
                />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Утас"
                  inputMode="numeric"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                placeholder={`Төлбөр (${money(row.price)})`}
                inputMode="numeric"
                className="max-w-40"
              />
              <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={payLater}
                  onChange={(e) => setPayLater(e.target.checked)}
                  className="size-3.5"
                />
                Дараа төлөх
              </label>
              <Button
                size="sm"
                className="ml-auto"
                disabled={adding || full || (!member && !name.trim())}
                onClick={add}
                title={full ? 'Хичээл дүүрсэн' : undefined}
              >
                {adding ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                Нэмэх
              </Button>
            </div>

            {full && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Хичээл дүүрсэн ({row.capacity} хүн). Багтаамжийг нэмэгдүүлнэ үү.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap">
          {/*
            ⚠ УСТГАХ биш ЦУЦЛАХ. Оролцогчтой хичээлийг устгавал хэн
            хэдийг төлсөн нь алга болно; цуцалсан мөр нь үлдэнэ.
          */}
          {can('manager') && (
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={toggleCancel}
            >
              <Ban className="size-4" />
              {row.cancelledAt ? 'Цуцлалтыг буцаах' : 'Хичээл цуцлах'}
            </Button>
          )}
          <Button onClick={onClose}>Хаах</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
