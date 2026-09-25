'use client';

import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Loader2,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FilterSelect, type FilterOption } from '@/components/filter-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { YogaMemberDialog } from '@/components/yoga-members';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { errorToast } from '@/lib/errors';
import { money, time } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  hhmm,
  PAYMENT_STATE,
  WEEKDAY,
  WEEKDAY_FULL,
  type YogaCourse,
  type YogaEnrollment,
} from '@/lib/yoga';

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

/** `sessionDetail` нь бүртгэлийн БҮХ талбарыг ирцтэй хамт буцаана. */
interface Person extends YogaEnrollment {
  here: boolean;
  at: string | null;
}

interface SessionDetail {
  on: string;
  present: number;
  total: number;
  people: Person[];
}

const SORTS: FilterOption[] = [
  { value: 'away', label: 'Ирээгүй дээгүүр' },
  { value: 'name', label: 'Нэрээр' },
  { value: 'owed', label: 'Үлдэгдэл (ихээс)' },
  { value: 'attended', label: 'Ирц (олноос)' },
];

/**
 * ЙОГИЙН АНГИ — НЭГ ДЭЛГЭЦ.
 *
 * ★ ЯАГААД ХОЁР ТАБЫГ НЭГТГЭВ
 *
 * Урьд нь «Цагийн хуваарь» ба «Гишүүд» гэсэн хоёр таб байв. Ресепшний
 * ажил тэр хоёрыг ДАНДАА хамт шаарддаг байсан:
 *
 *   1. хуваарь таб → өнөөдрийн мөрийг ол → дар
 *   2. цонх онгойно → ирц тэмдэглэ
 *   3. «энэ хүн төлсөн үү?» → цонхыг хаа → гишүүд таб → хай
 *   4. эргэж хуваарь таб → цонхыг дахин онгойлго
 *
 * Хаалган дээр хүн хүлээж байхад дөрвөн алхам хэт урт. Одоо:
 * ДЭЭД мөрийн хуанлиас өдөр сонгоно (анхдагчаар ӨНӨӨДӨР), доор тэр
 * оролтод явах гишүүд ТӨЛБӨРИЙН МЭДЭЭЛЭЛТЭЙ харагдана, checkbox
 * дарвал ирц бүртгэгдэнэ.
 *
 * ★ ХААЛГЫГ АСУУНА, ӨӨРӨӨ НЭЭХГҮЙ
 *
 * Өмнө нь ирц тэмдэглэх нь ХААЛГЫГ ЧИМЭЭГҮЙ нээдэг байв. Тэр нь хоёр
 * тохиолдолд буруу: ажилтан ирцийг НӨХӨЖ бүртгэж байгаа (хүн аль
 * хэдийн орсон), эсвэл андуурч дарсан. Тиймээс бүртгэл нь `openDoor:
 * false`-оор явж, дараа нь АСУУНА.
 *
 * ⚠ Ирц нь хаалганаас ТУСДАА хадгалагдана. Асуултад «үгүй» гэвэл ирц
 * хэвээр — мөнгө/бүртгэлийн баримт төхөөрөмжөөс хамаарах ёсгүй.
 */
