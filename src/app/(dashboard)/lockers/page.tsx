"use client";

import { KeyRound, Loader2, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LockerHistory } from "@/components/locker-history";
import { LockerIssueDialog } from "@/components/locker-issue-dialog";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { date, dateTime, relative } from "@/lib/format";
import { cn } from "@/lib/utils";

type Status = "free" | "daily" | "rented" | "overdue" | "disabled";

interface LockerCell {
  id: string;
  number: number;
  active: boolean;
  status: Status;
  assignmentId: string | null;
  memberId: string | null;
  memberName: string | null;
  memberNo: number | null;
  issuedAt: string | null;
  dueAt: string | null;
  note: string | null;
}

type View = "board" | "history";

interface Board {
  zones: { zone: string; total: number; free: number; items: LockerCell[] }[];
}

/**
 * Шүүгээн дээр хулгана аваачихад гарах дэлгэрэнгүй.
 *
 * Урьд нь `title` атрибут ашигладаг байсан — систем 1-2 секунд хүлээдэг,
 * мөрөөр л бичдэг, загварчлах боломжгүй. Ресепшн энэ мэдээллийг ХУРДАН
 * харах шаардлагатай: хэн, хэзээ авсан, хэзээ буцаах, хоцорсон эсэх.
 */
function LockerTip({ zone, cell }: { zone: string; cell: LockerCell }) {
  if (cell.status === "disabled") {
    return (
      <div className="space-y-0.5">
        <p className="font-medium">
          {zone} №{cell.number}
        </p>
        <p className="opacity-80">Түр хаалттай</p>
        {cell.note && <p className="opacity-80">{cell.note}</p>}
      </div>
    );
  }
  if (!cell.memberName) {
    return (
      <div className="space-y-0.5">
        <p className="font-medium">
          {zone} №{cell.number}
        </p>
        <p className="opacity-80">Сул — дарж түлхүүр олгоно</p>
        {cell.note && <p className="opacity-80">{cell.note}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="font-medium">
        {zone} №{cell.number}
      </p>
      <div className="space-y-0.5 opacity-90">
        <p>
          {cell.memberName}
          {cell.memberNo !== null && ` · №${cell.memberNo}`}
        </p>
        <p>{cell.status === "daily" ? "Өдрийн түлхүүр" : "Түрээс"}</p>
        {cell.issuedAt && <p>Олгосон: {dateTime(cell.issuedAt)}</p>}
        {cell.dueAt && (
          <p className={cn(cell.status === "overdue" && "font-medium")}>
            {cell.status === "overdue" ? "ХОЦОРСОН — " : "Буцаах: "}
            {date(cell.dueAt)}
          </p>
        )}
        {cell.note && <p>{cell.note}</p>}
      </div>
      <p className="pt-0.5 opacity-70">Дарж буцааж авна</p>
    </div>
  );
}

const TONE: Record<Status, string> = {
  free: "border-border bg-card hover:border-primary/50 text-muted-foreground",
  daily: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  rented:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  overdue: "border-red-500/50 bg-red-500/12 text-red-700 dark:text-red-300",
  disabled: "border-dashed border-border bg-muted/40 text-muted-foreground/60",
};

const LEGEND: { status: Status; label: string }[] = [
  { status: "free", label: "Сул" },
  { status: "daily", label: "Өдрийн түлхүүр" },
  { status: "rented", label: "Түрээс" },
  { status: "overdue", label: "Хугацаа хэтэрсэн" },
  { status: "disabled", label: "Хаалттай" },
];

export default function LockersPage() {
  const {
    data: board,
    loading,
    reload,
  } = useApi<Board>("/lockers/board", {
    refreshMs: 30_000,
  });
  const { data: stats, reload: reloadStats } = useApi<{
    keysOut: number;
    overdueRentals: number;
  }>("/lockers/stats", { refreshMs: 30_000 });
  const { data: settings } = useApi<{
    locker_zones: string[];
    locker_price_per_month: number;
  }>("/settings");

  const [issueOpen, setIssueOpen] = useState(false);
  /**
   * Сонгосон өрөө — ХЯНАЛТТАЙ.
   *
   * Урьд нь `defaultValue={displayZones[0]?.zone}` байсан: өрөөний жагсаалт
   * тохиргоо/самбараас АСИНХРОНООР ирдэг тул анх `undefined`, дараа нь
   * жинхэнэ нэр болж, Base UI «uncontrolled Tabs-ийн анхны утга өөрчлөгдлөө»
   * гэж сануулдаг байв — таб нь сонгогдоогүй үлдэх эрсдэлтэй.
   *
   * Одоо утгыг render-ийн үед ГАРГАЖ АВНА: ажилтны сонголт хүчинтэй л бол
   * хадгалагдана, эс бөгөөс (өрөө устсан, хараахан ачаалагдаагүй) эхний
   * өрөө рүү унана. `useEffect` доторх setState шаардлагагүй.
   */
  const [zone, setZone] = useState("");
  const [view, setView] = useState<View>("board");
  const [issueTarget, setIssueTarget] = useState<{
    zone: string;
    number: number;
  } | null>(null);
  const [returning, setReturning] = useState<{
    zone: string;
    cell: LockerCell;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const zones = useMemo(
    () =>
      settings?.locker_zones?.length
        ? settings.locker_zones
        : (board?.zones.map((z) => z.zone) ?? ["Эрэгтэй", "Эмэгтэй"]),
    [settings, board],
  );

  // Тохиргоонд байгаа ч самбарт байхгүй өрөөг мөн харуулна (хоосон байж болно).
  const displayZones = useMemo(() => {
    const map = new Map(board?.zones.map((z) => [z.zone, z]) ?? []);
    return zones.map(
      (z) =>
        map.get(z) ?? { zone: z, total: 0, free: 0, items: [] as LockerCell[] },
    );
  }, [zones, board]);

  // Сонголт хүчинтэй бол хадгална, эс бөгөөс эхний өрөө. Render-ийн үед
  // гаргаж авдаг тул нэмэлт render давталт үүсэхгүй.
  const activeZone = displayZones.some((z) => z.zone === zone)
    ? zone
    : (displayZones[0]?.zone ?? "");

  const freeCount = displayZones.reduce((s2, z) => s2 + z.free, 0);
  const totalCount = displayZones.reduce((s2, z) => s2 + z.total, 0);

  function refresh() {
    reload();
    reloadStats();
  }

  async function doReturn() {
    if (!returning) return;
    setBusy(true);
    try {
      const res = await api.post<{ late: boolean; memberName: string | null }>(
        "/lockers/return",
        { zone: returning.zone, number: returning.cell.number },
      );
      toast.success(`${returning.zone} №${returning.cell.number} буцаж ирлээ`, {
        description: res.late ? "Хугацаа хэтэрсэн байсан" : undefined,
      });
      setReturning(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setBusy(false);
    }
  }

  function onCellClick(zone: string, cell: LockerCell) {
    if (cell.status === "disabled") return;
    if (cell.status === "free") {
      setIssueTarget({ zone, number: cell.number });
      setIssueOpen(true);
    } else {
      setReturning({ zone, cell });
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Шүүгээ"
        description="Түлхүүр олгох, буцааж авах, түрээс"
      >
        <Button
          onClick={() => {
            setIssueTarget(null);
            setIssueOpen(true);
          }}
        >
          <Plus className="size-4" />
          Түлхүүр олгох
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Гарсан түлхүүр"
          value={stats?.keysOut ?? "—"}
          suffix="ширхэг"
          sub="Буцаагдаагүй байгаа"
        />
        <StatCard
          label="Хугацаа хэтэрсэн түрээс"
          value={stats?.overdueRentals ?? "—"}
          tone={stats?.overdueRentals ? "danger" : "default"}
          sub={
            stats?.overdueRentals
              ? "Түлхүүр буцаагдаагүй — залгах шаардлагатай"
              : "Хугацаа хэтэрсэн байхгүй"
          }
        />
        <StatCard
          label="Сул шүүгээ"
          value={freeCount}
          suffix={`/ ${totalCount}`}
          ratio={totalCount ? freeCount / totalCount : 0}
          footL="Бүх өрөө"
          footR={`${totalCount - freeCount} эзэлсэн`}
        />
      </div>

      {/* Самбар нь ЗӨВХӨН одоогийн байдал. Маргаан гарахад («би буцаасан»
          / «үгүй») хэн хэзээ авч, хэзээ буцаасныг харах газар хэрэгтэй —
          backend-д эндпойнт байсан ч дэлгэц байгаагүй. */}
      <Tabs value={view} onValueChange={(v) => setView(String(v) as View)}>
        <TabsList>
          <TabsTrigger value="board">Самбар</TabsTrigger>
          <TabsTrigger value="history">Түүх</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <LockerHistory />
        </TabsContent>

        <TabsContent value="board" className="mt-4 space-y-4">
      {loading && !board ? (
        <Skeleton className="h-72" />
      ) : (
        <Tabs value={activeZone} onValueChange={(v) => setZone(String(v))}>
          {/*
            Өрөөний таб ба өнгөний тайлбар НЭГ мөрөнд. Тайлбар нь урьд нь
            хуудасны ЁРООЛД байсан — сүлжээг харж байхад доош гүйлгэж очих
            шаардлагатай болдог байв. Одоо нүд шилжүүлэлгүй харна.
          */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <TabsList>
              {displayZones.map((z) => (
                <TabsTrigger key={z.zone} value={z.zone}>
                  {z.zone}
                  <span className="text-muted-foreground ml-1.5 text-xs">
                    {z.total ? `${z.free}/${z.total}` : "0"}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {LEGEND.map((l) => (
                <span
                  key={l.status}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span
                    className={cn("size-3 rounded border", TONE[l.status])}
                  />
                  <span className="text-muted-foreground">{l.label}</span>
                </span>
              ))}
            </div>
          </div>

          {displayZones.map((z) => (
            <TabsContent key={z.zone} value={z.zone} className="mt-4 space-y-4">
              <Card>
                <CardContent>
                  {z.items.length ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
                      {z.items.map((cell) => (
                        <Tooltip key={cell.id}>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                onClick={() => onCellClick(z.zone, cell)}
                                disabled={cell.status === "disabled"}
                                className={cn(
                                  "flex flex-col items-center justify-center rounded-lg border px-1 py-2",
                                  "transition-colors disabled:cursor-not-allowed",
                                  TONE[cell.status],
                                )}
                              >
                                <span className="font-mono text-base font-semibold tabular-nums">
                                  {cell.number}
                                </span>
                                <span className="w-full truncate px-1 text-[0.65rem] leading-tight">
                                  {cell.memberName ?? "—"}
                                </span>
                              </button>
                            }
                          />
                          <TooltipContent className="max-w-64">
                            <LockerTip zone={z.zone} cell={cell} />
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-muted-foreground text-sm">
                        {z.zone} өрөөнд шүүгээ бүртгэгдээгүй
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Түлхүүр олгоход дугаар автоматаар бүртгэгдэнэ
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Гарсан түлхүүрийн жагсаалт — самбараас хурдан харах */}
              {z.items.some(
                (c) => c.status !== "free" && c.status !== "disabled",
              ) && (
                <Card className="py-0">
                  <CardContent className="p-0">
                    <ul className="divide-border divide-y">
                      {z.items
                        .filter(
                          (c) => c.status !== "free" && c.status !== "disabled",
                        )
                        .map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center gap-3 px-4 py-2.5"
                          >
                            <KeyRound
                              className={cn(
                                "size-4 shrink-0",
                                c.status === "overdue"
                                  ? "text-destructive"
                                  : c.status === "rented"
                                    ? "text-emerald-500"
                                    : "text-sky-500",
                              )}
                            />
                            <span className="font-mono text-sm font-semibold tabular-nums">
                              №{c.number}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm">
                              {c.memberName}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {c.status === "daily"
                                ? `өдрийн · ${relative(c.issuedAt)}`
                                : c.status === "overdue"
                                  ? `хэтэрсэн · ${date(c.dueAt)}`
                                  : `${date(c.dueAt)} хүртэл`}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setReturning({ zone: z.zone, cell: c })
                              }
                            >
                              <RotateCcw className="size-3.5" />
                              Буцаах
                            </Button>
                          </li>
                        ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
        </TabsContent>
      </Tabs>

      <LockerIssueDialog
        /* Өөр шүүгээ дарж орж ирэхэд диалог дахин mount болж, анхны утга
           (өрөө + дугаар) шинэчлэгдэнэ. */
        key={`${issueTarget?.zone ?? ""}-${issueTarget?.number ?? ""}`}
        open={issueOpen}
        onOpenChange={setIssueOpen}
        zones={zones}
        defaultZone={issueTarget?.zone}
        defaultNumber={issueTarget?.number}
        rentalPrice={settings?.locker_price_per_month ?? 30000}
        onDone={refresh}
      />

      <AlertDialog
        open={!!returning}
        onOpenChange={(v) => !v && setReturning(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Түлхүүр буцааж авах</AlertDialogTitle>
            <AlertDialogDescription>
              {returning && (
                <>
                  {returning.zone} №{returning.cell.number} —{" "}
                  <span className="font-medium">
                    {returning.cell.memberName}
                  </span>
                  {returning.cell.status === "overdue" && (
                    <span className="text-destructive block">
                      Хугацаа {date(returning.cell.dueAt)}-нд дууссан
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Болих</AlertDialogCancel>
            <AlertDialogAction onClick={doReturn} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Буцааж авав
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
