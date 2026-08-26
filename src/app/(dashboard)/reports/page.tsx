'use client';

import { useMemo, useState } from 'react';
import { ChartCard } from '@/components/chart-card';
import { ColumnChart, DonutChart, TrendChart } from '@/components/charts';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { qs } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { date, money, relative } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Summary {
  revenue: { membership: number; locker: number; total: number; reversed: number };
  sales: number;
  lockerRentals: number;
  newMembers: number;
  attendance: { visits: number; scans: number };
  averageSale: number;
}
interface Revenue {
  groupBy: string;
  items: {
    bucket: string;
    cash: number;
    bonum: number;
    manual: number;
    locker: number;
    total: number;
  }[];
}
interface Attendance<T> {
  groupBy: string;
  items: T[];
}
interface Packages {
  items: { name: string; days: number | null; sales: number; revenue: number }[];
}
interface Members {
  byStatus: Record<string, number>;
  growth: { bucket: string; joined: number }[];
}
interface TopMembers {
  items: {
    id: string;
    name: string;
    memberNo: number;
    visits: number;
    lastVisit: string | null;
  }[];
}

const PERIODS = [
  { key: '7', label: '7 хоног' },
  { key: '30', label: '30 хоног' },
  { key: '90', label: '3 сар' },
  { key: '365', label: '1 жил' },
] as const;

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--chart-3)',
  lead: 'var(--chart-1)',
  expired: 'var(--chart-2)',
  suspended: 'var(--chart-4)',
  cancelled: 'var(--chart-5)',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Идэвхтэй',
  lead: 'Шинэ',
  expired: 'Дууссан',
  suspended: 'Зогссон',
  cancelled: 'Цуцалсан',
};

/** `2026-08-17` → `08/17`, `2026-08` → `2026-08` (сарын багц аль хэдийн богино). */
const shortBucket = (b: string) => (b.length > 7 ? b.slice(5).replace('-', '/') : b);