export function YogaSession({
  course,
  onDone,
}: {
  course: YogaCourse;
  onDone: () => void;
}) {
  /** `null` = ажилтан хараахан сонгоогүй — анхдагч нь ДООШ УЛГААНА. */
  const [chosen, setChosen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('away');
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<YogaEnrollment | null>(null);
  /** Ирц бүртгэгдсэн хүн — «хаалга нээх үү?» гэж асуухаар хүлээж байна. */
  const [askDoor, setAskDoor] = useState<{ name: string; id: string } | null>(
    null,
  );
  const [opening, setOpening] = useState(false);

  const strip = useRef<HTMLDivElement>(null);

  const { data: sch } = useApi<Schedule>(`/yoga/courses/${course.id}/schedule`);

  /*
   * ★ АНХДАГЧ ӨДӨР — ӨНӨӨДӨР, эс бөгөөс ХАМГИЙН ДАРААГИЙНХ
   *
   * ⚠ «Өнөөдөр» нь ҮРГЭЛЖ хуваарьт байдаггүй: Да/Лх/Ба ангийн хувьд
   * Ням гарагт өнөөдрийн оролт БАЙХГҮЙ. Тэр үед хоосон дэлгэц харуулах
   * нь буруу — ажилтан «эвдэрсэн юм уу?» гэж бодно. Дараагийн оролт
   * руу, тэр ч байхгүй бол ХАМГИЙН СҮҮЛИЙНХ рүү (анги дууссан) орно.
   *
   * ⚠ Огноог клиент талд `new Date()`-ээр бодохгүй — `schedule` нь
   * `isToday`-г УЛААНБААТАРЫН цагаар СЕРВЕР талд тэмдэглэсэн байна.
   * Браузер өөр цагийн бүсэд байвал (эсвэл SSR нь UTC) өдөр гулсана.
   *
   * ⚠ Анхдагчийг `useEffect` + `setOn`-оор ТАВИХГҮЙ. Тэр нь cascading
   * render үүсгэдэг (`react-hooks/set-state-in-effect`) ба өгөгдөл
   * ирэх хооронд нэг хоосон зураг гарна. Оронд нь УЛГААНА: төлөвт
   * зөвхөн «ажилтан юу сонгосон» гэдгийг хадгална.
   */
  const on = chosen ?? defaultOn(sch?.sessions);

  /** Сонгосон чип дэлгэцийн дунд орно — 40 огноотой анги хамаагүй. */
  useEffect(() => {
    if (!on || !strip.current) return;
    const el = strip.current.querySelector<HTMLElement>(`[data-on="${on}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [on]);

  const { data: sess, reload } = useApi<SessionDetail>(
    on ? `/yoga/courses/${course.id}/sessions/${on}` : null,
  );

  function refresh() {
    reload();
    onDone();
  }

  const picked = sch?.sessions.find((s) => s.on === on) ?? null;
  /** Ирээдүйн оролтод ирц тэмдэглэх нь утгагүй — хэн ч хараахан ирээгүй. */
  const future = picked !== null && !picked.past && !picked.isToday;

  async function toggle(p: Person) {
    setBusy(p.id);
    try {
      if (p.here) {
        await api.del(`/yoga/courses/${course.id}/attendance/${p.id}/${on}`);
        toast.success(`${p.name} — ирц буцаав`);
        refresh();
      } else {
        /*
         * ⚠ `openDoor: false` — бүртгэл нь хаалганаас ТУСДАА. Дараа
         * асуух ба «тийм» гэвэл ижил endpoint-ыг `openDoor` нээлттэйгээр
         * дахин дуудна: backend нь ИДЕМПОТЕНТ (давхар бүртгэл үүсэхгүй)
         * тул хоёр дахь дуудлага нь ЗӨВХӨН хаалгыг нээнэ.
         */
        await api.post(`/yoga/courses/${course.id}/attendance`, {
          enrollmentId: p.id,
          sessionOn: on,
          openDoor: false,
        });
        refresh();
        // Өнгөрсөн оролтыг НӨХӨЖ бичиж байгаа бол хаалга асуух нь утгагүй.
        if (picked?.isToday) setAskDoor({ name: p.name, id: p.id });
        else toast.success(`${p.name} — ирц бүртгэв`);
      }
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  /** «Тийм, нээ» — ирц АЛЬ ХЭДИЙН бичигдсэн, энэ нь зөвхөн хаалга. */
  async function openDoor() {
    if (!askDoor) return;
    setOpening(true);
    try {
      const r = await api.post<{ door: { opened: boolean; error?: string } }>(
        `/yoga/courses/${course.id}/attendance`,
        { enrollmentId: askDoor.id, sessionOn: on, openDoor: true },
      );
      if (r.door.opened) {
        toast.success('🚪 Хаалга нээгдлээ');
      } else {
        toast.error('Хаалга нээгдсэнгүй', {
          description: `${r.door.error ?? 'терминал холбогдоогүй'} — ирц бүртгэгдсэн хэвээр`,
          duration: 8000,
        });
      }
      setAskDoor(null);
    } catch (e) {
      errorToast(e, 'Хаалга нээгдсэнгүй — ирц бүртгэгдсэн хэвээр');
    } finally {
      setOpening(false);
    }
  }

  // ⚠ `sess?.people ?? []` гэж шууд бичвэл `[]` нь render бүрд ШИНЭ
  // объект болж, доорх `useMemo` хэзээ ч кэшлэгдэхгүй.
  const people = useMemo(() => sess?.people ?? [], [sess]);
  const shown = useMemo(() => {
    const t = search.trim().toLowerCase();
    const list = t
      ? people.filter(
          (p) =>
            p.name.toLowerCase().includes(t) || (p.phone ?? '').includes(t),
        )
      : people;
    const by: Record<string, (a: Person, b: Person) => number> = {
      // Ирээгүй хүн ДЭЭГҮҮР — хаалган дээрх дараагийн ажил яг тэр.
      away: (a, b) => Number(a.here) - Number(b.here) || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      owed: (a, b) => b.owed - a.owed,
      attended: (a, b) => b.attended - a.attended,
    };
    return [...list].sort(by[sort] ?? by.away);
  }, [people, search, sort]);

  if (!sch) return <Skeleton className="h-96 w-full" />;

  if (!sch.sessions.length) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-14 text-center text-sm">
          Хуваарьт оролт алга — ангийн гарагуудыг тохируулна уу.
        </CardContent>
      </Card>
    );
  }

  const idx = sch.sessions.findIndex((s) => s.on === on);
  const step = (d: number) => {
    const next = sch.sessions[idx + d];
    if (next) setChosen(next.on);
  };

  return (
    <div className="space-y-3">
      {/*
        ★ ХУАНЛИЙН МӨР — хэвтээ гүйдэг.
        40 оролттой анги ч НЭГ мөрөнд багтана, сонгосон нь дунд байрлана.
      */}
      <div className="flex items-center gap-1.5">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => step(-1)}
          disabled={idx <= 0}
          aria-label="Өмнөх оролт"
          className="shrink-0"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/*
          ⚠ `scrollbar-none` биш — гүйлтийн зураас нь «энд гүйж болно»
          гэдгийг хэлэх ЦОР ГАНЦ дохио. Нуувал хэрэглэгч 13 огнооны
          4-ийг л байгаа гэж бодно.
        */}
        <div
          ref={strip}
          className="flex flex-1 gap-1.5 overflow-x-auto pb-1.5"
        >
          {sch.sessions.map((s) => {
            const d = new Date(`${s.on}T00:00:00`);
            const full = sch.enrolled > 0 && s.attended >= sch.enrolled;
            const active = s.on === on;
            return (
              <button
                key={s.on}
                type="button"
                data-on={s.on}
                onClick={() => setChosen(s.on)}
                title={`${WEEKDAY_FULL[d.getDay()]} · ${s.on}`}
                className={cn(
                  'flex min-w-14 shrink-0 flex-col items-center gap-0.5 rounded-xl border px-2.5 py-1.5 transition-colors',
                  // ⚠ ГУРВАН төлөв ГУРВАН өөр харагдана — зөвхөн өнгөөр
                  // биш, зураасан хүрээ/бүдгэрэлтээр ч ялгана.
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : s.isToday
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : s.past
                        ? 'bg-muted/40 border-border hover:bg-muted opacity-70'
                        : 'border-muted-foreground/25 hover:bg-muted/50 border-dashed',
                )}
              >
                <span className="text-[10px] leading-none opacity-70">
                  {WEEKDAY[d.getDay()]}
                </span>
                <span className="text-sm leading-none font-semibold tabular-nums">
                  {d.getDate()}
                </span>
                {/*
                  ⚠ ИРЭЭДҮЙН оролт дээр «0/5» ХАРУУЛАХГҮЙ — асуудал мэт
                  харагдана, тэнд хараахан хэн ч ирэх ёсгүй.
                */}
                <span
                  className={cn(
                    'text-[10px] leading-none tabular-nums',
                    active
                      ? 'opacity-80'
                      : full
                        ? 'font-medium text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground',
                  )}
                >
                  {s.past || s.isToday ? `${s.attended}/${sch.enrolled}` : '—'}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => step(1)}
          disabled={idx < 0 || idx >= sch.sessions.length - 1}
          aria-label="Дараагийн оролт"
          className="shrink-0"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* ── Сонгосон оролт: хэзээ, хэн ирсэн ── */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">
          {on}
          {picked && (
            <span className="text-muted-foreground ml-2 text-xs font-normal">
              {WEEKDAY_FULL[new Date(`${picked.on}T00:00:00`).getDay()]} ·{' '}
              {hhmm(sch.startTime)}
            </span>
          )}
        </p>
        {picked?.isToday && (
          <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            ӨНӨӨДӨР
          </span>
        )}
        {future && (
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
            ХАРААХАН БОЛООГҮЙ
          </span>
        )}
        <span className="flex-1" />
        <span className="text-muted-foreground text-xs tabular-nums">
          {sess?.present ?? 0} / {people.length} ирсэн
        </span>
      </div>

      {/* ── Хайлт + эрэмбэ ── */}
      {/*
        ⚠ Хайлт ҮРГЭЛЖ харагдана, «олон хүнтэй үед» гэж нуухгүй. Ресепшн
        хаалган дээр яаралтай ажилладаг: талбар байгаа эсэхийг бодох
        биш, шууд бичиж эхлэх ёстой.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Гишүүний нэр, утсаар хайх…"
            className="pl-9"
          />
        </div>
        <FilterSelect
          value={sort}
          onChange={setSort}
          options={SORTS}
          placeholder="Эрэмбэ"
          icon={<ArrowUpDown className="size-4" />}
        />
      </div>

      {/* ── Гишүүд ── */}
      <Card className="py-0">
        <CardContent className="p-0">
          {!sess ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : shown.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              {people.length === 0
                ? 'Энэ ангид гишүүн алга — «Гишүүн нэмэх»-ээр бүртгэнэ'
                : `«${search.trim()}» олдсонгүй`}
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {shown.map((p) => {
                const ps = PAYMENT_STATE[p.payment];
                return (
                  <li
                    key={p.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 transition-colors sm:px-4',
                      p.here && 'bg-emerald-500/5',
                    )}
                  >
                    {/*
                      ★ CHECKBOX — ирцийн ЦОР ГАНЦ үйлдэл.
                      ⚠ Мөрийн товшилтоос ТУСДАА элемент: мөр нь
                      дэлгэрэнгүйг онгойлгодог тул нэг товшилт хоёр
                      өөр зүйл хийж БОЛОХГҮЙ.
                    */}
                    <label
                      className={cn(
                        'flex shrink-0 items-center',
                        future ? 'cursor-not-allowed' : 'cursor-pointer',
                      )}
                      title={
                        future
                          ? 'Хараахан болоогүй оролт'
                          : p.here
                            ? 'Ирцийг буцаах'
                            : 'Ирц бүртгэх'
                      }
                    >
                      {busy === p.id ? (
                        <Loader2 className="text-muted-foreground size-4 animate-spin" />
                      ) : (
                        <Checkbox
                          checked={p.here}
                          disabled={future || busy !== null}
                          onCheckedChange={() => void toggle(p)}
                          className="size-5"
                        />
                      )}
                    </label>

                    {/* Мөрийн бие — дэлгэрэнгүйг онгойлгоно. */}
                    <button
                      type="button"
                      onClick={() => setDetail(p)}
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block truncate text-sm font-medium',
                            p.here && 'text-emerald-700 dark:text-emerald-400',
                          )}
                        >
                          {p.name}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {p.phone ?? 'утасгүй'} · {p.attended} удаа ирсэн
                          {p.at && ` · ${time(p.at)}-д ирэв`}
                        </span>
                      </span>

                      {/*
                        ★ ТӨЛБӨР ЯГ МӨРӨН ДЭЭР.
                        Урьд нь үүнийг харахын тулд «Гишүүд» таб руу
                        орох шаардлагатай байв. Хаалган дээр «энэ хүн
                        төлсөн үү?» гэдэг нь ХАМГИЙН түгээмэл асуулт.
                      */}
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-2 py-0.5 text-xs font-medium',
                          ps.tone,
                        )}
                      >
                        {ps.label}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-xs tabular-nums',
                          p.owed > 0
                            ? 'font-medium text-amber-700 dark:text-amber-400'
                            : 'text-muted-foreground',
                        )}
                      >
                        {p.owed > 0
                          ? `⚠ ${money(p.owed)}`
                          : money(p.amountPaid)}
                      </span>
                      <ChevronRight className="text-muted-foreground/40 size-4 shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/*
        ★ «ХААЛГА НЭЭХ ҮҮ?» — ирц АЛЬ ХЭДИЙН бичигдсэний ДАРАА.
        Болих дарвал ирц хэвээр үлдэнэ — тэр нь мөнгө/баримтын бүртгэл.
      */}
      <AlertDialog
        open={askDoor !== null}
        onOpenChange={(o) => !o && setAskDoor(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {askDoor?.name} — ирц бүртгэгдлээ. Хаалга нээх үү?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Хаалга хэдэн секундын дараа өөрөө хаагдана. Үйлдэл аудитад
              бичигдэнэ.
              <br />
              <br />
              <strong>Болих</strong> дарвал ирц бүртгэгдсэн ХЭВЭЭР үлдэнэ —
              зөвхөн хаалга нээгдэхгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={opening}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Товшилт цонхыг ШУУД хаахыг зогсооно — хүсэлт явж байна.
                e.preventDefault();
                void openDoor();
              }}
              disabled={opening}
            >
              {opening ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <DoorOpen className="size-4" />
              )}
              Тийм, нээ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/*
        Дэлгэрэнгүй — ирц, ТӨЛБӨР, гишүүний бүртгэл бүгд нэг цонхонд.
        `yoga-members.tsx`-ээс дахин хэрэглэнэ: төлбөр авах, ангиас
        хасах логик хоёр газарт хуулах нь зөрөх эрсдэл.
      */}
      <YogaMemberDialog
        row={detail}
        onClose={() => setDetail(null)}
        onDone={refresh}
        extra={
          detail !== null && people.find((p) => p.id === detail.id)?.here ? (
            <p className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              <Check className="size-3.5" />
              {on}-ны оролтод {time(people.find((p) => p.id === detail.id)?.at)}
              -д ирсэн гэж тэмдэглэгдсэн
            </p>
          ) : null
        }
      />
    </div>
  );
}

/**
 * Анхдагчаар ХАРАГДАХ оролт.
 *
 * ⚠ Дараалал УТГАТАЙ:
 *   1. ӨНӨӨДӨР — ресепшний 99% хэрэглээ
 *   2. дараагийн оролт — өнөөдөр хичээлгүй өдөр (Ням гараг г.м.)
 *   3. хамгийн сүүлийнх — анги аль хэдийн дууссан
 */
function defaultOn(list: ScheduleRow[] | undefined): string | null {
  if (!list?.length) return null;
  const pick =
    list.find((s) => s.isToday) ?? list.find((s) => !s.past) ?? list[list.length - 1];
  return pick.on;
}
