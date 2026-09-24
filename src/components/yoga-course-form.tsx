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
import { WEEKDAY_FULL, type YogaCourse } from '@/lib/yoga';
import { cn } from '@/lib/utils';

/**
 * Анги үүсгэх / засах.
 *
 * ★ ОРОЛТЫН ӨДРҮҮД ӨӨРӨӨ ТООЦООЛОГДОНО
 *
 * Ажилтан хугацаа + гарагуудаа л сонгоно. Хичээл бүрийг гараар
 * оруулах шаардлагагүй — 13 оролттой анги 13 удаа бөглөхийг
 * шаардвал хэн ч ашиглахгүй.
 */
export function YogaCourseForm({
  open,
  onOpenChange,
  onDone,
  course,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  /** Байвал ЗАСНА, байхгүй бол шинээр үүсгэнэ. */
  course?: YogaCourse;
}) {
  const edit = !!course;
  const [name, setName] = useState(course?.name ?? '');
  const [instructor, setInstructor] = useState(course?.instructor ?? '');
  const [startsOn, setStartsOn] = useState(course?.startsOn ?? '');
  const [endsOn, setEndsOn] = useState(course?.endsOn ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(course?.weekdays ?? []);
  const [startTime, setStartTime] = useState(
    course?.startTime?.slice(0, 5) ?? '19:00',
  );
  const [durationMin, setDurationMin] = useState(
    String(course?.durationMin ?? 60),
  );
  const [capacity, setCapacity] = useState(
    course?.capacity != null ? String(course.capacity) : '',
  );
  const [price, setPrice] = useState(
    course?.price != null ? String(course.price) : '',
  );
  const [busy, setBusy] = useState(false);

  function toggleDay(d: number) {
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]));
  }

  const valid =
    name.trim().length >= 2 && !!startsOn && !!endsOn && weekdays.length > 0;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        instructor: instructor.trim() || undefined,
        startsOn,
        endsOn,
        weekdays,
        startTime,
        durationMin: Number(durationMin) || 60,
        capacity: capacity ? Number(capacity) : undefined,
        price: price ? Number(price) : undefined,
      };
      if (edit) await api.patch(`/yoga/courses/${course.id}`, body);
      else await api.post('/yoga/courses', body);

      toast.success(edit ? 'Анги шинэчлэгдлээ' : 'Анги үүслээ');
      onOpenChange(false);
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
          <DialogTitle>{edit ? 'Ангийг засах' : 'Йогийн анги'}</DialogTitle>
          <DialogDescription>
            Хугацаа, гарагуудаас оролтын өдрүүд өөрөө тооцоологдоно.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="yc-name">Ангийн нэр</Label>
            <Input
              id="yc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Хатха йог — оройн анги"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yc-instr">Багш</Label>
            <Input
              id="yc-instr"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Сараа багш"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="yc-from">Эхлэх</Label>
              <Input
                id="yc-from"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yc-to">Дуусах</Label>
              <Input
                id="yc-to"
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </div>
          </div>

          {/*
            ⚠ Гараг сонгоогүй бол анги ХООСОН хуваарьтай үүснэ.
            Тиймээс `valid` шалгалтад орсон бөгөөд доор сануулна.
          */}
          <div className="space-y-2">
            <Label>Долоо хоногийн өдрүүд</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_FULL.map((w, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs transition-colors',
                    weekdays.includes(i)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted',
                  )}
                >
                  {w.slice(0, 2)}
                </button>
              ))}
            </div>
            {weekdays.length === 0 && (
              <p className="text-destructive text-xs">
                Ядаж нэг өдөр сонгоно уу — эс бөгөөс хуваарь хоосон үүснэ.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="yc-time">Эхлэх цаг</Label>
              <Input
                id="yc-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yc-dur">Үргэлжлэх (мин)</Label>
              <Input
                id="yc-dur"
                inputMode="numeric"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="yc-cap">Хэдэн гишүүн</Label>
              <Input
                id="yc-cap"
                inputMode="numeric"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))}
                placeholder="хязгааргүй"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yc-price">Төлбөр (₮)</Label>
              <Input
                id="yc-price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button onClick={submit} disabled={busy || !valid}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {edit ? 'Хадгалах' : 'Үүсгэх'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
