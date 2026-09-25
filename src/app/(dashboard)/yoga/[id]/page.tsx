'use client';

import { Archive, ArrowLeft, Pencil, UserPlus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { LinkButton } from '@/components/link-button';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { YogaCourseForm } from '@/components/yoga-course-form';
import { YogaAddMemberDialog } from '@/components/yoga-members';
import { YogaSession } from '@/components/yoga-session';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
 * ★ НЭГ ДЭЛГЭЦ — таб АЛГА
 *
 * Өмнө нь «Цагийн хуваарь» ба «Гишүүд» гэсэн хоёр таб байв. Гэвч
 * ресепшний ажил тэр хоёрыг ДАНДАА хамт шаарддаг: ирц тэмдэглэж
 * байхдаа «энэ хүн төлсөн үү?» гэдгийг харах. Хоёр таб хооронд
 * үсрэх нь хаалган дээр хүн хүлээж байхад хэт урт байв.
 *
 * Одоо `YogaSession` нь хуанлийн мөр (анхдагчаар ӨНӨӨДӨР) + тэр
 * оролтын гишүүдийг ТӨЛБӨРИЙН МЭДЭЭЛЭЛТЭЙ нэг дор харуулна.
 * Дэлгэрэнгүйг `yoga-session.tsx`-д.
 */
export default function YogaCoursePage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const [edit, setEdit] = useState(false);
  const [addMember, setAddMember] = useState(false);

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
        {/*
          ⚠ Гишүүн нэмэх нь ХАМГИЙН ТҮГЭЭМЭЛ үйлдэл — толгойд, ил.
          Урьд нь «Гишүүд» табын дотор байсан тул ажилтан хуваарь
          харж байгаад хүн бүртгэхийн тулд таб солих шаардлагатай байв.
        */}
        <Button onClick={() => setAddMember(true)}>
          <UserPlus className="size-4" />
          Гишүүн нэмэх
        </Button>
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

      <YogaSession course={c} onDone={reload} />

      {/*
        ⚠ ХУУДАСНЫ түвшинд — товч нь толгойд байдаг. (Табтай байхад
        `TabsContent` салдаг тул цонх render хийгддэггүй байв; таб
        арилсан ч товчны хажууд байлгах нь зөв хэвээр.)
      */}
      <YogaAddMemberDialog
        open={addMember}
        onOpenChange={setAddMember}
        course={c}
        onDone={reload}
      />

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
