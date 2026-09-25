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
import { Fragment, useState } from 'react';
import { toast } from 'sonner';
import { errorToast } from '@/lib/errors';
import {
  CardStageBadge,
  CardStageHint,
  type CardStage,
} from '@/components/card-stage';
import { AccessResult } from '@/components/access-result';
import { DataTable, type Column } from '@/components/data-table';
import { GENDER_LABEL } from '@/components/gender-picker';
import { ExtendDialog } from '@/components/extend-dialog';
import { FaceEnrollBanner, FaceEnrollButton } from '@/components/face-enroll';
import { LinkButton } from '@/components/link-button';
import { MemberReceivable, type UnpaidRow } from '@/components/member-receivable';
import { PageHeader } from '@/components/page-header';
import { RecordDialog } from '@/components/record-dialog';
import { StaffLinkField } from '@/components/staff-link-field';
import { CheckInDetail } from '@/components/check-in-detail';
import { TerminalImage } from '@/components/terminal-image';
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
import { MemberFreezeCard } from '@/components/member-freeze-card';
import { useApi } from '@/hooks/use-api';
import { useTableState } from '@/hooks/use-table-state';
import { api, qs, type Page } from '@/lib/api';
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
  memberNo: string;
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
  /** Терминал дээрх царайн зургийн ЗАМ — хостгүй. */
  photoPath: string | null;
  hikSyncedAt: string | null;
  syncError: string | null;
  hasCard: boolean;
  cardStage: CardStage;
  loopyCardSerial: string | null;
  walletDevices: number | null;
  lastVisitAt: string | null;
  /** Ажилтны данстай холбоос — байвал тайлангаас хасагдана. */
  staffUser: { id: string; name: string; email: string; role: string } | null;
  /** «Терминал руу sync» дарвал ЯГ ЮУ бичигдэх вэ. */
  devicePlan: { label: string; value: string }[];
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
  /** `null` = «дараа төлье»-өөр зарсан, мөнгө хараахан ирээгүй. */
  paidAt: string | null;
  reversedAt: string | null;
  createdAt: string;
}

interface EventRow {
  id: string;
  eventAt: string;
  granted: boolean;
  /** Түүхий түлхүүр — терминал ↔ WinFit зөрүүг илрүүлэхэд. */
  reason: string;
  reasonLabel: string;
  verifyMode: string | null;
  /** Уншуулах үеийн кадрын ЗАМ — терминал дээр. */
  picturePath: string | null;
}

