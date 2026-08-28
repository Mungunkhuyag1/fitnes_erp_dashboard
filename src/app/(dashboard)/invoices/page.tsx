'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FilterSelect, type FilterOption } from '@/components/filter-select';
import { AwaitingApprovalCard } from '@/components/awaiting-approval-card';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import { useNow } from '@/hooks/use-now';
import { qs, type Page } from '@/lib/api';
import { dateTime, money, relative } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * «8 мин өмнө» — зөвхөн ХУГАЦААНЫ зөрүүнд «өмнө» залгана.
 *
 * `relative()` нь «Дөнгөж сая» эсвэл хуучин бол бүтэн огноо ч буцаадаг;
 * тэдэнд «өмнө» залгавал «Дөнгөж сая өмнө» гэсэн утгагүй бичиг гарна.
 */
function ago(value: string | null): string {
  const r = relative(value);
  return /^\d+ (мин|цаг|хоног)$/.test(r) ? `${r} өмнө` : r;
}

interface InvoiceRow {
  id: string;
  memberId: string;
  memberName: string | null;
  memberNo: number | null;
  packageId: string;
  packageName: string;
  days: number;
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  provider: string;
  transactionId: string;
  payUrl: string | null;
  paidAt: string | null;
  expiresAt: string;
  createdAt: string;
}

/** Дэлгэрэнгүй цонхны нэг мөр. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="min-w-0 text-right text-sm">{children}</span>
    </div>
  );
}

interface PackageRow {
  id: string;
  name: string;
}

const STATUS: Record<
  InvoiceRow['status'],
  { label: string; tone: string; dot: string }
> = {
  pending: {
    label: 'Хүлээгдэж буй',
    tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  paid: {
    label: 'Төлөгдсөн',
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  expired: {
    label: 'Хугацаа дууссан',
    tone: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/40',
  },
  cancelled: {
    label: 'Цуцлагдсан',
    tone: 'bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
};

const STATUS_FILTERS: FilterOption[] = [
  { value: '', label: 'Төлөв — бүгд' },
  ...(Object.keys(STATUS) as InvoiceRow['status'][]).map((k) => ({
    value: k,
    label: STATUS[k].label,
    dot: STATUS[k].dot,
  })),
];

/**
 * Хүлээгдэж буй нэхэмжлэх хэдэн минутын дараа хаагдахыг харуулна.
 *
 * Нэхэмжлэх 5 минутын настай тул «2 минут» гэдэг нь ажилтанд бодитой
 * мэдээлэл: гишүүн одоо төлж амжих уу, эсвэл дахин үүсгэх үү.
 */
function Countdown({ expiresAt }: { expiresAt: string }) {
  const now = useNow();
  // Сервер дээр `now === 0` — тоолуур зөвхөн клиент дээр утгатай.
  if (!now) return <span className="text-muted-foreground">…</span>;
  const left = new Date(expiresAt).getTime() - now;
  if (left <= 0) return <span className="text-muted-foreground">дууссан</span>;
  const min = Math.floor(left / 60_000);
  const sec = Math.floor((left % 60_000) / 1000);
  return (
    <span className="tabular-nums">
      {min}:{String(sec).padStart(2, '0')}
    </span>
  );
}

