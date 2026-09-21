'use client';

import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { TaskList, type TaskOccurrence } from '@/components/task-list';
import { KIND_LABEL, TaskDialog, type TaskRule } from '@/components/task-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { api, qs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

/** Даваагаар эхэлнэ — Монголд долоо хоног даваагаас эхэлдэг. */
const WEEKDAYS = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];
const MONTHS = [
  '1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
  '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар',
];

/** `YYYY-MM-DD` — орон нутгийн огноог UTC хөрвүүлэлтгүйгээр. */
function dayStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Сарын 6×7 нүдний тор.
 *
 * ⚠ Заавал 42 нүд — сар бүр өөр өндөртэй байвал сар сольход бүхэл
 * хуудас үсэрч, нүд ядаргаатай. Тогтмол өндөр нь тайван.
 */
function monthGrid(year: number, month0: number): Date[] {
  const first = new Date(year, month0, 1);
  // `getDay()` нь Ням = 0. Даваагаар эхлүүлэхийн тулд шилжүүлнэ.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month0, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Төлөвлөгөөт ажил — САРЫН КАЛЕНДАРЬ.
 *
 * ★ ЯАГААД КАЛЕНДАРЬ, ХҮСНЭГТ БИШ
 *
 * Давтагдах ажил нь хүснэгтэд утгагүй: «өдөр бүр» гэсэн нэг мөр нь
 * сарын 30 өдөрт юу болохыг хэлэхгүй. Календарь дээр ачаалал ЯГ
 * харагдана — аль өдөр хэт олон ажил овоолсныг нүдээр мэднэ.
 */
export default function TasksPage() {
  const { can } = useAuth();
  const today = dayStr(new Date());

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [dialog, setDialog] = useState<{ open: boolean; task: TaskRule | null }>({
    open: false,
    task: null,
  });

  const cells = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const from = dayStr(cells[0]);
  const to = dayStr(cells[41]);

  const { data, loading, reload } = useApi<TaskOccurrence[]>(
    `/tasks/occurrences${qs({ from, to })}`,
  );

  /** Өдөр → тэр өдрийн ажлууд. Нүд бүрд шүүлт хийхээс сэргийлнэ. */
  const byDay = useMemo(() => {
    const m = new Map<string, TaskOccurrence[]>();
    for (const o of data ?? []) {
      const list = m.get(o.on);
      if (list) list.push(o);
      else m.set(o.on, [o]);
    }
    return m;
  }, [data]);

  const shift = (delta: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  /** Дүрмийг засахын тулд бүтэн мөрийг татна — тохиолдолд бүгд байхгүй. */
  async function edit(taskId: string) {
    try {
      const rules = await api.get<TaskRule[]>('/tasks?all=true');
      const t = rules.find((r) => r.id === taskId);
      if (t) setDialog({ open: true, task: t });
    } catch (e) {
      // Чимээгүй байвал харандаа ер ажиллахгүй мэт харагдана.
      toast.error(e instanceof Error ? e.message : 'Ажлын мэдээлэл татагдсангүй');
    }
  }

  const dayItems = byDay.get(selected) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Төлөвлөгөөт ажил"
        description="Ажилтнуудын давтагдах болон нэг удаагийн даалгавар"
      >
        {can('manager') && (
          <Button onClick={() => setDialog({ open: true, task: null })}>
            <Plus className="size-4" />
            Ажил төлөвлөх
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        {/* ── Сарын тор ── */}
        <Card className="py-0">
          <CardContent className="p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => shift(-1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-36 text-center text-sm font-medium">
                  {cursor.y} · {MONTHS[cursor.m]}
                </span>
                <Button variant="ghost" size="icon" onClick={() => shift(1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  setCursor({ y: d.getFullYear(), m: d.getMonth() });
                  setSelected(today);
                }}
              >
                Өнөөдөр
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="text-muted-foreground pb-1 text-center text-xs font-medium"
                >
                  {w}
                </div>
              ))}

              {loading && !data
                ? Array.from({ length: 42 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))
                : cells.map((d) => {
                    const key = dayStr(d);
                    const items = byDay.get(key) ?? [];
                    const open = items.filter((o) => !o.done).length;
                    const inMonth = d.getMonth() === cursor.m;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelected(key)}
                        className={cn(
                          'flex h-20 flex-col items-start gap-0.5 rounded-lg border p-1.5 text-left transition-colors',
                          'hover:bg-accent',
                          // Өөр сарын өдрийг БҮДЭГ болгоно — тор нь
                          // тасрахгүй ч анхаарал өнөөгийн сар дээр.
                          !inMonth && 'text-muted-foreground/50',
                          selected === key && 'ring-primary ring-2',
                          key === today && 'border-primary',
                        )}
                      >
                        <span
                          className={cn(
                            'text-xs tabular-nums',
                            key === today && 'text-primary font-semibold',
                          )}
                        >
                          {d.getDate()}
                        </span>
                        {/* Гурваас илүүг тоогоор — нүд бөглөрөхөөс сэргийлнэ. */}
                        {items.slice(0, 2).map((o) => (
                          <span
                            key={o.key}
                            className={cn(
                              'w-full truncate rounded px-1 text-[10px] leading-tight',
                              o.done
                                ? 'text-muted-foreground line-through'
                                : 'bg-primary/10 text-primary',
                            )}
                          >
                            {o.atTime ? `${o.atTime} ` : ''}
                            {o.title}
                          </span>
                        ))}
                        {items.length > 2 && (
                          <span className="text-muted-foreground text-[10px]">
                            +{items.length - 2} бусад
                          </span>
                        )}
                        {open > 0 && items.length <= 2 && <span className="flex-1" />}
                      </button>
                    );
                  })}
            </div>
          </CardContent>
        </Card>

        {/* ── Сонгосон өдөр ── */}
        <Card className="py-0">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="text-muted-foreground size-4" />
              <h2 className="text-sm font-medium">
                {selected === today ? 'Өнөөдөр' : selected}
              </h2>
              <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                {dayItems.filter((o) => !o.done).length} / {dayItems.length}
              </span>
            </div>

            {dayItems.length ? (
              <TaskList
                items={dayItems}
                onChanged={reload}
                onOpen={edit}
                canEdit={can('manager')}
                showKind
              />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Энэ өдөр ажил алга
              </p>
            )}

            {can('manager') && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDialog({ open: true, task: null })}
              >
                <Plus className="size-4" />
                Энэ өдөрт нэмэх
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskDialog
        open={dialog.open}
        task={dialog.task}
        defaultDay={selected}
        onClose={() => setDialog({ open: false, task: null })}
        onSaved={reload}
      />

      {/* Тайлбар — давталтын төрлүүд юу гэсэн үг болохыг сануулна. */}
      <p className="text-muted-foreground text-xs">
        Давталт: {Object.values(KIND_LABEL).join(' · ')}. Унтраасан ажил
        календарьт харагдахгүй ч өнгөрсөн гүйцэтгэл нь түүхэнд үлдэнэ.
      </p>
    </div>
  );
}
