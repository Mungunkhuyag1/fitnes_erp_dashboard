'use client';

import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TaskList, type TaskOccurrence } from '@/components/task-list';
import { KIND_LABEL, TaskDialog, type TaskRule } from '@/components/task-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { useIsMobile } from '@/hooks/use-mobile';
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
 * Сарын тор — ЗӨВХӨН ТУХАЙН САРЫН ӨДРҮҮД.
 *
 * Өмнөх/дараагийн сарын өдрүүдийг бүдэг үсгээр харуулдаг байсан
 * — тэдгээр нь дарагдах боловч «сараасаа гарсан» гэдгийг анзаарахад
 * хэцүү. Одоо эхний нүднүүд ХООСОН — `null`.
 *
 * Мөрийн тоо сараас хамаарна (4–6). Тогтмол 42 нүд барих нь
 * хоосон мөр үлдээх тул яг шаардлагатайг нь л зурна.
 */
function monthGrid(year: number, month0: number): (Date | null)[] {
  const first = new Date(year, month0, 1);
  // `getDay()` нь Ням = 0. Даваагаар эхлүүлэхийн тулд шилжүүлнэ.
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month0 + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 1; i <= days; i++) cells.push(new Date(year, month0, i));
  // Сүүлийн мөрийг дүүргэнэ — тор тэгш байх ёстой.
  while (cells.length % 7) cells.push(null);
  return cells;
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
  const isMobile = useIsMobile();
  const today = dayStr(new Date());
  /*
    Утасан дээр өдрийн жагсаалт ДООРООС гарах цонхоор.

    Хажуудаа байрлуулбал төк доошоо шилжээд календарь дарах бүрд
    гүйлгэх шаардлагатай болно — өдөр сонгох бүрд дэлгэц үсрэнэ.
  */
  const [sheet, setSheet] = useState(false);

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
  // Муж нь САР ӨӨРӨӨ — тороос хоосон нүд хасагдсан тул.
  const from = dayStr(new Date(cursor.y, cursor.m, 1));
  const to = dayStr(new Date(cursor.y, cursor.m + 1, 0));

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

  /** Өдрийн ажлууд — ширээний хажуугийн карт ба утасны цонхонд. */
  const dayPanel = (
    <div className="space-y-3">
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
          today={today}
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
    </div>
  );

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
                ? Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 sm:h-20" />
                  ))
                : cells.map((d, i) => {
                    // Сараас ГАДНАХ нүд — хоосон зай, дарагдахгүй.
                    if (!d) return <div key={`b${i}`} aria-hidden />;

                    const key = dayStr(d);
                    const items = byDay.get(key) ?? [];
                    const undone = items.filter((o) => !o.done);
                    // Цаг нь өнгөрсөн боловч хийгдээгүй — анхаарах шаардлагатай.
                    const overdue = key < today && undone.length > 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelected(key);
                          if (isMobile) setSheet(true);
                        }}
                        className={cn(
                          'flex h-14 flex-col items-start gap-0.5 rounded-lg border p-1 text-left transition-colors sm:h-20 sm:p-1.5',
                          'hover:bg-accent',
                          selected === key && 'ring-primary ring-2',
                          key === today && 'border-primary',
                          overdue && 'border-destructive/40 bg-destructive/[0.04]',
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

                        {/*
                          Утасан дээр ГАРЧИГ БАГТАХГҮЙ — 7 нүд × 40px өргөнд
                          үсгэнээс юу ч уншигдахгүй. ӨНГӨТ ЦЭГҮҮД болговол
                          «энэ өдөр ажил байна, хийгдээгүй нь хэд» гэдгийг хэлнэ.
                        */}
                        {items.length > 0 && (
                          <span className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                            {items.slice(0, 4).map((o) => (
                              <span
                                key={o.key}
                                className={cn(
                                  'size-1.5 rounded-full',
                                  o.done
                                    ? 'bg-emerald-500/60'
                                    : key < today
                                      ? 'bg-destructive'
                                      : 'bg-primary',
                                )}
                              />
                            ))}
                            {items.length > 4 && (
                              <span className="text-muted-foreground text-[9px] leading-none">
                                +{items.length - 4}
                              </span>
                            )}
                          </span>
                        )}

                        {/* Ширээнд — гарчиг бүтнээр. */}
                        <span className="hidden w-full flex-col gap-0.5 sm:flex">
                          {items.slice(0, 2).map((o) => (
                            <span
                              key={o.key}
                              className={cn(
                                'w-full truncate rounded px-1 text-[10px] leading-tight',
                                o.done
                                  ? 'text-muted-foreground line-through'
                                  : key < today
                                    ? 'bg-destructive/10 text-destructive'
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
                        </span>
                      </button>
                    );
                  })}
            </div>
          </CardContent>
        </Card>

        {/*
          ── Сонгосон өдөр ──

          Ширээнд хажуудаа; утасан дээр доороос гарах цонхоор
          (доор харна). Агуулга нь ИЖИЛ — `dayPanel`-ыг хуваана.
        */}
        <Card className="hidden py-0 lg:block">
          <CardContent className="p-4">{dayPanel}</CardContent>
        </Card>
      </div>

      {/* Утасанд — өдөр дарахад доороос гарах цонх. */}
      <Sheet open={sheet && isMobile} onOpenChange={setSheet}>
        <SheetContent side="bottom" className="max-h-[80svh] overflow-y-auto p-4">
          <SheetHeader className="sr-only">
            <SheetTitle>{selected} — ажлууд</SheetTitle>
          </SheetHeader>
          {dayPanel}
        </SheetContent>
      </Sheet>

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
