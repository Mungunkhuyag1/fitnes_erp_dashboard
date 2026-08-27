'use client';

import { Bell, KeyRound, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { FilterSelect, type FilterOption } from '@/components/filter-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth';
import { api, qs, type Page } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Assignment {
  id: string;
  zone: string;
  number: number;
  type: 'daily' | 'rental';
  memberId: string;
  memberName: string | null;
  memberNo: number | null;
  issuedAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  amount: number;
  overdue: boolean;
  note: string | null;
}

const TYPE_FILTERS: FilterOption[] = [
  { value: '', label: 'Бүх төрөл' },
  { value: 'daily', label: 'Өдрийн' },
  { value: 'rental', label: 'Түрээс' },
];

const STATE_FILTERS: FilterOption[] = [
  { value: '', label: 'Бүх төлөв' },
  { value: 'out', label: 'Гарсан хэвээр', dot: 'bg-amber-500' },
  { value: 'returned', label: 'Буцаагдсан', dot: 'bg-emerald-500' },
  { value: 'overdue', label: 'Хугацаа хэтэрсэн', dot: 'bg-destructive' },
];

/** «3 цаг 20 мин» — түлхүүр хэр удаан гарсан бэ. */
function duration(fromIso: string, toIso: string | null): string {
  const min = Math.max(
    0,
    Math.round(
      ((toIso ? new Date(toIso).getTime() : Date.now()) -
        new Date(fromIso).getTime()) /
        60_000,
    ),
  );
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} ц ${min % 60} мин` : `${h} цаг`;
  return `${Math.floor(h / 24)} хоног`;
}

/**
 * Түлхүүр олголтын бүрэн түүх.
 *
 * Самбар нь ЗӨВХӨН одоогийн байдлыг харуулдаг. Маргаан гарахад («би
 * буцаасан» / «үгүй») хэн, хэзээ авч, хэзээ буцаасныг харах газар
 * хэрэгтэй — backend-д эндпойнт байсан ч дэлгэц байгаагүй.
 */
export function LockerHistory() {
  const router = useRouter();
  const { can } = useAuth();
  const [type, setType] = useState('');
  const [state, setState] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reminding, setReminding] = useState<string | null>(null);

  const set = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const { data, loading, error, reload } = useApi<Page<Assignment>>(
    `/locker-assignments${qs({
      type: type || undefined,
      outstanding: state === 'out' || state === 'overdue' ? true : undefined,
      overdue: state === 'overdue' ? true : undefined,
      // `returned` талбар backend-д байхгүй тул `outstanding=false` гэж явна.
      ...(state === 'returned' ? { outstanding: false } : {}),
      q: search.trim() || undefined,
      page,
      limit: 25,
    })}`,
  );

  async function remind(a: Assignment) {
    setReminding(a.id);
    try {
      const r = await api.post<{ queued: boolean; reason?: string }>(
        `/locker-assignments/${a.id}/remind`,
      );
      if (r.queued) {
        toast.success(`${a.memberName ?? 'Гишүүн'} рүү сануулга илгээв`, {
          description: `${a.zone} №${a.number} шүүгээ`,
        });
      } else {
        toast.warning('Илгээгдсэнгүй', { description: r.reason });
      }
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setReminding(null);
    }
  }

  const columns: Column<Assignment>[] = [
    {
      key: 'locker',
      header: 'Шүүгээ',
      cell: (a) => (
        <span className="font-medium">
          {a.zone} <span className="tabular-nums">№{a.number}</span>
        </span>
      ),
      className: 'w-36',
    },
    {
      key: 'member',
      header: 'Гишүүн',
      cell: (a) => (
        <div className="leading-tight">
          <div className="font-medium">{a.memberName ?? '—'}</div>
          {a.memberNo ? (
            <div className="text-muted-foreground font-mono text-xs tabular-nums">
              №{a.memberNo}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Төрөл',
      cell: (a) => (
        <Badge variant="outline" className="font-normal">
          {a.type === 'rental' ? 'Түрээс' : 'Өдрийн'}
        </Badge>
      ),
      className: 'w-24',
    },
    {
      key: 'issued',
      header: 'Олгосон',
      cell: (a) => (
        <span className="text-muted-foreground font-mono text-xs">
          {dateTime(a.issuedAt)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'returned',
      header: 'Буцаасан',
      cell: (a) =>
        a.returnedAt ? (
          <span className="text-muted-foreground font-mono text-xs">
            {dateTime(a.returnedAt)}
          </span>
        ) : (
          <span
            className={cn(
              'text-xs font-medium',
              a.overdue ? 'text-destructive' : 'text-amber-600 dark:text-amber-400',
            )}
          >
            Гарсан хэвээр
          </span>
        ),
    },
    {
      key: 'dur',
      header: 'Үргэлжилсэн',
      cell: (a) => (
        <span className="text-sm tabular-nums">
          {duration(a.issuedAt, a.returnedAt)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'amount',
      header: 'Дүн',
      cell: (a) => (
        <span className="text-sm tabular-nums">
          {a.amount ? money(a.amount) : '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'act',
      header: '',
      cell: (a) =>
        // Сануулга зөвхөн ГАРСАН хэвээр байгаа түлхүүрт. Буцаагдсаны
        // дараа илгээх нь утгагүй.
        !a.returnedAt && can('manager') ? (
          <Button
            size="sm"
            variant="outline"
            disabled={reminding !== null}
            onClick={(e) => {
              e.stopPropagation();
              void remind(a);
            }}
          >
            <Bell className="size-3.5" />
            Сануулах
          </Button>
        ) : null,
      className: 'w-32 text-right',
    },
  ];

  const filtered = !!(type || state || search.trim());

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => set(() => setSearch(e.target.value))}
            placeholder="Гишүүний нэрээр хайх…"
            className="pl-9"
          />
        </div>
        <FilterSelect
          value={type}
          onChange={(v) => set(() => setType(v))}
          options={TYPE_FILTERS}
          placeholder="Төрөл"
        />
        <FilterSelect
          value={state}
          onChange={(v) => set(() => setState(v))}
          options={STATE_FILTERS}
          placeholder="Төлөв"
        />
      </div>

      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        rowKey={(a) => a.id}
        onRowClick={(a) => router.push(`/members/${a.memberId}`)}
        onPageChange={setPage}
        empty={
          <EmptyState
            icon={filtered ? Search : KeyRound}
            title={
              filtered
                ? 'Шүүлтүүрт тохирох бичлэг олдсонгүй'
                : 'Түлхүүр олгоогүй байна'
            }
            hint={
              filtered
                ? 'Шүүлтүүрээ өөрчилж үзнэ үү.'
                : 'Шүүгээ олгомогц түүх энд хуримтлагдана.'
            }
          />
        }
      />
    </div>
  );
}
