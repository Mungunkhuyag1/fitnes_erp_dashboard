'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  Loader2,
  Play,
  Save,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Step {
  key: string;
  label: string;
  why: string;
  ok: boolean;
  ms: number;
  data?: unknown;
  error?: string;
}

interface Diag {
  at: string;
  host: string;
  mode: string;
  steps: Step[];
  ok: number;
  failed: number;
  savedTo: string | null;
}

/**
 * Терминалын оношилгоо — фитнест очиход зориулсан дэлгэц.
 *
 * ЯАГААД: `npm run probe` скрипт нь терминалын дэргэд суусан хүн л
 * ажиллуулж чадна. Газар дээр хамгийн хэрэгтэй зүйл бол «юу ажиллаж,
 * юу ажиллахгүй байна» гэдгийг ДЭЛГЭЦЭЭС харах.
 *
 * ⚠ Зөвхөн УНШИНА — терминалын төлөвийг өөрчлөхгүй.
 */
export default function DiagnosePage() {
  const [employeeNo, setEmployeeNo] = useState('1');
  const [hours, setHours] = useState('24');
  const [busy, setBusy] = useState(false);
  const [diag, setDiag] = useState<Diag | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  async function run() {
    setBusy(true);
    try {
      const r = await api.get<Diag>(
        `/devices/diagnose?employeeNo=${encodeURIComponent(employeeNo || '1')}&eventHours=${encodeURIComponent(hours || '24')}`,
      );
      setDiag(r);
      // Унасан алхмуудыг ШУУД нээж харуулна — засах зүйл нь тэнд байна.
      setOpen(
        Object.fromEntries(r.steps.filter((s) => !s.ok).map((s) => [s.key, true])),
      );
      if (r.failed) {
        toast.warning(`${r.failed} шалгалт унав`, {
          description: `${r.ok} амжилттай`,
        });
      } else {
        toast.success('Бүх шалгалт амжилттай', { description: `${r.ok} алхам` });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Оношилгоо ажиллуулж чадсангүй');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Түүхий JSON-ыг ТАТАЖ авна.
   *
   * Сервер дээр `probe/` хавтсанд аль хэдийн хадгалагдсан ч зөөврийн
   * компьютер дээр гар дээр байх нь дээр — фитнесээс буцаж ирээд
   * `docs/03-isapi-findings.md` бичихэд эх сурвалж болно.
   */
  function download() {
    if (!diag) return;
    const blob = new Blob([JSON.stringify(diag, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `probe-${diag.at.replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Терминалын оношилгоо"
        description="ISAPI дуудлагуудыг шалгаж, түүхий хариуг хадгална"
      >
        {diag && (
          <Button variant="outline" onClick={download}>
            <Download className="size-4" />
            JSON татах
          </Button>
        )}
        <Button onClick={run} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Оношилгоо ажиллуулах
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Тохируулга</CardTitle>
          <CardDescription>
            Аль хэрэглэгчийн дугаараар шалгах, хэдэн цагийн эвент татахыг
            сонгоно
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="emp">Хэрэглэгчийн дугаар</Label>
            <Input
              id="emp"
              value={employeeNo}
              onChange={(e) => setEmployeeNo(e.target.value)}
              className="w-40"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hrs">Эвентийн хугацаа (цаг)</Label>
            <Input
              id="hrs"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-40"
              inputMode="numeric"
            />
          </div>
        </CardContent>
      </Card>

      {diag && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {diag.host || 'Хаяг тохируулаагүй'}
            </CardTitle>
            <CardDescription>
              {new Date(diag.at).toLocaleString('mn-MN')} · горим: {diag.mode}
            </CardDescription>
            <CardAction>
              <span
                className={cn(
                  'text-sm font-medium tabular-nums',
                  diag.failed ? 'text-destructive' : 'text-emerald-600',
                )}
              >
                {diag.ok}/{diag.steps.length}
              </span>
            </CardAction>
          </CardHeader>

          <CardContent className="space-y-2">
            {diag.savedTo && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Save className="size-3.5 shrink-0" />
                Сервер дээр хадгалав:{' '}
                <code className="bg-muted rounded px-1 py-0.5 break-all">
                  {diag.savedTo}
                </code>
              </p>
            )}

            {diag.steps.map((s) => (
              <div key={s.key} className="rounded-lg border">
                <button
                  className="hover:bg-accent/50 flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left"
                  onClick={() =>
                    setOpen((p) => ({ ...p, [s.key]: !p[s.key] }))
                  }
                >
                  {s.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="text-destructive mt-0.5 size-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-muted-foreground text-xs">{s.why}</p>
                    {!s.ok && (
                      <p className="text-destructive mt-1 text-xs break-all">
                        {s.error}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                    {s.ms} мс
                  </span>
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform',
                      open[s.key] && 'rotate-180',
                    )}
                  />
                </button>

                {open[s.key] && (
                  <div className="border-t px-3 py-2">
                    {/* Түүхий хариу — таамаглахгүй, байгаагаар нь. */}
                    <pre className="bg-muted max-h-72 overflow-auto rounded-md p-3 text-[11px] leading-relaxed">
                      {JSON.stringify(s.data ?? { error: s.error }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!diag && !busy && (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
            <AlertTriangle className="size-8 opacity-40" />
            <p>Оношилгоо хараахан ажиллаагүй байна</p>
            <p className="max-w-md text-xs">
              Дээрх товчийг дарна. Терминал руу зөвхөн уншилтын дуудлага
              явна — төлөв өөрчлөгдөхгүй.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
