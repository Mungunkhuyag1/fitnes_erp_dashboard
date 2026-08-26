'use client';

/**
 * Графикууд — бүгд shadcn `ChartContainer` дээр суурилна.
 *
 * Гараар SVG зурахгүй: `ChartContainer` нь өнгөний хувьсагч, hover tooltip,
 * responsive хэмжээг зохицуулна. Өнгө нь `globals.css`-д батлагдсан
 * `--chart-1..5` палитраас гарна (гэрэл/харанхуй хоёуланд шалгагдсан).
 */

import {
  Area,
  AreaChart as RAreaChart,
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RLineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

/**
 * Тэнхлэгийн товч тоон формат.
 *
 * «990мянга» гэсэн урт шошго тэнхлэгийн өргөнөөс хальж таслагддаг тул
 * мянгыг «к» гэж товчилно: 990,000 → «990к», 1,200,000 → «1.2сая».
 */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}сая`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}к`;
  return String(Math.round(n));
}

export interface Point {
  label: string;
  value: number;
}

const AXIS = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  className: 'text-[10px]',
} as const;

/**
 * Талбайт график — хандлага харуулахад.
 *
 * `type="natural"` нь зөөлөн муруй өгнө. Градиент дүүргэлт нь «энэ бол
 * хуримтлагдах хэмжигдэхүүн» гэдгийг өгүүлнэ (орлого, ирц).
 */
export function TrendChart({
  data,
  seriesLabel = 'Утга',
  valueFmt = (v) => v.toLocaleString(),
  height = 240,
  color = 'var(--chart-1)',
}: {
  data: Point[];
  seriesLabel?: string;
  valueFmt?: (v: number) => string;
  height?: number;
  color?: string;
}) {
  const config = { value: { label: seriesLabel, color } } satisfies ChartConfig;
  const id = `fill-${seriesLabel.replace(/\W/g, '')}`;
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RAreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" minTickGap={24} {...AXIS} />
        <YAxis width={52} tickFormatter={compact} {...AXIS} />
        <ChartTooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={
            <ChartTooltipContent
              formatter={(v) => valueFmt(Number(v))}
              indicator="dot"
            />
          }
        />
        <Area
          isAnimationActive={false}
          dataKey="value"
          type="natural"
          stroke="var(--color-value)"
          strokeWidth={2}
          fill={`url(#${id})`}
        />
      </RAreaChart>
    </ChartContainer>
  );
}

/**
 * Шугаман график — ОЛОН цуваа зэрэгцүүлэн харьцуулахад.
 *
 * Талбайт графикаас ялгаатай нь дүүргэлтгүй: хоёр цуваа давхарлахад
 * дүүргэлт нь доод цувааг далдална.
 */
export function MultiLineChart({
  data,
  series,
  height = 260,
  valueFmt = (v) => v.toLocaleString(),
}: {
  data: Record<string, string | number>[];
  series: { key: string; label: string; color: string }[];
  height?: number;
  valueFmt?: (v: number) => string;
}) {
  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RLineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" minTickGap={24} {...AXIS} />
        <YAxis width={52} tickFormatter={compact} {...AXIS} />
        <ChartTooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={
            <ChartTooltipContent formatter={(v) => valueFmt(Number(v))} />
          }
        />
        {series.map((s) => (
          <Line
            key={s.key}
            isAnimationActive={false}
            dataKey={s.key}
            type="natural"
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            // ≥8px цэг — hover бай нь хангалттай том байх ёстой.
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
        ))}
      </RLineChart>
    </ChartContainer>
  );
}

/**
 * Багана график.
 *
 * `highlight` — тухайн шошготой баганыг тодруулна (жишиг дизайн дээрх
 * «оргил сар» шиг). Бусад нь бүдэг: харьцуулах суурь болно.
 */
