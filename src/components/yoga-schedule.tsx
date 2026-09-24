'use client';

import { CalendarDays, Check, DoorOpen, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { errorToast } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { hhmm, WEEKDAY_FULL, type YogaCourse } from '@/lib/yoga';

interface ScheduleRow {
  on: string;
  attended: number;
  past: boolean;
  isToday: boolean;
}

interface Schedule {
  courseId: string;
  startTime: string;
  durationMin: number;
  enrolled: number;
  today: string;
  sessions: ScheduleRow[];
}

interface Person {
  id: string;
  name: string;
  phone: string | null;
  here: boolean;
  at: string | null;
  owed: number;
}

/**
 * Ангийн бүх оролт.
 *
 * ★ ОГНОО НЬ ХАДГАЛАГДДАГГҮЙ
 *
 * Хуваарь дээрээс (эхлэх, дуусах, гарагууд) тооцоологдоно. Тиймээс
 * ангийн гарагийг өөрчлөхөд жагсаалт нь өөрөө шинэчлэгдэнэ.
 *
 * ★ ӨНӨӨДРИЙН ОРОЛТ ТОДРОНО
 *
 * Ресепшний өдөр тутмын ажил бол «өнөөдөр хэн ирэх ёстой». Тэр мөрийг
 * олохын тулд 13 огноог нүдээр гүйлгэх ёсгүй.
 */
export function YogaSchedule({
  course,
  onDone,
}: {
  course: YogaCourse;
  onDone: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const { data, reload } = useApi<Schedule>(
    `/yoga/courses/${course.id}/schedule`,
  );

  if (!data) return <Skeleton className="h-64 w-full" />;

  const today = data.sessions.find((s) => s.isToday);

  return (
    <div className="space-y-3">
      {/*
        Өнөөдөр оролттой бол ХАМГИЙН ДЭЭР товчтой — ресепшн нэг
        товшилтоор ирц рүү орно.
      */}
      {today && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="flex flex-wrap items-center gap-3">
            <CalendarDays className="size-5 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Өнөөдрийн хичээл</p>
              <p className="text-muted-foreground text-xs">
                {today.on} · {hhmm(data.startTime)} · {today.attended}/
                {data.enrolled} ирсэн
              </p>
            </div>
            <Button onClick={() => setOpen(today.on)}>
              <DoorOpen className="size-4" />
              Ирц бүртгэх
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="py-0">
        <CardContent className="p-0">
          <ul className="divide-border divide-y">
            {data.sessions.map((s) => {
              const d = new Date(`${s.on}T00:00:00`);
              return (
                <li key={s.on}>
                  <button
                    type="button"
                    onClick={() => setOpen(s.on)}
                    className={cn(
                      'hover:bg-muted/50 flex w-full flex-wrap items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      s.isToday && 'bg-emerald-500/5',
                    )}
                  >
                    <span className="font-mono text-sm tabular-nums">{s.on}</span>
                    <span className="text-muted-foreground text-xs">
                      {WEEKDAY_FULL[d.getDay()]}
                    </span>
                    {s.isToday && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        Өнөөдөр
                      </span>
                    )}
                    <span className="flex-1" />
                    {/*
                      ⚠ Ирээдүйн оролт дээр «0 ирсэн» гэж УЛААНААР
                      харуулбал ажилтныг дэмий сандраана — тэнд хараахан
                      хэн ч ирэх ёсгүй.
                    */}
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        !s.past && !s.isToday
                          ? 'text-muted-foreground/50'
                          : s.attended === 0
                            ? 'text-muted-foreground'
                            : 'text-emerald-600 dark:text-emerald-400',
                      )}
                    >
                      {s.attended}/{data.enrolled} ирсэн
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {open && (
        <SessionDialog
          courseId={course.id}
          on={open}
          startTime={data.startTime}
          onClose={() => setOpen(null)}
          onDone={() => {
            reload();
            onDone();
          }}
        />
      )}
    </div>
  );
}

/**
 * Нэг оролтын ирц.
 *
 * ★ ИРЦ ТЭМДЭГЛЭХЭД ХААЛГА НЭЭГДЭНЭ
 *
 * Ресепшн ирцийг яг хаалган дээр бүртгэдэг. Тусад нь «хаалга нээх»
 * товч дарах шаардлагатай бол нэг нь мартагдаж дараалал үүснэ.
 *
 * ⚠ Терминал унасан ч ирц БҮРТГЭГДЭНЭ — хариу нь хаалга нээгдсэн
 * эсэхийг тусад нь хэлэх ба бид түүнийг ил харуулна.
 */
function SessionDialog({
  courseId,
  on,
  startTime,
  onClose,
  onDone,
}: {
  courseId: string;
  on: string;
  startTime: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const { data, reload } = useApi<{
    on: string;
    present: number;
    total: number;
    people: Person[];
  }>(`/yoga/courses/${courseId}/sessions/${on}`);

  async function toggle(p: Person) {
    setBusy(p.id);
    try {
      if (p.here) {
        await api.del(
          `/yoga/courses/${courseId}/attendance/${p.id}/${on}`,
        );
        toast.success(`${p.name} — ирц буцаав`);
      } else {
        const r = await api.post<{ door: { opened: boolean; error?: string } }>(
          `/yoga/courses/${courseId}/attendance`,
          { enrollmentId: p.id, sessionOn: on },
        );
        toast.success(`${p.name} ирлээ`, {
          description: r.door.opened
            ? '🚪 Хаалга нээгдлээ'
            : `⚠ Хаалга нээгдсэнгүй — ${r.door.error ?? 'терминал холбогдоогүй'}`,
        });
      }
      reload();
      onDone();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ирц · {on}</DialogTitle>
          <DialogDescription>
            {hhmm(startTime)} · {data ? `${data.present}/${data.total} ирсэн` : '…'}
            {' · '}Тэмдэглэхэд хаалга нээгдэнэ
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {!data ? (
            <Skeleton className="h-32 w-full" />
          ) : data.people.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Энэ ангид гишүүн алга
            </p>
          ) : (
            data.people.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2',
                  p.here && 'border-emerald-500/40 bg-emerald-500/5',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {p.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {p.phone ?? 'утасгүй'}
                    {p.owed > 0 && ' · ⚠ үлдэгдэлтэй'}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant={p.here ? 'ghost' : 'default'}
                  disabled={busy !== null}
                  onClick={() => void toggle(p)}
                >
                  {busy === p.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : p.here ? (
                    <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <DoorOpen className="size-3.5" />
                  )}
                  {p.here ? 'Ирсэн' : 'Оруулах'}
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Хаах</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
