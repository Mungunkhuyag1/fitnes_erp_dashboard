'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CreditCard,
  KeyRound,
  Loader2,
  Pause,
  Pencil,
  Phone,
  PhoneOff,
  Play,
  Plus,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  CardStageBadge,
  CardStageHint,
  type CardStage,
} from '@/components/card-stage';
import { DataTable, type Column } from '@/components/data-table';
import { GENDER_LABEL } from '@/components/gender-picker';
import { ExtendDialog } from '@/components/extend-dialog';
import { LinkButton } from '@/components/link-button';
import { PageHeader } from '@/components/page-header';
import { DaysLeft, StatusBadge } from '@/components/status-badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApi } from '@/hooks/use-api';
import { api, type Page } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  date,
  dateTime,
  money,
  phone as fmtPhone,
  relative,
  SOURCE_LABEL,
} from '@/lib/format';
import { cn } from '@/lib/utils';

interface MemberDetail {
  id: string;
  memberNo: number;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  gender: 'male' | 'female' | 'other' | null;
  birthDate: string | null;
  age: number | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  status: string;
  accessEndsAt: string | null;
  daysLeft: number | null;
  faceEnrolled: boolean;
  faceEnrolledAt: string | null;
  hikSyncedAt: string | null;
  syncError: string | null;
  hasCard: boolean;
  cardStage: CardStage;
  loopyCardSerial: string | null;
  walletDevices: number | null;
  lastVisitAt: string | null;
  createdAt: string;
}

interface MembershipRow {
  id: string;
  packageName: string | null;
  days: number;
  amount: number;
  source: string;
  reason: string | null;
  endsAt: string;
  reversedAt: string | null;
  createdAt: string;
}

interface EventRow {
  id: string;
  eventAt: string;
  granted: boolean;
  reasonLabel: string;
}

interface AuditRow {
  id: string;
  action: string;
  reason: string | null;
  createdAt: string;
  staffName: string | null;
}

const AUDIT_LABEL: Record<string, string> = {
  'membership.extend': 'Эрх сунгав',
  'membership.reverse': 'Худалдан авалт буцаав',
  'member.suspend': 'Түр зогсоов',
  'member.resume': 'Сэргээв',
  'member.cancel': 'Цуцлав',
  'member.create': 'Бүртгэв',
  'member.update': 'Мэдээлэл заслаа',
  'locker.issue': 'Шүүгээ олгов',
  'locker.return': 'Шүүгээ буцаав',
};

