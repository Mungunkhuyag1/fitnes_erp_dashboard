'use client';

import { CalendarDays, Check, DoorOpen, Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  /** Болж өнгөрсөн оролт — явцын мөрөнд. */
  const done = data.sessions.filter((s) => s.past).length;

  /** Сараар бүлэглэнэ — `2026-10` → `2026 оны 10-р сар`. */
  const groups = new Map<string, ScheduleRow[]>();
  for (const s of data.sessions) {
    const [y, m] = s.on.split('-');
    const k = `${y} оны ${Number(m)}-р сар`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }

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

      {/*
        ★ ЯВЦЫН МӨР — анги хаана явж байгааг НЭГ ХАРЦААР
        «13 оролтын 4 нь болсон» гэдгийг огноог тоолж мэдэх ёсгүй.
      */}
      <div className="flex items-center gap-3 text-xs">
        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{
              width: `${data.sessions.length ? (done / data.sessions.length) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="text-muted-foreground shrink-0 tabular-nums">
          {done} / {data.sessions.length} оролт
        </span>
      </div>

      {/*
        Сараар бүлэглэнэ — 13 огноо нэг цувралаар байвал «10-р сар
        хэдээс эхлэх вэ» гэдгийг нүдээр гүйлгэж хайна.
      */}
      {[...groups.entries()].map(([month, list]) => (
        <div key={month} className="space-y-1.5">
          <p className="text-muted-foreground px-1 text-xs font-medium">
            {month}
          </p>
          <Card className="py-0">
            <CardContent className="p-0">
              <ul className="divide-border divide-y">
                {list.map((s) => {
                  const d = new Date(`${s.on}T00:00:00`);
                  const full = data.enrolled > 0 && s.attended >= data.enrolled;
                  return (
                    <li key={s.on}>
                      <button
                        type="button"
                        onClick={() => setOpen(s.on)}
                        className={cn(
                          'flex w-full flex-wrap items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          s.isToday
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                            : 'hover:bg-muted/50',
                          // Өнгөрсөн нь бүдгэрнэ — анхаарал ирээдүй рүү.
                          s.past && 'opacity-60',
                        )}
                      >
                        {/*
                          ★ ЗҮҮН ТАЛЫН ТЭМДЭГ — төлвийг өнгө, дүрсээр нэг
                          зэрэг хэлнэ. Зөвхөн өнгө ашиглавал өнгө ялгах
                          бэрхшээлтэй хүн ялгаж чадахгүй.
                        */}
                        <span
                          className={cn(
                            'flex size-7 shrink-0 items-center justify-center rounded-full',
                            s.isToday
                              ? 'bg-emerald-500 text-white'
                              : s.past
                                ? 'bg-muted text-muted-foreground'
                                : 'border-muted-foreground/30 text-muted-foreground border border-dashed',
                          )}
                        >
                          {s.isToday ? (
                            <DoorOpen className="size-3.5" />
                          ) : s.past ? (
                            <Check className="size-3.5" />
                          ) : (
                            <span className="text-[10px] font-medium tabular-nums">
                              {d.getDate()}
                            </span>
                          )}
                        </span>

                        <span className="min-w-0">
                          <span
                            className={cn(
                              'block font-mono text-sm tabular-nums',
                              s.isToday && 'font-semibold',
                            )}
                          >
                            {s.on}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {WEEKDAY_FULL[d.getDay()]} · {hhmm(data.startTime)}
                          </span>
                        </span>

                        {s.isToday && (
                          <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            ӨНӨӨДӨР
                          </span>
                        )}

                        <span className="flex-1" />

                        {/*
                          ⚠ ИРЭЭДҮЙН оролт дээр тоо ХАРУУЛАХГҮЙ. «0/3
                          ирсэн» гэвэл асуудал мэт харагдана — тэнд
                          хараахан хэн ч ирэх ёсгүй.
                        */}
                        {s.past || s.isToday ? (
                          <span
                            className={cn(
                              'text-xs tabular-nums',
                              full
                                ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                : s.attended > 0
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {s.attended}/{data.enrolled} ирсэн
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">
                            хараахан болоогүй
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      ))}

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
 *
 * ★ ОЛОН ХҮНТЭЙ АНГИД ЗОРИУЛСАН
 *
 * 20-30 хүнтэй ангид зүгээр жагсаалт нь ажиллахгүй: ресепшн нэг
 * хүнийг олохын тулд гүйлгэж хайна. Тиймээс:
 *   • хайлт (нэр, утас)
 *   • шүүлт: Ирээгүй / Ирсэн — хаалган дээр «хэн үлдсэн» нь гол асуулт
 *   • ирээгүй хүн ДЭЭГҮҮР — дараагийн ажил эхэнд байна
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
  const [search, setSearch] = useState('');
  const [only, setOnly] = useState<'all' | 'here' | 'away'>('all');

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
        await api.del(`/yoga/courses/${courseId}/attendance/${p.id}/${on}`);
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

  const people = data?.people ?? [];
  const t = search.trim().toLowerCase();
  const shown = people
    .filter((p) => (only === 'all' ? true : only === 'here' ? p.here : !p.here))
    .filter(
      (p) => !t || p.name.toLowerCase().includes(t) || (p.phone ?? '').includes(t),
    )
    /*
     * Ирээгүй хүн ДЭЭГҮҮР. Хаалган дээрх дараагийн ажил бол ирээгүй
     * хүнийг оруулах — ирсэн хүмүүс дээр гүйлгэх шаардлагагүй.
     */
    .sort((a, b) => Number(a.here) - Number(b.here) || a.name.localeCompare(b.name));

  const away = people.length - (data?.present ?? 0);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ирц · {on}</DialogTitle>
          <DialogDescription>
            {hhmm(startTime)} · Тэмдэглэхэд хаалга нээгдэнэ
          </DialogDescription>
        </DialogHeader>

        {/* ── Товч тоо + шүүлт ── */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', `Бүгд ${people.length}`],
              ['away', `Ирээгүй ${away}`],
              ['here', `Ирсэн ${data?.present ?? 0}`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setOnly(k)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs transition-colors',
                only === k
                  ? 'bg-primary text-primary-foreground border-primary font-medium'
                  : 'hover:bg-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {people.length > 6 && (
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Нэр, утсаар хайх…"
              className="pl-9"
            />
          </div>
        )}

        {/*
          ⚠ Тогтмол өндөртэй, ДОТРОО гүйнэ. Цонх нь агуулгаараа өсвөл
          30 хүнтэй ангид дэлгэцээс халина.
        */}
        <div className="h-[22rem] space-y-1.5 overflow-y-auto pr-1">
          {!data ? (
            <Skeleton className="h-40 w-full" />
          ) : shown.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              {people.length === 0
                ? 'Энэ ангид гишүүн алга'
                : 'Шүүлтэд тохирох хүн алга'}
            </p>
          ) : (
            shown.map((p) => (
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
                    {p.owed > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {' · ⚠ үлдэгдэлтэй'}
                      </span>
                    )}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant={p.here ? 'ghost' : 'default'}
                  disabled={busy !== null}
                  onClick={() => void toggle(p)}
                  className="shrink-0"
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
