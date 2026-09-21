'use client';

import {
  CheckCircle2,
  DoorOpen,
  Download,
  Search,
  SearchX,
  ShieldAlert,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckInDetail } from '@/components/check-in-detail';
import { DataTable, type Column } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { FilterSelect, type FilterOption } from '@/components/filter-select';
import { PageHeader } from '@/components/page-header';
import { TerminalImage } from '@/components/terminal-image';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { useTableState } from '@/hooks/use-table-state';
import { useDebounce } from '@/hooks/use-debounce';
import { qs, type Page } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { date, dateTime, relative, time } from '@/lib/format';
import { cn } from '@/lib/utils';

interface EventRow {
  id: string;
  memberId: string | null;
  memberName: string | null;
  /**
   * Терминал дээр бичигдсэн нэр.
   *
   * WinFit-д гишүүн олдоогүй үед хэн болохыг хэлэх цорын ганц эх
   * сурвалж — терминалаас импортолсон ирцийн ихэнх нь тийм.
   */
  terminalName: string | null;
  memberNo: string | null;
  eventAt: string;
  granted: boolean;
  reasonLabel: string;
  verifyMode: string | null;
  /** Уншуулах үеийн зургийн ЗАМ — терминал дээр байдаг. */
  picturePath: string | null;
}

interface Stats {
  scans: number;
  granted: number;
  denied: number;
  visitors: number;
  denyRate: number | null;
}

/**
 * Хугацааны хүрээ.
 *
 * `days`-ыг СЕРВЕРТ илгээж тэнд тооцуулна — клиент дээр `Date.now()` дуудвал
 * render impure болно (`react-hooks/purity`), мөн ажилтны компьютерын цаг
 * зөрсөн бол тайлан зөрөх байсан.
 */
const RANGES = [
  { key: 'today', label: 'Өнөөдөр', days: 0 },
  { key: '7', label: 'Сүүлийн 7 хоног', days: 7 },
  { key: '30', label: 'Сүүлийн 30 хоног', days: 30 },
  { key: 'all', label: 'Бүх хугацаа', days: null },
] as const;

type RangeKey = (typeof RANGES)[number]['key'];

const RANGE_OPTIONS: FilterOption[] = RANGES.map((r) => ({
  value: r.key,
  label: r.label,
}));

const RESULT_OPTIONS: FilterOption[] = [
  { value: '', label: 'Бүх үр дүн' },
  { value: 'true', label: 'Зөвшөөрсөн', dot: 'bg-emerald-500' },
  { value: 'false', label: 'Татгалзсан', dot: 'bg-destructive' },
];

/**
 * Шалтгааны шошго нь backend-ийн `REASON_LABEL`-тай тохирох ёстой
 * (`access.service.ts`). Энд зөвхөн ТАТГАЛЗСАН шалтгаанууд — «Зөвшөөрөв»
 * нь үр дүнгийн шүүлтүүрт харьяалагдана.
 */
const REASON_OPTIONS: FilterOption[] = [
  { value: '', label: 'Бүх шалтгаан' },
  { value: 'expired', label: 'Хугацаа дууссан' },
  { value: 'suspended', label: 'Түр зогссон' },
  { value: 'no_match', label: 'Танигдсангүй' },
  { value: 'unknown_member', label: 'Бүртгэлгүй дугаар' },
  { value: 'other', label: 'Бусад' },
];

const VERIFY_LABEL: Record<string, string> = {
  face: 'Царай',
  card: 'Карт',
  fp: 'Хурууны хээ',
  pin: 'ПИН',
};