interface LockerRow {
  id: string;
  zone: string;
  number: number;
  type: string;
  issuedAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  overdue: boolean;
  amount: number;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data: m, loading, reload } = useApi<MemberDetail>(`/members/${id}`);

  const [extendOpen, setExtendOpen] = useState(false);
  const [action, setAction] = useState<'suspend' | 'resume' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState<'loopy' | 'device' | null>(null);
  const [returning, setReturning] = useState<string | null>(null);

  const { data: memberships, reload: reloadMs } = useApi<Page<MembershipRow>>(
    `/members/${id}/memberships?limit=10&page=${page}`,
  );
  const { data: events } = useApi<Page<EventRow>>(
    `/access-events?memberId=${id}&limit=10`,
  );
  // Энэ гишүүнд хийгдсэн ГАР үйлдлүүд. `can('manager')` шалгах шаардлагагүй:
  // эрхгүй бол backend 403 буцаах ба `useApi` алдааг чимээгүй барина.
  const { data: audit } = useApi<Page<AuditRow>>(
    `/audit?entity=member&entityId=${id}&limit=10`,
  );
  const { data: lockers, reload: reloadLockers } = useApi<Page<LockerRow>>(
    `/members/${id}/lockers?limit=10`,
  );

  async function runAction() {
    if (!action) return;
    setBusy(true);
    try {
      await api.post(`/members/${id}/${action}`, { reason });
      toast.success(
        action === 'suspend'
          ? 'Түр зогсоов'
          : action === 'resume'
            ? 'Сэргээв'
            : 'Цуцлав',
      );
      setAction(null);
      setReason('');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function resync() {
    try {
      await api.post(`/members/${id}/resync`);
      toast.success('Терминал руу дахин бичихээр дараалалд орлоо');
      setTimeout(reload, 2500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Алдаа гарлаа');
    }
  }

  /**
   * Wallet карт руу дахин бичих — эрхийн огноо + төлбөрийн линк.
   *
   * Карт үүсгээгүй гишүүнд backend 400 буцаана. Тиймээс товчийг харуулахаас
   * нь өмнө шалгана — дарж байж алдаа авах нь ажилтныг төөрөгдүүлнэ.
   */
  async function resyncCard() {
    setSyncing('loopy');
    try {
      await api.post(`/members/${id}/card/resync`);
      toast.success('Wallet карт руу дахин бичихээр дараалалд орлоо', {
        description: 'Эрхийн огноо, төлбөрийн линк шинэчлэгдэнэ',
      });
      setTimeout(reload, 2500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setSyncing(null);
    }
  }

  async function resyncDevice() {
    setSyncing('device');
    try {
      await resync();
    } finally {
      setSyncing(null);
    }
  }

  /** Гарсан түлхүүрийг буцааж авах. */
  async function returnLocker(l: LockerRow) {
    setReturning(l.id);
    try {
      await api.post('/lockers/return', { zone: l.zone, number: l.number });
      toast.success(`${l.zone} №${l.number} буцаагдлаа`);
      reloadLockers();
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setReturning(null);
    }
  }

  if (loading && !m) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    );
  }
  if (!m) return null;

  const msColumns: Column<MembershipRow>[] = [
    { key: 'date', header: 'Огноо', cell: (r) => date(r.createdAt) },
    {
      key: 'pkg',
      header: 'Багц',
      cell: (r) => (
        <span className={cn(r.reversedAt && 'text-muted-foreground line-through')}>
          {r.packageName ?? `${r.days} хоног (гараар)`}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Дүн',
      cell: (r) => (
        <span className={cn('text-sm', r.reversedAt && 'text-muted-foreground line-through')}>
          {money(r.amount)}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Хэлбэр',
      cell: (r) => SOURCE_LABEL[r.source] ?? r.source,
      hideOnMobile: true,
    },
    {
      key: 'ends',
      header: 'Хүртэл',
      cell: (r) => date(r.endsAt),
      hideOnMobile: true,
    },
    {
      key: 'rev',
      header: '',
      cell: (r) =>
        r.reversedAt ? (
          <span className="text-muted-foreground text-xs">Буцаагдсан</span>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={m.name}
        description={`№${m.memberNo} · ${m.phone ? fmtPhone(m.phone) : 'утасгүй'}`}
      >
        <LinkButton variant="ghost" href="/members">
          <ArrowLeft className="size-4" />
          Буцах
        </LinkButton>
        <LinkButton variant="outline" href={`/members/${m.id}/edit`}>
          <Pencil className="size-4" />
          Засах
        </LinkButton>
      </PageHeader>

      {/* ⚠ Утасгүй гишүүн Loopy-тэй ХОЛБОГДОХГҮЙ — утас нь тэнд гол
          түлхүүр. Терминалаас импортлосон гишүүд бүгд ийм байдаг тул
          профайл дээр шууд харагдах ёстой. */}
      {!m.phone && (
        <div className="border-destructive/30 bg-destructive/8 flex items-start gap-3 rounded-lg border px-4 py-3">
          <PhoneOff className="text-destructive mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Утасны дугаар алга</p>
            <p className="text-muted-foreground text-xs">
              Утас оруулах хүртэл Wallet карт үүсэхгүй, эрх дуусах
              сануулга ч очихгүй.
            </p>
          </div>
          <LinkButton size="sm" variant="outline" href={`/members/${m.id}/edit`}>
            Утас нэмэх
          </LinkButton>
        </div>
      )}

      {m.syncError && (
        <div className="border-destructive/30 bg-destructive/8 flex items-start gap-3 rounded-lg border px-4 py-3">
          <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Терминал руу бичигдээгүй</p>
            <p className="text-muted-foreground text-xs">{m.syncError}</p>
          </div>
          <Button size="sm" variant="outline" onClick={resync}>
            <RefreshCw className="size-3.5" />
            Дахин
          </Button>
        </div>
      )}

      {/* Үйлдлүүд */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setExtendOpen(true)}>
          <Plus className="size-4" />
          {m.status === 'cancelled' ? 'Сэргээж сунгах' : 'Эрх сунгах'}
        </Button>

        {/* Гараар sync — систем автоматаар хийдэг ч зөрүү сэжиглэвэл
            ажилтан шууд түлхэх боломжтой байх ёстой. */}
        <Button
          variant="outline"
          onClick={resyncDevice}
          disabled={syncing !== null}
        >
          {syncing === 'device' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ScanFace className="size-4" />
          )}
          Терминал руу sync
        </Button>
        {m.hasCard && (
          <Button
            variant="outline"
            onClick={resyncCard}
            disabled={syncing !== null}
          >
            {syncing === 'loopy' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CreditCard className="size-4" />
            )}
            Wallet карт руу sync
          </Button>
        )}
        {can('manager') && m.status !== 'cancelled' && (
          <>
            {m.status === 'suspended' ? (
              <Button variant="outline" onClick={() => setAction('resume')}>
                <Play className="size-4" />
                Сэргээх
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setAction('suspend')}>
                <Pause className="size-4" />
                Түр зогсоох
              </Button>
            )}
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setAction('cancel')}
            >
              <Trash2 className="size-4" />
              Цуцлах
            </Button>
          </>
        )}
      </div>

      {/* Товч мэдээлэл */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="text-muted-foreground size-4" />
              Эрх
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Төлөв">
              <StatusBadge status={m.status} />
            </Field>
            <Field label="Дуусах огноо">{date(m.accessEndsAt)}</Field>
            <Field label="Үлдсэн">
              <DaysLeft days={m.daysLeft} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScanFace className="text-muted-foreground size-4" />
              Терминал
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Царай">
              {m.faceEnrolled ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Бүртгэгдсэн · {date(m.faceEnrolledAt)}
                </span>
              ) : (
                <span className="text-sky-600 dark:text-sky-400">
                  Бүртгүүлээгүй — терминал дээр уншуулна
                </span>
              )}
            </Field>
            <Field label="Сүүлд синк">{dateTime(m.hikSyncedAt)}</Field>
            <Field label="Сүүлд ирсэн">{relative(m.lastVisitAt)}</Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CreditCard className="text-muted-foreground size-4" />
              Бусад
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Wallet карт">
              <div className="space-y-1">
                <CardStageBadge stage={m.cardStage} />
                <div>
                  <CardStageHint stage={m.cardStage} />
                </div>
                {m.loopyCardSerial && (
                  <div className="text-muted-foreground font-mono text-[11px]">
                    {m.loopyCardSerial}
                    {m.walletDevices !== null && m.walletDevices > 0 && (
                      <> · {m.walletDevices} төхөөрөмж</>
                    )}
                  </div>
                )}
              </div>
            </Field>
            <Field label="И-мэйл">{m.email ?? '—'}</Field>
            <Field label="Хүйс">
              {m.gender ? GENDER_LABEL[m.gender] : '—'}
            </Field>
            <Field label="Төрсөн">
              {m.birthDate ? (
                <>
                  {m.birthDate}
                  {m.age !== null && (
                    <span className="text-muted-foreground">
                      {' · '}
                      {m.age} нас
                    </span>
                  )}
                </>
              ) : (
                '—'
              )}
            </Field>
            <Field label="Бүртгэсэн">{date(m.createdAt)}</Field>
          </CardContent>
        </Card>
      </div>

      {(m.emergencyName || m.emergencyPhone) && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Phone className="size-3.5" />
              Яаралтай үед
            </span>
            {m.emergencyName && <span>{m.emergencyName}</span>}
            {m.emergencyPhone && (
              <a
                href={`tel:${m.emergencyPhone}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {m.emergencyPhone}
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {m.note && (
        <Card>
          <CardContent className="text-sm">
            <p className="text-muted-foreground mb-1 text-xs">Тэмдэглэл</p>
            {m.note}
          </CardContent>
        </Card>
      )}

      {/* Түүх */}
      <Tabs defaultValue="memberships">
        <TabsList>
          <TabsTrigger value="memberships">Худалдан авалт</TabsTrigger>
          <TabsTrigger value="visits">Ирц</TabsTrigger>
          <TabsTrigger value="lockers">Шүүгээ</TabsTrigger>
          {audit && audit.total > 0 && (
            <TabsTrigger value="audit">
              Түүх
              <span className="text-muted-foreground ml-1.5 text-xs">
                {audit.total}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="memberships" className="mt-4">
          <DataTable
            data={memberships}
            columns={msColumns}
            rowKey={(r) => r.id}
            emptyText="Худалдан авалт алга"
            onPageChange={setPage}
          />
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <Card className="py-0">
            <CardContent className="p-0">
              {events?.items.length ? (
                <ul className="divide-border divide-y">
                  {events.items.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          e.granted ? 'bg-emerald-500' : 'bg-red-500',
                        )}
                      />
                      <span className="flex-1 text-sm">{dateTime(e.eventAt)}</span>
                      <span className="text-muted-foreground text-xs">
                        {e.reasonLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground py-10 text-center text-sm">
                  Ирц алга
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lockers" className="mt-4">
          <Card className="py-0">
            <CardContent className="p-0">
              {lockers?.items.length ? (
                <ul className="divide-border divide-y">
                  {lockers.items.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                      <KeyRound
                        className={cn(
                          'size-4',
                          l.returnedAt
                            ? 'text-muted-foreground'
                            : l.overdue
                              ? 'text-destructive'
                              : 'text-emerald-500',
                        )}
                      />
                      <span className="text-sm font-medium">
                        {l.zone} №{l.number}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {l.type === 'rental' ? 'Түрээс' : 'Өдрийн'}
                      </span>
                      <span className="flex-1" />
                      <span className="text-muted-foreground text-xs">
                        {l.returnedAt
                          ? `Буцаав ${date(l.returnedAt)}`
                          : l.dueAt
                            ? `${date(l.dueAt)} хүртэл`
                            : 'Гарсан хэвээр'}
                      </span>
                      {/* Зөвхөн ГАРСАН хэвээр байгаа түлхүүрийг буцаана. */}
                      {!l.returnedAt && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => returnLocker(l)}
                          disabled={returning === l.id}
                        >
                          {returning === l.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Undo2 className="size-3.5" />
                          )}
                          Буцаах
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground py-10 text-center text-sm">
                  Шүүгээний бүртгэл алга
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card className="py-0">
            <CardContent className="p-0">
              {audit?.items.length ? (
                <ul className="divide-border divide-y">
                  {audit.items.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                      <ShieldCheck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {AUDIT_LABEL[a.action] ?? a.action}
                        </p>
                        {a.reason && (
                          <p className="text-muted-foreground text-xs">
                            {a.reason}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-muted-foreground text-xs">
                          {a.staffName ?? '—'}
                        </p>
                        <p className="text-muted-foreground font-mono text-xs">
                          {dateTime(a.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground py-10 text-center text-sm">
                  Гар үйлдлийн бүртгэл алга
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ExtendDialog
        memberId={m.id}
        memberName={m.name}
        cancelled={m.status === 'cancelled'}
        open={extendOpen}
        onOpenChange={setExtendOpen}
        onDone={() => {
          reload();
          reloadMs();
        }}
      />

      <AlertDialog open={!!action} onOpenChange={(v) => !v && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'suspend'
                ? 'Түр зогсоох'
                : action === 'resume'
                  ? 'Сэргээх'
                  : 'Цуцлах'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'cancel'
                ? 'Гишүүн терминалаас УСТГАГДАНА — царай нь хамт устана. Дахин ирвэл шинээр бүртгэж, царайг дахин уншуулна.'
                : action === 'suspend'
                  ? 'Терминал дээрх эрх унтарна. Хугацаа нь хөндөгдөхгүй.'
                  : 'Эрх дахин ажиллана.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Шалтгаан (заавал)"
              autoFocus
            />
            <p className="text-muted-foreground text-xs">
              Аудит логт бичигдэнэ.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={runAction}
              disabled={busy || reason.trim().length < 3}
              className={cn(
                action === 'cancel' &&
                  'bg-destructive text-white hover:bg-destructive/90',
              )}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Батлах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
