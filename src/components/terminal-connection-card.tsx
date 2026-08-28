'use client';

import { CheckCircle2, Loader2, Radar, Save, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

type Src = 'db' | 'env' | 'none';

interface Connection {
  ip: string | null;
  port: number;
  user: string;
  https: boolean;
  passwordSet: boolean;
  source: { ip: Src; port: Src; user: Src; password: Src };
  envHost: string | null;
  model: string | null;
  firmware: string | null;
  lastSeenAt: string | null;
  subnet: string | null;
}

interface Test {
  ok: boolean;
  detail: string;
}

/** Талбарын утга `.env`-ээс ирж байгаа эсэхийг тэмдэглэнэ. */
function SourceTag({ src }: { src: Src }) {
  if (src !== 'env') return null;
  return (
    <span className="text-muted-foreground ml-1.5 text-[10px] font-normal">
      .env
    </span>
  );
}

/**
 * Терминалын холболтын тохиргоо.
 *
 * ЯАГААД ДЭЛГЭЦЭД ВЭ: IP нь DHCP-ээр солигддог, нууц үгийг заалан дээр
 * солино. `.env`-д байвал ажилтан өөрөө засаж чадахгүй, дахин deploy
 * хүлээнэ.
 *
 * ⚠ Нууц үгийг сервер БУЦААДАГГҮЙ — зөвхөн «тохируулсан эсэх». Хоосон
 * үлдээвэл хуучнаараа хадгалагдана.
 */
export function TerminalConnectionCard() {
  const { can } = useAuth();
  const { data, loading, reload } = useApi<Connection>('/devices/connection');
  const [form, setForm] = useState<{
    ip?: string;
    port?: string;
    user?: string;
    password?: string;
    https?: boolean;
  }>({});
  const [busy, setBusy] = useState<'scan' | 'save' | null>(null);
  const [test, setTest] = useState<Test | null>(null);

  const editable = can('manager');
  const dirty = Object.keys(form).length > 0;
  // Хадгалаагүй өөрчлөлт байвал түүнийг, эс бөгөөс серверийн утгыг харуулна.
  // ⚠ Талбар ЗАССАН эсэхээр шийднэ, утга хоосон эсэхээр БИШ — эс бөгөөс
  // бүх тэмдэгтийг устгамагц хуучин утга буцаж гарч ирнэ.
  const val = (k: 'ip' | 'port' | 'user') =>
    form[k] !== undefined ? form[k]! : String(data?.[k] ?? '');

  async function scan() {
    setBusy('scan');
    setTest(null);
    try {
      const r = await api.post<{ found: string[]; chosen: string | null }>(
        '/devices/discover',
      );
      if (r.chosen) {
        toast.success(`Терминал олдлоо: ${r.chosen}`);
        setForm((p) => ({ ...p, ip: r.chosen! }));
      } else {
        toast.warning('Терминал олдсонгүй', {
          description: 'Нэг сүлжээнд байгаа эсэхээ шалгана уу',
        });
      }
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Хайлт амжилтгүй');
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy('save');
    setTest(null);
    try {
      const body: Record<string, unknown> = {};
      if (form.ip?.trim()) body.ip = form.ip.trim();
      if (form.port?.trim()) body.port = Number(form.port);
      if (form.user?.trim()) body.user = form.user.trim();
      if (form.password) body.password = form.password;
      if (form.https !== undefined) body.https = form.https;

      const r = await api.patch<Connection & { test: Test }>(
        '/devices/connection',
        body,
      );
      setForm({});
      setTest(r.test);
      if (r.test.ok) toast.success('Холбогдлоо', { description: r.test.detail });
      else toast.error('Холбогдсонгүй', { description: r.test.detail });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Хадгалж чадсангүй');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Терминалын холболт</CardTitle>
        <CardDescription>
          Хаяг, нэвтрэх мэдээллийг энд тохируулна. Хадгалмагц холболтыг
          шалгаж, шинэ тохиргоогоор ажиллаж эхэлнэ.
        </CardDescription>
        {editable && (
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              onClick={scan}
              disabled={busy !== null}
            >
              {busy === 'scan' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Radar className="size-3.5" />
              )}
              Сүлжээнээс хайх
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !data ? (
          <Skeleton className="h-32" />
        ) : (
          data && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ip">
                    IP хаяг
                    <SourceTag src={data.source.ip} />
                  </Label>
                  <Input
                    id="ip"
                    className="font-mono"
                    inputMode="decimal"
                    disabled={!editable}
                    value={val('ip')}
                    placeholder={data.subnet ? `${data.subnet}.106` : '192.168.0.106'}
                    onChange={(e) => setForm((p) => ({ ...p, ip: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="port">
                    Порт
                    <SourceTag src={data.source.port} />
                  </Label>
                  <Input
                    id="port"
                    className="font-mono"
                    inputMode="numeric"
                    disabled={!editable}
                    value={val('port')}
                    onChange={(e) => setForm((p) => ({ ...p, port: e.target.value }))}
                  />
                  <p className="text-muted-foreground text-xs">
                    ISAPI нь 80. 8000 нь SDK-ынх — ажиллахгүй.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="user">
                    Нэвтрэх нэр
                    <SourceTag src={data.source.user} />
                  </Label>
                  <Input
                    id="user"
                    className="font-mono"
                    autoComplete="off"
                    disabled={!editable}
                    value={val('user')}
                    onChange={(e) => setForm((p) => ({ ...p, user: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">
                    Нууц үг
                    <SourceTag src={data.source.password} />
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    disabled={!editable}
                    value={form.password ?? ''}
                    placeholder={
                      data.passwordSet ? '•••••••• (хадгалсан)' : 'Оруулаагүй'
                    }
                    onChange={(e) =>
                      setForm((p) => ({ ...p, password: e.target.value }))
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Хоосон бол хуучнаараа үлдэнэ.
                  </p>
                </div>
              </div>

              {editable && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <Label className="flex items-center gap-2 font-normal">
                    <Checkbox
                      checked={form.https ?? data.https}
                      onCheckedChange={(c) =>
                        setForm((p) => ({ ...p, https: c === true }))
                      }
                    />
                    HTTPS-ээр холбогдох
                  </Label>
                  <Button onClick={save} disabled={!dirty || busy !== null}>
                    {busy === 'save' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Хадгалж шалгах
                  </Button>
                  {dirty && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setForm({});
                        setTest(null);
                      }}
                      disabled={busy !== null}
                    >
                      Болих
                    </Button>
                  )}
                </div>
              )}

              {test && (
                <p
                  className={cn(
                    'flex items-start gap-1.5 rounded-lg border px-3 py-2 text-xs',
                    test.ok
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-destructive',
                  )}
                >
                  {test.ok ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 size-3.5 shrink-0" />
                  )}
                  <span className="break-all">
                    {test.ok ? `Холбогдлоо — ${test.detail}` : test.detail}
                  </span>
                </p>
              )}

              <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-xs">
                {data.model && (
                  <span>
                    Төхөөрөмж: {data.model} {data.firmware}
                  </span>
                )}
                {data.lastSeenAt && (
                  <span>Сүүлд холбогдсон: {dateTime(data.lastSeenAt)}</span>
                )}
                {data.subnet && <span>Энэ сервер {data.subnet}.x сүлжээнд</span>}
              </div>
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}
