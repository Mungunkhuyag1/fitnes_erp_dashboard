'use client';

import { Loader2, Trash2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
import { errorToast } from '@/lib/errors';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PAYMENT_STATE, type YogaCourse, type YogaEnrollment } from '@/lib/yoga';

/*
 * ⚠ ЭНД ГИШҮҮДИЙН ЖАГСААЛТ БАЙХГҮЙ — зориуд.
 *
 * Өмнө нь `YogaMembers` гэсэн бүтэн жагсаалт байв. Тэр нь ангийн
 * дэлгэцийн ХОЁР ДАХЬ таб байсан бөгөөд ирцийн табтай нэгтгэгдсэн
 * (`yoga-session.tsx`). Шалтгаан: ресепшн «энэ хүн төлсөн үү?»
 * гэдгийг ИРЦ бүртгэж байхдаа асуудаг — хоёр таб хооронд үсрэх нь
 * хаалган дээр хүн хүлээж байхад хэт урт.
 *
 * Энэ файлд зөвхөн ХОЁР ЦОНХ үлдэв, хоёулаа нэгдсэн дэлгэцээс
 * дуудагдана.
 */

/**
 * Гишүүн нэмэх.
 *
 * ★ ЯАГААД ХУУДАСНЫ ТҮВШИНД ВЭ
 *
 * «Гишүүн нэмэх» товч толгойд байдаг тул ХУВААРИЙН таб дээр байхад ч
 * дарагдана. Цонхыг `YogaMembers` дотор үлдээвэл тэр таб идэвхгүй
 * үед `TabsContent` нь салдаг ба цонх огт render хийгдэхгүй.
 */
