'use client';

import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
  Trash2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FilterSelect } from '@/components/filter-select';
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
import { Badge } from '@/components/ui/badge';
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

interface Program {
  id: string;
  name: string;
  type: string;
  target: string | null;
  status: string;
}

interface ProgramsResponse {
  items: Program[];
  selected: string | null;
  envFallback: string | null;
}

interface Summary {
  program: Program | null;
  enrollAllowlist: boolean | null;
  loopy: { cards: number; allowedPhones: number };
  winfit: {
    members: number;
    allowed: number;
    withCard: number;
    inWallet: number;
  };
}

interface AllowlistDiff {
  extras: string[];
  missing: string[];
  loopyTotal: number;
  winfitTotal: number;
}

interface EnrollLink {
  programId: string;
  name: string;
  enrollAllowlist: boolean;
  enrollUrl: string;
}

/**
 * Loopy программын сонголт + гишүүн бүртгүүлэх линк.
 *
 * Программын ID нь урьд нь ЗӨВХӨН `.env`-д байсан тул солиход deploy
 * шаардагддаг байв. Одоо DB-д хадгалагдана — админ энд сонгоно.
 */
export function LoopyProgramCard() {
  const { data, loading, error, reload } =
    useApi<ProgramsResponse>('/loyalty/programs');
  const { data: sum, reload: reloadSum } =
    useApi<Summary>('/loyalty/program-summary');
  const { data: diff, reload: reloadDiff } = useApi<AllowlistDiff>(
    '/loyalty/allowlist/diff',
  );
  const [confirmClean, setConfirmClean] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  /**
   * Loopy дээр байгаа ч WinFit-д байхгүй дугаарыг хасна.
   *
   * ⚠ Loopy тал дээр буцаах аргагүй тул баталгаажуулалт ЗААВАЛ. Backend
   * нь дуудагчийн жагсаалтыг шууд хэрэглэхгүй — Loopy-гоос дахин
   * тооцоолж таарсныг л устгана.
   */
  async function cleanup() {
    setCleaning(true);
    try {
      const r = await api.post<{ queued: number }>(
        '/loyalty/allowlist/cleanup',
        {},
      );
      toast.success(`${r.queued} дугаар хасах дараалалд оров`, {
        description: 'Гүйцэтгэлийг Синк хуудсаас хараарай',
      });
      setConfirmClean(false);
      reloadDiff();
      reloadSum();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setCleaning(false);
    }
  }
  const [saving, setSaving] = useState(false);
  const [link, setLink] = useState<EnrollLink | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /** Одоо ажиллаж буй ID: тохиргоо → env нөөц. */
  const active = data?.selected ?? data?.envFallback ?? '';

  async function select(programId: string) {
    if (!programId || programId === active) return;
    setSaving(true);
    try {
      const r = await api.patch<{ name: string }>('/loyalty/program', {
        programId,
      });
      toast.success(`«${r.name}» программ сонгогдлоо`);
      closeLink();
      reload();
      reloadSum();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function loadLink() {
    try {
      const r = await api.get<EnrollLink>('/loyalty/enroll-link');
      setLink(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Линк авч чадсангүй');
    }
  }

  /**
   * QR-ыг линк ирсний ДАРАА зурна.
   *
   * `toDataURL` нь Promise буцаадаг тул render дотор дуудаж болохгүй
   * (`react-hooks/purity`). Тиймээс effect дотор, линк солигдоход л.
   */
  useEffect(() => {
    // ⚠ Энд `setQr(null)` гэж ШУУД дуудаж болохгүй — effect-ийн бие дотор
    // синхроноор setState хийхийг `react-hooks/set-state-in-effect` хориглоно.
    // Тиймээс цэвэрлэгээг `closeLink()`-д шилжүүлэв.
    if (!link) return;
    let alive = true;
    void QRCode.toDataURL(link.enrollUrl, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [link]);

  /** Линк болон QR-ыг ХАМТ хаана — тусад нь хаавал QR өлгөөтэй үлдэнэ. */
  function closeLink() {
    setLink(null);
    setQr(null);
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link.enrollUrl);
    setCopied(true);
    toast.success('Хаяг хуулагдлаа');
    // Товчны төлөвийг буцаана — «хуулсан» гэж үүрд үлдэх нь эргэлзээ төрүүлнэ.
    setTimeout(() => setCopied(false), 2000);
  }

  const options = (data?.items ?? []).map((p) => ({
    value: p.id,
    label: p.name,
    dot: p.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground',
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Loopy программ</CardTitle>
        <CardDescription>
          Карт аль программ дээр үүсэхийг сонгоно
        </CardDescription>
        {link && (
          <CardAction>
            <Button size="sm" variant="ghost" onClick={closeLink}>
              Хаах
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !data && <Skeleton className="h-9 w-full max-w-sm" />}

        {error && (
          <p className="text-destructive flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {data && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                value={active}
                onChange={select}
                options={options}
                placeholder="Программ сонгох"
                className="min-w-56"
              />
              {saving && (
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              )}
              <Button size="sm" variant="outline" onClick={loadLink}>
                <QrCode className="size-3.5" />
                Бүртгэлийн линк
              </Button>
            </div>

            {/* Тохиргоо хоосон үед env ажиллаж байгааг ил хэлнэ — эс бөгөөс
                «сонгоогүй» мөртлөө яагаад ажиллаж байгаа нь ойлгомжгүй. */}
            {!data.selected && data.envFallback && (
              <p className="text-muted-foreground text-xs">
                Тохиргоонд сонгоогүй тул `LOOPY_PROGRAM_ID` орчны утга
                ажиллаж байна. Дээрээс сонгвол DB-д хадгалагдана.
              </p>
            )}
            {!data.selected && !data.envFallback && (
              <p className="text-destructive text-xs">
                Программ сонгоогүй байна — карттай холбоотой үйлдэл ажиллахгүй.
              </p>
            )}
          </>
        )}

        {sum?.program && (
          <ProgramSummary
            sum={sum}
            diff={diff}
            onCleanup={() => setConfirmClean(true)}
          />
        )}

        <AlertDialog open={confirmClean} onOpenChange={setConfirmClean}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {diff?.extras.length} дугаарыг Loopy-гоос хасах уу?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Эдгээр нь Loopy-гийн жагсаалтад байгаа ч WinFit-д гишүүнээр
                бүртгэлгүй дугаарууд. Ихэвчлэн устгагдсан гишүүдийнх байдаг.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2">
              <p className="text-destructive text-sm">
                Буцаах боломжгүй — дахин нэмэхийн тулд гишүүнийг шинээр
                бүртгэх шаардлагатай.
              </p>
              {diff && diff.extras.length > 0 && (
                <code className="bg-muted block max-h-28 overflow-y-auto rounded p-2 text-[11px]">
                  {diff.extras.join(', ')}
                </code>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Болих</AlertDialogCancel>
              <AlertDialogAction
                onClick={cleanup}
                disabled={cleaning}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {cleaning && <Loader2 className="size-4 animate-spin" />}
                Хасах
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {link && (
          <div className="space-y-3 rounded-lg border p-4">
            {!link.enrollAllowlist && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-muted-foreground text-xs">
                  Энэ программ дээр{' '}
                  <span className="text-foreground font-medium">
                    жагсаалтын горим унтраалттай
                  </span>{' '}
                  — линкийг олсон ХЭН Ч карт үүсгэж чадна. Loopy-гээс
                  «зөвшөөрөгдсөн дугаар» горимыг асаана уу.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-start gap-4">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt={`${link.name} — бүртгэлийн QR`}
                  className="size-40 shrink-0 rounded-md border bg-white p-2"
                />
              ) : (
                <Skeleton className="size-40 shrink-0 rounded-md" />
              )}

              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium">{link.name}</p>
                <p className="text-muted-foreground text-xs">
                  Гишүүн энэ хаягаар өөрөө бүртгүүлж Wallet карт авна.
                  Ресепшнд QR-ыг хэвлэж тавьж болно.
                </p>
                <code className="bg-muted block rounded px-2 py-1.5 text-[11px] break-all">
                  {link.enrollUrl}
                </code>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={copy}>
                    {copied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? 'Хуулсан' : 'Хаяг хуулах'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(link.enrollUrl, '_blank', 'noopener')
                    }
                  >
                    <ExternalLink className="size-3.5" />
                    Нээж үзэх
                  </Button>
                  {qr && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = qr;
                        a.download = `winfit-enroll-qr.png`;
                        a.click();
                      }}
                    >
                      QR татах
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Хоёр талын тоо — зөрүүг ил харуулна. */
function ProgramSummary({
  sum,
  diff,
  onCleanup,
}: {
  sum: Summary;
  diff: AllowlistDiff | null;
  onCleanup: () => void;
}) {
  const p = sum.program!;
  /**
   * ⚠ Зөрүү нь ХЭВИЙН БИШ. WinFit «карттай» гэж бодож буй гишүүн Loopy
   * дээр байхгүй бол картын үйлдэл чимээгүй унана. Шөнийн тулгалт
   * (04:00) үүнийг засдаг ч админ ХҮЛЭЭЛГҮЙ мэдэх ёстой.
   */
  const drift =
    sum.loopy.cards >= 0 && sum.winfit.withCard !== sum.loopy.cards;

  const rows: { label: string; value: number; hint?: string }[] = [
    { label: 'Гишүүн', value: sum.winfit.members, hint: 'цуцлаагүй' },
    { label: 'Жагсаалтад нэмсэн', value: sum.winfit.allowed },
    { label: 'Карт үүссэн', value: sum.winfit.withCard },
    { label: 'Wallet-д нэмсэн', value: sum.winfit.inWallet },
  ];

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{p.name}</span>
        <Badge variant="outline" className="font-normal">
          {p.type}
        </Badge>
        <Badge
          variant="outline"
          className={
            p.status === 'active'
              ? 'border-emerald-500/30 bg-emerald-500/10 font-normal text-emerald-700 dark:text-emerald-400'
              : 'font-normal'
          }
        >
          {p.status === 'active' ? 'идэвхтэй' : p.status}
        </Badge>
        {sum.enrollAllowlist === false && (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 font-normal text-amber-700 dark:text-amber-400"
          >
            жагсаалтын горим унтраалттай
          </Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label}>
            <p className="text-muted-foreground text-xs">{r.label}</p>
            <p className="text-lg font-semibold tabular-nums">
              {r.value}
              {r.hint && (
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  {r.hint}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground border-t pt-3 text-xs">
        Loopy тал:{' '}
        <span className="text-foreground font-medium tabular-nums">
          {sum.loopy.cards < 0 ? '—' : sum.loopy.cards}
        </span>{' '}
        карт ·{' '}
        <span className="text-foreground font-medium tabular-nums">
          {sum.loopy.allowedPhones < 0 ? '—' : sum.loopy.allowedPhones}
        </span>{' '}
        зөвшөөрөгдсөн дугаар
        {drift && (
          <span className="text-destructive ml-2">
            ⚠ WinFit {sum.winfit.withCard} карттай гэж үзэж байна — зөрүүтэй.
            Синк хуудсаас «Loopy тулгах» ажиллуулна уу.
          </span>
        )}
      </div>

      {/* Жагсаалтын зөрүү — нэмэх нь автомат, ХАСАХ нь гараар. */}
      {diff && (diff.extras.length > 0 || diff.missing.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5">
          <div className="min-w-0 text-xs">
            {diff.extras.length > 0 && (
              <p>
                Loopy-гийн жагсаалтад{' '}
                <span className="font-medium">{diff.extras.length}</span> илүү
                дугаар байна — WinFit-д гишүүнээр бүртгэлгүй.
              </p>
            )}
            {diff.missing.length > 0 && (
              <p className="text-muted-foreground">
                {diff.missing.length} дугаар дутуу — «Loopy тулгах» өөрөө нэмнэ.
              </p>
            )}
          </div>
          {diff.extras.length > 0 && (
            <Button size="sm" variant="outline" onClick={onCleanup}>
              <Trash2 className="size-3.5" />
              Жагсаалт цэвэрлэх
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
