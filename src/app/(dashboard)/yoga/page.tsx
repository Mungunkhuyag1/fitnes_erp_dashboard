'use client';

import { CalendarPlus, Flower2, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { FilterSelect, type FilterOption } from '@/components/filter-select';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { YogaCourseForm } from '@/components/yoga-course-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import { qs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { COURSE_STATE, hhmm, WEEKDAY, type YogaCourse } from '@/lib/yoga';

const STATE_FILTERS: FilterOption[] = [
  { value: '', label: 'Бүх төлөв' },
  { value: 'active', label: 'Явагдаж буй', dot: 'bg-emerald-500' },
  { value: 'upcoming', label: 'Эхлээгүй', dot: 'bg-sky-500' },
  { value: 'finished', label: 'Хугацаа дууссан', dot: 'bg-muted-foreground' },
];

/**
 * Йогийн ангиуд.
 *
 * ★ ХҮСНЭГТ БИШ, GRID
 *
 * Анги бүр нэг дор олон зүйл хэлнэ: хугацаа, гарагууд, хэдэн хүн,
 * хэдэн оролт, төлбөрийн байдал. Хүснэгтийн мөрөнд шахвал багана нь
 * 8 болж, утсан дээр хагас нь нуугдана. Карт нь тэр бүхнийг зэрэг
 * харуулна.
 *
 * ⚠ Мөнгийг заалны орлоготой НЭГТГЭХГҮЙ — захиалагч тусдаа тооцоо
 * хүссэн.
 */
export default function YogaPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const q = useDebounce(search, 250);

  const { data, loading, reload } = useApi<YogaCourse[]>(
    `/yoga/courses${qs({ q: q.trim() || undefined, state: state || undefined })}`,
  );
  const { data: sum, reload: reloadSum } = useApi<{
    courses: number;
    enrolled: number;
    paid: number;
    owed: number;
  }>('/yoga/summary');

  function refresh() {
    reload();
    reloadSum();
  }

  const filtered = !!(q.trim() || state);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Йог"
        description="Анги, гишүүд, ирц — заалнаас тусдаа тооцоо"
      >
        {can('manager') && (
          <Button onClick={() => setOpen(true)}>
            <CalendarPlus className="size-4" />
            Анги нэмэх
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Анги" value={sum?.courses ?? '—'} sub="Дуусаагүй" />
        <StatCard
          label="Бүртгүүлсэн"
          value={sum?.enrolled ?? '—'}
          suffix="хүн"
        />
        <StatCard label="Хүлээн авсан" value={money(sum?.paid ?? 0)} sub="Зөвхөн йог" />
        {/*
          ⚠ Үлдэгдлийг ТУСДАА. Заалны талтай ижил дүрэм: аваагүй
          мөнгийг орлогод нийлүүлбэл кассанд байгаатай таарахаа болино.
        */}
        <StatCard
          label="Үлдэгдэл"
          value={money(sum?.owed ?? 0)}
          sub={sum?.owed ? 'Цуглуулах ёстой' : 'Үлдэгдэл алга'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ангийн нэр, багшаар хайх…"
            className="pl-9"
          />
        </div>
        <FilterSelect
          value={state}
          onChange={setState}
          options={STATE_FILTERS}
          placeholder="Төлөв"
        />
      </div>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={filtered ? Search : Flower2}
          title={filtered ? 'Тохирох анги олдсонгүй' : 'Анги алга'}
          hint={
            filtered
              ? 'Шүүлтүүрээ өөрчилж үзнэ үү.'
              : 'Анги нэмэхэд хуваарь нь өөрөө тооцоологдоно.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((c) => {
            const st = COURSE_STATE[c.state];
            const full = c.capacity !== null && c.enrolled >= c.capacity;
            return (
              <Card
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/yoga/${c.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/yoga/${c.id}`);
                  }
                }}
                className="hover:border-primary/40 cursor-pointer transition-colors"
              >
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {c.instructor ?? 'Багш заагаагүй'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-md px-2 py-0.5 text-xs font-medium',
                        st.tone,
                      )}
                    >
                      {st.label}
                    </span>
                  </div>

                  <div className="text-muted-foreground space-y-1 text-xs">
                    <p className="font-mono">
                      {c.startsOn} → {c.endsOn}
                    </p>
                    <p className="flex flex-wrap items-center gap-1">
                      {/*
                        Долоо хоногийн бүх өдрийг харуулж, сонгосныг нь
                        тодруулна — «Да Лх Ба» гэж бичихээс хуваарь нь
                        нэг харцаар ойлгогдоно.
                      */}
                      {WEEKDAY.map((w, i) => (
                        <span
                          key={i}
                          className={cn(
                            'rounded px-1 py-0.5 text-[10px]',
                            c.weekdays.includes(i)
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'bg-muted/50 opacity-40',
                          )}
                        >
                          {w}
                        </span>
                      ))}
                      <span className="ml-1 font-mono">{hhmm(c.startTime)}</span>
                    </p>
                    <p>
                      {c.sessions} оролт
                      {c.nextOn && ` · дараагийнх ${c.nextOn}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
                    <span
                      className={cn(
                        'flex items-center gap-1 tabular-nums',
                        full ? 'text-amber-600 dark:text-amber-400' : '',
                      )}
                    >
                      <Users className="size-3.5" />
                      {c.enrolled}
                      {c.capacity !== null && `/${c.capacity}`}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {money(c.paid)}
                    </span>
                    {c.owed > 0 && (
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 tabular-nums dark:text-amber-400">
                        Үлдэгдэл {money(c.owed)}
                      </span>
                    )}
                    <span className="text-muted-foreground ml-auto tabular-nums">
                      {money(c.price)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <YogaCourseForm open={open} onOpenChange={setOpen} onDone={refresh} />
    </div>
  );
}