export default function InvoicesPage() {
  const router = useRouter();
  const [detail, setDetail] = useState<InvoiceRow | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [packageId, setPackageId] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);

  const { data: packages } = useApi<Page<PackageRow>>('/packages?limit=100');

  const path = useMemo(
    () =>
      `/invoices${qs({
        q: q || undefined,
        status: status || undefined,
        packageId: packageId || undefined,
        page,
        limit: 20,
      })}`,
    [q, status, packageId, page],
  );
  const { data, loading, error } = useApi<Page<InvoiceRow>>(path);

  const packageFilters: FilterOption[] = [
    { value: '', label: 'Багц — бүгд' },
    ...(packages?.items ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  const setFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  // Одоогийн ХУУДСАН дээрх дүн — нийт биш. Хуудаслалттай жагсаалтад
  // «нийт төлөгдсөн дүн» гэж бичвэл ажилтныг төөрөгдүүлнэ.
  const pageTotals = useMemo(() => {
    const items = data?.items ?? [];
    const sum = (s: InvoiceRow['status']) =>
      items.filter((i) => i.status === s).reduce((a, b) => a + b.amount, 0);
    return {
      pending: items.filter((i) => i.status === 'pending').length,
      pendingAmount: sum('pending'),
      paidAmount: sum('paid'),
    };
  }, [data]);

  const columns: Column<InvoiceRow>[] = [
    {
      key: 'member',
      header: 'Гишүүн',
      cell: (i) => (
        <div>
          <span className="font-medium">{i.memberName ?? '—'}</span>
          {/* ⚠ `!== null` гэж шалгаж БОЛОХГҮЙ: талбар огт ирээгүй үед
              `undefined` болох ба тэр шалгалтыг давж «№» гэж хоосон
              хэвлэдэг байв. */}
          {i.memberNo ? (
            <span className="text-muted-foreground ml-1.5 text-xs">
              №{i.memberNo}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'package',
      header: 'Багц',
      cell: (i) => (
        <span className="text-sm">
          {i.packageName}
          <span className="text-muted-foreground ml-1.5 text-xs">
            {i.days} хоног
          </span>
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Дүн',
      cell: (i) => (
        <span className="font-medium tabular-nums">{money(i.amount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Төлөв',
      cell: (i) => (
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
            STATUS[i.status].tone,
          )}
        >
          {STATUS[i.status].label}
        </span>
      ),
    },
    {
      key: 'left',
      header: 'Үлдсэн хугацаа',
      cell: (i) =>
        i.status === 'pending' ? (
          <span className="text-sm">
            <Countdown expiresAt={i.expiresAt} />
          </span>
        ) : i.paidAt ? (
          // Төлөгдсөн бол «үлдсэн хугацаа» гэж юу ч байхгүй — хэзээ
          // төлөгдсөнийг харуулах нь илүү хэрэгтэй.
          <span className="text-muted-foreground text-xs">
            {ago(i.paidAt)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: 'created',
      header: 'Үүссэн',
      cell: (i) => (
        <span className="text-muted-foreground font-mono text-xs">
          {dateTime(i.createdAt)}
        </span>
      ),
      hideOnMobile: true,
    },
  ];

  const activeFilters = [
    status && {
      label: STATUS_FILTERS.find((f) => f.value === status)?.label ?? status,
      clear: () => setFilter(() => setStatus('')),
    },
    packageId && {
      label: packageFilters.find((f) => f.value === packageId)?.label ?? 'Багц',
      clear: () => setFilter(() => setPackageId('')),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <div className="flex h-full flex-col gap-5">
      <PageHeader
        title="Төлбөр"
        description="Онлайн нэхэмжлэх ба гүйлгээний түүх"
      />

      <AwaitingApprovalCard />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Хүлээгдэж буй"
          value={pageTotals.pending}
          suffix="ширхэг"
          sub={
            pageTotals.pending
              ? `${money(pageTotals.pendingAmount)} · 5 минутын дараа автоматаар хаагдана`
              : 'Нээлттэй нэхэмжлэх алга'
          }
        />
        <StatCard
          label="Төлөгдсөн"
          value={money(pageTotals.paidAmount)}
          sub="Энэ хуудсан дээрх"
        />
        <StatCard
          label="Нийт бичлэг"
          value={data?.total ?? '—'}
          sub="Шүүлтүүрийн дүнгээр"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Хайлт нь мөрийг бүхэлд нь эзлэхгүй — шүүлтүүрүүд
            баруун талд шахагдахаа больж, мөр тэнцвэртэй болно. */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Гишүүний нэр эсвэл утсаар хайх…"
            className="pl-9"
          />
        </div>
        <FilterSelect
          value={status}
          onChange={(v) => setFilter(() => setStatus(v))}
          options={STATUS_FILTERS}
          placeholder="Төлөв"
        />
        <FilterSelect
          value={packageId}
          onChange={(v) => setFilter(() => setPackageId(v))}
          options={packageFilters}
          placeholder="Багц"
        />
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <Button key={f.label} size="xs" variant="secondary" onClick={f.clear}>
              {f.label} ✕
            </Button>
          ))}
        </div>
      )}

      <DataTable
        fill
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        rowKey={(i) => i.id}
        emptyText="Нэхэмжлэх алга"
        onPageChange={setPage}
        onRowClick={setDetail}
      />

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Гүйлгээний дэлгэрэнгүй</DialogTitle>
            <DialogDescription>
              {detail?.packageName} · {detail && money(detail.amount)}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-3">
              <Row label="Төлөв">
                <span
                  className={cn(
                    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                    STATUS[detail.status].tone,
                  )}
                >
                  {STATUS[detail.status].label}
                </span>
              </Row>
              <Row label="Гишүүн">
                <button
                  className="text-primary hover:underline"
                  onClick={() => router.push(`/members/${detail.memberId}`)}
                >
                  {detail.memberName ?? '—'}
                  {detail.memberNo ? ` №${detail.memberNo}` : ''}
                </button>
              </Row>
              <Row label="Багц">
                {detail.packageName} · {detail.days} хоног
              </Row>
              <Row label="Дүн">
                <span className="font-medium tabular-nums">
                  {money(detail.amount)}
                </span>
              </Row>
              <Row label="Гүйлгээний дугаар">
                {/* Bonum-тай тулгахад ЭНЭ дугаараар хайна. */}
                <code className="bg-muted rounded px-1.5 py-0.5 text-xs break-all">
                  {detail.transactionId}
                </code>
              </Row>
              <Row label="Суваг">{detail.provider}</Row>
              <Row label="Үүссэн">{dateTime(detail.createdAt)}</Row>
              <Row label="Хугацаа дуусах">{dateTime(detail.expiresAt)}</Row>
              <Row label="Төлсөн">
                {detail.paidAt ? (
                  <>
                    {dateTime(detail.paidAt)}
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      {ago(detail.paidAt)}
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </Row>
              {detail.payUrl && detail.status === 'pending' && (
                <Row label="Төлбөрийн холбоос">
                  <a
                    href={detail.payUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs break-all hover:underline"
                  >
                    {detail.payUrl}
                  </a>
                </Row>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
