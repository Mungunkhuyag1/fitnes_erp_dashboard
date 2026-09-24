'use client';

import { CalendarPlus, Flower2, Users } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { YogaClassDialog } from '@/components/yoga-class-dialog';
import { YogaClassForm } from '@/components/yoga-class-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface YogaClassRow {
  id: string;
  title: string;
  instructor: string | null;
  startsAt: string;
  durationMin: number;
  capacity: number | null;
  price: number;
  note: string | null;
  cancelledAt: string | null;
  booked: number;
  attended: number;
  paid: number;
  owed: number;
}

/** `2026-09-25 · Пүрэв` */
const DAY = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA');
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Йогийн хичээлийн хуваарь.
 *
 * ★ ЗААЛНААС ТУСДАА
 *
 * Йог нь терминал, гишүүнчлэл, эрхийн хугацаа аль нэгтэй нь
 * холбогдохгүй — хаалгыг админ өөрөө нээж өгдөг. Тиймээс энэ дэлгэц
 * цэвэр БҮРТГЭЛ: хэзээ ямар хичээл байна, хэн явж байна, хэдийг
 * төлсөн.
 *
 * ⚠ Мөнгийг заалны орлоготой НЭГТГЭЖ ХАРУУЛАХГҮЙ. Захиалагч тусдаа
 * тооцоо хүссэн; нэгтгэвэл аль үйлчилгээ хэр ашигтайг ялгах
 * боломжгүй болно.
 */
export default function YogaPage() {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<YogaClassRow | null>(null);

  const { data, loading, reload } = useApi<YogaClassRow[]>('/yoga/classes');
  const { data: sum, reload: reloadSum } = useApi<{
    classes: number;
    bookings: number;
    attended: number;
    paid: number;
    owed: number;
  }>('/yoga/summary');

  function refresh() {
    reload();
    reloadSum();
  }

  // Өдрөөр бүлэглэнэ — хуваарь нь цагийн дараалалтай уншигддаг.
  const days = new Map<string, YogaClassRow[]>();
  for (const c of data ?? []) {
    const k = dayKey(c.startsAt);
    days.set(k, [...(days.get(k) ?? []), c]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Йог"
        description="Хичээлийн хуваарь, оролцогч, төлбөр — заалнаас тусдаа"
      >
        {can('manager') && (
          <Button onClick={() => setOpen(true)}>
            <CalendarPlus className="size-4" />
            Хичээл нэмэх
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Хичээл" value={sum?.classes ?? '—'} sub="Дараагийн 30 хоног" />
        <StatCard
          label="Бүртгүүлсэн"
          value={sum?.bookings ?? '—'}
          suffix="хүн"
          sub={sum ? `${sum.attended} ирсэн` : undefined}
        />
        <StatCard
          label="Хүлээн авсан"
          value={money(sum?.paid ?? 0)}
          sub="Зөвхөн йог"
        />
        {/*
          ⚠ Авлагыг ТУСДАА. Заалны талтай ижил дүрэм: аваагүй мөнгийг
          орлогод нийлүүлбэл кассанд байгаатай таарахаа болино.
        */}
        <StatCard
          label="Авлага"
          value={money(sum?.owed ?? 0)}
          sub={sum?.owed ? 'Мөнгө хүлээгдэж байна' : 'Авлага алга'}
        />
      </div>

      {loading && !data ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : days.size === 0 ? (
        <EmptyState
          icon={Flower2}
          title="Хичээл алга"
          hint="Дараагийн 30 хоногт төлөвлөсөн хичээл байхгүй байна."
        />
      ) : (
        <div className="space-y-4">
          {[...days.entries()].map(([k, list]) => {
            const d = new Date(`${k}T00:00:00`);
            return (
              <div key={k} className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium">
                  {k} · {DAY[d.getDay()]}
                </p>
                <Card className="py-0">
                  <CardContent className="p-0">
                    <ul className="divide-border divide-y">
                      {list.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setDetail(c)}
                            className="hover:bg-muted/50 flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors"
                          >
                            <span className="font-mono text-sm font-semibold tabular-nums">
                              {clock(c.startsAt)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  'block truncate text-sm font-medium',
                                  c.cancelledAt && 'text-muted-foreground line-through',
                                )}
                              >
                                {c.title}
                              </span>
                              <span className="text-muted-foreground block truncate text-xs">
                                {c.instructor ?? 'Багш заагаагүй'} · {c.durationMin} мин
                              </span>
                            </span>

                            {c.cancelledAt ? (
                              <Badge variant="outline" className="text-destructive">
                                Цуцалсан
                              </Badge>
                            ) : (
                              <>
                                {/*
                                  Дүүрсэн хичээлийг ТОДОРХОЙ харуулна —
                                  ажилтан дарж ороод байж мэдэхээс өмнө.
                                */}
                                <span
                                  className={cn(
                                    'flex items-center gap-1 text-xs tabular-nums',
                                    c.capacity !== null && c.booked >= c.capacity
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-muted-foreground',
                                  )}
                                >
                                  <Users className="size-3.5" />
                                  {c.booked}
                                  {c.capacity !== null && `/${c.capacity}`}
                                </span>
                                {c.owed > 0 && (
                                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 tabular-nums dark:text-amber-400">
                                    Авлага {money(c.owed)}
                                  </span>
                                )}
                                <span className="text-muted-foreground text-xs tabular-nums">
                                  {money(c.paid)}
                                </span>
                              </>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <YogaClassForm open={open} onOpenChange={setOpen} onDone={refresh} />
      <YogaClassDialog
        row={detail}
        onClose={() => setDetail(null)}
        onDone={refresh}
      />
    </div>
  );
}
