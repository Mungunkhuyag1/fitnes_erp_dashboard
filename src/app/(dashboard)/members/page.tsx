'use client';

import {
  AlertTriangle,
  PhoneOff,
  Plus,
  ScanFace,
  Search,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { CardStageDot, type CardStage } from '@/components/card-stage';
import { FilterSelect, type FilterOption } from '@/components/filter-select';
import { DataTable, type Column } from '@/components/data-table';
import { LinkButton } from '@/components/link-button';
import { PageHeader } from '@/components/page-header';
import { DaysLeft, StatusBadge } from '@/components/status-badge';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import { qs, type Page } from '@/lib/api';
import { phone as fmtPhone, relative } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MemberRow {
  id: string;
  memberNo: number;
  name: string;
  phone: string | null;
  status: string;
  accessEndsAt: string | null;
  daysLeft: number | null;
  faceEnrolled: boolean;
  hasCard: boolean;
  cardStage: CardStage;
  lastVisitAt: string | null;
  syncError: string | null;
}

const CARD_STAGE_FILTERS: FilterOption[] = [
  { value: '', label: 'Wallet карт — бүгд' },
  { value: 'not_allowed', label: 'Бүртгэгдээгүй', dot: 'bg-destructive' },
  { value: 'no_card', label: 'Карт үүсгээгүй', dot: 'bg-muted-foreground/40' },
  { value: 'no_wallet', label: 'Wallet-д нэмээгүй', dot: 'bg-amber-500' },
  { value: 'active', label: 'Идэвхтэй', dot: 'bg-emerald-500' },
];

const STATUS_FILTERS: FilterOption[] = [
  { value: '', label: 'Төлөв — бүгд' },
  { value: 'active', label: 'Идэвхтэй', dot: 'bg-emerald-500' },
  { value: 'expired', label: 'Дууссан', dot: 'bg-orange-500' },
  { value: 'lead', label: 'Шинэ', dot: 'bg-sky-500' },
  { value: 'suspended', label: 'Зогссон', dot: 'bg-amber-500' },
  { value: 'cancelled', label: 'Цуцалсан', dot: 'bg-muted-foreground/40' },
];

const EXPIRING_FILTERS: FilterOption[] = [
  { value: '', label: 'Хугацаа — бүгд' },
  { value: '3', label: '3 хоногт дуусах' },
  { value: '7', label: '7 хоногт дуусах' },
  { value: '30', label: '30 хоногт дуусах' },
];

const PHONE_FILTERS: FilterOption[] = [
  { value: '', label: 'Бүгд' },
  { value: 'true', label: 'Утасгүй', dot: 'bg-destructive' },
];

const FACE_FILTERS: FilterOption[] = [
  { value: '', label: 'Царай — бүгд' },
  { value: 'false', label: 'Уншуулаагүй', dot: 'bg-sky-500' },
  { value: 'true', label: 'Уншуулсан', dot: 'bg-emerald-500' },
];

function MembersList() {
  const router = useRouter();
  const params = useSearchParams();

  // URL-аас эхний төлөв — dashboard-аас «удахгүй дуусах» дарж ирэхэд хадгалагдана.
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [expiring, setExpiring] = useState(params.get('expiring') ?? '');
  const [face, setFace] = useState(params.get('faceEnrolled') ?? '');
  // Нүүр хуудасны анхааруулгаас  гэж шууд орж ирнэ.
  const [noPhone, setNoPhone] = useState(params.get('noPhone') ?? '');
  const [cardStage, setCardStage] = useState(params.get('cardStage') ?? '');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);

  const path = useMemo(
    () =>
      `/members${qs({
        q: q || undefined,
        status: status || undefined,
        expiring: expiring || undefined,
        faceEnrolled: face || undefined,
        cardStage: cardStage || undefined,
        noPhone: noPhone || undefined,
        page,
        limit: 20,
      })}`,
    [q, status, expiring, face, cardStage, noPhone, page],
  );

  const { data, loading, error } = useApi<Page<MemberRow>>(path);

  const setFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const activeFilters = [
    status && {
      label: STATUS_FILTERS.find((f) => f.value === status)?.label ?? status,
      clear: () => setFilter(() => setStatus('')),
    },
    expiring && {
      label: `${expiring} хоногт дуусах`,
      clear: () => setFilter(() => setExpiring('')),
    },
    face && {
      label: FACE_FILTERS.find((f) => f.value === face)?.label ?? face,
      clear: () => setFilter(() => setFace('')),
    },
    noPhone && {
      label: 'Утасгүй',
      clear: () => setFilter(() => setNoPhone('')),
    },
    cardStage && {
      label: `Карт: ${CARD_STAGE_FILTERS.find((f) => f.value === cardStage)?.label ?? cardStage}`,
      clear: () => setFilter(() => setCardStage('')),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const columns: Column<MemberRow>[] = [
    {
      key: 'no',
      header: '№',
      cell: (m) => (
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {m.memberNo}
        </span>
      ),
      className: 'w-16',
    },
    {
      key: 'name',
      header: 'Нэр',
      cell: (m) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{m.name}</span>
          {/* Lucide икон `title` prop авдаггүй — span-аар бүрхэнэ. */}
          {!m.faceEnrolled && (
            <span title="Царай бүртгээгүй" className="inline-flex">
              <ScanFace className="size-3.5 text-sky-500" aria-label="Царай бүртгээгүй" />
            </span>
          )}
          {m.syncError && (
            <span title={m.syncError} className="inline-flex">
              <AlertTriangle
                className="text-destructive size-3.5"
                aria-label="Синкийн алдаа"
              />
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Утас',
      cell: (m) => (
        // ⚠ Утасгүй бол Loopy-тэй холбогдохгүй — ердийн «—» биш,
        // анзаарагдахуйц байх ёстой.
        m.phone ? (
          <span className="font-mono text-sm tabular-nums">
            {fmtPhone(m.phone)}
          </span>
        ) : (
          <span className="text-destructive inline-flex items-center gap-1 text-xs font-medium">
            <PhoneOff className="size-3.5" />
            Утас алга
          </span>
        )
      ),
    },
    { key: 'status', header: 'Төлөв', cell: (m) => <StatusBadge status={m.status} /> },
    {
      key: 'days',
      header: 'Үлдсэн',
      cell: (m) => <DaysLeft days={m.daysLeft} />,
      hideOnMobile: true,
    },
    {
      key: 'card',
      header: 'Wallet карт',
      cell: (m) => <CardStageDot stage={m.cardStage} />,
      hideOnMobile: true,
    },
    {
      key: 'visit',
      header: 'Сүүлд ирсэн',
      cell: (m) => (
        <span className="text-muted-foreground text-sm">{relative(m.lastVisitAt)}</span>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    // `h-full` — хуудас дэлгэцийг ЯГ дүүргэнэ. Ингэснээр гадна талд
    // гүйх зүйл үлдэхгүй, зөвхөн хүснэгтийн бие дотроо гүйнэ.
    <div className="flex h-full flex-col gap-5">
      <PageHeader title="Гишүүд" description="Хайлт, шүүлтүүр, бүртгэл">
        <LinkButton href="/members/new">
          <Plus className="size-4" />
          Гишүүн нэмэх
        </LinkButton>
      </PageHeader>

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
            placeholder="Нэр эсвэл утсаар хайх…"
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
          value={cardStage}
          onChange={(v) => setFilter(() => setCardStage(v))}
          options={CARD_STAGE_FILTERS}
          placeholder="Wallet карт"
        />
        <FilterSelect
          value={expiring}
          onChange={(v) => setFilter(() => setExpiring(v))}
          options={EXPIRING_FILTERS}
          placeholder="Хугацаа"
        />
        <FilterSelect
          value={face}
          onChange={(v) => setFilter(() => setFace(v))}
          options={FACE_FILTERS}
          placeholder="Царай"
        />
        <FilterSelect
          value={noPhone}
          onChange={(v) => setFilter(() => setNoPhone(v))}
          options={PHONE_FILTERS}
          placeholder="Утас"
        />
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <button
              key={f.label}
              onClick={f.clear}
              className={cn(
                'bg-accent text-accent-foreground inline-flex items-center gap-1.5',
                'rounded-md px-2 py-1 text-xs hover:opacity-80',
              )}
            >
              {f.label}
              <X className="size-3" />
            </button>
          ))}
        </div>
      )}

      <DataTable
        fill
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        rowKey={(m) => m.id}
        onRowClick={(m) => router.push(`/members/${m.id}`)}
        emptyText="Гишүүн олдсонгүй"
        onPageChange={setPage}
      />
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense>
      <MembersList />
    </Suspense>
  );
}
