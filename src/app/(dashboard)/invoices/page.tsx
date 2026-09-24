'use client';

import { Loader2, Search, Wallet } from 'lucide-react';
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
import { useTableState } from '@/hooks/use-table-state';
import { useDebounce } from '@/hooks/use-debounce';
import { useNow } from '@/hooks/use-now';
import { toast } from 'sonner';
import { api, qs, type Page } from '@/lib/api';
import { errorToast } from '@/lib/errors';
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
  memberNo: string | null;
  packageId: string;
  packageName: string;
  days: number;
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  /** `bonum` (онлайн) · `cash` · `manual`. */
  provider: string;
  transactionId: string | null;
  payUrl: string | null;
  paidAt: string | null;
  /** Гараар бүртгэсэн мөрөнд утгагүй — хугацаа дуусдаггүй. */
  expiresAt: string | null;
  createdAt: string;
  /**
   * Мөр ХААНААС гарсан бэ.
   *
   * ⚠ Онлайн нэхэмжлэх 5 минутын дараа ӨӨРӨӨ хаагддаг; гараар
   * бүртгэсэн авлага нь хүн мөнгө авах хүртэл хүлээнэ. Хоёуланг нь
   * «хүлээгдэж буй» гэж нэг адил харуулбал авлага хэзээ ч цуглуулагдахгүй.
   */
  kind: 'invoice' | 'membership';
}

/** Төлбөр ЯМАР сувгаар орсон бэ. */
const CHANNEL: Record<string, { label: string; tone: string }> = {
  bonum: { label: 'Онлайн', tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  cash: {
    label: 'Бэлэн',
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  manual: {
    label: 'Гараар',
    tone: 'bg-muted text-muted-foreground',
  },
};

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
  const q = useDebounce(search);

  const table = useTableState({ key: 'createdAt', dir: 'DESC' });
  const { setPage } = table;

  const { data: packages } = useApi<Page<PackageRow>>('/packages?limit=100');

  const path = useMemo(
    () =>
      `/invoices${qs({
        q: q || undefined,
        status: status || undefined,
        packageId: packageId || undefined,
        ...table.params,
      })}`,
    [q, status, packageId, table.params],
  );
  const { data, loading, error, reload } = useApi<Page<InvoiceRow>>(path);

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
  /** Авлага барагдуулж буй мөр. */
  const [paying, setPaying] = useState<string | null>(null);

  async function markPaid(i: InvoiceRow) {
    setPaying(i.id);
    try {
      await api.post(`/memberships/${i.id}/pay`);
      toast.success(`${money(i.amount)} хүлээн авав`, {
        description: i.memberName ?? undefined,
      });
      reload();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setPaying(null);
    }
  }

  const pageTotals = useMemo(() => {
    const items = data?.items ?? [];
    const sum = (s: InvoiceRow['status']) =>
      items.filter((i) => i.status === s).reduce((a, b) => a + b.amount, 0);
    /*
     * ⚠ «Хүлээгдэж буй»-г ХОЁР хуваана. Онлайн нэхэмжлэх нь 5 минутын
     * дараа өөрөө хаагддаг тул анхаарал шаардахгүй; авлага нь хүн
     * очиж мөнгө авах хүртэл хэвтэнэ. Нэг тоо болговол авлага
     * нэхэмжлэхийн чимээнд алдагдана.
     */
    const owed = items.filter(
      (i) => i.status === 'pending' && i.kind === 'membership',
    );
    return {
      pending: items.filter(
        (i) => i.status === 'pending' && i.kind === 'invoice',
      ).length,
      pendingAmount: items
        .filter((i) => i.status === 'pending' && i.kind === 'invoice')
        .reduce((a, b) => a + b.amount, 0),
      paidAmount: sum('paid'),
      owedCount: owed.length,
      owedAmount: owed.reduce((a, b) => a + b.amount, 0),
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
      sortKey: 'amount',
      cell: (i) => (
        <span className="font-medium tabular-nums">{money(i.amount)}</span>
      ),
    },
    {
      key: 'channel',
      header: 'Суваг',
      cell: (i) => {
        const c = CHANNEL[i.provider] ?? {
          label: i.provider,
          tone: 'bg-muted text-muted-foreground',
        };
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
              c.tone,
            )}
          >
            {c.label}
          </span>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Төлөв',
      sortKey: 'status',
      cell: (i) =>
        /*
          ⚠ Гараар бүртгэсэн «хүлээгдэж буй» нь АВЛАГА — хэн нэгэн
          очиж мөнгө авах ёстой. Онлайн нэхэмжлэхийн «хүлээгдэж буй»
          нь өөрөө хаагдана. Нэг шошготой байвал ялгагдахгүй.
        */
        i.status === 'pending' && i.kind === 'membership' ? (
          <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            Авлага
          </span>
        ) : (
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
        // Countdown нь ЗӨВХӨН нэхэмжлэхэд — авлага хугацаа дуусдаггүй.
        i.status === 'pending' && i.kind === 'invoice' && i.expiresAt ? (
          <span className="text-sm">
            <Countdown expiresAt={i.expiresAt} />
          </span>
        ) : i.status === 'pending' ? (
          <span className="text-muted-foreground text-xs">
            Мөнгө хүлээгдэж байна
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
      key: 'act',
      header: '',
      cell: (i) =>
        // Зөвхөн АВЛАГА дээр. Онлайн нэхэмжлэхийг гараар «төлөгдсөн»
        // болгох нь өөр урсгал (баримт шалгах) бөгөөд энд байх ёсгүй.
        i.status === 'pending' && i.kind === 'membership' ? (
          <Button
            size="sm"
            variant="outline"
            disabled={paying !== null}
            onClick={(e) => {
              e.stopPropagation();
              void markPaid(i);
            }}
          >
            {paying === i.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Wallet className="size-3.5" />
            )}
            Төлбөр авах
          </Button>
        ) : null,
      className: 'w-36 text-right',
    },
    {
      key: 'created',
      header: 'Үүссэн',
      sortKey: 'createdAt',
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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Төлбөр"
        description="Онлайн, бэлэн, гараар — бүх төлбөр"
      />

      <AwaitingApprovalCard />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        {/*
          ⚠ АВЛАГА нь «хүлээгдэж буй»-гаас ТУСДАА. Онлайн нэхэмжлэх
          өөрөө хаагддаг тул анхаарал шаардахгүй; авлага нь хүн очиж
          мөнгө авах хүртэл хэвтэнэ.
        */}
        <StatCard
          label="Авлага"
          value={money(pageTotals.owedAmount)}
          sub={
            pageTotals.owedCount
              ? `${pageTotals.owedCount} хүнээс авах`
              : 'Авлага алга'
          }
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
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        rowKey={(i) => i.id}
        emptyText="Нэхэмжлэх алга"
        onPageChange={setPage}
        sort={table.sort}
        onSortChange={table.setSort}
        pageSize={table.pageSize}
        onPageSizeChange={table.setPageSize}
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
