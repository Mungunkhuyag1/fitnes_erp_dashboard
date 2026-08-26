'use client';

import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanFace,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApi } from '@/hooks/use-api';
import { api, qs, type Page } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateTime, phone as fmtPhone } from '@/lib/format';
import { cn } from '@/lib/utils';

interface OutboxRow {
  id: string;
  topic: string;
  memberId: string | null;
  memberName: string | null;
  memberNo: number | null;
  phone: string | null;
  status: 'pending' | 'done' | 'failed';
  attempts: number;
  lastError: string | null;
  createdAt: string;
  processedAt: string | null;
  groupKey: string | null;
}

/**
 * Дарааллын мөрийг ажилтны ойлгох хэлээр.
 *
 * ⚠ Топик бүр энд байх ЁСТОЙ. Дутвал `loopy.allowPhone` гэсэн түүхий нэр
 * дэлгэц дээр гарч, ресепшн юу болж байгааг ойлгохгүй.
 */
const TOPIC_LABEL: Record<string, string> = {
  'hik.userUpsert': 'Терминалд бичих',
  'hik.setValidity': 'Хугацаа шинэчлэх',
  'hik.userDelete': 'Терминалаас устгах',
  'loopy.allowPhone': 'Дугаарыг Loopy-д нэмэх',
  'loopy.disallowPhone': 'Дугаарыг Loopy-гоос хасах',
  'loopy.extend': 'Картын хугацаа сунгах',
  'loopy.status': 'Картын төлөв солих',
  'loopy.fields': 'Картын мэдээлэл шинэчлэх',
  'loopy.push': 'Wallet мэдэгдэл илгээх',
};

