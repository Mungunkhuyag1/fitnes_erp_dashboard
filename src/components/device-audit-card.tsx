"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Download,
  Loader2,
  MoreHorizontal,
  ScanSearch,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface FieldDiff {
  field: string;
  winfit: string;
  device: string;
}

interface DriftRow {
  employeeNo: number;
  name: string;
  fields: FieldDiff[];
}

interface Diff {
  ran: boolean;
  reason?: string;
  deviceTotal: number;
  winfitTotal: number;
  missing: DriftRow[];
  drift: DriftRow[];
  nameDiff: DriftRow[];
  extras: DriftRow[];
  queued?: number;
}

/** Дэлгэрэнгүй цонхонд аль үйлдэл боломжтойг ангилал шийднэ. */
interface Detail {
  row: DriftRow;
  push: boolean;
  remove: boolean;
}

/** Хийхээр сонгосон үйлдэл — баталгаажуулах цонхонд дамжина. */
interface Pending {
  kind: "pull" | "remove";
  employeeNo: number;
  name: string;
}

/**
 * Терминал ↔ WinFit-ийн БҮРЭН тулгалт.
 *
 * ★ ЯАГААД МӨР ТУС БҮРД ҮЙЛДЭЛ ВЭ
 *
 * Зөрүү бүр өөр шалтгаантай: нэг нь ажилтан, нөгөө нь бүртгэл алдагдсан
 * гишүүн, гурав дахь нь терминал reset хийгдсэний үлдэц. Бөөнөөр
 * «бүгдийг устга» гэвэл ажилтан тэр ялгааг харахгүйгээр шийднэ.
 * Тиймээс мөр бүр дээр ЧИГЛЭЛИЙГ өөрөө сонгоно.
 */
