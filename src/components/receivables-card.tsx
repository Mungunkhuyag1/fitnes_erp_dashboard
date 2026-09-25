'use client';

import { ChevronRight, Flower2, HandCoins, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LinkButton } from '@/components/link-button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { date, money } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Заалны төлөгдөөгүй эрх — ГИШҮҮНЭЭР нэгтгэсэн. */
export interface GymReceivable {
  memberId: string;
  memberNo: string | null;
  name: string;
  phone: string | null;
  status: string;
  owed: number;
  rows: number;
  packageName: string | null;
  since: string;
  days: number;
  accessUntil: string | null;
  lastPaidAt: string | null;
}

/** Йогийн ангийн үлдэгдэл — БҮРТГЭЛЭЭР. */
export interface YogaReceivable {
  enrollmentId: string;
  courseId: string;
  courseName: string;
  courseEndsOn: string;
  memberId: string | null;
  name: string;
  phone: string | null;
  due: number;
  paid: number;
  owed: number;
  since: string;
  days: number;
  lastPaidAt: string | null;
}

/** Хоёр төрлийн авлагын НЭГДСЭН зураглалын хэлбэр. */
interface Row {
  key: string;
  href: string;
  name: string;
  /** №1001 г.м. — йогт байхгүй. */
  badge: string | null;
  owed: number;
  phone: string | null;
  days: number;
  /** «Эрх авсан» эсвэл «Бүртгүүлсэн». */
  sinceLabel: string;
  lastPaidAt: string | null;
  /** Нэмэлт тайлбарууд — «·»-аар салгаж харуулна. */
  extra: string[];
}

interface Receivables {
  gym: GymReceivable[];
  yoga: YogaReceivable[];
  total: { gym: number; yoga: number; amount: number };
}

/**
 * Өрийн ХУГАЦААНААС өнгө.
 *
 * ★ ЯАГААД ӨНГӨ ХЭРЭГТЭЙ ВЭ
 *
 * «14 хоног» гэсэн тоо нь өөрөө юу ч хэлэхгүй — ажилтан бүр өөрөөр
 * дүгнэнэ. Өнгө нь ШИЙДВЭР болгож хувиргана: хэрэв хүн улаан бол
 * ЗААВАЛ залгах, шар бол сануулах, эсвэл хүлээж болно.
 *
 * Босго нь заалны эрхийн хамгийн богино багц (14 хоног) болон нэг сараар
 * тавигдсан: 30 хоногоос хэтэрсэн өр нь ихэвчлэн мартагдсан гэсэн үг.
 */
function tone(days: number): { cls: string; label: string } {
  if (days >= 30)
    return {
      cls: 'text-destructive font-semibold',
      label: 'ЗААВАЛ залгах',
    };
  if (days >= 14)
    return {
      cls: 'text-amber-600 dark:text-amber-400 font-medium',
      label: 'Сануулах',
    };
  return { cls: 'text-muted-foreground', label: '' };
}

/** «14 хоногийн өмнө» / «өнөөдөр». */
const ago = (days: number): string =>
  days === 0 ? 'өнөөдөр' : days === 1 ? 'өчигдөр' : `${days} хоногийн өмнө`;

/**
 * АВЛАГЫН ЖАГСААЛТ — нүүр дэлгэц дээр.
 *
 * ★ ЯАГААД ТООНООС ГАДНА ЖАГСААЛТ ВЭ
 *
 * Нүүр дэлгэц дээр «⚠ Авлага 1,250,000₮» гэсэн тоо л байв. Тэр нь
 * ажилтанд ЮУ Ч хийлгэхгүй: хэнээс авахаа мэдэхгүй тул мөнгө өөрөө
 * ирэхийг хүлээнэ. Авлага бол ЗАЙЛШГҮЙ авах ёстой мөнгө — гишүүн аль
 * хэдийн заалаар орж, эрхээ хэрэглэж байна.
 *
 * Тиймээс мөр тус бүр ГУРВАН зүйлийг хэлнэ:
 *
 *   • ХЭДИЙГ авах (үлдэгдэл)
 *   • ХЭР УРТ болсон (хэдэн хоногийн өмнө эрх авсан / бүртгүүлсэн)
 *   • СҮҮЛД ХЭЗЭЭ төлсөн — «хэзээ ч төлөөгүй» нь тэс өөр дүгнэлт
 *
 * ⚠ ОРЛОГОД ОРООГҮЙ мөнгө. Тайлангийн орлоготой нэмбэл кассанд байгаа
 * бодит мөнгөтэй таарахаа болино — тиймээс тусдаа карт.
 */