const STATUS: Record<string, { label: string; tone: string; icon: React.ElementType }> = {
  pending: {
    label: 'Хүлээгдэж байна',
    tone: 'text-amber-600 dark:text-amber-400',
    icon: Clock,
  },
  done: { label: 'Хийгдсэн', tone: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  failed: { label: 'Бүтэлгүйтсэн', tone: 'text-destructive', icon: AlertTriangle },
};

export default function SyncPage() {
  const { can } = useAuth();
  const [filter, setFilter] = useState<'' | 'failed' | 'pending' | 'done'>('');
  const [page, setPage] = useState(1);

  const { data: status, reload: reloadStatus } = useApi<{
    outbox: { pending: number; done: number; failed: number };
    topics: string[];
  }>('/sync/status', { refreshMs: 15_000 });

  const { data, loading, error, reload } = useApi<Page<OutboxRow>>(
    `/sync/outbox${qs({ status: filter || undefined, page, limit: 20 })}`,
    { refreshMs: 15_000 },
  );

  async function retry(id: string) {
    try {
      await api.post(`/sync/outbox/${id}/retry`);
      toast.success('Дахин илгээхээр дараалалд орлоо');
      setTimeout(() => {
        reload();
        reloadStatus();
      }, 2500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    }
  }

  async function runJob(job: 'expire' | 'face-check' | 'device-reconcile') {
    setBusy(job);
    try {
      const res = await api.post<Record<string, number>>(`/sync/run/${job}`);
      toast.success('Ажил гүйцэтгэгдлээ', {
        description: Object.entries(res)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', '),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(null);
      reload();
      reloadStatus();
    }
  }

  /** Аль ажил ажиллаж байгаа — зэрэг хоёрыг эхлүүлэхээс сэргийлнэ. */
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<OutboxRow | null>(null);
  const [confirmResyncAll, setConfirmResyncAll] = useState(false);
  const [resyncingAll, setResyncingAll] = useState(false);

  /**
   * БҮХ гишүүнийг дахин бичих. Гишүүн бүрд 2 мөр үүсэх тул зөвхөн
   * баталгаажуулсны дараа ажиллана — санамсаргүй дарахад хэдэн зуун
   * хүсэлт үүсгэхээс сэргийлнэ.
   */
  async function resyncAll() {
    setResyncingAll(true);
    try {
      const r = await api.post<{ members: number; queued: number }>(
        '/sync/run/resync-all',
      );
      toast.success(`${r.members} гишүүн дараалалд оров`, {
        description: `${r.queued} үйлдэл — дуусахад хэдэн минут болно`,
      });
      setConfirmResyncAll(false);
      reload();
      reloadStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setResyncingAll(false);
    }
  }

  /**
   * Loopy-тэй тулгах. Түүхий тоог биш, ЮУ БОЛСНЫГ хүнлэг өгүүлбэрээр
   * харуулна — «allowAdded: 3» гэхээс «3 дугаар нэмэв» нь ойлгомжтой.
   */
  async function runReconcile() {
    setBusy('loopy');
    try {
      const r = await api.post<{
        ran: boolean;
        reason?: string;
        allowAdded: number;
        allowExtra: number;
        cardsScanned: number;
        linked: number;
        expiryFixed: number;
        orphaned: number;
        errors: string[];
      }>('/sync/run/loopy-reconcile');

      if (!r.ran) {
        toast.warning('Тулгалт ажиллаагүй', { description: r.reason });
        return;
      }
      const done = [
        r.allowAdded && `${r.allowAdded} дугаар нэмэв`,
        r.linked && `${r.linked} карт холбов`,
        r.expiryFixed && `${r.expiryFixed} огноо зассан`,
      ].filter(Boolean) as string[];
      const warn = [
        r.orphaned && `${r.orphaned} картын сери Loopy дээр алга`,
        r.allowExtra && `${r.allowExtra} илүү дугаар`,
      ].filter(Boolean) as string[];

      if (r.errors.length) {
        toast.error('Тулгалт дуусав — алдаатай', {
          description: r.errors.join(' · '),
        });
      } else if (done.length) {
        toast.success(done.join(', '), {
          description: warn.length
            ? warn.join(' · ')
            : `${r.cardsScanned} карт шалгав`,
        });
      } else {
        toast.success('Зөрүү алга', {
          description: warn.length
            ? warn.join(' · ')
            : `${r.cardsScanned} карт шалгав — бүгд таарч байна`,
        });
      }
      reload();
      reloadStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  const columns: Column<OutboxRow>[] = [
    {
      key: 'status',
      header: '',
      cell: (r) => {
        const s = STATUS[r.status];
        const Icon = s.icon;
        return <Icon className={cn('size-4', s.tone)} />;
      },
      className: 'w-10',
    },
    {
      key: 'topic',
      header: 'Үйлдэл',
      cell: (r) => (
        <span className="text-sm">{TOPIC_LABEL[r.topic] ?? r.topic}</span>
      ),
    },
    {
      key: 'who',
      header: 'Хэн',
      cell: (r) =>
        r.memberName ? (
          <span className="text-sm">
            {r.memberName}
            {r.memberNo !== null && (
              <span className="text-muted-foreground ml-1.5 text-xs">
                №{r.memberNo}
              </span>
            )}
          </span>
        ) : r.phone ? (
          // `disallowPhone` нь гишүүнгүй — утас нь цорын ганц тэмдэглэгээ
          // (гишүүн устсан эсвэл утсаа сольсон байж болно).
          <span className="text-muted-foreground font-mono text-sm">
            {fmtPhone(r.phone)}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: 'attempts',
      header: 'Оролдлого',
      cell: (r) => (
        <span className="font-mono text-sm tabular-nums">{r.attempts}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'error',
      header: 'Алдаа',
      cell: (r) => (
        <span className="text-muted-foreground line-clamp-2 text-xs">
          {r.lastError ?? '—'}
        </span>
      ),
    },
    {
      key: 'when',
      header: 'Үүссэн',
      cell: (r) => (
        <span className="text-muted-foreground font-mono text-xs">
          {dateTime(r.createdAt)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'act',
      header: '',
      cell: (r) =>
        r.status === 'failed' && can('manager') ? (
          <Button size="sm" variant="outline" onClick={() => retry(r.id)}>
            <RotateCcw className="size-3.5" />
            Дахин
          </Button>
        ) : null,
      className: 'text-right',
    },
  ];

  const s = status?.outbox;

  /**
   * Гараар ажиллуулах ажлууд.
   *
   * Бүгд ХУВААРЬТАЙ автоматаар ажилладаг (docs/10 §9) — эдгээр товч нь
   * зөвхөн «хүлээхгүй яг одоо ажиллуулъя» гэсэн хурдасгуур.
   */
  const JOBS = [
    {
      key: 'loopy',
      label: 'Loopy тулгах',
      icon: RefreshCw,
      run: runReconcile,
    },
    {
      key: 'device-reconcile',
      label: 'Терминал тулгах',
      icon: RefreshCw,
      run: () => runJob('device-reconcile'),
    },
    {
      key: 'face-check',
      label: 'Царай шалгах',
      icon: ScanFace,
      run: () => runJob('face-check'),
    },
    {
      key: 'expire',
      label: 'Хугацаа дуусгах',
      icon: CalendarX,
      run: () => runJob('expire'),
    },
    {
      key: 'resync-all',
      label: 'Бүгдийг дахин бичих',
      icon: RotateCcw,
      run: () => setConfirmResyncAll(true),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Синк"
        description="Терминал руу явж байгаа өөрчлөлтүүд"
      >
        {/* Таван товч нь `xl`-ээс доош багтахгүй — толгойн мөр хоёр эгнээ
            болж, гарчигтай мөргөлддөг. Тиймээс нарийн дэлгэцэд ганц
            унждаг цэс болгоно. */}
        <div className="hidden items-center gap-2 xl:flex">
          {JOBS.map((j) => (
            <Button
              key={j.key}
              variant="outline"
              onClick={() => j.run()}
              disabled={busy !== null}
            >
              {busy === j.key ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <j.icon className="size-4" />
              )}
              {j.label}
            </Button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="xl:hidden">
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wrench className="size-4" />
                )}
                Үйлдэл
                <ChevronDown className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Гараар ажиллуулах</DropdownMenuLabel>
              {JOBS.map((j) => (
                <DropdownMenuItem
                  key={j.key}
                  onClick={() => j.run()}
                  disabled={busy !== null}
                >
                  <j.icon className="size-4" />
                  <span className="flex-1">{j.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <AlertDialog open={confirmResyncAll} onOpenChange={setConfirmResyncAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Бүх гишүүнийг дахин бичих үү?</AlertDialogTitle>
            <AlertDialogDescription>
              Цуцлагдаагүй гишүүн бүрийг терминал болон Loopy руу дахин
              бичихээр дараалалд оруулна. Гишүүн бүрд 2 үйлдэл үүсэх тул
              дуусахад хэдэн минут болно.
              <br />
              <br />
              Терминал сольсон, factory reset хийсэн, эсвэл урт хугацааны
              тасалдлын дараа хэрэглэнэ. Энгийн үед шаардлагагүй — систем
              өөрөө дараалалд оруулдаг.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resyncingAll}>Цуцлах</AlertDialogCancel>
            <Button onClick={resyncAll} disabled={resyncingAll}>
              {resyncingAll && <Loader2 className="size-4 animate-spin" />}
              Тийм, дахин бичих
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-3 sm:grid-cols-3">
        {(['failed', 'pending', 'done'] as const).map((k) => {
          const st = STATUS[k];
          const Icon = st.icon;
          return (
            <Card
              key={k}
              role="button"
              tabIndex={0}
              aria-pressed={filter === k}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setFilter(filter === k ? '' : k);
                  setPage(1);
                }
              }}
              className={cn(
                'cursor-pointer gap-0 py-3 transition-all outline-none',
                'hover:border-muted-foreground/30',
                'focus-visible:ring-ring/50 focus-visible:ring-3',
                // Сонгогдсоныг зөвхөн хүрээгээр биш, ДЭВСГЭР + сүүдрээр ч
                // ялгана — зөвхөн хүрээ нь харц сарних үед анзаарагдахгүй.
                filter === k
                  ? 'border-primary bg-primary/5 ring-primary/20 shadow-sm ring-1'
                  : k === 'failed' && s?.failed
                    ? 'border-destructive/40'
                    : undefined,
              )}
              onClick={() => {
                setFilter(filter === k ? '' : k);
                setPage(1);
              }}
            >
              <CardHeader className="px-4 pb-1">
                <CardTitle className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Icon className={cn('size-3.5', st.tone)} />
                  {st.label}
                  {filter === k && (
                    <span className="text-primary ml-auto text-[0.65rem] font-medium">
                      шүүгдсэн
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <p
                  className={cn(
                    'font-mono text-2xl font-semibold tabular-nums',
                    filter === k && 'text-primary',
                  )}
                >
                  {s ? s[k] : '—'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {s?.failed ? (
        <div className="border-destructive/30 bg-destructive/8 rounded-lg border px-4 py-3">
          <p className="text-sm font-medium">
            {s.failed} өөрчлөлт терминал руу хүрээгүй
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Ихэвчлэн терминал холбогдоогүй эсвэл нэвтрэх эрх алдагдсан.
            Шалтгааныг доор харж, засаад «Дахин» дарна.
          </p>
        </div>
      ) : null}

      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        rowKey={(r) => r.id}
        emptyText="Бичлэг алга"
        onPageChange={setPage}
        onRowClick={setDetail}
      />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {detail ? (TOPIC_LABEL[detail.topic] ?? detail.topic) : ''}
            </DialogTitle>
            <DialogDescription>
              Дарааллын нэг бичлэгийн бүрэн мэдээлэл
            </DialogDescription>
          </DialogHeader>
          {detail && <OutboxDetail row={detail} onRetry={retry} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Дарааллын бичлэгийн дэлгэрэнгүй.
 *
 * Хүснэгтэд алдааны текстийг 2 мөрөөр таслаж харуулдаг — жинхэнэ шалтгаан нь
 * ихэвчлэн тэр цаана үлддэг. Энд БҮТНЭЭР нь харуулна.
 */
function OutboxDetail({
  row,
  onRetry,
}: {
  row: OutboxRow;
  onRetry: (id: string) => void;
}) {
  const st = STATUS[row.status];
  const Icon = st.icon;
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2">
        <Icon className={cn('size-4', st.tone)} />
        <span className="font-medium">{st.label}</span>
        <span className="text-muted-foreground text-xs">
          · {row.attempts} оролдлого
        </span>
      </div>

      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2">
        {(row.memberName || row.phone) && (
          <>
            <dt className="text-muted-foreground text-xs">Хэн</dt>
            <dd>
              {row.memberId ? (
                <Link
                  href={`/members/${row.memberId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {row.memberName}
                  {row.memberNo !== null && ` №${row.memberNo}`}
                </Link>
              ) : (
                <span className="font-mono text-xs">{fmtPhone(row.phone!)}</span>
              )}
            </dd>
          </>
        )}

        <dt className="text-muted-foreground text-xs">Үүссэн</dt>
        <dd className="font-mono text-xs">{dateTime(row.createdAt)}</dd>

        <dt className="text-muted-foreground text-xs">Боловсруулсан</dt>
        <dd className="font-mono text-xs">
          {row.processedAt ? dateTime(row.processedAt) : '—'}
        </dd>

        <dt className="text-muted-foreground text-xs">Дарааллын бүлэг</dt>
        <dd className="font-mono text-xs break-all">{row.groupKey ?? '—'}</dd>

        <dt className="text-muted-foreground text-xs">Topic</dt>
        <dd className="font-mono text-xs break-all">{row.topic}</dd>

        <dt className="text-muted-foreground text-xs">ID</dt>
        <dd className="font-mono text-xs break-all">{row.id}</dd>
      </dl>

      {row.lastError && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Алдааны бүтэн текст</p>
          <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
            {row.lastError}
          </pre>
        </div>
      )}

      {row.status === 'failed' && (
        <Button size="sm" variant="outline" onClick={() => onRetry(row.id)}>
          <RotateCcw className="size-3.5" />
          Дахин илгээх
        </Button>
      )}
    </div>
  );
}