export default function ReportsPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('30');
  // 3 сараас урт хугацаанд өдрөөр бүлэглэвэл цэг хэт олон болно.
  const revenueGroup = period === '365' ? 'month' : period === '90' ? 'week' : 'day';
  const q = useMemo(() => qs({ days: Number(period) }), [period]);

  const { data: summary } = useApi<Summary>(`/reports/summary${q}`);
  const { data: revenue, loading: revLoading } = useApi<Revenue>(
    `/reports/revenue${qs({ days: Number(period), groupBy: revenueGroup })}`,
  );
  const { data: byHour, loading: hourLoading } = useApi<
    Attendance<{ bucket: number; label: string; scans: number }>
  >(`/reports/attendance${qs({ days: Number(period), groupBy: 'hour' })}`);
  const { data: byWeekday, loading: wdLoading } = useApi<
    Attendance<{ bucket: number; label: string; scans: number }>
  >(`/reports/attendance${qs({ days: Number(period), groupBy: 'weekday' })}`);
  const { data: byDay, loading: dayLoading } = useApi<
    Attendance<{ bucket: string; visits: number; scans: number }>
  >(`/reports/attendance${qs({ days: Number(period), groupBy: 'day' })}`);
  const { data: packages, loading: pkgLoading } = useApi<Packages>(
    `/reports/packages${q}`,
  );
  const { data: members, loading: memLoading } = useApi<Members>(
    `/reports/members${q}`,
  );
  const { data: top, loading: topLoading } = useApi<TopMembers>(
    `/reports/top-members${q}`,
  );

  const peakHour = useMemo(() => {
    if (!byHour?.items.length) return null;
    return byHour.items.reduce((a, b) => (b.scans > a.scans ? b : a));
  }, [byHour]);

  const sourceTotals = useMemo(() => {
    if (!revenue?.items.length) return [];
    const sum = (k: 'cash' | 'bonum' | 'manual' | 'locker') =>
      revenue.items.reduce((s, i) => s + i[k], 0);
    return [
      { label: 'Бэлэн', value: sum('cash'), color: 'var(--chart-1)' },
      { label: 'Онлайн', value: sum('bonum'), color: 'var(--chart-3)' },
      { label: 'Гараар', value: sum('manual'), color: 'var(--chart-4)' },
      { label: 'Шүүгээ', value: sum('locker'), color: 'var(--chart-2)' },
    ].filter((x) => x.value > 0);
  }, [revenue]);

  const statusData = useMemo(() => {
    if (!members) return [];
    return Object.entries(members.byStatus)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        label: STATUS_LABEL[k] ?? k,
        value: v,
        color: STATUS_COLOR[k] ?? 'var(--chart-5)',
      }));
  }, [members]);

  return (
    <div className="space-y-5">
      <PageHeader title="Тайлан" description="Орлого, ирц, гишүүдийн шинжилгээ">
        <div className="bg-muted flex rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? 'default' : 'ghost'}
              className={period === p.key ? '' : 'text-muted-foreground'}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      {/* ── Товч үзүүлэлт ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary ? (
          <>
            <StatCard
              label="Нийт орлого"
              value={money(summary.revenue.total)}
              sub={`гишүүнчлэл ${money(summary.revenue.membership)} · шүүгээ ${money(summary.revenue.locker)}`}
            />
            <StatCard
              label="Борлуулалт"
              value={summary.sales}
              suffix="ширхэг"
              sub={`дундаж чек ${money(summary.averageSale)}`}
            />
            <StatCard
              label="Ирц"
              value={summary.attendance.visits}
              suffix="хүн"
              sub={`${summary.attendance.scans} уншуулалт`}
            />
            <StatCard
              label="Шинэ гишүүн"
              value={summary.newMembers}
              suffix="хүн"
              sub={peakHour ? `оргил цаг ${peakHour.label}` : undefined}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))
        )}
      </div>

      {/* ── Орлого ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Орлогын хандлага"
          description={
            revenueGroup === 'month'
              ? 'Сараар'
              : revenueGroup === 'week'
                ? '7 хоногоор'
                : 'Өдрөөр'
          }
          filename={`орлого-${period}`}
          headers={['Огноо', 'Бэлэн', 'Онлайн', 'Гараар', 'Шүүгээ', 'Нийт']}
          rows={(revenue?.items ?? []).map((i) => [
            i.bucket,
            i.cash,
            i.bonum,
            i.manual,
            i.locker,
            i.total,
          ])}
          loading={revLoading}
        >
          <TrendChart
            data={(revenue?.items ?? []).map((i) => ({
              label: shortBucket(i.bucket),
              value: i.total,
            }))}
            seriesLabel="Орлого"
            valueFmt={money}
            height={260}
          />
        </ChartCard>

        <ChartCard
          title="Эх сурвалж"
          description="Төлбөр хаанаас орсон"
          filename={`орлого-эх-сурвалж-${period}`}
          headers={['Эх сурвалж', 'Дүн']}
          rows={sourceTotals.map((s) => [s.label, s.value])}
          loading={revLoading}
        >
          <DonutChart data={sourceTotals} valueFmt={money} height={200} />
          <div className="mt-3 space-y-1.5">
            {sourceTotals.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-muted-foreground flex-1">{s.label}</span>
                <span className="font-medium tabular-nums">{money(s.value)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Багц ── */}
      <ChartCard
        title="Багц тус бүрийн борлуулалт"
        description="Аль багц хамгийн их орлого авчирсан бэ"
        filename={`багц-${period}`}
        headers={['Багц', 'Хоног', 'Ширхэг', 'Орлого']}
        rows={(packages?.items ?? []).map((i) => [
          i.name,
          i.days ?? '',
          i.sales,
          i.revenue,
        ])}
        loading={pkgLoading}
      >
        <ColumnChart
          data={(packages?.items ?? []).map((i) => ({
            label: i.name,
            value: i.revenue,
          }))}
          seriesLabel="Орлого"
          valueFmt={money}
          height={220}
          highlight={packages?.items[0]?.name}
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(packages?.items ?? []).slice(0, 4).map((i) => (
            <div key={i.name} className="bg-muted/50 rounded-lg px-3 py-2">
              <p className="truncate text-xs font-medium">{i.name}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {money(i.revenue)}
              </p>
              <p className="text-muted-foreground text-xs">{i.sales} ширхэг</p>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* ── Ирц ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Оргил цаг"
          description="Хэдэн цагт хамгийн их ачаалалтай вэ"
          filename={`оргил-цаг-${period}`}
          headers={['Цаг', 'Уншуулалт']}
          rows={(byHour?.items ?? []).map((i) => [i.label, i.scans])}
          loading={hourLoading}
        >
          <ColumnChart
            data={(byHour?.items ?? []).map((i) => ({
              label: i.label,
              value: i.scans,
            }))}
            seriesLabel="Уншуулалт"
            height={220}
            highlight={peakHour?.label}
          />
        </ChartCard>

        <ChartCard
          title="Долоо хоногийн ачаалал"
          description="Аль өдөр хамгийн завгүй вэ"
          filename={`7хоног-ачаалал-${period}`}
          headers={['Өдөр', 'Уншуулалт']}
          rows={(byWeekday?.items ?? []).map((i) => [i.label, i.scans])}
          loading={wdLoading}
        >
          <ColumnChart
            data={(byWeekday?.items ?? []).map((i) => ({
              label: i.label,
              value: i.scans,
            }))}
            seriesLabel="Уншуулалт"
            height={220}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Өдрийн ирц"
        description="Давхардсан уншуулалтыг тооцохгүй — өдөрт нэг хүн нэг удаа"
        filename={`өдрийн-ирц-${period}`}
        headers={['Огноо', 'Ирсэн хүн', 'Уншуулалт']}
        rows={(byDay?.items ?? []).map((i) => [i.bucket, i.visits, i.scans])}
        loading={dayLoading}
      >
        <TrendChart
          data={(byDay?.items ?? []).map((i) => ({
            label: shortBucket(i.bucket),
            value: i.visits,
          }))}
          seriesLabel="Ирсэн хүн"
          valueFmt={(v) => `${v} хүн`}
          color="var(--chart-3)"
          height={240}
        />
      </ChartCard>

      {/* ── Гишүүд ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Гишүүдийн төлөв"
          description="Одоогийн байдлаар"
          filename="гишүүдийн-төлөв"
          headers={['Төлөв', 'Тоо']}
          rows={statusData.map((s) => [s.label, s.value])}
          loading={memLoading}
        >
          <DonutChart
            data={statusData}
            valueFmt={(v) => `${v} гишүүн`}
            height={200}
          />
          <div className="mt-3 space-y-1.5">
            {statusData.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-muted-foreground flex-1">{s.label}</span>
                <span className="font-medium tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="Гишүүдийн өсөлт"
          description="Сар бүр шинээр бүртгүүлсэн"
          filename={`гишүүн-өсөлт-${period}`}
          headers={['Сар', 'Шинэ гишүүн']}
          rows={(members?.growth ?? []).map((g) => [g.bucket, g.joined])}
          loading={memLoading}
        >
          <ColumnChart
            data={(members?.growth ?? []).map((g) => ({
              label: g.bucket,
              value: g.joined,
            }))}
            seriesLabel="Шинэ гишүүн"
            valueFmt={(v) => `${v} хүн`}
            height={240}
          />
        </ChartCard>
      </div>

      {/* ── Хамгийн идэвхтэй гишүүд ── */}
      <ChartCard
        title="Хамгийн идэвхтэй гишүүд"
        description="Сонгосон хугацаанд хамгийн олон ирсэн"
        filename={`идэвхтэй-гишүүд-${period}`}
        headers={['№', 'Нэр', 'Ирц', 'Сүүлд ирсэн']}
        rows={(top?.items ?? []).map((m) => [
          m.memberNo,
          m.name,
          m.visits,
          m.lastVisit ? date(m.lastVisit) : '',
        ])}
        loading={topLoading}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-xs">
                <th className="py-2 pr-3 text-left font-medium">Гишүүн</th>
                <th className="px-3 py-2 text-right font-medium">Ирц</th>
                <th className="px-3 py-2 text-right font-medium">Эзлэх</th>
                <th className="py-2 pl-3 text-right font-medium">Сүүлд</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {(top?.items ?? []).map((m, i) => {
                const max = top?.items[0]?.visits || 1;
                return (
                  <tr key={m.id}>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                            i < 3
                              ? 'bg-foreground text-background'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {i + 1}
                        </span>
                        <span className="truncate font-medium">{m.name}</span>
                        <span className="text-muted-foreground text-xs">
                          №{m.memberNo}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {m.visits}
                    </td>
                    <td className="px-3 py-2">
                      {/* Харьцангуй урттай зураас — тоог харьцуулахад
                          нүдээр хамгийн хурдан. */}
                      <span className="bg-muted ml-auto block h-1.5 w-full max-w-24 overflow-hidden rounded-full">
                        <span
                          className="bg-foreground block h-full rounded-full"
                          style={{ width: `${(m.visits / max) * 100}%` }}
                        />
                      </span>
                    </td>
                    <td className="text-muted-foreground py-2 pl-3 text-right text-xs">
                      {relative(m.lastVisit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Бүх тайланг нэг дор */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            const rows: unknown[][] = [
              ['ТАЙЛАН', PERIODS.find((p) => p.key === period)?.label ?? ''],
              [],
              ['Нийт орлого', summary?.revenue.total ?? 0],
              ['Гишүүнчлэл', summary?.revenue.membership ?? 0],
              ['Шүүгээ', summary?.revenue.locker ?? 0],
              ['Буцаалт', summary?.revenue.reversed ?? 0],
              ['Борлуулалт', summary?.sales ?? 0],
              ['Дундаж чек', summary?.averageSale ?? 0],
              ['Ирц', summary?.attendance.visits ?? 0],
              ['Уншуулалт', summary?.attendance.scans ?? 0],
              ['Шинэ гишүүн', summary?.newMembers ?? 0],
              [],
              ['БАГЦ', 'Ширхэг', 'Орлого'],
              ...(packages?.items ?? []).map((i) => [i.name, i.sales, i.revenue]),
            ];
            downloadCsv(`тайлан-${period}`, ['Үзүүлэлт', 'Утга', ''], rows);
          }}
        >
          Нэгдсэн тайлан (CSV)
        </Button>
      </div>
    </div>
  );
}
