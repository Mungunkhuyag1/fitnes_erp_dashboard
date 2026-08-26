'use client';

import {
  CheckCircle2,
  DoorOpen,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  ScanFace,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ChartCard } from '@/components/chart-card';
import { ColumnChart, TrendChart } from '@/components/charts';
import { LinkButton } from '@/components/link-button';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateTime, relative } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Stats {
  mode: string;
  today: { scans: number; granted: number; denied: number };
  period: { days: number; scans: number; granted: number; denied: number };
  faces: { enrolled: number; missing: number };
  queue: {
    pending: number;
    failed: number;
    memberErrors: number;
    lastSyncAt: string | null;
  };
  denialReasons: { reason: string; label: string; count: number }[];
  hourly: { hour: number; label: string; scans: number }[];
  daily: { date: string; scans: number; denied: number }[];
  devices: {
    id: string;
    name: string;
    model: string | null;
    ip: string | null;
    firmware: string | null;
    doorNo: number;
    online: boolean;
    active: boolean;
    lastSeenAt: string | null;
  }[];
}

const RANGES = [
  { key: 7, label: '7 хоног' },
  { key: 30, label: '30 хоног' },
  { key: 90, label: '3 сар' },
];

const MODE_LABEL: Record<string, { label: string; hint: string }> = {
  stub: {
    label: 'Дуурайлган',
    hint: 'Жинхэнэ төхөөрөмжтэй холбогдоогүй — демо өгөгдөл',
  },
  direct: {
    label: 'Шууд холболт',
    hint: 'Сервер терминалтай нэг сүлжээнд, ISAPI-аар шууд ярина',
  },
  agent: {
    label: 'Агент',
    hint: 'Фитнесийн дотоод агентаар дамжина',
  },
};

