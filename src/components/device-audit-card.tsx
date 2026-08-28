'use client';

import { AlertTriangle, CheckCircle2, Loader2, ScanSearch, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { date } from '@/lib/format';

interface Extra {
  employeeNo: number;
  name: string;
  end: string | null;
}

interface Diff {
  ran: boolean;
  reason?: string;
  deviceTotal: number;
  winfitTotal: number;
  missing: { employeeNo: number; name: string }[];
  drift: { employeeNo: number; name: string; reason: string }[];
  nameDiff: { employeeNo: number; winfit: string; device: string }[];
  extras: Extra[];
  queued?: number;
}

/**
 * Терминал ↔ WinFit-ийн БҮРЭН тулгалт.
 *
 * «Терминал тулгах» товчноос ЯЛГААТАЙ: тэр нь WinFit өөрөө «би энд
 * унасан» гэж мэдэж байгаа гишүүдийг л засдаг. Энэ нь терминал дээрх
 * бодит жагсаалтыг татаж, WinFit мэдэхгүй зөрүүг олно — reset хийсэн,
 * гараар засварласан, гараар хэрэглэгч нэмсэн тохиолдол.
 */
export function DeviceAuditCard() {
  const { can } = useAuth();
  const [diff, setDiff] = useState<Diff | null>(null);
  const [busy, setBusy] = useState<'diff' | 'fix' | 'remove' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function load(fix: boolean) {
    setBusy(fix ? 'fix' : 'diff');
    try {
      const r = fix
        ? await api.post<Diff>('/sync/run/device-audit')
        : await api.get<Diff>('/sync/run/device-audit/diff');
      setDiff(r);
      if (!r.ran) toast.warning(r.reason ?? 'Ажиллуулах боломжгүй');
      else if (fix) {
        toast.success(
          r.queued
            ? `${r.queued} гишүүн дахин бичихээр дараалалд орлоо`
            : 'Зөрүү олдсонгүй',
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  async function removeExtras() {
    if (!diff?.extras.length) return;
    setBusy('remove');
    try {
      const r = await api.post<{ queued: number }>(
        '/sync/run/device-audit/remove-extras',
        { employeeNos: diff.extras.map((e) => e.employeeNo) },
      );
      toast.success(`${r.queued} хэрэглэгч устгахаар дараалалд орлоо`);
      setConfirmRemove(false);
      await load(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Устгаж чадсангүй');
    } finally {
      setBusy(null);
    }
  }

  const clean =
    diff?.ran && !diff.missing.length && !diff.drift.length && !diff.extras.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Терминалын бүрэн тулгалт</CardTitle>
        <CardDescription>
          Терминал дээрх бүх хэрэглэгчийг татаж WinFit-тэй харьцуулна.
          Өдөр бүр 02:30-д автоматаар ажиллана.
        </CardDescription>
        <CardAction className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => load(false)}
            disabled={busy !== null}
          >
            {busy === 'diff' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ScanSearch className="size-3.5" />
            )}
            Зөрүү харах
          </Button>
          {can('manager') && (
            <Button size="sm" onClick={() => load(true)} disabled={busy !== null}>
              {busy === 'fix' && <Loader2 className="size-3.5 animate-spin" />}
              Тулгаж засах
            </Button>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {!diff ? (
          <p className="text-muted-foreground text-xs">
            «Зөрүү харах» дарж терминалын бодит байдлыг шалгана. Уншихаас
            өөр юу ч хийхгүй.
          </p>
        ) : !diff.ran ? (
          <p className="text-muted-foreground text-xs">{diff.reason}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Stat label="Терминал дээр" value={diff.deviceTotal} />
              <Stat label="WinFit-д" value={diff.winfitTotal} />
              <Stat
                label="Терминал дээр алга"
                value={diff.missing.length}
                warn={diff.missing.length > 0}
              />
              <Stat
                label="Огноо зөрсөн"
                value={diff.drift.length}
                warn={diff.drift.length > 0}
              />
              <Stat
                label="WinFit-д алга"
                value={diff.extras.length}
                warn={diff.extras.length > 0}
              />
              <Stat label="Нэр зөрсөн" value={diff.nameDiff.length} />
            </div>

            {clean && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Нэвтрэлтэд нөлөөлөх зөрүү алга.
              </p>
            )}

            {diff.nameDiff.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Нэрийн зөрүү нь нэвтрэлтэд нөлөөлөхгүй тул автоматаар
                зассаггүй — импортын үед бүртгэлийн дугаарыг нэрнээс
                салгасны үлдэц. Тэгшитгэх бол «Бүгдийг дахин бичих».
              </p>
            )}

            {diff.extras.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="flex items-start gap-1.5 text-xs">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                  <span>
                    Терминал дээр байгаа ч WinFit-д бүртгэлгүй{' '}
                    <strong>{diff.extras.length}</strong> хэрэглэгч. Эдгээр нь
                    ажилтан, цэвэрлэгч, зочин байж болзошгүй тул{' '}
                    <strong>автоматаар устгадаггүй</strong>.
                  </span>
                </p>
                <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs">
                  {diff.extras.map((e) => (
                    <li key={e.employeeNo} className="flex gap-2">
                      <span className="text-muted-foreground font-mono">
                        №{e.employeeNo}
                      </span>
                      <span className="truncate">{e.name}</span>
                      {e.end && (
                        <span className="text-muted-foreground ml-auto shrink-0">
                          {date(e.end)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {can('admin') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setConfirmRemove(true)}
                    disabled={busy !== null}
                  >
                    <Trash2 className="size-3.5" />
                    Бүгдийг терминалаас устгах
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {diff?.extras.length} хэрэглэгчийг терминалаас устгах уу?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Тэдний царайны бүртгэл хамт устана. WinFit-д бүртгэлгүй тул
              буцааж сэргээх боломжгүй — заалны ажилтан, цэвэрлэгч биш
              эсэхийг эхлээд шалгана уу.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>Болих</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                removeExtras();
              }}
              disabled={busy !== null}
            >
              {busy === 'remove' && <Loader2 className="size-4 animate-spin" />}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={
          warn
            ? 'text-destructive text-lg font-semibold tabular-nums'
            : 'text-lg font-semibold tabular-nums'
        }
      >
        {value}
      </p>
    </div>
  );
}