export function DeviceAuditCard() {
  const { can } = useAuth();
  const [diff, setDiff] = useState<Diff | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  async function load(fix: boolean) {
    setBusy(fix ? "fix" : "diff");
    try {
      const r = fix
        ? await api.post<Diff>("/sync/run/device-audit")
        : await api.get<Diff>("/sync/run/device-audit/diff");
      setDiff(r);
      if (!r.ran) toast.warning(r.reason ?? "Ажиллуулах боломжгүй");
      else if (fix) {
        toast.success(
          r.queued
            ? `${r.queued} гишүүн терминал руу бичихээр дараалалд орлоо`
            : "Нэвтрэлтэд нөлөөлөх зөрүү алга",
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setBusy(null);
    }
  }

  async function act(kind: "push" | "pull" | "remove", employeeNo: number) {
    setBusy(`${kind}:${employeeNo}`);
    try {
      await api.post(`/sync/run/device-audit/${kind}`, { employeeNo });
      toast.success(
        kind === "push"
          ? `№${employeeNo} терминал руу бичихээр дараалалд орлоо`
          : kind === "pull"
            ? `№${employeeNo} WinFit рүү авлаа`
            : `№${employeeNo} терминалаас устгахаар дараалалд орлоо`,
      );
      setPending(null);
      await load(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setBusy(null);
    }
  }

  /** Мөрийн `...` цэс — аль үйлдэл боломжтой нь ангиллаас хамаарна. */
  function RowMenu({
    employeeNo,
    name,
    push,
    remove,
  }: {
    employeeNo: number;
    name: string;
    push: boolean;
    remove: boolean;
  }) {
    const running = busy?.endsWith(`:${employeeNo}`);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0"
              disabled={busy !== null}
            >
              {running ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <MoreHorizontal className="size-3.5" />
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-64">
          {/* ⚠ Base UI-д `Label` нь заавал `Group` дотор байх ёстой —
              эс бөгөөс «MenuGroupContext is missing» гэж УНАНА. Энэ нь
              зөвхөн ажиллах үед илэрдэг тул tsc/build барихгүй. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              №{employeeNo} {name}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {push && can("manager") && (
              <DropdownMenuItem onClick={() => act("push", employeeNo)}>
                <Upload className="size-4" />
                WinFit → терминал
              </DropdownMenuItem>
            )}
            {can("admin") && (
              <DropdownMenuItem
                onClick={() => setPending({ kind: "pull", employeeNo, name })}
              >
                <Download className="size-4" />
                Терминал → WinFit
              </DropdownMenuItem>
            )}
            {remove && can("admin") && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setPending({ kind: "remove", employeeNo, name })}
              >
                <Trash2 className="size-4" />
                Терминалаас устгах
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const clean =
    diff?.ran &&
    !diff.missing.length &&
    !diff.drift.length &&
    !diff.extras.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Терминалын бүрэн тулгалт</CardTitle>
        <CardDescription>
          Терминал дээрх бүх хэрэглэгчийг татаж WinFit-тэй харьцуулна. Өдөр бүр
          02:30-д автоматаар ажиллана.
          <br />
          <strong>Тулгаж засах</strong> — нэвтрэлтэд нөлөөлөх зөрүүг WinFit-ийн
          мэдээллээр терминал дээр дарж бичнэ. Мөр тус бүрд чиглэлийг өөрөө
          сонгох бол <ArrowLeftRight className="inline size-3" /> цэсийг
          ашиглана.
        </CardDescription>
        <CardAction className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => load(false)}
            disabled={busy !== null}
          >
            {busy === "diff" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ScanSearch className="size-3.5" />
            )}
            Зөрүү харах
          </Button>
          {can("manager") && (
            <Button
              size="sm"
              onClick={() => load(true)}
              disabled={busy !== null}
            >
              {busy === "fix" && <Loader2 className="size-3.5 animate-spin" />}
              Тулгаж засах
            </Button>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {!diff ? (
          <p className="text-muted-foreground text-xs">
            «Зөрүү харах» дарж терминалын бодит байдлыг шалгана. Уншихаас өөр юу
            ч хийхгүй.
          </p>
        ) : !diff.ran ? (
          <p className="text-muted-foreground text-xs">{diff.reason}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Stat label="Терминал дээр" value={diff.deviceTotal} />
              <Stat label="WinFit-д" value={diff.winfitTotal} />
            </div>

            {clean && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Нэвтрэлтэд нөлөөлөх зөрүү алга.
              </p>
            )}

            {/* ── Терминал дээр алга ── */}
            <Section
              title="Терминал дээр алга"
              count={diff.missing.length}
              hint="WinFit-д бүртгэлтэй ч терминал дээр байхгүй — эдгээр хүн орж чадахгүй."
            >
              {diff.missing.map((r) => (
                <Row
                  key={r.employeeNo}
                  row={r}
                  onOpen={() =>
                    setDetail({ row: r, push: true, remove: false })
                  }
                >
                  <RowMenu
                    employeeNo={r.employeeNo}
                    name={r.name}
                    push
                    remove={false}
                  />
                </Row>
              ))}
            </Section>

            {/* ── Эрхийн зөрүү ── */}
            <Section
              title="Зөрүүтэй"
              count={diff.drift.length}
              hint="Хоёр талд байгаа ч нэвтрэлтэд нөлөөлөх утга зөрсөн."
            >
              {diff.drift.map((r) => (
                <Row
                  key={r.employeeNo}
                  row={r}
                  onOpen={() =>
                    setDetail({ row: r, push: true, remove: false })
                  }
                >
                  <RowMenu
                    employeeNo={r.employeeNo}
                    name={r.name}
                    push
                    remove={false}
                  />
                </Row>
              ))}
            </Section>

            {/* ── WinFit-д алга ── */}
            <Section
              title="WinFit-д алга"
              count={diff.extras.length}
              warn
              hint="Терминал дээр байгаа ч WinFit-д бүртгэлгүй. Ажилтан, зочин байж болзошгүй тул автоматаар устгадаггүй — мөр бүрийг тусад нь шийднэ."
            >
              {diff.extras.map((r) => (
                <Row
                  key={r.employeeNo}
                  row={r}
                  onOpen={() =>
                    setDetail({ row: r, push: false, remove: true })
                  }
                >
                  <RowMenu
                    employeeNo={r.employeeNo}
                    name={r.name}
                    push={false}
                    remove
                  />
                </Row>
              ))}
            </Section>

            {/* ── Нэр зөрсөн ── */}
            <Section
              title="Нэр зөрсөн"
              count={diff.nameDiff.length}
              hint="Нэвтрэлтэд нөлөөлөхгүй тул автоматаар зассаггүй — импортын үед бүртгэлийн дугаарыг нэрнээс салгасны үлдэц."
              collapsed
            >
              {diff.nameDiff.map((r) => (
                <Row
                  key={r.employeeNo}
                  row={r}
                  onOpen={() =>
                    setDetail({ row: r, push: true, remove: false })
                  }
                >
                  <RowMenu
                    employeeNo={r.employeeNo}
                    name={r.name}
                    push
                    remove={false}
                  />
                </Row>
              ))}
            </Section>
          </>
        )}
      </CardContent>

      {/* ── Дэлгэрэнгүй — аль тал алины утга нь ЭРГЭЛЗЭЭГҮЙ ── */}
      <Dialog
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              №{detail?.row.employeeNo} {detail?.row.name}
            </DialogTitle>
            <DialogDescription>
              WinFit болон терминал дээрх утгыг зэрэгцүүлэв. Зөрсөн утгыг
              улаанаар тэмдэглэв.
            </DialogDescription>
          </DialogHeader>

          {detail && <FieldTable fields={detail.row.fields} />}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {detail?.push && can("manager") && (
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => {
                  const no = detail.row.employeeNo;
                  setDetail(null);
                  act("push", no);
                }}
              >
                <Upload className="size-4" />
                WinFit → терминал
              </Button>
            )}
            {can("admin") && detail && (
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => {
                  const { employeeNo, name } = detail.row;
                  setDetail(null);
                  setPending({ kind: "pull", employeeNo, name });
                }}
              >
                <Download className="size-4" />
                Терминал → WinFit
              </Button>
            )}
            {detail?.remove && can("admin") && (
              <Button
                variant="outline"
                className="text-destructive"
                disabled={busy !== null}
                onClick={() => {
                  const { employeeNo, name } = detail.row;
                  setDetail(null);
                  setPending({ kind: "remove", employeeNo, name });
                }}
              >
                <Trash2 className="size-4" />
                Терминалаас устгах
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "remove"
                ? `№${pending.employeeNo} «${pending.name}»-г терминалаас устгах уу?`
                : `№${pending?.employeeNo} «${pending?.name}»-г WinFit рүү авах уу?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "remove" ? (
                <>
                  Царайны бүртгэл нь хамт устана. Энэ хүн дахин орох боломжгүй
                  болно — заалны ажилтан биш эсэхийг эхлээд шалгана уу.
                </>
              ) : (
                <>
                  Терминал дээрх нэр, эрхийн огноог WinFit рүү хуулна. Гишүүн
                  байхгүй бол шинээр үүсгэнэ.
                  <br />
                  <br />⚠ Энэ нь хэвийн урсгалын эсрэг чиглэл. Эрхийн огноог
                  терминалаас авах нь төлбөрийн бүртгэлтэй зөрчилдөж болзошгүй.
                  Мөн терминалд утасны дугаар байдаггүй тул дараа нь гараар
                  нөхөх шаардлагатай.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>
              Болих
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pending) act(pending.kind, pending.employeeNo);
              }}
              disabled={busy !== null}
            >
              {busy?.includes(":") && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {pending?.kind === "remove" ? "Устгах" : "Авах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * Нэг ангилал.
 *
 * ⚠ Гарчиг ба тоо нь ЗЭРЭГ байх ёстой: дээр нь тоо, доор нь тайлбар гэж
 * тусад нь байрлуулбал аль тоо алины тухай яриад байгаа нь ойлгомжгүй
 * болно (өмнөх хувилбар дээр яг ийм ойлгомжгүй байдал үүссэн).
 */
function Section({
  title,
  count,
  hint,
  warn,
  collapsed,
  children,
}: {
  title: string;
  count: number;
  hint: string;
  warn?: boolean;
  collapsed?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!collapsed);
  if (!count) return null;
  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-muted/50 flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left"
      >
        {warn && (
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
        )}
        <span className="min-w-0">
          <span className="text-sm font-medium">
            {title}
            <span
              className={
                warn
                  ? "text-destructive ml-2 tabular-nums"
                  : "text-muted-foreground ml-2 tabular-nums"
              }
            >
              {count}
            </span>
          </span>
          <span className="text-muted-foreground block text-xs">{hint}</span>
        </span>
        <span className="text-muted-foreground ml-auto shrink-0 text-xs">
          {open ? "Хураах" : "Дэлгэх"}
        </span>
      </button>
      {open && (
        <ul className="max-h-64 space-y-0.5 overflow-y-auto border-t px-3 py-2 text-xs">
          {children}
        </ul>
      )}
    </div>
  );
}

/**
 * Нэг мөр — дарвал дэлгэрэнгүй цонх нээнэ.
 *
 * ⚠ Утгыг МӨРӨНД харуулахгүй. `2026-05-25 ↔ 2026-08-23` гэж бичихэд
 * аль тал нь WinFit, аль нь терминалынх болох нь мэдэгдэхгүй. Мөрөнд
 * зөвхөн ЯМАР талбар зөрсөнийг нэрлээд, утгыг нь толгойтой хүснэгтэд
 * харуулна.
 */
function Row({
  row,
  onOpen,
  children,
}: {
  row: DriftRow;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="hover:bg-muted/50 flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left"
      >
        <span className="text-muted-foreground shrink-0 font-mono">
          №{row.employeeNo}
        </span>
        <span className="truncate">{row.name}</span>
        <span className="text-muted-foreground ml-auto shrink-0 pl-3">
          {row.fields
            .filter((f) => f.winfit !== "—" && f.device !== "—")
            .map((f) => f.field)
            .join(" · ") || "Дэлгэрэнгүй"}
        </span>
      </button>
      {children}
    </li>
  );
}

/** Талбарын зөрүү — толгойтой хүснэгт, аль тал алины нь эргэлзээгүй. */
function FieldTable({ fields }: { fields: FieldDiff[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-xs">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Талбар</th>
            <th className="px-3 py-2 text-left font-medium">WinFit</th>
            <th className="px-3 py-2 text-left font-medium">Терминал</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => {
            const same = f.winfit === f.device;
            return (
              <tr key={f.field} className="border-t">
                <td className="text-muted-foreground px-3 py-2">{f.field}</td>
                <td className="px-3 py-2 font-medium">{f.winfit}</td>
                <td
                  className={
                    same
                      ? "px-3 py-2 font-medium"
                      : "text-destructive px-3 py-2 font-medium"
                  }
                >
                  {f.device}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