const VERIFY_LABEL: Record<string, string> = {
  face: 'Царай',
  card: 'Карт',
  fp: 'Хурууны хээ',
  pin: 'ПИН',
};

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
  /*
    Гурван таб ГУРВАН төлөвтэй. Нэгийг хуваавал өөр таб руу
    шилжихэд одоогийн хуудас/эрэмбэ нь дагаж, байхгүй баганаар
    эрэмбэлэх гэж 400 алдаа өгнө.
  */
  const msTable = useTableState({ key: 'createdAt', dir: 'DESC' });
  const evTable = useTableState({ key: 'eventAt', dir: 'DESC' });
  const lkTable = useTableState({ key: 'issuedAt', dir: 'DESC' });
  /** Дарсан мөрүүд — дэлгэрэнгүй цонхонд. */
  const [msRow, setMsRow] = useState<MembershipRow | null>(null);
  const [lkRow, setLkRow] = useState<LockerRow | null>(null);
  /** Дэлгэрэнгүй цонх нээх ирцийн ID. */
  const [detailId, setDetailId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<'loopy' | 'device' | null>(null);
  const [returning, setReturning] = useState<string | null>(null);

  const { data: memberships, reload: reloadMs } = useApi<Page<MembershipRow>>(
    `/members/${id}/memberships${qs(msTable.params)}`,
  );
  /*
   * ⚠ Авлагыг ТУСДАА татна — дээрх дэвтэр нь ХУУДАСЛАГДСАН бөгөөд
   * ажилтны сонгосон эрэмбээр ирдэг. Тэрнээс шүүвэл 3 дахь хуудсанд
   * үлдсэн хуучин өр нүүрэн дээр ХЭЗЭЭ Ч харагдахгүй — яг тэр нь
   * хамгийн чухал өр байх магадлалтай.
   */
  const { data: unpaid, reload: reloadUnpaid } = useApi<Page<UnpaidRow>>(
    `/members/${id}/memberships?unpaid=1&limit=50&sort=createdAt&order=asc`,
  );
  const { data: events } = useApi<Page<EventRow>>(
    `/access-events${qs({ memberId: id, ...evTable.params })}`,
  );
  // Энэ гишүүнд хийгдсэн ГАР үйлдлүүд. `can('manager')` шалгах шаардлагагүй:
  // эрхгүй бол backend 403 буцаах ба `useApi` алдааг чимээгүй барина.
  const { data: audit } = useApi<Page<AuditRow>>(
    `/audit?entity=member&entityId=${id}&limit=10`,
  );
  const { data: lockers, reload: reloadLockers } = useApi<Page<LockerRow>>(
    `/members/${id}/lockers${qs(lkTable.params)}`,
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
      errorToast(err, 'Алдаа гарлаа');
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
      errorToast(err, 'Алдаа гарлаа');
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
      errorToast(err, 'Алдаа гарлаа');
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
      errorToast(err, 'Алдаа гарлаа');
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

  /*
    Ирц ба шүүгээний жагсаалт бас ХҮСНЭГТ — үндсэн дэлгэцүүдийнхтэй
    ижил. Үүнээс өмнө эдгээр нь хавтгай `<ul>` байсан тул нэг хуудас дээр
    хоёр өөр загвар зэрэг харагдаж, хуудаслалт ч байхгүй байв.
  */
  const evColumns: Column<EventRow>[] = [
    {
      key: 'shot',
      header: '',
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
        <span className="font-mono text-sm tabular-nums">
          {dateTime(e.eventAt)}
        </span>
      ),
      className: 'w-44',
    },
    {
      key: 'reason',
      header: 'Үр дүн',
      cell: (e) => (
        <AccessResult
          granted={e.granted}
          reason={e.reason}
          reasonLabel={e.reasonLabel}
        />
      ),
    },
    {
      key: 'verify',
      header: 'Танилт',
      cell: (e) => (
        <span className="text-muted-foreground text-xs">
          {e.verifyMode ? (VERIFY_LABEL[e.verifyMode] ?? e.verifyMode) : '—'}
        </span>
      ),
      className: 'w-24 text-right',
      hideOnMobile: true,
    },
  ];

  const lkColumns: Column<LockerRow>[] = [
    {
      key: 'locker',
      header: 'Шүүгээ',
      cell: (l) => (
        <div className="flex items-center gap-2">
          <KeyRound
            className={cn(
              'size-4 shrink-0',
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
        </div>
      ),
      className: 'w-40',
    },
    {
      key: 'type',
      header: 'Төрөл',
      cell: (l) => (
        <span className="text-muted-foreground text-xs">
          {l.type === 'rental' ? 'Түрээс' : 'Өдрийн'}
        </span>
      ),
      className: 'w-24',
      hideOnMobile: true,
    },
    {
      key: 'issued',
      header: 'Олгосон',
      sortKey: 'issuedAt',
      cell: (l) => <span className="text-sm">{date(l.issuedAt)}</span>,
      className: 'w-32',
      hideOnMobile: true,
    },
    {
      key: 'until',
      header: 'Төлөв',
      sortKey: 'dueAt',
      cell: (l) => (
        <span
          className={cn(
            'text-sm',
            !l.returnedAt && l.overdue && 'text-destructive',
          )}
        >
          {l.returnedAt
            ? `Буцаав ${date(l.returnedAt)}`
            : l.dueAt
              ? `${date(l.dueAt)} хүртэл`
              : 'Гарсан хэвээр'}
        </span>
      ),
    },
    {
      key: 'act',
      header: '',
      // Зөвхөн ГАРСАН хэвээр байгаа түлхүүрийг буцаана.
      cell: (l) =>
        l.returnedAt ? null : (
          <Button
            size="sm"
            variant="outline"
            onClick={(ev) => {
              ev.stopPropagation();
              returnLocker(l);
            }}
            disabled={returning === l.id}
          >
            {returning === l.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Undo2 className="size-3.5" />
            )}
            Буцаах
          </Button>
        ),
      className: 'w-28 text-right',
    },
  ];

  const msColumns: Column<MembershipRow>[] = [
    {
      key: 'date',
      header: 'Огноо',
      sortKey: 'createdAt',
      cell: (r) => date(r.createdAt),
    },
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
      sortKey: 'amount',
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
      sortKey: 'endsAt',
      cell: (r) => date(r.endsAt),
      hideOnMobile: true,
    },
    {
      key: 'rev',
      header: '',
      /*
       * ⚠ «Төлөөгүй»-г дэвтэр дээр ч харуулна. Дээрх баннер нь зөвхөн
       * ИДЭВХТЭЙ авлагыг хэлнэ; түүхийг гүйлгэж байгаа ажилтан аль
       * мөр нь мөнгөгүй байсныг ялгаж чадах ёстой.
       */
      cell: (r) =>
        r.reversedAt ? (
          <span className="text-muted-foreground text-xs">Буцаагдсан</span>
        ) : r.paidAt === null && r.amount > 0 ? (
          <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            Төлөөгүй
          </span>
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

      {/* ⚠ Царайгүй гишүүн хаалгаар ОРЖ ЧАДАХГҮЙ. Эрх сунгасан ч,
          төлбөр төлсөн ч хамаагүй — терминал танихгүй. Тиймээс энэ нь
          профайлын дээд хэсэгт, эрхийн төлөвийн зэрэгцээ байх ёстой. */}
      {!m.faceEnrolled && m.status !== 'cancelled' && (
        <FaceEnrollBanner
          memberId={m.id}
          name={m.name}
          synced={!!m.hikSyncedAt}
          syncFailed={!!m.syncError}
          onDone={reload}
        />
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

      {/*
        ⚠ АВЛАГА нь эрхийн төлөвтэй ижил жинтэй. Нүүр дэлгэцийн авлагын
        жагсаалтаас энэ профайл руу товшиж ирдэг тул ажилтан юу хийхээ
        ЭНД, гүйлгэхгүйгээр олох ёстой. Авлагагүй бол өөрөө нуугдана.
      */}
      <MemberReceivable
        rows={unpaid?.items ?? []}
        onDone={() => {
          reload();
          reloadMs();
          reloadUnpaid();
        }}
      />

      {/* Үйлдлүүд */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setExtendOpen(true)}>
          <Plus className="size-4" />
          {m.status === 'cancelled' ? 'Сэргээж сунгах' : 'Эрх сунгах'}
        </Button>

        {/*
          ⚠ Sync товчнууд ЭНДЭЭС ХАСАГДАВ — Терминал ба Бусад картан
          ДОТОР шилжив. Тэнд юу бичигдэхийг нь хажууд нь харуулдаг тул
          ажилтан уншаад шууд дарна. Энд байхад дэлгэцийн дээд талд,
          утгаасаа хэдэн зуун пиксель зайтай байв.
        */}
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

      <MemberFreezeCard
        memberId={id}
        status={m.status}
        onChange={() => {
          reload();
          reloadMs();
        }}
      />

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
            {/*
              Царайн зураг нь терминал дээр байдаг — WinFit зөвхөн ЗАМЫГ
              хадгална. Байт нь сан руу ороод сангийн хэмжээг олон дахин
              томруулах ёсгүй.
            */}
            <TerminalImage
              path={m.photoPath}
              alt={`${m.name} — терминал дээрх зураг`}
              emptyText="Зураг алга"
              className="aspect-square w-28"
            />
            <Field label="Царай">
              {m.faceEnrolled ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Бүртгэгдсэн · {date(m.faceEnrolledAt)}
                </span>
              ) : (
                <span className="text-sky-600 dark:text-sky-400">
                  Бүртгүүлээгүй
                </span>
              )}
            </Field>

            {/*
              Царайг ДАХИН уншуулах нь бүртгэлтэй хүнд ч хэрэгтэй: хүн
              нүдний шил зүүсэн, үс засуулсан, эсвэл терминал хуучин
              зургаар нь таних нь муудсан байж болно. Дарвал хуучин нь
              шинээр солигдоно.
            */}
            <FaceEnrollButton
              memberId={m.id}
              name={m.name}
              synced={!!m.hikSyncedAt}
              onDone={reload}
              variant="outline"
              size="sm"
              label={m.faceEnrolled ? 'Царайг дахин уншуулах' : 'Царай уншуулах'}
            />
            <Field label="Сүүлд синк">{dateTime(m.hikSyncedAt)}</Field>
            <Field label="Сүүлд ирсэн">{relative(m.lastVisitAt)}</Field>

            {/*
              ★ «ТЕРМИНАЛ РУУ SYNC» ДАРВАЛ ЮУ ЯВАХ ВЭ

              Товч нь дээр байгаа ч юу бичихийг нь хэлдэггүй байв.
              Ялангуяа `Эрх: Унтраах` гэдэг нь чухал — түр зогсоосон
              эсвэл цуцалсан гишүүнд терминал дээрх эрх хаагдана
              гэсэн үг бөгөөд дарахаасаа өмнө харах ёстой.

              ⚠ Эдгээр нь ОДООГИЙН төлөвөөс тооцогдоно. Эрх сунгасны
              дараа энэ хэсэг шинэчлэгдэнэ.
            */}
            {m.devicePlan?.length > 0 && (
              <div className="border-t pt-3">
                {/*
                  ⚠ Товч нь УТГЫНХАА ХАЖУУД байх ёстой. Урьд нь
                  дэлгэцийн дээд талд, эндээс хэдэн зуун пиксель
                  зайтай байв — ажилтан юу бичигдэхийг уншаад дарах
                  товчоо хайж дээш гүйлгэнэ.
                */}
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-xs">
                    Sync дарвал бичигдэх утга
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resyncDevice}
                    disabled={syncing !== null}
                  >
                    {syncing === 'device' ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    Sync
                  </Button>
                </div>
                <dl className="bg-muted/50 grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1 rounded-md p-2.5">
                  {m.devicePlan.map((p) => (
                    <Fragment key={p.label}>
                      <dt className="text-muted-foreground text-[11px]">
                        {p.label}
                      </dt>
                      <dd className="text-[11px] break-words">{p.value}</dd>
                    </Fragment>
                  ))}
                </dl>
              </div>
            )}

            {/*
              Ажилтан уу — терминал өөрөө ялгадаггүй тул энд тэмдэглэнэ.
              Терминалын картан дотор байрлуулсан нь санамсаргүй биш:
              асуулт нь үргэлж «энэ уншуулалт хэн бэ» гэснээс эхэлдэг.
            */}
            <div className="border-t pt-3">
              <StaffLinkField
                memberId={m.id}
                current={m.staffUser}
                onChange={reload}
              />
            </div>
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

                {/*
                  ⚠ Зөвхөн КАРТТАЙ үед. Карт үүсээгүй гишүүнд backend
                  400 буцаадаг тул товчийг харуулах нь ажилтныг дарж
                  байж алдаа авахад хүргэнэ — тэр үед хийх ажил нь
                  дээрх заавар (утас нэмэх), sync биш.
                */}
                {m.hasCard && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1.5"
                    onClick={resyncCard}
                    disabled={syncing !== null}
                  >
                    {syncing === 'loopy' ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    Loopy руу sync
                  </Button>
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
            onRowClick={setMsRow}
            onPageChange={msTable.setPage}
            sort={msTable.sort}
            onSortChange={msTable.setSort}
            pageSize={msTable.pageSize}
            onPageSizeChange={msTable.setPageSize}
          />
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          {/*
            Мөрийг дарвал дэлгэрэнгүй — ирцийн дэлгэцтэй ижил цонх.
            Жижиг кадрыг томруулж харах, түүхий өгөгдлийг үзэх зэрэг
            маргаан шийдэх ажил энэ дэлгэцээс эхэлдэг.
          */}
          <DataTable
            data={events}
            columns={evColumns}
            rowKey={(r) => r.id}
            onRowClick={(r) => setDetailId(r.id)}
            emptyText="Ирц алга"
            onPageChange={evTable.setPage}
            sort={evTable.sort}
            onSortChange={evTable.setSort}
            pageSize={evTable.pageSize}
            onPageSizeChange={evTable.setPageSize}
          />
        </TabsContent>

        <TabsContent value="lockers" className="mt-4">
          <DataTable
            data={lockers}
            columns={lkColumns}
            rowKey={(r) => r.id}
            emptyText="Шүүгээний бүртгэл алга"
            onRowClick={setLkRow}
            onPageChange={lkTable.setPage}
            sort={lkTable.sort}
            onSortChange={lkTable.setSort}
            pageSize={lkTable.pageSize}
            onPageSizeChange={lkTable.setPageSize}
          />
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

      <CheckInDetail id={detailId} onClose={() => setDetailId(null)} />

      {/*
        Худалдан авалтын дэлгэрэнгүй.

        Хүснэгтэд багтахгүй тул утасны дэлгэцээс хэд хэдэн багана
        нуугддаг (`hideOnMobile`) — яг тэдгээрийг энд бүртнээр харуулна.
      */}
      <RecordDialog
        open={msRow !== null}
        onClose={() => setMsRow(null)}
        title="Худалдан авалт"
        fields={
          msRow
            ? [
                { label: 'Огноо', value: dateTime(msRow.createdAt) },
                {
                  label: 'Багц',
                  value: msRow.packageName ?? `${msRow.days} хоног (гараар)`,
                },
                { label: 'Хоног', value: `${msRow.days} хоног` },
                { label: 'Дүн', value: money(msRow.amount) },
                {
                  label: 'Хэлбэр',
                  value: SOURCE_LABEL[msRow.source] ?? msRow.source,
                },
                { label: 'Эрх дуусах', value: date(msRow.endsAt) },
                ...(msRow.reason
                  ? [{ label: 'Шалтгаан', value: msRow.reason }]
                  : []),
                ...(msRow.reversedAt
                  ? [
                      {
                        label: 'Буцаасан',
                        value: (
                          <span className="text-destructive">
                            {dateTime(msRow.reversedAt)}
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]
            : []
        }
      />

      <RecordDialog
        open={lkRow !== null}
        onClose={() => setLkRow(null)}
        title="Шүүгээний бүртгэл"
        fields={
          lkRow
            ? [
                { label: 'Шүүгээ', value: `${lkRow.zone} №${lkRow.number}` },
                {
                  label: 'Төрөл',
                  value: lkRow.type === 'rental' ? 'Түрээс' : 'Өдрийн',
                },
                { label: 'Төлбөр', value: money(lkRow.amount) },
                { label: 'Олгосон', value: dateTime(lkRow.issuedAt) },
                {
                  label: 'Дуусах',
                  value: lkRow.dueAt ? date(lkRow.dueAt) : '—',
                },
                {
                  label: 'Төлөв',
                  value: lkRow.returnedAt ? (
                    `Буцаав ${dateTime(lkRow.returnedAt)}`
                  ) : lkRow.overdue ? (
                    <span className="text-destructive">Хоцросон</span>
                  ) : (
                    'Гарсан хэвээр'
                  ),
                },
              ]
            : []
        }
        footer={
          lkRow && !lkRow.returnedAt ? (
            <Button
              variant="outline"
              /*
                Цонхыг АМЖИЛТТАЙ болсны ДАРАА хаана. Шууд хаавал
                алдаа гарсан тохиолдолд ажилтан жагсаалтаа хараад «болсон
                байх байлгүй дээ» гэж бодох эрсдэлтэй.
              */
              onClick={async () => {
                await returnLocker(lkRow);
                setLkRow(null);
              }}
              disabled={returning === lkRow.id}
            >
              <Undo2 className="size-4" />
              Түлхүүр буцаах
            </Button>
          ) : null
        }
      />

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
