import { MEMBER_STATUS } from '@/lib/format';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  const s = MEMBER_STATUS[status] ?? {
    label: status,
    tone: 'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        s.tone,
      )}
    >
      {s.label}
    </span>
  );
}

/** Үлдсэн хоног — өнгөөр анхааруулна. */
export function DaysLeft({ days }: { days: number | null }) {
  if (days === null) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  const tone =
    days < 0
      ? 'text-destructive'
      : days <= 7
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-foreground';
  return (
    <span className={cn('font-mono text-sm tabular-nums', tone)}>
      {days < 0 ? `${days}` : days} хоног
    </span>
  );
}