export function ReceivablesCard() {
  const router = useRouter();
  const [tab, setTab] = useState<'gym' | 'yoga'>('gym');
  const { data, loading } = useApi<Receivables>('/reports/receivables');

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Авлага</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  // ⚠ Авлага ЦЭВЭР бол картыг огт харуулахгүй. «Авлага байхгүй» гэсэн
  // хоосон карт нь нүүр дэлгэцийн зайг эзлэхээс өөр үүрэггүй.
  if (!data.gym.length && !data.yoga.length) return null;

  // Хоёр талын аль нэг нь хоосон байвал ТЭР талыг нь шууд онгойлгоно —
  // ажилтан хоосон жагсаалт хараад «алдаа гарсан уу?» гэж эргэлзэхгүй.
  const active = data.gym.length === 0 ? 'yoga' : data.yoga.length === 0 ? 'gym' : tab;

  /*
   * ⚠ ХОЁР ТӨРЛИЙГ НЭГ ХЭЛБЭРТ хувиргана.
   *
   * Эхлээд JSX дотор `active === 'gym' ? (r as GymReceivable)...` гэж
   * шалгаж байв — мөр бүрд 6 cast, уншигдахгүй бөгөөд шинэ талбар
   * нэмэхэд хаана алдсанаа TypeScript хэлж чадахгүй. Задлалыг ЭНД,
   * нэг дор хийвэл доорх зураглал нь зөвхөн ЗУРНА.
   */
  const rows: Row[] =
    active === 'gym'
      ? data.gym.map((r) => ({
          key: r.memberId,
          href: `/members/${r.memberId}`,
          name: r.name,
          badge: r.memberNo ? `№${r.memberNo}` : null,
          owed: r.owed,
          phone: r.phone,
          days: r.days,
          // «Эрх авсан» — гишүүн мөнгө төлөхгүйгээр ХЭЗЭЭНЭЭС нэвтэрч байна.
          sinceLabel: 'Эрх авсан',
          lastPaidAt: r.lastPaidAt,
          extra: [
            r.accessUntil ? `${date(r.accessUntil)} хүртэл` : null,
            r.rows > 1 ? `${r.rows} удаа сунгасан` : null,
          ].filter((x): x is string => x !== null),
        }))
      : data.yoga.map((r) => ({
          key: r.enrollmentId,
          href: `/yoga/${r.courseId}`,
          name: r.name,
          badge: null,
          owed: r.owed,
          phone: r.phone,
          days: r.days,
          sinceLabel: 'Бүртгүүлсэн',
          lastPaidAt: r.lastPaidAt,
          extra: [
            r.courseName,
            // Хэсэгчилсэн төлбөр — «юу ч төлөөгүй»-гээс тэс өөр.
            r.paid > 0 ? `${money(r.paid)} / ${money(r.due)} орсон` : null,
          ].filter((x): x is string => x !== null),
        }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HandCoins className="text-muted-foreground size-4" />
          Авлага
          <span className="text-destructive text-sm font-semibold tabular-nums">
            {money(data.total.amount)}
          </span>
        </CardTitle>
        <CardAction className="col-start-1 row-start-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end">
          <div className="flex flex-wrap items-center gap-2">
            {/*
              Сегмент — ХОЁУЛАА өртэй үед л. Нэг тал хоосон бол сонголт
              нь ажилтныг хоосон жагсаалт руу л хөтөлнө.
            */}
            {data.gym.length > 0 && data.yoga.length > 0 && (
              <div className="bg-muted flex rounded-lg p-0.5">
                <Seg
                  active={active === 'gym'}
                  onClick={() => setTab('gym')}
                  icon={<Wallet className="size-3.5" />}
                  label="Заал"
                  count={data.gym.length}
                  amount={data.total.gym}
                />
                <Seg
                  active={active === 'yoga'}
                  onClick={() => setTab('yoga')}
                  icon={<Flower2 className="size-3.5" />}
                  label="Йог"
                  count={data.yoga.length}
                  amount={data.total.yoga}
                />
              </div>
            )}
            <LinkButton size="sm" variant="ghost" href="/invoices?paid=unpaid">
              Төлбөр
            </LinkButton>
          </div>
        </CardAction>
      </CardHeader>

      {/*
        ⚠ Дотроо гүйнэ, `max-h` тавьсан. 40 хүн өртэй байхад жагсаалт нь
        нүүр дэлгэцийг хоёр дахин уртасгаж, доорх график, түлхүүрийн
        хүснэгт хэн ч хүрэхгүй газар унана. `min-h-0` нь flex хүүхдийг
        агшихыг зөвшөөрнө — үүнгүй бол `overflow-y-auto` ажиллахгүй.
      */}
      <CardContent className="max-h-[22rem] min-h-0 space-y-1.5 overflow-y-auto">
        {rows.map((r) => {
          const t = tone(r.days);
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => router.push(r.href)}
              className={cn(
                'group hover:bg-accent/50 focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-3',
                r.days >= 30
                  ? 'border-destructive/25 bg-destructive/[0.03]'
                  : 'border-border',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {r.name}
                  {r.badge && (
                    <span className="text-muted-foreground text-xs font-normal">
                      {r.badge}
                    </span>
                  )}
                  {t.label && (
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                        r.days >= 30
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                      )}
                    >
                      {t.label}
                    </span>
                  )}
                </p>

                {/*
                  ХОЁР ДАХЬ МӨР — «яагаад өртэй» гэдгийн хэрэгтэй бүх зүйл.
                  `flex-wrap` тул жижиг дэлгэцэд тасална.
                */}
                <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span className={t.cls}>
                    {r.sinceLabel}: {ago(r.days)}
                  </span>
                  {r.extra.map((x) => (
                    <span key={x} className="flex items-center gap-2">
                      <span className="text-muted-foreground/40">·</span>
                      <span className="truncate">{x}</span>
                    </span>
                  ))}
                  <span className="text-muted-foreground/40">·</span>
                  {/*
                    ⚠ «Хэзээ ч төлөөгүй» нь «сүүлд 3 сарын өмнө төлсөн»-өөс
                    ТЭС ӨӨР дүгнэлт: эхнийх нь анхнаасаа мөнгө аваагүй,
                    хоёр дахь нь тогтмол гишүүн мартсан.
                  */}
                  <span>
                    {r.lastPaidAt
                      ? `Сүүлд төлсөн: ${date(r.lastPaidAt)}`
                      : 'Хэзээ ч төлөөгүй'}
                  </span>
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-destructive text-sm font-semibold tabular-nums">
                  {money(r.owed)}
                </p>
                {r.phone && (
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {r.phone}
                  </p>
                )}
              </div>
              <ChevronRight className="text-muted-foreground/40 group-hover:text-muted-foreground size-4 shrink-0" />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Сегментийн нэг товч — тоо БА дүнг хоёуланг харуулна. */
function Seg({
  active,
  onClick,
  icon,
  label,
  count,
  amount,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  amount: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
      <span className="tabular-nums opacity-70">
        {count} · {money(amount)}
      </span>
    </button>
  );
}
