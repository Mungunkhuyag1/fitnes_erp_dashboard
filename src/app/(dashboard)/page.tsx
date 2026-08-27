'use client';

import {
  AlertTriangle,
  ArrowRight,
  Check,
  CreditCard,
  KeyRound,
  ScanFace,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DonutChart, TrendChart } from '@/components/charts';
import { LinkButton } from '@/components/link-button';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth';
import { date, money, relative } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Dash {
  today: { visits: number; scans: number; denied: number };
  members: {
    active: number;
    expired: number;
    lead: number;
    suspended: number;
    cancelled: number;
  };
  expiringSoon: { total: number; withoutCard: number };
  faceNotEnrolled: number;
  lockers: {
    keysOut: number;
    overdueRentals: number;
    expiringRentals: number;
    staleDaily: number;
  };
  revenueToday: {
    cash: number;
    bonum: number;
    manual: number;
    locker: number;
    total: number;
  };
  sync: { memberErrors: number; outboxFailed: number; outboxPending: number };
  devices: {
    id: string;
    name: string;
    online: boolean;
    lastSeenAt: string | null;
  }[];
  trend: { date: string; revenue: number; visits: number }[];
  cardStages: {
    notAllowed: number;
    noCard: number;
    noWallet: number;
    active: number;
  };
  openLockers: {
    id: string;
    zone: string;
    number: number;
    type: string;
    issuedAt: string;
    dueAt: string | null;
    amount: number;
    memberId: string;
    memberName: string | null;
    memberNo: number | null;
    overdue: boolean;
  }[];
  range: DashRange;
  rangeLabel: string;
  period: {
    revenue: number;
    visits: number;
    newMembers: number;
    revenueDelta: number | null;
    visitsDelta: number | null;
    newMembersDelta: number | null;
  };
}

type DashRange = '7d' | '30d' | '12m';

const RANGES: { key: DashRange; label: string; short: string }[] = [
  { key: '7d', label: '7 хоног', short: '7 хоногт' },
  { key: '30d', label: '30 хоног', short: '30 хоногт' },
  { key: '12m', label: '12 сар', short: '12 сард' },
];

const MONTHS = [
  '1-р', '2-р', '3-р', '4-р', '5-р', '6-р',
  '7-р', '8-р', '9-р', '10-р', '11-р', '12-р',
];

/**
 * X тэнхлэгийн шошго.
 *
 * Өдрөөр: `2026-08-26` → `08/26`. Сараар: `2026-08` нь урт тул зөвхөн
 * сарын дугаарыг үлдээнэ — 12 цэг зэрэгцэхэд орон зай хомс.
 */
const axisLabel = (iso: string, range: DashRange) =>
  range === '12m'
    ? MONTHS[Number(iso.slice(5, 7)) - 1]
    : iso.slice(5).replace('-', '/');

