'use client';

import { CalendarCheck, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { LinkButton } from '@/components/link-button';
import { TaskDialog, type TaskRule } from '@/components/task-dialog';
import { TaskList, type TaskOccurrence } from '@/components/task-list';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export interface Todo {
  today: string;
  items: TaskOccurrence[];
  overdue: TaskOccurrence[];
}

/**
 * Өнөөдрийн ажил.
 *
 * ★ КАРТААС ТУСДАА ГАРГАСАН ШАЛТГААН
 *
 * Нүүр хуудас нь ажил БА анхаарах зүйлс ХОЁУЛАНГ нь хоосон
 * үед дээд мөрийг БүХэлд нь нуух шаардлагатай. Үүнийг мэдэхийн
 * тулд өгөгдлийг ХУУДАС өөрөө эзэмших ёстой — карт дотороо
 * татвал хуудас түүнийг асуух аргагүй.
 */
export function useTodo() {
  return useApi<Todo>('/tasks/todo', { refreshMs: 120_000 });
}

/**
 * Нүүр хуудасны ажлын жагсаалт.
 *
 * ★ ЗӨВХӨН ГҮЙЦЭТГЭЭГҮЙ
 *
 * Гүйцэтгэсэн ажлыг харуулбал жагсаалт өдрийн турш уртсаж, үлдсэн ажил
 * доош живнэ. «Юу хийх ёстой вэ» гэдэг нь нүүрний асуулт; «юу хийсэн
 * бэ» гэдэг нь календарийн асуулт.
 *
 * ★ ХОЦОРСОН НЬ ТУСДАА
 *
 * Өчигдрийн хийгдээгүй ажлыг өнөөдрийнхтэй хольвол аль нь яаралтайг
 * ялгахгүй. Backend 7 хоногоор хязгаарладаг.
 */
export function TaskTodoCard({
  data,
  loading,
  reload,
}: {
  data: Todo | null;
  loading: boolean;
  reload: () => void;
}) {
  const { can } = useAuth();
  const [task, setTask] = useState<TaskRule | null>(null);

  /*
   * Дэлгэрэнгүй рүү ороход ДҮРЭМИЙГ татна.
   *
   * Нүүрийн жагсаалт нь ТОХИОЛДОЛ (нэг өдрийн) байдаг тул давталт,
   * дуусах огноо зэрэг талбарууд түүн дээр БАЙХГҮЙ.
   */
  async function openTask(taskId: string) {
    try {
      const rules = await api.get<TaskRule[]>('/tasks?all=true');
      const t = rules.find((r) => r.id === taskId);
      if (t) setTask(t);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ажлын мэдээлэл татагдсангүй');
    }
  }

  /**
   * Тэмдэг дээрх тоо — ЗӨВХӨН хийгдээгүй.
   *
   * Жагсаалтад хийгдсэн ажил ч харагдана (буцаах, засах
   * боломжтой байхын тулд) ч тэмдэг нь «хийх ажил»-ыг л хэлнэ.
   */
  const openCount =
    (data?.items.filter((o) => !o.done).length ?? 0) + (data?.overdue.length ?? 0);
  const total = (data?.items.length ?? 0) + (data?.overdue.length ?? 0);

  return (
    <Card>
      {/*
        ⚠ `CardHeader` нь GRID (`grid-cols-[1fr_auto]` нь `data-slot=card-action`
        байхад л асана). `flex-row justify-between` гэж бичихэд
        дэлгэц нь grid хэвээр тул товч ХОЁР ДАХЬ МӨРӨНД буудаг.
        Зөв зам нь `CardAction`.
      */}
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarCheck className="text-muted-foreground size-4" />
          Өнөөдрийн ажил
          {openCount > 0 && (
            <Badge variant="outline" className="font-normal tabular-nums">
              {openCount}
            </Badge>
          )}
        </CardTitle>
        <CardAction>
          <LinkButton size="sm" variant="ghost" href="/tasks">
            Календарь
          </LinkButton>
        </CardAction>
      </CardHeader>

      <CardContent>
        {loading && !data ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : total === 0 ? (
          /*
            Хоосон төлөв — «Анхаарах зүйлс»-тэй ИЖИЛ байрлал.

            Хоёр карт зэрэгцээ байгаа тул хоосон төлөв нь өөр хэлбэртэй
            байвал аль нь алиных болох нь төөрөгдүүлнэ.
          */
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="bg-emerald-500/10 mb-3 flex size-11 items-center justify-center rounded-full">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <p className="text-sm font-medium">Төлөвлөгдсөн ажил алга</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Өнөөдөр хийх зүйл товлогдоогүй байна
            </p>
            {can('manager') && (
              <LinkButton size="sm" variant="outline" href="/tasks" className="mt-3">
                Ажил төлөвлөх
              </LinkButton>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Бүгд хийгдсэн үед сайн мэдээг ХЭЛНЭ — гэхдээ жагсаалтыг
                НУУХГҮЙ: буруу дарсан бол буцаах зам хэрэгтэй. */}
            {openCount === 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                Өнөөдрийн ажил бүгд хийгдсэн
              </div>
            )}
            {data!.overdue.length > 0 && (
              <div>
                <p className="text-destructive mb-1 text-xs font-medium">
                  Хоцорсон ({data!.overdue.length})
                </p>
                <TaskList
                  items={data!.overdue}
                  onChanged={reload}
                  onOpen={openTask}
                  canEdit={can('manager')}
                  showDate
                  today={data!.today}
                />
              </div>
            )}
            {data!.items.length > 0 && (
              <TaskList
                items={data!.items}
                onChanged={reload}
                onOpen={openTask}
                canEdit={can('manager')}
                today={data!.today}
              />
            )}
          </div>
        )}
      </CardContent>

      <TaskDialog
        open={task !== null}
        task={task}
        defaultDay={data?.today ?? ''}
        onClose={() => setTask(null)}
        onSaved={reload}
      />
    </Card>
  );
}