export default function TerminalPage() {
  const [days, setDays] = useState(7);
  const { data: d, loading, reload } = useApi<Stats>(`/devices/stats?days=${days}`);
  const { can } = useAuth();
  const [pinging, setPinging] = useState(false);
  const [ping, setPing] = useState<{ ok: boolean; detail?: string } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  async function testConnection() {
    setPinging(true);
    try {
      const r = await api.get<{ ok: boolean; detail?: string }>('/devices/ping');
      setPing(r);
      if (r.ok) toast.success('Терминалтай холбогдлоо');
      else toast.error('Холбогдсонгүй', { description: r.detail });
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'Алдаа';
      setPing({ ok: false, detail });
      toast.error('Холбогдсонгүй', { description: detail });
    } finally {
      setPinging(false);
    }
  }

  async function openDoor(id: string, name: string) {
    setOpening(id);
    try {
      await api.post(`/devices/${id}/open-door`, {});
      toast.success(`${name} — хаалга нээгдлээ`, {
        description: 'Үйлдэл аудитад бичигдэв',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setOpening(null);
    }
  }

  if (loading && !d) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (!d) return null;

  const mode = MODE_LABEL[d.mode] ?? { label: d.mode, hint: '' };
  const grantRate = d.period.scans
    ? Math.round((d.period.granted / d.period.scans) * 100)
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Терминал"
        description="Царай таних төхөөрөмжийн ажиллагаа"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-muted flex rounded-lg p-0.5">
            {RANGES.map((r) => (
              <Button
                key={r.key}
                size="sm"
                variant={days === r.key ? 'default' : 'ghost'}
                className={days === r.key ? '' : 'text-muted-foreground'}
                onClick={() => setDays(r.key)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={reload}>
            <RefreshCw className="size-4" />
            Шинэчлэх
          </Button>
        </div>
      </PageHeader>

      {/* ── Горимын сануулга ── */}
      {d.mode === 'stub' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
          <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium">Дуурайлган горим</p>
            <p className="text-muted-foreground text-xs">
              {mode.hint}. Жинхэнэ терминал холбохын тулд серверийн{' '}
              <code className="bg-muted rounded px-1">DEVICE_GATEWAY</code>{' '}
              тохиргоог солино.
            </p>
          </div>
        </div>
      )}

      {/* ── Үзүүлэлт ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Өнөөдрийн уншуулалт"
          value={d.today.scans}
          sub={`${d.today.granted} нэвтэрсэн · ${d.today.denied} татгалзсан`}
          footL={`${d.period.days} хоногт`}
          footR={`${d.period.scans} удаа`}
        />
        <StatCard
          label="Нэвтрэлтийн хувь"
          value={grantRate === null ? '—' : `${grantRate}%`}
          sub={
            grantRate === null
              ? 'Уншуулалт бүртгэгдээгүй'
              : `${d.period.denied} удаа татгалзсан`
          }
          ratio={grantRate === null ? undefined : grantRate / 100}
        />
        <StatCard
          label="Царай бүртгэсэн"
          value={d.faces.enrolled}
          suffix={`/ ${d.faces.enrolled + d.faces.missing}`}
          ratio={
            d.faces.enrolled + d.faces.missing
              ? d.faces.enrolled / (d.faces.enrolled + d.faces.missing)
              : 0
          }
          sub={
            d.faces.missing
              ? `${d.faces.missing} гишүүн уншуулаагүй`
              : 'Бүгд уншуулсан'
          }
          tone={d.faces.missing ? 'danger' : 'default'}
        />
        <StatCard
          label="Бичих дараалал"
          value={d.queue.pending + d.queue.failed}
          sub={
            d.queue.failed
              ? `${d.queue.failed} амжилтгүй — шалгах шаардлагатай`
              : `Сүүлд ${relative(d.queue.lastSyncAt)} синк хийсэн`
          }
          tone={d.queue.failed ? 'danger' : 'default'}
          footL={`${d.queue.pending} хүлээгдэж буй`}
          footR={`${d.queue.memberErrors} алдаатай гишүүн`}
        />
      </div>

      {/* ── Төхөөрөмжүүд ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Төхөөрөмж</CardTitle>
          <CardDescription>
            {mode.label} — {mode.hint}
          </CardDescription>
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              onClick={testConnection}
              disabled={pinging}
            >
              {pinging ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Холболт шалгах
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          {ping && (
            <p
              className={cn(
                'flex items-start gap-1.5 text-xs',
                ping.ok
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive',
              )}
            >
              {ping.ok ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 size-3.5 shrink-0" />
              )}
              <span className="break-all">
                {ping.ok ? 'Холбогдлоо' : (ping.detail ?? 'Холбогдсонгүй')}
              </span>
            </p>
          )}

          {d.devices.length ? (
            d.devices.map((dev) => (
              <div
                key={dev.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5"
              >
                <span
                  className={cn(
                    'size-2.5 shrink-0 rounded-full',
                    dev.online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{dev.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {[
                      dev.model,
                      dev.ip,
                      dev.firmware,
                      `Хаалга ${dev.doorNo}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">
                  {dev.online ? 'Холбогдсон' : `Сүүлд ${relative(dev.lastSeenAt)}`}
                </span>
                {can('manager') && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={opening === dev.id}
                    onClick={() => openDoor(dev.id, dev.name)}
                  >
                    {opening === dev.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <DoorOpen className="size-3.5" />
                    )}
                    Хаалга нээх
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Терминал бүртгэгдээгүй
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Ачаалал ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Өдрийн уншуулалт"
          description="Терминал дээр хэдэн удаа уншуулсан"
          filename={`терминал-өдөр-${days}`}
          headers={['Огноо', 'Уншуулалт', 'Татгалзсан']}
          rows={d.daily.map((x) => [x.date, x.scans, x.denied])}
        >
          <TrendChart
            data={d.daily.map((x) => ({
              label: x.date.slice(5).replace('-', '/'),
              value: x.scans,
            }))}
            seriesLabel="Уншуулалт"
            valueFmt={(v) => `${v} удаа`}
            height={240}
          />
        </ChartCard>

        <ChartCard
          title="Цагийн ачаалал"
          description="Хэдэн цагт хамгийн их уншуулдаг вэ"
          filename={`терминал-цаг-${days}`}
          headers={['Цаг', 'Уншуулалт']}
          rows={d.hourly.filter((h) => h.scans > 0).map((h) => [h.label, h.scans])}
        >
          <ColumnChart
            data={d.hourly.map((h) => ({ label: h.label, value: h.scans }))}
            seriesLabel="Уншуулалт"
            height={240}
          />
        </ChartCard>
      </div>

      {/* ── Татгалзсан шалтгаан ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Татгалзсан шалтгаан</CardTitle>
          <CardDescription>
            Хэн, яагаад орж чадаагүй вэ — ажилтны хийх зүйл эндээс тодорхойлогдоно
          </CardDescription>
          <CardAction>
            <LinkButton size="sm" variant="ghost" href="/check-ins">
              Бүх ирц
            </LinkButton>
          </CardAction>
        </CardHeader>
        <CardContent>
          {d.denialReasons.length ? (
            <ul className="divide-border divide-y">
              {d.denialReasons.map((r) => (
                <li
                  key={r.reason}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <XCircle className="text-destructive size-4 shrink-0" />
                  <span className="flex-1">{r.label}</span>
                  <span className="font-medium tabular-nums">{r.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <ScanFace className="mb-2 size-6 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-medium">Татгалзсан тохиолдол алга</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Сүүлийн {d.period.days} хоногт бүх уншуулалт амжилттай
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Сүүлд синк хийсэн: {dateTime(d.queue.lastSyncAt)}
      </p>
    </div>
  );
}