export default function HomePage() {
  const [range, setRange] = useState<DashRange>('30d');
  const { data: d, loading } = useApi<Dash>(`/dashboard?range=${range}`);
  const { user } = useAuth();
  const router = useRouter();
  const [metric, setMetric] = useState<'revenue' | 'visits'>('revenue');

  const chartData = useMemo(
    () =>
      (d?.trend ?? []).map((p) => ({
        label: axisLabel(p.date, d?.range ?? range),
        revenue: p.revenue,
        visits: p.visits,
      })),
    [d, range],
  );

  const peak = useMemo(() => {
    if (!d?.trend.length) return null;
    return d.trend.reduce((a, b) => (b.revenue > a.revenue ? b : a));
  }, [d]);

  const shortLabel =
    RANGES.find((r) => r.key === (d?.range ?? range))?.short ?? '';

  if (loading && !d) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }
  if (!d) return null;

  const totalMembers = d.members.active + d.members.expired + d.members.lead;
  const attention = [
    d.expiringSoon.total && {
      icon: CreditCard,
      label: `${d.expiringSoon.total} гишүүний эрх 7 хоногт дуусна`,
      hint: d.expiringSoon.withoutCard
        ? `${d.expiringSoon.withoutCard} нь картгүй — залгах шаардлагатай`
        : 'Wallet мэдэгдэл автоматаар очно',
      href: '/members?expiring=7',
      danger: d.expiringSoon.withoutCard > 0,
    },
    d.sync.outboxFailed && {
      icon: AlertTriangle,
      label: `${d.sync.outboxFailed} өөрчлөлт хүрээгүй`,
      hint: 'Терминал эсвэл Loopy руу бичигдээгүй',
      href: '/sync',
      danger: true,
    },
    d.cardStages.notAllowed && {
      icon: Wallet,
      label: `${d.cardStages.notAllowed} гишүүн Loopy-д бүртгэгдээгүй`,
      hint: 'Тэд карт үүсгэж чадахгүй — тулгалт ажиллуулна уу',
      href: '/members?cardStage=not_allowed',
      danger: true,
    },
    d.lockers.overdueRentals && {
      icon: KeyRound,
      label: `${d.lockers.overdueRentals} шүүгээний хугацаа хэтэрсэн`,
      hint: 'Түлхүүр буцаагдаагүй',
      href: '/lockers',
      danger: true,
    },
    d.lockers.staleDaily && {
      icon: KeyRound,
      label: `${d.lockers.staleDaily} өдрийн түлхүүр буцаагдаагүй`,
      // ⚠ Гишүүн аваад явсныг БАТАЛДАГГҮЙ — ресепшн бүртгээгүй ч байж
      // болно. Тиймээс автоматаар мэдэгдэл явуулахгүй, ажилтан шалгана.
      hint: '6+ цаг гарсан — самбараас шалгаж, шаардвал сануулга илгээнэ',
      href: '/lockers',
      danger: true,
    },
    d.lockers.expiringRentals && {
      icon: KeyRound,
      label: `${d.lockers.expiringRentals} шүүгээний түрээс 7 хоногт дуусна`,
      hint: 'Wallet мэдэгдэл автоматаар очно',
      href: '/lockers',
      danger: false,
    },
    d.faceNotEnrolled && {
      icon: ScanFace,
      label: `${d.faceNotEnrolled} гишүүн царайгаа уншуулаагүй`,
      hint: 'Терминал дээр нэг удаа уншуулна',
      href: '/members?faceEnrolled=false',
      danger: false,
    },
  ].filter(Boolean) as {
    icon: typeof CreditCard;
    label: string;
    hint: string;
    href: string;
    danger: boolean;
  }[];

  // Гишүүдийн төлөвийн бүтэц. Дараалал нь «эрүүл → анхаарах» чиглэлтэй:
  // идэвхтэй, шинэ, дууссан, зогссон.
  const statusData = [
    { label: 'Идэвхтэй', value: d.members.active, color: 'var(--chart-3)', href: '/members?status=active' },
    { label: 'Шинэ', value: d.members.lead, color: 'var(--chart-1)', href: '/members?status=lead' },
    { label: 'Дууссан', value: d.members.expired, color: 'var(--chart-2)', href: '/members?status=expired' },
    { label: 'Зогссон', value: d.members.suspended, color: 'var(--chart-4)', href: '/members?status=suspended' },
  ].filter((x) => x.value > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Сайн байна уу, ${user?.name?.split(' ')[0] ?? ''} 👋`}
        description="Өнөөдрийн ирц, орлого, анхаарах зүйлс"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Хугацааны хүрээ — үзүүлэлт, график ХОЁУЛАНД нөлөөлнө. */}
          <div className="bg-muted flex rounded-lg p-0.5">
            {RANGES.map((r) => (
              <Button
                key={r.key}
                size="sm"
                variant={range === r.key ? 'default' : 'ghost'}
                className={range === r.key ? '' : 'text-muted-foreground'}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <LinkButton href="/members/new">Гишүүн нэмэх</LinkButton>
        </div>
      </PageHeader>

      {/* ── Үзүүлэлтүүд ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Өнөөдрийн ирц"
          value={d.today.visits}
          suffix="хүн"
          sub={`${d.today.scans} уншуулалт${d.today.denied ? ` · ${d.today.denied} татгалзсан` : ''}`}
          delta={d.period.visitsDelta}
          footL={shortLabel}
          footR={`${d.period.visits} хүн`}
          onClick={() => router.push('/check-ins')}
        />
        <StatCard
          label="Өнөөдрийн орлого"
          value={money(d.revenueToday.total)}
          sub={`Бэлэн ${money(d.revenueToday.cash)} · Онлайн ${money(d.revenueToday.bonum)}`}
          delta={d.period.revenueDelta}
          footL={shortLabel}
          footR={money(d.period.revenue)}
          onClick={() => router.push('/reports')}
        />
        <StatCard
          label="Идэвхтэй гишүүн"
          value={d.members.active}
          suffix={`/ ${totalMembers}`}
          ratio={totalMembers ? d.members.active / totalMembers : 0}
          footL={`${d.members.expired} дууссан`}
          footR={`${d.members.lead} шинэ`}
          onClick={() => router.push('/members?status=active')}
        />
        <StatCard
          label="Гарсан түлхүүр"
          value={d.lockers.keysOut}
          suffix="ширхэг"
          sub={
            d.lockers.overdueRentals
              ? `${d.lockers.overdueRentals} хугацаа хэтэрсэн`
              : 'Хугацаа хэтэрсэн байхгүй'
          }
          tone={d.lockers.overdueRentals ? 'danger' : 'default'}
          onClick={() => router.push('/lockers')}
        />
      </div>

      {/* ── График + хажуугийн самбар ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="text-base">{d.rangeLabel}</CardTitle>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {metric === 'visits'
                  ? `${d.trend.reduce((s, p) => s + p.visits, 0)} ирц`
                  : money(d.trend.reduce((s, p) => s + p.revenue, 0))}
              </p>
            </div>
            <CardAction>
              <div className="flex gap-1">
                {(
                  [
                    ['revenue', 'Орлого'],
                    ['visits', 'Ирц'],
                  ] as const
                ).map(([k, lbl]) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={metric === k ? 'default' : 'outline'}
                    onClick={() => setMetric(k)}
                  >
                    {lbl}
                  </Button>
                ))}
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            {/* Хоёр хэмжигдэхүүнийг зэрэг харуулахад ШУГАМ ашиглана —
                талбай нь доод цувааг далдална. Ганцаар нь үзүүлэхэд
                талбайт график хуримтлалыг илүү сайн өгүүлнэ. */}
            <TrendChart
              data={chartData.map((p) => ({
                label: p.label,
                value: metric === 'revenue' ? p.revenue : p.visits,
              }))}
              seriesLabel={metric === 'revenue' ? 'Орлого' : 'Ирц'}
              valueFmt={(v) => (metric === 'revenue' ? money(v) : `${v} хүн`)}
              color={metric === 'revenue' ? 'var(--chart-1)' : 'var(--chart-3)'}
            />

            {peak && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Mini
                  label={d.range === '12m' ? 'Оргил сар' : 'Оргил өдөр'}
                  value={`${axisLabel(peak.date, d.range)} · ${money(peak.revenue)}`}
                />
                <Mini
                  label={d.range === '12m' ? 'Сарын дундаж' : 'Өдрийн дундаж'}
                  value={money(
                    Math.round(
                      d.trend.reduce((s, p) => s + p.revenue, 0) /
                        (d.trend.length || 1),
                    ),
                  )}
                />
                <Mini
                  label={`Шинэ гишүүн · ${shortLabel}`}
                  value={`${d.period.newMembers} хүн`}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Анхаарах зүйлс ── */}
        <Card className="flex max-h-[26rem] flex-col">
          <CardHeader>
            <CardTitle className="text-base">Анхаарах зүйлс</CardTitle>
            {attention.length > 0 && (
              <CardAction>
                <span className="bg-muted rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  {attention.length}
                </span>
              </CardAction>
            )}
          </CardHeader>
          {/*
            Дотроо гүйнэ — жагсаалт уртсахад хуудас бүхэлдээ сунаж, доорх
            хэсгүүдийг түлхэхгүй. `min-h-0` нь flex хүүхдийг агшихыг
            зөвшөөрнө; үүнгүй бол `overflow-y-auto` огт ажиллахгүй.
          */}
          <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {attention.length ? (
              attention.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.href + a.label}
                    type="button"
                    onClick={() => router.push(a.href)}
                    className={cn(
                      'group hover:bg-accent/50 focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left outline-none transition-colors focus-visible:ring-3',
                      a.danger
                        ? 'border-destructive/25 bg-destructive/[0.03]'
                        : 'border-border',
                    )}
                  >
                    {/* Иконыг дугуй дэвсгэр дээр — жагсаалтын мөрүүд
                        харааны хувьд тогтвортой эхлэлтэй болно. */}
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full',
                        a.danger
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug font-medium">
                        {a.label}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                        {a.hint}
                      </span>
                    </span>
                    <ArrowRight className="text-muted-foreground/50 group-hover:text-foreground size-4 shrink-0 transition-colors" />
                  </button>
                );
              })
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <span className="bg-emerald-500/10 mb-3 flex size-11 items-center justify-center rounded-full">
                  <Check className="size-5 text-emerald-600 dark:text-emerald-400" />
                </span>
                <p className="text-sm font-medium">Бүх зүйл хэвийн</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Анхаарал шаардсан зүйл алга
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Wallet карт + сүүлийн хөдөлгөөн ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Гишүүдийн төлөв</CardTitle>
            <CardAction>
              <span className="text-muted-foreground text-sm tabular-nums">
                {totalMembers}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent>
            {statusData.length ? (
              <>
                <DonutChart data={statusData} valueFmt={(v) => `${v} гишүүн`} />
                <div className="mt-3 space-y-0.5">
                  {statusData.map((sd) => (
                    <button
                      key={sd.label}
                      type="button"
                      onClick={() => router.push(sd.href)}
                      className="hover:bg-accent/60 focus-visible:ring-ring/50 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs outline-none focus-visible:ring-3"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: sd.color }}
                      />
                      <span className="text-muted-foreground flex-1 text-left">
                        {sd.label}
                      </span>
                      <span className="font-medium tabular-nums">{sd.value}</span>
                      <span className="text-muted-foreground w-9 text-right tabular-nums">
                        {Math.round((sd.value / (totalMembers || 1)) * 100)}%
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Гишүүн алга
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 gap-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              Гарсан шүүгээ
              {d.openLockers.length > 0 && (
                <span className="bg-muted rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  {d.lockers.keysOut}
                </span>
              )}
            </CardTitle>
            <CardAction>
              <LinkButton size="sm" variant="outline" href="/lockers">
                Бүгдийг
                <ArrowRight className="size-3.5" />
              </LinkButton>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {d.openLockers.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-y text-xs">
                      <th className="px-6 py-2 text-left font-medium">Шүүгээ</th>
                      <th className="px-3 py-2 text-left font-medium">Гишүүн</th>
                      <th className="px-3 py-2 text-left font-medium">Төрөл</th>
                      <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">
                        Олгосон
                      </th>
                      <th className="px-6 py-2 text-right font-medium">Буцаах</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {d.openLockers.map((l) => (
                      <tr
                        key={l.id}
                        onClick={() => router.push(`/members/${l.memberId}`)}
                        className="hover:bg-accent/50 cursor-pointer"
                      >
                        <td className="px-6 py-2.5">
                          {/* Өрөө + дугаарыг ХАМТ — эрэгтэй/эмэгтэй өрөөний
                              дугаарлалт тусдаа тул дугаар дангаараа хоёрдмол. */}
                          <span className="inline-flex items-center gap-2">
                            <KeyRound
                              className={cn(
                                'size-4 shrink-0',
                                l.overdue ? 'text-destructive' : 'text-emerald-500',
                              )}
                            />
                            <span className="font-medium">
                              {l.zone}{' '}
                              <span className="tabular-nums">№{l.number}</span>
                            </span>
                          </span>
                        </td>
                        <td className="text-muted-foreground px-3 py-2.5">
                          <span className="truncate">{l.memberName ?? '—'}</span>
                          {l.memberNo !== null && (
                            <span className="ml-1 text-xs">№{l.memberNo}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-xs',
                              l.type === 'rental'
                                ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {l.type === 'rental' ? 'Түрээс' : 'Өдрийн'}
                          </span>
                        </td>
                        <td className="text-muted-foreground hidden px-3 py-2.5 text-xs sm:table-cell">
                          {relative(l.issuedAt)}
                        </td>
                        <td className="px-6 py-2.5 text-right">
                          {l.dueAt ? (
                            <span
                              className={cn(
                                'text-xs',
                                l.overdue
                                  ? 'text-destructive font-medium'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {l.overdue && 'ХЭТЭРСЭН · '}
                              {date(l.dueAt)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Өнөөдөр
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground py-12 text-center text-sm">
                Гарсан түлхүүр алга
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Терминал ── */}
      {d.devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Терминал</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {d.devices.map((dev) => (
              <div
                key={dev.id}
                className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
              >
                <span
                  className={cn(
                    'size-2 rounded-full',
                    dev.online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                  )}
                />
                <div>
                  <p className="text-sm font-medium">{dev.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {dev.online ? 'Холбогдсон' : `Сүүлд ${relative(dev.lastSeenAt)}`}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Графикийн доорх жижиг үзүүлэлт. */
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}
