'use client';

import { Check, Copy, Loader2, MessageSquare, Unplug } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { dateTime } from '@/lib/format';

interface Status {
  connected: boolean;
  pageId: string | null;
  pageName: string | null;
  verifyToken: string | null;
  hasToken: boolean;
  hasAppSecret: boolean;
  connectedAt: string | null;
  /** Meta-гийн самбарт хуулж тавих хаяг. */
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
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    try {
      const r = await api.post<{ pageName: string }>('/meta/connect', {
        pageId: pageId.trim(),
        token: token.trim(),
        appSecret: appSecret.trim(),
        verifyToken: verifyToken.trim(),
      });
      toast.success(`«${r.pageName}» холбогдлоо`);
      setToken('');
      setAppSecret('');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
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
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
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
              <p className="font-medium">Meta-гийн талд хийх дараалал</p>
              <ol className="text-muted-foreground list-decimal space-y-1 pl-4">
                <li>
                  developers.facebook.com дээр апп үүсгэж <b>Messenger</b>{' '}
                  бүтээгдэхүүнийг нэмнэ
                </li>
                <li>Хуудсаа тэр апптай холбож, Page access token үүсгэнэ</li>
                <li>
                  Webhook хаягт доорхыг тавьж, өөрийн сонгосон
                  баталгаажуулах үгийг бичнэ
                </li>
                <li>
                  <b>messages</b>, <b>message_echoes</b> хоёрыг заавал
                  захиална — хоёрдахьгүй бол утаснаас бичсэн хариу WinFit-д
                  харагдахгүй
                </li>
                <li>
                  App Review хүртэл зөвхөн аппын админ/тестерүүд мессеж
                  бичиж чадна
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
              <Field label="Page ID">
                <Input
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  placeholder="102938475610293"
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
                !pageId.trim() ||
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
