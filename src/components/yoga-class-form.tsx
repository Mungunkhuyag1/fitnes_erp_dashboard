'use client';

import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { errorToast } from '@/lib/errors';

/**
 * Шинэ хичээл үүсгэх.
 *
 * ★ ДАВТАЛТ НЬ МӨР ҮҮСГЭНЭ, ДҮРЭМ БИШ
 *
 * «7 хоног тутам × 8» гэвэл 8 бодит хичээл үүснэ. Дүрмээр хадгалбал
 * нэг өдрийн хичээлийг цуцлах, багшийг нь солих, оролцогч хавсаргах
 * боломжгүй болно.
 */
export function YogaClassForm({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [instructor, setInstructor] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [durationMin, setDurationMin] = useState('60');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');
  const [repeatWeeks, setRepeatWeeks] = useState('1');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !date) return;
    setBusy(true);
    try {
      /*
       * ⚠ Огноо+цагийг ОРОН НУТГИЙН цагаар уншина. `new Date('2026-09-25T19:00')`
       * нь бүсийн тэмдэггүй тул браузерын бүсээр уншигдана — яг хүссэн зан.
       * `Z` залгавал 8 цагаар гулсана.
       */
      const startsAt = new Date(`${date}T${time}`).toISOString();
      const r = await api.post<unknown[]>('/yoga/classes', {
        title: title.trim(),
        instructor: instructor.trim() || undefined,
        startsAt,
        durationMin: Number(durationMin) || 60,
        capacity: capacity ? Number(capacity) : undefined,
        price: price ? Number(price) : undefined,
        repeatWeeks: Number(repeatWeeks) || 1,
      });
      const n = Array.isArray(r) ? r.length : 1;
      toast.success(n > 1 ? `${n} хичээл үүслээ` : 'Хичээл үүслээ');
      onOpenChange(false);
      setTitle('');
      setInstructor('');
      setDate('');
      setCapacity('');
      setPrice('');
      setRepeatWeeks('1');
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
          <DialogTitle>Йогийн хичээл</DialogTitle>
          <DialogDescription>
            Хуваарьт хичээл үүсгэнэ. Терминал оролцохгүй — хаалгыг та өөрөө
            нээж өгнө.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="y-title">Нэр</Label>
            <Input
              id="y-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Хатха йог"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="y-instr">Багш</Label>
            <Input
              id="y-instr"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Сараа багш"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="y-date">Огноо</Label>
              <Input
                id="y-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="y-time">Цаг</Label>
              <Input
                id="y-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="y-dur">Үргэлжлэх</Label>
              <Input
                id="y-dur"
                inputMode="numeric"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="y-cap">Багтаамж</Label>
              <Input
                id="y-cap"
                inputMode="numeric"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))}
                placeholder="хязгааргүй"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="y-price">Төлбөр (₮)</Label>
              <Input
                id="y-price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="y-rep">7 хоног тутам давтах</Label>
            <Input
              id="y-rep"
              inputMode="numeric"
              value={repeatWeeks}
              onChange={(e) => setRepeatWeeks(e.target.value.replace(/\D/g, ''))}
            />
            <p className="text-muted-foreground text-xs">
              {Number(repeatWeeks) > 1
                ? `${repeatWeeks} хичээл үүснэ — тус бүрийг нь тусад нь засаж, цуцалж болно.`
                : 'Зөвхөн тэр өдөр. Давтахыг хүсвэл тоог нэмнэ үү.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button onClick={submit} disabled={busy || !title.trim() || !date}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Үүсгэх
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