export function ColumnChart({
  data,
  seriesLabel = 'Утга',
  valueFmt = (v) => v.toLocaleString(),
  height = 200,
  highlight,
}: {
  data: Point[];
  seriesLabel?: string;
  valueFmt?: (v: number) => string;
  height?: number;
  highlight?: string;
}) {
  const config = {
    value: { label: seriesLabel, color: 'var(--chart-1)' },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RBarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" minTickGap={8} {...AXIS} />
        <YAxis width={52} tickFormatter={compact} {...AXIS} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(v) => valueFmt(Number(v))}
              indicator="dot"
            />
          }
        />
        {/* Дээд ирмэг нь бөөрөнхий, суурь нь тэгш — тэнхлэгт наалдана. */}
        {/*
          Хөдөлгөөнт эффект УНТРААЛТТАЙ: recharts нь өгөгдөл дахин ирэхэд
          (`useApi` дахин татахад) багана/хэрчмийн замыг зурахгүй үлдээж,
          график хоосон харагддаг. Хяналтын самбарт хөдөлгөөн ашиггүй.
        */}
        <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell
              key={d.label}
              fill="var(--color-value)"
              fillOpacity={highlight && d.label !== highlight ? 0.28 : 1}
            />
          ))}
        </Bar>
      </RBarChart>
    </ChartContainer>
  );
}

/** Бөгж график — бүтэц харуулахад (4-5 хэсгээс хэтрэхгүй). */
export function DonutChart({
  data,
  height = 200,
  valueFmt = (v) => v.toLocaleString(),
}: {
  data: { label: string; value: number; color: string }[];
  height?: number;
  valueFmt?: (v: number) => string;
}) {
  const config = Object.fromEntries(
    data.map((d, i) => [`s${i}`, { label: d.label, color: d.color }]),
  ) satisfies ChartConfig;

  // Радиусыг ПИКСЕЛЭЭР тооцно. Хувиар (`"82%"`) өгвөл `ChartContainer`-ийн
  // `flex` байрлуулалт дотор суурь хэмжээ буруу гарч, бөгж нь маш жижиг
  // хэрчим болж хумигддаг. Өндөр нь мэдэгдэж байгаа тул тооцох нь найдвартай.
  const outer = Math.max(24, height / 2 - 8);
  const inner = outer * 0.62;

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="label"
              formatter={(v) => valueFmt(Number(v))}
            />
          }
        />
        <Pie
          // Хөдөлгөөнт эффектийг УНТРААНА. recharts нь өгөгдөл дахин
          // ирэхэд (`useApi` дахин татахад) хэсгийн замыг зурахгүй үлдээж,
          // бөгж бүхэлдээ алга болдог. Хяналтын самбарт хөдөлгөөн нь
          // ямар ч ашиггүй — тоо шууд харагдах нь чухал.
          isAnimationActive={false}
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={inner}
          outerRadius={outer}
          // 2px завсар — зэргэлдээ хэсгүүд нийлж харагдахаас сэргийлнэ.
          paddingAngle={2}
          strokeWidth={2}
          className="stroke-card"
        >
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

/**
 * Хэвтээ бахархалт мөр — жишиг дизайны stat хайрцаг дахь «эзэлхүүн» зураас.
 *
 * Тасархай сегментүүд нь нарийн ялгааг тоолж харахад тусална (тасралтгүй
 * зураас дээр 74% ба 80% ялгарахгүй).
 */
export function SegmentBar({
  ratio,
  segments = 24,
  className,
}: {
  ratio: number;
  segments?: number;
  className?: string;
}) {
  const filled = Math.round(Math.min(1, Math.max(0, ratio)) * segments);
  return (
    <div
      className={cn('flex gap-[3px]', className)}
      role="img"
      aria-label={`${Math.round(ratio * 100)}%`}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-4 flex-1 rounded-[1px]',
            i < filled ? 'bg-foreground' : 'bg-muted',
          )}
        />
      ))}
    </div>
  );
}
