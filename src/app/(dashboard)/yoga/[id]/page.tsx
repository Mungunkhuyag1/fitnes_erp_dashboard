'use client';

import { ArrowLeft, Archive, Pencil, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { LinkButton } from '@/components/link-button';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { YogaCourseForm } from '@/components/yoga-course-form';
import { YogaMembers } from '@/components/yoga-members';
import { YogaSchedule } from '@/components/yoga-schedule';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorToast } from '@/lib/errors';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { COURSE_STATE, hhmm, WEEKDAY, type YogaCourse } from '@/lib/yoga';

/**
 * Нэг ангийн дэлгэц.
 *
 * ★ ХОЁР ХЭСЭГ — ГИШҮҮД ба ЦАГИЙН ХУВААРЬ
 *
 * Ресепшний хоёр өөр ажил: «хэн бүртгүүлсэн, хэн төлсөн» ба «өнөөдөр
 * хэн ирэх ёстой». Нэг жагсаалтад шахвал аль нэг нь үргэлж бүдгэрнэ.
 */
export default function YogaCoursePage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const [edit, setEdit] = useState(false);

  const { data: c, loading, reload } = useApi<YogaCourse>(`/yoga/courses/${id}`);

  async function toggleArchive() {
    if (!c) return;
    try {
      await api.patch(`/yoga/courses/${c.id}`, { archived: !c.archivedAt });
      toast.success(c.archivedAt ? 'Архиваас гаргав' : 'Архивлав');
      reload();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    }
  }

  if (loading && !c) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (!c) return null;

  const st = COURSE_STATE[c.state];

  return (
    <div className="space-y-5">
      <PageHeader
        title={c.name}
        description={`${c.instructor ?? 'Багш заагаагүй'} · ${c.startsOn} → ${c.endsOn}`}
      >
        <LinkButton variant="ghost" href="/yoga">
          <ArrowLeft className="size-4" />
          Буцах
        </LinkButton>
        {can('manager') && (
          <>
            <Button variant="outline" onClick={() => setEdit(true)}>
              <Pencil className="size-4" />
              Засах
            </Button>
            {/*
              ⚠ УСТГАХ биш АРХИВЛАХ. Гишүүнтэй ангийг устгавал төлбөр,
              ирцийн бүртгэл алга болно — backend ч 409 буцаана.
            */}
            <Button variant="outline" onClick={toggleArchive}>
              <Archive className="size-4" />
              {c.archivedAt ? 'Архиваас гаргах' : 'Архивлах'}
            </Button>
          </>
        )}
      </PageHeader>

      {/* Ангийн хуваарь — нэг харцаар */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={cn('rounded-md px-2 py-0.5 text-xs font-medium', st.tone)}
        >
          {st.label}
        </span>
        {WEEKDAY.map((w, i) => (
          <span
            key={i}
            className={cn(
              'rounded px-1.5 py-0.5 text-xs',
              c.weekdays.includes(i)
                ? 'bg-primary text-primary-foreground font-medium'
                : 'bg-muted/50 opacity-40',
            )}
          >
            {w}
          </span>
        ))}
        <span className="text-muted-foreground font-mono text-xs">
          {hhmm(c.startTime)} · {c.durationMin} мин · {c.sessions} оролт
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Гишүүд"
          value={c.enrolled}
          suffix={c.capacity !== null ? `/ ${c.capacity}` : 'хүн'}
          ratio={c.capacity ? c.enrolled / c.capacity : undefined}
        />
        <StatCard label="Ангийн үнэ" value={money(c.price)} sub="Нэг хүн" />
        <StatCard label="Хүлээн авсан" value={money(c.paid)} />
        <StatCard
          label="Үлдэгдэл"
          value={money(c.owed)}
          sub={c.owed ? 'Цуглуулах ёстой' : 'Үлдэгдэл алга'}
        />
      </div>

      {/*
        ⚠ Гишүүд нь АНХДАГЧ таб. Ресепшний хамгийн түгээмэл асуулт
        «энэ хүн төлсөн үү» — хуваарь нь хааяа хэрэгтэй.
      */}
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="size-4" />
            Гишүүд
            <span className="text-muted-foreground ml-1 text-xs">
              {c.enrolled}
            </span>
          </TabsTrigger>
          <TabsTrigger value="schedule">Цагийн хуваарь</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="pt-4">
          <YogaMembers course={c} onDone={reload} />
        </TabsContent>

        <TabsContent value="schedule" className="pt-4">
          <YogaSchedule course={c} onDone={reload} />
        </TabsContent>
      </Tabs>

      {edit && (
        <YogaCourseForm
          open={edit}
          onOpenChange={setEdit}
          onDone={reload}
          course={c}
        />
      )}
    </div>
  );
}
