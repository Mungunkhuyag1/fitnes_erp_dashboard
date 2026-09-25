'use client';

import {
  AlertTriangle,
  BellRing,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  Stethoscope,
  Unplug,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorToast } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date, dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Status {
  connected: boolean;
  pageId: string | null;
  pageName: string | null;
  verifyToken: string | null;
  hasToken: boolean;
  hasAppSecret: boolean;
  hasAppId: boolean;
  connectedAt: string | null;
  /** Meta-гийн самбарт хуулж тавих хаяг. */
  webhookUrl: string;
}

/** `/meta/check` — оношилгооны хариу. */
interface Check {
  connected: boolean;
  token: { ok: boolean; error?: string; note?: string };
  page: { id: string; name: string } | null;
  /** `'never'` = хэзээ ч дуусахгүй, `null` = App ID өгөөгүй тул мэдэхгүй. */
  expiresAt: string | null | 'never' | 'unknown';
  subscription: {
    subscribed: boolean;
    fields: string[];
    missing: string[];
    error?: string;
  };
  webhookUrl: string;
}

/**
 * Facebook Page-ийн холболт.
 *
 * ★ META-ГИЙН ТАЛД ХИЙХ АЖЛЫГ ЭНД ХЭЛНЭ
 *
 * Энэ маягт зөвхөн хадгална — Meta дээр апп үүсгэх, webhook бүртгэх,
 * токен авах гурвыг ажилтан өөрөө хийнэ. Тэдгээрийг хийгээгүй бол
 * холболт «амжилттай» харагдаад мессеж хэзээ ч ирэхгүй, шалтгаан нь
 * ойлгомжгүй. Тиймээс алхмуудыг ил бичив.
 *
 * ⚠ Токен, app secret хоёрыг санд битүүмжилж хадгална
 * (`secret-box.ts` — терминалын нууц үгтэй ижил). Хадгалсны дараа
 * ДАХИН ХАРУУЛАХГҮЙ.
 */