export function YogaAddMemberDialog({
  open,
  onOpenChange,
  course,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: YogaCourse;
  onDone: () => void;
}) {
  const [member, setMember] = useState<PickedMember | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [due, setDue] = useState(String(course.price));
  const [paid, setPaid] = useState('');
  const [busy, setBusy] = useState(false);

  const owed = Math.max(0, Number(due || 0) - Number(paid || 0));

  async function submit() {
    if (!member && !name.trim()) return;
    setBusy(true);
    try {
      await api.post(`/yoga/courses/${course.id}/enrollments`, {
        memberId: member?.id ?? undefined,
        name: member ? undefined : name.trim(),
        phone: phone.trim() || undefined,
        amountDue: Number(due || 0),
        amountPaid: Number(paid || 0),
      });
      toast.success('Бүртгэлээ', {
        description: owed ? `Үлдэгдэл ${money(owed)}` : 'Бүрэн төлсөн',
      });
      onOpenChange(false);
      setMember(null);
      setName('');
      setPhone('');
      setPaid('');
      onDone();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Гишүүн нэмэх</DialogTitle>
          <DialogDescription>{course.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/*
            ⚠ Гишүүн сонговол нэрийг БҮРТГЭЛЭЭС авна — гараар бичсэн
            нэр зөрвөл аль нь үнэн болох нь тодорхойгүй болно.
          */}
          <MemberPicker value={member} onChange={setMember} />

          {!member && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ye-name">Нэр</Label>
                <Input
                  id="ye-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Гишүүн биш бол"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ye-phone">Утас</Label>
                <Input
                  id="ye-phone"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ye-due">Төлөх ёстой (₮)</Label>
              <Input
                id="ye-due"
                inputMode="numeric"
                value={due}
                onChange={(e) => setDue(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ye-paid">Авсан төлбөр (₮)</Label>
              <Input
                id="ye-paid"
                inputMode="numeric"
                value={paid}
                onChange={(e) => setPaid(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
              />
            </div>
          </div>

          {/*
            Үлдэгдлийг ШУУД харуулна — ажилтан хадгалахаасаа өмнө
            зөв эсэхийг мэднэ.
          */}
          <p
            className={cn(
              'rounded-md px-3 py-2 text-xs',
              owed
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            )}
          >
            {owed ? `Үлдэгдэл ${money(owed)} үүснэ.` : 'Бүрэн төлсөн болно.'}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button onClick={submit} disabled={busy || (!member && !name.trim())}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Бүртгэх
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Гишүүний ДЭЛГЭРЭНГҮЙ — ирц, төлбөр, заалны бүртгэл нэг цонхонд.
 *
 * ★ ЯАГААД ЭКСПОРТ ВЭ
 *
 * Нэгдсэн дэлгэц (`yoga-session.tsx`) ижил цонхыг хэрэглэнэ. Төлбөр
 * авах, ангиас хасах логикийг ХУУЛБАРЛАВАЛ хоёр нь цаг хугацаатай
 * зөрнө — нэг газар засаад нөгөөг мартана.
 *
 * `extra` — дуудагч талаас нэмэх мөр (тухайлбал «энэ оролтод ирсэн»).
 */
export function YogaMemberDialog({
  row,
  onClose,
  onDone,
  extra,
}: {
  row: YogaEnrollment | null;
  onClose: () => void;
  onDone: () => void;
  extra?: React.ReactNode;
}) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  if (!row) return null;

  async function pay() {
    if (!row || !amount) return;
    setBusy(true);
    try {
      const r = await api.post<{ owed: number }>(
        `/yoga/enrollments/${row.id}/payments`,
        { amount: Number(amount) },
      );
      toast.success(`${money(Number(amount))} хүлээн авав`, {
        description: r.owed ? `Үлдэгдэл ${money(r.owed)}` : 'Бүрэн төлөгдлөө',
      });
      setAmount('');
      onClose();
      onDone();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!row) return;
    setBusy(true);
    try {
      await api.del(`/yoga/enrollments/${row.id}`);
      toast.success(`${row.name} хасагдлаа`);
      onClose();
      onDone();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  const ps = PAYMENT_STATE[row.payment];
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{row.name}</DialogTitle>
          <DialogDescription>
            {row.phone ?? 'утасгүй'} · {row.attended} удаа ирсэн
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted-foreground text-xs">Төлбөрийн байдал</dt>
          <dd>
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-xs font-medium',
                ps.tone,
              )}
            >
              {ps.label}
            </span>
          </dd>

          <dt className="text-muted-foreground text-xs">Төлөх ёстой</dt>
          <dd className="tabular-nums">{money(row.amountDue)}</dd>

          <dt className="text-muted-foreground text-xs">Хүлээн авсан</dt>
          <dd className="tabular-nums">{money(row.amountPaid)}</dd>

          <dt className="text-muted-foreground text-xs">Үлдэгдэл</dt>
          <dd
            className={cn(
              'tabular-nums',
              row.owed && 'font-medium text-amber-700 dark:text-amber-400',
            )}
          >
            {money(row.owed)}
          </dd>

          {row.lastOn && (
            <>
              <dt className="text-muted-foreground text-xs">Сүүлд ирсэн</dt>
              <dd className="font-mono text-xs">{row.lastOn}</dd>
            </>
          )}

          {row.memberId && (
            <>
              <dt className="text-muted-foreground text-xs">Заалны гишүүн</dt>
              <dd>
                <Link
                  href={`/members/${row.memberId}`}
                  className="underline underline-offset-4"
                >
                  Бүртгэл рүү очих
                </Link>
              </dd>
            </>
          )}
        </dl>

        {extra}

        {/*
          ⚠ Нэмэлт төлбөр нь ОРЛУУЛАХГҮЙ НЭМНЭ. Ажилтан «одоо хэдийг
          авсан»-аа бичих нь «нийт хэд болсон»-оос хамаагүй бага
          алдаатай.
        */}
        {row.owed > 0 && (
          <div className="space-y-2 rounded-lg border p-3">
            <Label htmlFor="ye-pay" className="text-xs">
              Нэмэлт төлбөр хүлээн авах
            </Label>
            <div className="flex gap-2">
              <Input
                id="ye-pay"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                placeholder={String(row.owed)}
              />
              <Button onClick={pay} disabled={busy || !amount}>
                <Wallet className="size-4" />
                Авах
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap">
          <Button variant="outline" disabled={busy} onClick={remove}>
            <Trash2 className="text-destructive size-4" />
            Ангиас хасах
          </Button>
          <Button onClick={onClose}>Хаах</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