export default function CheckInsPage() {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('today');
  const [result, setResult] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  /** Дэлгэрэнгүй цонх нээх ирцийн ID. */
  const [detailId, setDetailId] = useState<string | null>(null);

  const table = useTableState({ key: 'eventAt', dir: 'DESC' });
  const { setPage, onFilter: setFilter } = table;

  const q = useDebounce(search);
  const days = RANGES.find((x) => x.key === range)!.days;
  const live = range === 'today';

  const { data, loading, error } = useApi<Page<EventRow>>(
    `/access-events${qs({
      days: days ?? undefined,
      granted: result || undefined,
      reason: reason || undefined,
      q: q || undefined,
      ...table.params,
    })}`,
    { refreshMs: live ? 20_000 : undefined },
  );

  /**
   * Үзүүлэлт нь ЗӨВХӨН хугацааны хүрээнээс хамаарна — үр дүн/шалтгааны
   * шүүлтүүрээс биш. Тэгэхгүй бол «Татгалзсан» шүүхэд «Зөвшөөрсөн 0» гэж
   * гарч, ажилтныг төөрөгдүүлнэ. Хайрцгууд нь ерөнхий зураглал өгөх
   * зорилготой; хүснэгт нь нарийвчилсан шүүлтийг харуулна.
   */
  const { data: stats } = useApi<Stats>(
    `/access-events/stats${qs({ days: days ?? undefined })}`,
    { refreshMs: live ? 20_000 : undefined },
  );

  const activeFilters = [
    result && {
      label: RESULT_OPTIONS.find((o) => o.value === result)!.label,
      clear: () => setFilter(() => setResult('')),
    },
    reason && {
      label: REASON_OPTIONS.find((o) => o.value === reason)!.label,
      clear: () => setFilter(() => setReason('')),
    },
    q && {
      label: `Хайлт: ${q}`,
      clear: () => setFilter(() => setSearch('')),
    },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const clearAll = () =>
    setFilter(() => {
      setResult('');
      setReason('');
      setSearch('');
    });

  const columns: Column<EventRow>[] = [
    {
      key: 'ok',
      header: '',
      cell: (e) =>
        e.granted ? (
          <CheckCircle2 className="size-4 text-emerald-500" />
        ) : (
          <XCircle className="text-destructive size-4" />
        ),
      className: 'w-10',
    },
    {
      key: 'shot',
      header: '',
      /*
       * Уншуулах үеийн кадр. «Энэ хүн үнэхээр орсон уу» гэсэн маргааныг
       * шийддэг цорын ганц нотолгоо.
       *
       * ⚠ Зураг нь терминал дээр байдаг — WinFit зөвхөн замыг хадгална.
       * Терминалын санах ой дүүрэхэд хуучин кадр дарагдана.
       */
      cell: (e) =>
        e.picturePath ? (
          <TerminalImage
            path={e.picturePath}
            alt="Уншуулах үеийн зураг"
            className="size-10"
          />
        ) : null,
      className: 'w-14',
      hideOnMobile: true,
    },
    {
      key: 'when',
      header: 'Цаг',
      sortKey: 'eventAt',
      cell: (e) => (
        <div className="leading-tight">
          {/* Өнөөдрийн жагсаалтад огноо нь БҮГД ижил тул зөвхөн цагийг
              харуулна — нүд шаардлагагүй давталтыг уншихгүй. */}
          <div className="font-mono text-sm tabular-nums">
            {live ? time(e.eventAt) : dateTime(e.eventAt)}
          </div>
          <div className="text-muted-foreground text-xs">
            {live ? relative(e.eventAt) : date(e.eventAt)}
          </div>
        </div>
      ),
      className: 'w-28',
    },
    {
      key: 'who',
      header: 'Гишүүн',
      // Терминал дээрх ДУГААРААР — нэр нь бусад хүснэгтээс ирдэг тул.
      sortKey: 'memberNo',
      // ⚠ Өргөнийг ЗОРИУДААР өгөхгүй. `table-auto`-д бүх багана хэмжээтэй
      // байвал үлдсэн зай БҮГДЭД нь хуваарилагдаж, багана бүр хоорондоо
      // цоорхойтой болно. Ганц багана чөлөөтэй байвал үлдсэн зайг тэр
      // шингээж, бусад нь агуулгынхаа хэрээр нягт байрлана.
      cell: (e) =>
        e.memberName ? (
          <div className="leading-tight">
            {/*
              Нэр дээр дарвал ШУУД гишүүн рүү. Мөрийг дарвал дэлгэрэнгүй
              нээгддэг тул `stopPropagation` — эс бөгөөс хоёулаа зэрэг
              ажиллаж, цонх нээгдээд дараа нь хуудас солигдоно.
            */}
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                router.push(`/members/${e.memberId}`);
              }}
              className="font-medium hover:underline"
            >
              {e.memberName}
            </button>
            <div className="text-muted-foreground font-mono text-xs tabular-nums">
              №{e.memberNo}
            </div>
          </div>
        ) : (
          /*
            WinFit-д гишүүн алга. Гэхдээ терминал нэрийг нь илгээсэн
            байвал ТҮҮНИЙГ харуулна — «Бүртгэлгүй (№246)» гэхээс хэн
            болох нь ойлгомжтой. Налуу үсэг нь WinFit-ийн бүртгэл биш
            гэдгийг ялгаж байна.
          */
          <div className="leading-tight">
            <div className="text-muted-foreground text-sm italic">
              {e.terminalName || 'Бүртгэлгүй'}
            </div>
            <div className="text-muted-foreground/70 font-mono text-xs tabular-nums">
              №{e.memberNo ?? '—'} · терминал
            </div>
          </div>
        ),
    },
    {
      key: 'reason',
      header: 'Үр дүн',
      sortKey: 'reason',
      cell: (e) => (
        <Badge
          variant="outline"
          className={cn(
            'font-normal',
            e.granted
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-destructive/30 bg-destructive/10 text-destructive',
          )}
        >
          {e.reasonLabel}
        </Badge>
      ),
      className: 'w-44',
    },
    {
      key: 'verify',
      header: 'Танилт',
      sortKey: 'verify',
      cell: (e) => (
        <span className="text-muted-foreground text-xs">
          {e.verifyMode ? (VERIFY_LABEL[e.verifyMode] ?? e.verifyMode) : '—'}
        </span>
      ),
      // Сүүлийн багана баруун зэрэгцээ — хүснэгтийн ирмэг цэвэр болно.
      className: 'w-24 text-right',
      hideOnMobile: true,
    },
  ];

  const rows = data?.items ?? [];
  const filtered = activeFilters.length > 0;

  return (
    // `h-full` — хуудас дэлгэцийг ЯГ дүүргэнэ. Ингэснээр гадна талд
    // гүйх зүйл үлдэхгүй, зөвхөн хүснэгтийн бие дотроо гүйнэ.
    <div className="flex h-full flex-col gap-4">
      <PageHeader title="Ирц" description="Терминалын нэвтрэлтийн бүртгэл">
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              `irts-${range}`,
              ['Огноо', 'Гишүүн', '№', 'Үр дүн', 'Шалтгаан', 'Танилт'],
              rows.map((e) => [
                dateTime(e.eventAt),
                e.memberName ?? 'Бүртгэлгүй',
                e.memberNo ?? '',
                e.granted ? 'Зөвшөөрөв' : 'Татгалзав',
                e.reasonLabel,
                e.verifyMode ? (VERIFY_LABEL[e.verifyMode] ?? e.verifyMode) : '',
              ]),
            )
          }
        >
          <Download className="size-4" />
          CSV
        </Button>
      </PageHeader>

      {/* Үзүүлэлтүүд — хайрцаг дарахад холбогдох шүүлтүүр тавигдана. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Уншуулалт"
          value={stats?.scans ?? '—'}
          footL="Бүх уншуулалт"
          footR="давхардал орсон"
        />
        <StatCard
          label="Зочид"
          value={stats?.visitors ?? '—'}
          footL="Давхардалгүй гишүүн"
          footR="өдөрт 1 ирц"
        />
        <StatCard
          label="Зөвшөөрсөн"
          value={stats?.granted ?? '—'}
          ratio={stats?.scans ? stats.granted / stats.scans : undefined}
          onClick={() => setFilter(() => setResult('true'))}
          footL="Хаалга нээгдсэн"
        />
        <StatCard
          label="Татгалзсан"
          value={stats?.denied ?? '—'}
          suffix={stats?.denyRate !== null ? `${stats?.denyRate}%` : undefined}
          tone={stats && stats.denied > 0 ? 'danger' : 'default'}
          onClick={() => setFilter(() => setResult('false'))}
          footL="Шалтгааныг доор шүүнэ"
        />
      </div>

      {/* Шүүлтүүрийн мөр */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setFilter(() => setSearch(e.target.value))}
            /*
              ★ НЭГ ТАЛБАР — НЭР, УТАС, № ГУРВУУЛАНД.

              Үүнээс өмнө дугаарт тусдаа талбар байсан — ажилтан аль нь
              альд байгааг сонгох шаардлагатай болдог байв. Backend одоо гурвууланг
              НЭГ `q`-аас хайна (`access.service`): дугаарыг гишүүнгүй мөр дээр
              ч шалгадаг тул терминалаас ирсэн бүртгэлгүй уншуулалт ч олдоно.
            */
            placeholder="Нэр, утас эсвэл № дугаараар хайх…"
            className="pl-9"
          />
        </div>
        <FilterSelect
          value={range}
          onChange={(v) => setFilter(() => setRange(v as RangeKey))}
          options={RANGE_OPTIONS}
          placeholder="Хугацаа"
        />
        <FilterSelect
          value={result}
          onChange={(v) => setFilter(() => setResult(v))}
          options={RESULT_OPTIONS}
          placeholder="Үр дүн"
        />
        <FilterSelect
          value={reason}
          onChange={(v) => setFilter(() => setReason(v))}
          options={REASON_OPTIONS}
          placeholder="Шалтгаан"
        />

        {live && (
          <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            20 секунд тутам шинэчлэгдэнэ
          </span>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            onClick={clearAll}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
          >
            Бүгдийг цэвэрлэх
          </button>
        </div>
      )}

      <DataTable
        fill
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        rowKey={(e) => e.id}
        /*
         * Мөр дарахад ДЭЛГЭРЭНГҮЙ нээгдэнэ — гишүүн рүү шууд үсрэхгүй.
         *
         * Урьд нь гишүүнтэй мөр л дарагддаг байсан бөгөөд бүртгэлгүй
         * уншуулалт дээр юу ч болдоггүй байв. Гэтэл яг тэдгээр нь
         * «энэ хэн бэ» гэж шалгах шаардлагатай мөрүүд. Одоо бүх мөр
         * нээгдэж, гишүүн рүү очих товч цонхон дотор байна.
         */
        onRowClick={(e) => setDetailId(e.id)}
        onPageChange={setPage}
        sort={table.sort}
        onSortChange={table.setSort}
        pageSize={table.pageSize}
        onPageSizeChange={table.setPageSize}
        empty={
          filtered ? (
            <EmptyState
              icon={SearchX}
              title="Шүүлтүүрт тохирох нэвтрэлт олдсонгүй"
              hint="Хугацааны хүрээг өргөтгөх эсвэл шүүлтүүрээ цэвэрлэж үзнэ үү."
              action={
                <Button size="sm" variant="outline" onClick={clearAll}>
                  Шүүлтүүр цэвэрлэх
                </Button>
              }
            />
          ) : result === 'false' ? (
            <EmptyState
              icon={ShieldAlert}
              title="Татгалзсан нэвтрэлт алга"
              hint="Сонгосон хугацаанд хэн ч буцаагдаагүй байна."
            />
          ) : live ? (
            <EmptyState
              icon={DoorOpen}
              title="Өнөөдөр хэн ч уншуулаагүй байна"
              hint="Гишүүн терминал дээр царайгаа уншуулмагц энд шууд харагдана."
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Нэвтрэлтийн бүртгэл алга"
              hint="Терминал холбогдоод ажиллаж эхлэхэд ирц энд хуримтлагдана."
            />
          )
        }
      />

      <CheckInDetail id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
