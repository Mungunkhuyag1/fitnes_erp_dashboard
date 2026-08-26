'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { SegmentBar } from '@/components/charts';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Өөрчлөлтийн шошго — «+8.2%».
 *
 * shadcn-ий блок нь өнгөгүй `outline` badge ашигладаг. Энд ЗОРИУДААР
 * өнгөтэй болгов: ажилтан хяналтын самбарыг хормын зуур хардаг тул
 * «сайжирсан уу, мууджээ юу» гэдгийг УНШИХГҮЙГЭЭР ялгах ёстой.
 *
 * `null` бол ОГТ ХАРУУЛАХГҮЙ: өмнөх үе 0 байхад хувь тооцох нь утгагүй
 * (0-ээс 5 болох нь «+∞%» биш).
 */
export function DeltaBadge({
  value,
  /** Буурах нь САЙН эсэх (жишээ нь алдааны тоо). */
  lowerIsBetter = false,
}: {
  value: number | null;
  lowerIsBetter?: boolean;
}) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  const good = lowerIsBetter ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1',
        good
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      <Icon className="size-3" />
      {up ? '+' : ''}
      {value}%
    </Badge>
  );
}

/**
 * Үзүүлэлтийн хайрцаг — shadcn `dashboard-01` блокийн `SectionCards` бүтэц.
 *
 *   CardDescription  — жижиг гарчиг
 *   CardTitle        — ТОМ тоо (`tabular-nums`, контейнерээс хамааран томорно)
 *   CardAction       — өөрчлөлтийн шошго
 *   CardFooter       — хоёр мөр: тод / бүдэг
 *
 * `@container/card` нь хайрцгийн ӨРГӨНӨӨС хамааран үсгийн хэмжээг
 * тохируулна — дэлгэцийн өргөнөөс биш. 4 хайрцаг зэрэгцэхэд жижиг, 2
 * болоход том болно.
 */
export function StatCard({
  label,
  value,
  sub,
  suffix,
  delta,
  lowerIsBetter,
  ratio,
  footL,
  footR,
  onClick,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  suffix?: string;
  delta?: number | null;
  lowerIsBetter?: boolean;
  /** 0..1 — өгвөл сегмент зураас гарна. */
  ratio?: number;
  footL?: ReactNode;
  footR?: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <Card
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            },
          }
        : {})}
      className={cn(
        // Блокийн градиент: дээрээсээ `primary/5`, доошоо `card`.
        'from-primary/5 to-card @container/card gap-3 bg-gradient-to-t shadow-xs dark:bg-card',
        onClick &&
          'hover:border-muted-foreground/30 focus-visible:ring-ring/50 cursor-pointer outline-none focus-visible:ring-3',
        tone === 'danger' && 'border-destructive/40 from-destructive/5',
      )}
    >
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            'flex items-baseline gap-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
            tone === 'danger' && 'text-destructive',
          )}
        >
          {value}
          {suffix && (
            <span className="text-muted-foreground text-sm font-normal">
              {suffix}
            </span>
          )}
        </CardTitle>
        {delta !== undefined && (
          <CardAction>
            <DeltaBadge value={delta} lowerIsBetter={lowerIsBetter} />
          </CardAction>
        )}
      </CardHeader>

      {ratio !== undefined && (
        <CardContent>
          <SegmentBar ratio={ratio} />
        </CardContent>
      )}

      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        {sub && <div className="text-muted-foreground line-clamp-1">{sub}</div>}
        {(footL || footR) && (
          <div className="flex w-full items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{footL}</span>
            <span className="font-medium">{footR}</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
