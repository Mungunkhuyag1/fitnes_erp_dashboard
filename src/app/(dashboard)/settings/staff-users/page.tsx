'use client';

import {
  ChevronDown,
  KeyRound,
  Loader2,
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/data-table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApi } from '@/hooks/use-api';
import { api, type Page } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';

type RoleKey = 'reception' | 'manager' | 'admin';

interface Staff {
  id: string;
  email: string;
  name: string;
  role: RoleKey;
  roleLabel: string;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

interface ResetRequest {
  id: string;
  email: string;
  staffUserId: string | null;
  note: string | null;
  createdAt: string;
  unknown: boolean;
}

const ROLES: {
  key: RoleKey;
  label: string;
  hint: string;
  tone: string;
}[] = [
  {
    key: 'reception',
    label: 'Ресепшн',
    hint: 'Өдөр тутмын ажил — мөнгө, тохиргоонд хүрэхгүй',
    tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  {
    key: 'manager',
    label: 'Менежер',
    hint: 'Эрх зогсоох, буцаах, багц, аудит',
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  {
    key: 'admin',
    label: 'Админ',
    hint: 'Тохиргоо, ажилтан, гараар төлбөр баталгаажуулах',
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
];

/**
 * Эрхийн хураангуй — `docs/09-role-matrix.md`-ийн гол хэсэг.
 *
 * Админ ажилтанд эрх өгөхийн ӨМНӨ юу нээгдэхийг мэдэх ёстой. Баримт
 * бичиг хайж уншина гэж найдах нь бодит биш — шийдвэр гаргах газартаа
 * байх ёстой.
 *
 * `✔` = тухайн эрх БОЛОН түүнээс дээш (эрх нь шатлалтай).
 */
const MATRIX: { group: string; rows: [string, boolean, boolean, boolean][] }[] = [
  {
    group: 'Гишүүн',
    rows: [
      ['Бүртгэх, засах, хайх', true, true, true],
      ['Терминал / Wallet руу дахин бичих', true, true, true],
      ['Төлбөрийн токен сэлгэх', false, true, true],
    ],
  },
  {
    group: 'Эрх, төлбөр',
    rows: [
      ['Эрх сунгах (бэлнээр)', false, true, true],
      ['Зогсоох, сэргээх, цуцлах', false, true, true],
      ['Худалдан авалт буцаах', false, true, true],
      ['Нэхэмжлэх цуцлах', false, true, true],
      ['Гараар «төлөгдсөн» болгох', false, false, true],
    ],
  },
  {
    group: 'Шүүгээ, терминал',
    rows: [
      ['Түлхүүр олгох, буцаах', true, true, true],
      ['Шүүгээ бүртгэх, засах', false, true, true],
      ['Хаалга зайнаас нээх', false, true, true],
    ],
  },
  {
    group: 'Удирдлага',
    rows: [
      ['Тайлан харах', true, true, true],
      ['Синк, аудит', false, true, true],
      ['Багц үүсгэх, засах', false, true, true],
      ['Тохиргоо, ажилтан', false, false, true],
    ],
  },
];

export default function StaffUsersPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi<Page<Staff>>(
    `/staff?page=${page}&limit=20`,
  );
  const { data: resets, reload: reloadResets } =
    useApi<ResetRequest[]>('/staff/password-resets');

  const [addOpen, setAddOpen] = useState(false);
  const [pwTarget, setPwTarget] = useState<Staff | null>(null);
  const [roleTarget, setRoleTarget] = useState<Staff | null>(null);
  const [activeTarget, setActiveTarget] = useState<Staff | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    if (!activeTarget) return;
    setBusy(true);
    try {
      await api.patch(`/staff/${activeTarget.id}`, { active: !activeTarget.active });
      toast.success(activeTarget.active ? 'Идэвхгүй болголоо' : 'Идэвхжүүллээ');
      setActiveTarget(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  async function dismissReset(id: string) {
    try {
      await api.post(`/staff/password-resets/${id}/resolve`, {});
      reloadResets();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    }
  }

  const columns: Column<Staff>[] = [
    {
      key: 'name',
      header: 'Ажилтан',
      cell: (s) => (
        <div className="flex items-center gap-3">
          <span className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium">
            {s.name[0]}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="truncate">{s.name}</span>
              {s.id === user?.id && (
                <span className="text-muted-foreground text-xs">(та)</span>
              )}
            </p>
            <p className="text-muted-foreground truncate text-xs">{s.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Эрх',
      cell: (s) => {
        const r = ROLES.find((x) => x.key === s.role);
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
              r?.tone,
            )}
          >
            {r?.label ?? s.role}
          </span>
        );
      },
    },
    {
      key: 'state',
      header: 'Төлөв',
      cell: (s) =>
        !s.active ? (
          <Badge variant="outline">Идэвхгүй</Badge>
        ) : s.mustChangePassword ? (
          <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
            Түр нууц үгтэй
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">Идэвхтэй</span>
        ),
    },
    {
      key: 'login',
      header: 'Сүүлд нэвтэрсэн',
      cell: (s) => (
        <span className="text-muted-foreground text-sm">
          {relative(s.lastLoginAt)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'act',
      header: '',
      className: 'w-12',
      cell: (s) => {
        const isSelf = s.id === user?.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Үйлдэл">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  disabled={isSelf || !s.active}
                  onClick={() => setRoleTarget(s)}
                >
                  <ShieldCheck className="size-4" />
                  Эрх солих
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPwTarget(s)}>
                  <KeyRound className="size-4" />
                  Түр нууц үг тавих
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isSelf}
                variant={s.active ? 'destructive' : 'default'}
                onClick={() => setActiveTarget(s)}
              >
                <X className="size-4" />
                {s.active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Нууц үг сэргээх хүсэлт ── */}
      {resets && resets.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/[0.04]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
              Нууц үг сэргээх хүсэлт
              <Badge variant="outline">{resets.length}</Badge>
            </CardTitle>
            <CardDescription>
              Ажилтан нууц үгээ мартсан гэж мэдэгдсэн. Түр нууц үг тавьж амаар
              дамжуулна уу.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {resets.map((r) => {
              const target = data?.items.find((s) => s.id === r.staffUserId);
              return (
                <div
                  key={r.id}
                  className="bg-background flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {target?.name ?? r.email}
                      {r.unknown && (
                        <span className="text-destructive ml-2 text-xs">
                          бүртгэлгүй хаяг
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {r.email}
                      {r.note && ` · ${r.note}`}
                      {` · ${relative(r.createdAt)}`}
                    </p>
                  </div>
                  {target && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPwTarget(target)}
                    >
                      <KeyRound className="size-3.5" />
                      Түр нууц үг
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissReset(r.id)}
                    aria-label="Хүсэлтийг хаах"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Ажилтны хүснэгт ── */}
      <Card className="gap-0 py-0">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Ажилтан</CardTitle>
          <CardDescription>
            Шинэ ажилтанд түр нууц үг өгнө — эхний нэвтрэлтэд заавал солино
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="size-3.5" />
              Ажилтан нэмэх
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        rowKey={(s) => s.id}
        emptyText="Ажилтан алга"
        onPageChange={setPage}
      />

      <RoleMatrix />

      <AddStaffDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onDone={() => {
          reload();
          setAddOpen(false);
        }}
      />
      <RoleDialog
        key={`role-${roleTarget?.id ?? 'none'}`}
        staff={roleTarget}
        onOpenChange={(o) => !o && setRoleTarget(null)}
        onDone={() => {
          setRoleTarget(null);
          reload();
        }}
      />
      <ResetPasswordDialog
        key={`pw-${pwTarget?.id ?? 'none'}`}
        staff={pwTarget}
        onOpenChange={(o) => !o && setPwTarget(null)}
        onDone={() => {
          setPwTarget(null);
          reload();
          reloadResets();
        }}
      />

      {/* Идэвх солих баталгаажуулалт */}
      <Dialog
        open={!!activeTarget}
        onOpenChange={(o) => !o && setActiveTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeTarget?.active ? 'Идэвхгүй болгох уу?' : 'Идэвхжүүлэх үү?'}
            </DialogTitle>
            <DialogDescription>
              {activeTarget?.active ? (
                <>
                  <b>{activeTarget?.name}</b> системд нэвтэрч чадахгүй болно.
                  Бүртгэл нь устахгүй — хожим дахин идэвхжүүлж болно.
                </>
              ) : (
                <>
                  <b>{activeTarget?.name}</b> дахин нэвтрэх боломжтой болно.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveTarget(null)}>
              Цуцлах
            </Button>
            <Button
              variant={activeTarget?.active ? 'destructive' : 'default'}
              onClick={toggleActive}
              disabled={busy}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {activeTarget?.active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Эрх бүр юу хийж чаддагийг задалсан хүснэгт. */
function RoleMatrix() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Эрх бүр юу хийж чадах вэ</CardTitle>
        <CardDescription>
          Эрх нь шатлалтай — админ бүх зүйлийг, менежер ресепшний бүх зүйлийг
          хийж чадна
        </CardDescription>
        <CardAction>
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? 'Хураах' : 'Дэлгэрэнгүй'}
            <ChevronDown
              className={cn('size-3.5 transition-transform', open && 'rotate-180')}
            />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.key} className="rounded-lg border px-3 py-2.5">
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                  r.tone,
                )}
              >
                {r.label}
              </span>
              <p className="text-muted-foreground mt-1.5 text-xs">{r.hint}</p>
            </div>
          ))}
        </div>

        {open && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-xs">
                  <th className="py-2 pr-3 text-left font-medium">Үйлдэл</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="w-24 px-2 py-2 text-center font-medium">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((g) => (
                  // Жагсаалтын элемент нь ФРАГМЕНТ тул `key` нь дотоод
                  // `<tr>`-т биш ЭНД байх ёстой — эс бөгөөс React сануулна.
                  <Fragment key={g.group}>
                    <tr>
                      <td
                        colSpan={4}
                        className="text-muted-foreground pt-4 pb-1 text-xs font-medium tracking-wide uppercase"
                      >
                        {g.group}
                      </td>
                    </tr>
                    {g.rows.map(([label, ...allowed]) => (
                      <tr key={label} className="border-b last:border-0">
                        <td className="py-2 pr-3">{label}</td>
                        {allowed.map((ok, i) => (
                          <td key={i} className="px-2 py-2 text-center">
                            {ok ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                ✔
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>

            <p className="text-muted-foreground mt-4 text-xs">
              ⚠ <b>Админыг цөөн байлга.</b> Админ нь банкны баталгаагүйгээр
              нэхэмжлэхийг «төлөгдсөн» болгож, эрх нээж чадна. 1–2 хүн байхад
              хангалттай.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Эрх солих — аль эрх рүү шилжихийг сонгож, үр дагаврыг харуулна. */
function RoleDialog({
  staff,
  onOpenChange,
  onDone,
}: {
  staff: Staff | null;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [role, setRole] = useState<RoleKey | null>(null);
  const [busy, setBusy] = useState(false);
  const picked = role ?? staff?.role ?? null;
  const changed = !!staff && !!picked && picked !== staff.role;

  async function submit() {
    if (!staff || !picked) return;
    setBusy(true);
    try {
      await api.patch(`/staff/${staff.id}`, { role: picked });
      toast.success(
        `${staff.name} — ${ROLES.find((r) => r.key === picked)?.label}`,
      );
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!staff} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Эрх солих</DialogTitle>
          <DialogDescription>
            {staff?.name} ({staff?.email}) — одоо{' '}
            <b>{ROLES.find((r) => r.key === staff?.role)?.label}</b>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-left transition-colors',
                picked === r.key
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-accent/50',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium">{r.label}</span>
                {staff?.role === r.key && (
                  <span className="text-muted-foreground text-xs">(одоогийн)</span>
                )}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                {r.hint}
              </span>
            </button>
          ))}
        </div>

        {changed && (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            {picked === 'admin'
              ? 'Админ нь тохиргоо, ажилтныг удирдаж, гараар төлбөр баталгаажуулж чадна.'
              : staff && ROLES.findIndex((r) => r.key === picked) <
                  ROLES.findIndex((r) => r.key === staff.role)
                ? 'Эрх БУУРНА — тухайн ажилтан зарим үйлдлийг хийж чадахаа болино.'
                : 'Эрх нэмэгдэнэ.'}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Цуцлах
          </Button>
          <Button onClick={submit} disabled={busy || !changed}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Солих
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddStaffDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleKey>('reception');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/staff', { name, email, role, password });
      toast.success(`${name} нэмэгдлээ`, {
        description: 'Түр нууц үгийг ажилтанд амаар дамжуулна уу',
      });
      setName('');
      setEmail('');
      setPassword('');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ажилтан нэмэх</DialogTitle>
          <DialogDescription>
            Түр нууц үгийг та өөрөө бичнэ. Ажилтан эхний нэвтрэлтэд заавал
            солино.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sname">Нэр</Label>
            <Input
              id="sname"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Батаа"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="semail">И-мэйл</Label>
            <Input
              id="semail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bataa@winfit.mn"
            />
          </div>
          <div className="space-y-2">
            <Label>Эрх</Label>
            <div className="grid gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left transition-colors',
                    role === r.key
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent/50',
                  )}
                >
                  <span className="block text-sm font-medium">{r.label}</span>
                  <span className="text-muted-foreground block text-xs">
                    {r.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="spass">Түр нууц үг</Label>
            <Input
              id="spass"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Хамгийн багадаа 8 тэмдэгт"
            />
            <p className="text-muted-foreground text-xs">
              Энэ нууц үгийг ажилтанд амаар дамжуулна. Систем и-мэйл
              илгээхгүй.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Цуцлах
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Нэмэх
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  staff,
  onOpenChange,
  onDone,
}: {
  staff: Staff | null;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff) return;
    setBusy(true);
    try {
      await api.post(`/staff/${staff.id}/reset-password`, { password });
      toast.success('Түр нууц үг тавигдлаа', {
        description: `${staff.name}-д амаар дамжуулна уу. Бүх сесс тасарлаа.`,
      });
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!staff} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Түр нууц үг тавих</DialogTitle>
          <DialogDescription>
            {staff?.name} ({staff?.email}) — бүх төхөөрөмж дээрх сесс тасарч,
            эхний нэвтрэлтэд нууц үгээ солино.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rpass">Шинэ түр нууц үг</Label>
            <Input
              id="rpass"
              required
              minLength={8}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Хамгийн багадаа 8 тэмдэгт"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Цуцлах
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Тавих
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