export function MetaConnectionCard() {
  const { can } = useAuth();
  const admin = can('admin');
  const { data, loading, reload } = useApi<Status>('/meta/status');

  const [pageId, setPageId] = useState('');
  const [token, setToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [appId, setAppId] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [diag, setDiag] = useState<Check | null>(null);

  async function connect() {
    setBusy(true);
    try {
      const r = await api.post<{ pageName: string }>('/meta/connect', {
        pageId: pageId.trim() || undefined,
        appId: appId.trim() || undefined,
        token: token.trim(),
        appSecret: appSecret.trim(),
        verifyToken: verifyToken.trim(),
      });
      toast.success(`«${r.pageName}» холбогдлоо`);
      setToken('');
      setAppSecret('');
      reload();
      // Холбомогц ШУУД оношилно — «одоо юу дутуу байна» гэдгийг
      // ажилтан дараагийн товч хайлгүй харна.
      void runCheck();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await api.del('/meta/connect');
      toast.success('Холболт салгагдлаа');
      reload();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Оношилгоо.
   *
   * ⚠ Алдааг toast-оор ШИДЭХГҮЙ — `check` нь өөрөө «юу эвдэрсэн»-ийг
   * буцаадаг тул хариуг нь харуулах нь зөв. Зөвхөн сүлжээ тасарсан
   * үед л toast.
   */
  async function runCheck() {
    setChecking(true);
    try {
      setDiag(await api.get<Check>('/meta/check'));
    } catch (e) {
      errorToast(e, 'Шалгаж чадсангүй');
    } finally {
      setChecking(false);
    }
  }

  /** Хуудсыг аппад захиалах — Meta-гийн самбарт гараар хийдэг алхам. */
  async function subscribe() {
    setBusy(true);
    try {
      const r = await api.post<{ fields: string[] }>('/meta/subscribe', {});
      toast.success('Хуудас захиалагдлаа', {
        description: r.fields.join(', '),
      });
      await runCheck();
    } catch (e) {
      errorToast(e, 'Захиалга бүтсэнгүй');
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string, what: string) {
    void navigator.clipboard.writeText(text);
    toast.success(`${what} хуулагдлаа`);
  }

  if (loading && !data) return <Skeleton className="h-64" />;
  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="text-muted-foreground size-4" />
          Facebook Page
        </CardTitle>
        <CardDescription>
          Хуудсанд ирсэн мессежийг WinFit дотроос харж хариулах
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {data.connected ? (
          <>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="size-4" />
              <span className="font-medium">{data.pageName}</span>
              <span className="text-muted-foreground font-mono text-xs">
                {data.pageId}
              </span>
              <span className="text-muted-foreground ml-auto text-xs">
                {dateTime(data.connectedAt)}
              </span>
            </div>
            {/*
              ★ ШАЛГАХ — «холбогдсон» гэдэг нь «АЖИЛЛАЖ БАЙНА» гэсэн үг БИШ.
              Токен хадгалагдсан ч хуудас аппад захиалагдаагүй бол нэг ч
              мессеж ирэхгүй, гэтэл дээрх ногоон мөр «холбогдлоо» гэж
              хэлсээр байна. Энэ товч тэр зөрүүг илчилнэ.
            */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={runCheck} disabled={checking}>
                {checking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Stethoscope className="size-4" />
                )}
                Шалгах
              </Button>
              {admin && (
                <Button variant="outline" onClick={disconnect} disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Unplug className="size-4" />
                  )}
                  Салгах
                </Button>
              )}
            </div>

            {diag && (
              <div className="space-y-2 rounded-lg border p-3">
                <Row
                  ok={diag.token.ok}
                  label="Токен"
                  value={
                    diag.token.ok
                      ? (diag.page?.name ?? 'хүчинтэй')
                      : (diag.token.error ?? 'хүчингүй')
                  }
                  note={diag.token.note}
                  fix="Токен хугацаа дууссан бол Meta дээр шинээр үүсгээд доор дахин хадгална"
                />

                {/*
                  ⚠ ХУГАЦАА — чимээгүй үхлийн цорын ганц урьдчилсан дохио.
                  Page token ихэвчлэн 60 хоногт дуусдаг; тэр үед webhook
                  ирсээр байгаад хариу илгээх бүрд л унана.
                */}
                <Row
                  ok={diag.expiresAt === 'never'}
                  warn={diag.expiresAt === null || diag.expiresAt === 'unknown'}
                  label="Хугацаа"
                  value={
                    diag.expiresAt === 'never'
                      ? 'Хэзээ ч дуусахгүй'
                      : diag.expiresAt === null
                        ? 'App ID өгөөгүй тул мэдэхгүй'
                        : diag.expiresAt === 'unknown'
                          ? 'Шалгаж чадсангүй — App ID зөв эсэхийг хар'
                          : `${date(diag.expiresAt)}-нд дуусна`
                  }
                  fix={
                    diag.expiresAt === null
                      ? 'Доорх App ID талбарыг бөглөвөл шалгана'
                      : diag.expiresAt === 'unknown'
                        ? 'App ID нь Meta → App settings → Basic дээрхтэй таарч байна уу'
                        : 'Урт хугацааны токен авах: docs/17 §4'
                  }
                />

                <Row
                  ok={diag.subscription.subscribed && diag.subscription.missing.length === 0}
                  label="Захиалга"
                  value={
                    diag.subscription.error
                      ? diag.subscription.error
                      : !diag.subscription.subscribed
                        ? 'Хуудас аппад захиалагдаагүй — мессеж ИРЭХГҮЙ'
                        : diag.subscription.missing.length
                          ? `Дутуу: ${diag.subscription.missing.join(', ')}`
                          : diag.subscription.fields.join(', ')
                  }
                  fix="«Захиалах» товчийг дар"
                />

                {admin &&
                  (!diag.subscription.subscribed ||
                    diag.subscription.missing.length > 0) && (
                    <Button size="sm" onClick={subscribe} disabled={busy}>
                      {busy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <BellRing className="size-3.5" />
                      )}
                      Захиалах
                    </Button>
                  )}
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Холбогдоогүй байна.</p>
        )}

        {admin && (
          <>
            {/*
              Meta-гийн талд хийх ажил. Энэ жагсаалтгүй бол ажилтан
              маягтыг бөглөөд «яагаад мессеж ирэхгүй байна» гэж
              ойлгохгүй — бүртгэл нь тэнд хийгддэг.
            */}
            <div className="bg-muted/40 space-y-2 rounded-lg p-3 text-xs">
              <p className="font-medium">Дараалал</p>
              {/*
                ⚠ ДАРААЛАЛ ЧУХАЛ. Meta-гийн «Verify and Save» нь
                WinFit-ийн САНД хадгалсан баталгаажуулах үгийг асуудаг.
                Тиймээс энд ЭХЛЭЭД хадгалах ёстой — эс бөгөөс Meta
                татгалзаж, шалтгаан нь ойлгомжгүй байна.
              */}
              <ol className="text-muted-foreground list-decimal space-y-1 pl-4">
                <li>
                  developers.facebook.com → апп үүсгээд <b>Messenger</b>{' '}
                  бүтээгдэхүүнийг нэмнэ
                </li>
                <li>
                  Messenger → Settings → хуудсаа холбож{' '}
                  <b>Page access token</b> үүсгэнэ (нэг л удаа харагдана)
                </li>
                <li>
                  App Settings → Basic → <b>App Secret</b> хуулна
                </li>
                <li className="text-foreground font-medium">
                  Доорх маягтыг бөглөөд ЭНД ХАДГАЛНА
                </li>
                <li>
                  Дараа нь Meta → Webhooks → Callback URL болгож доорх
                  хаягыг, Verify Token болгож энд бичсэн үгээ тавьж{' '}
                  <b>Verify and Save</b>
                </li>
                <li className="text-foreground font-medium">
                  Энд эргэж ирээд <b>«Шалгах»</b> → <b>«Захиалах»</b> дар —
                  <b>messages</b>, <b>message_echoes</b> захиалагдана.
                  (Хоёрдахьгүй бол утаснаас бичсэн хариу энд харагдахгүй.)
                </li>
                <li>
                  Туршихад <b>аппын админы</b> Facebook хаягаас бичнэ —
                  App Review хүртэл бусад хүн бичиж чадахгүй
                </li>
              </ol>

              <div className="flex items-center gap-2 pt-1">
                <code className="bg-background truncate rounded border px-2 py-1 font-mono text-[11px]">
                  {data.webhookUrl}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(data.webhookUrl, 'Webhook хаяг')}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Page ID (заавал биш)"
                hint="Хоосон орхивол токенээс нь авна"
              >
                <Input
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  placeholder="102938475610293"
                />
              </Field>
              <Field
                label="App ID (заавал биш)"
                hint="Өгвөл токен хэзээ дуусахыг шалгана"
              >
                <Input
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder={data.hasAppId ? '•••••• (хадгалсан)' : '1234567890123456'}
                />
              </Field>
              <Field
                label="Баталгаажуулах үг"
                hint="Meta-гийн самбарт ижилхэн бичнэ"
              >
                <Input
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="winfit-2026"
                />
              </Field>
            </div>

            <Field label="Page access token" hint="Хадгалсны дараа харагдахгүй">
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={data.hasToken ? '•••••• (хадгалсан)' : ''}
              />
            </Field>

            <Field
              label="App secret"
              hint="Түлхэлтийн гарын үсэг шалгахад — үүнгүйгээр мессеж хүлээж авахгүй"
            >
              <Input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder={data.hasAppSecret ? '•••••• (хадгалсан)' : ''}
              />
            </Field>

            <Button
              onClick={connect}
              disabled={
                busy ||
                !token.trim() ||
                !appSecret.trim() ||
                !verifyToken.trim()
              }
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {data.connected ? 'Дахин холбох' : 'Холбох'}
            </Button>

            {/* Хадгалахаас ӨМНӨ токеныг шалгана — буруу утга хадгалагдвал
                мессеж ирсээр байгаад хариу илгээх бүрд унана. */}
            <p className="text-muted-foreground text-xs">
              Хадгалахын өмнө токеныг Facebook дээр шалгаж, хуудасны нэрийг
              автоматаар авна.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      {children}
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  );
}

/**
 * Оношилгооны нэг мөр.
 *
 * ⚠ Зөвхөн ӨНГӨӨР биш, ДҮРСЭЭР ч ялгана — өнгө ялгах бэрхшээлтэй
 * хүнд ногоон/улаан хоёр ижил саарал харагдана.
 *
 * `fix` нь ЗӨВХӨН асуудалтай үед. Бүх зүйл зөв байхад зөвлөгөө
 * харуулах нь дэлгэцийг дүүргээд «ямар нэг зүйл буруу байна уу?»
 * гэж эргэлзүүлнэ.
 */
function Row({
  ok,
  warn,
  label,
  value,
  fix,
  note,
}: {
  ok: boolean;
  warn?: boolean;
  label: string;
  value: string;
  fix: string;
  /** Зөв боловч мэдэх нь зүйтэй зүйл — алдаа БИШ. */
  note?: string;
}) {
  const Icon = ok ? Check : warn ? AlertTriangle : X;
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon
        className={cn(
          'mt-0.5 size-3.5 shrink-0',
          ok
            ? 'text-emerald-600 dark:text-emerald-400'
            : warn
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-destructive',
        )}
      />
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="min-w-0 flex-1">
        <span className={cn('block', !ok && !warn && 'text-destructive')}>
          {value}
        </span>
        {!ok && <span className="text-muted-foreground block">{fix}</span>}
        {ok && note && (
          <span className="text-muted-foreground block">{note}</span>
        )}
      </span>
    </div>
  );
}
