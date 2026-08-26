'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/use-api';
import { qs, type Page } from '@/lib/api';
import { dateTime, money } from '@/lib/format';

interface AuditRow {
  id: string;
  staffUserId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
  memberId: string | null;
  memberName: string | null;
  memberNo: number | null;
  staffName: string | null;
  staffEmail: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  'membership.extend': 'Эрх сунгав',
  'membership.reverse': 'Худалдан авалт буцаав',
  'member.suspend': 'Түр зогсоов',
  'member.resume': 'Сэргээв',
  'member.cancel': 'Цуцлав',
  'locker.rent': 'Шүүгээ түрээслэв',
  'locker.return': 'Шүүгээ буцаав',
  'settings.update': 'Тохиргоо өөрчлөв',
};

const FILTERS = [
  { value: '', label: 'Бүгд' },
  { value: 'membership.extend', label: 'Сунгалт' },
  { value: 'membership.reverse', label: 'Буцаалт' },
  { value: 'locker.rent', label: 'Шүүгээ' },
  { value: 'settings.update', label: 'Тохиргоо' },
] as const;

/** Аудитын мөрийн гол өөрчлөлтийг хүнд ойлгомжтой болгож харуулна. */
function describe(r: AuditRow): string {
  const a = r.after ?? {};
  if (r.action === 'membership.extend') {
    const days = a.days as number | undefined;
    const amount = a.amount as number | undefined;
    return [days ? `+${days} хоног` : null, amount ? money(amount) : null]
      .filter(Boolean)
      .join(' · ');
  }
  if (r.action === 'locker.rent') {
    return [
      a.memberName as string | undefined,
      a.days ? `${a.days as number} хоног` : null,
      a.amount ? money(a.amount as number) : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (r.action === 'locker.return') {
    return [a.memberName as string | undefined, a.late ? 'хугацаа хэтэрсэн' : null]
      .filter(Boolean)
      .join(' · ');
  }
  if (r.action === 'settings.update') {
    return Object.entries(a)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(', ');
  }
  return (a.status as string | undefined) ?? '';
}

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditRow | null>(null);
  const { data, loading, error } = useApi<Page<AuditRow>>(
    `/audit${qs({ action: action || undefined, page, limit: 25 })}`,
  );

  const columns: Column<AuditRow>[] = [
    {
      key: 'when',
      header: 'Цаг',
      cell: (r) => (
        <span className="font-mono text-xs tabular-nums">{dateTime(r.createdAt)}</span>
      ),
    },
    {
      key: 'action',
      header: 'Үйлдэл',
      cell: (r) => (
        <span className="text-sm font-medium">
          {ACTION_LABEL[r.action] ?? r.action}
        </span>
      ),
    },
    {
      key: 'what',
      header: 'Дэлгэрэнгүй',
      cell: (r) => <span className="text-sm">{describe(r) || '—'}</span>,
    },
    {
      key: 'member',
      header: 'Гишүүн',
      cell: (r) =>
        r.memberName ? (
          <span className="text-sm">
            {r.memberName}
            {r.memberNo !== null && (
              <span className="text-muted-foreground ml-1.5 text-xs">
                №{r.memberNo}
              </span>
            )}
          </span>
        ) : (
          // Гишүүнтэй холбоогүй үйлдэл (тохиргоо, шүүгээ, терминал).
          <span className="text-muted-foreground font-mono text-xs">
            {r.entity}
          </span>
        ),
    },
    {
      key: 'staff',
      header: 'Ажилтан',
      cell: (r) => (
        <span className="text-muted-foreground text-sm">
          {r.staffName ?? '—'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'reason',
      header: 'Шалтгаан',
      cell: (r) => (
        <span className="text-muted-foreground text-xs">{r.reason ?? '—'}</span>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    // `h-full` — хуудас дэлгэцийг ЯГ дүүргэнэ. Ингэснээр гадна талд
    // гүйх зүйл үлдэхгүй, зөвхөн хүснэгтийн бие дотроо гүйнэ.
    <div className="flex h-full flex-col gap-5">
      <PageHeader
        title="Аудит"
        description="Гар ажиллагаагаар хийсэн бүх өөрчлөлт"
      />

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={action === f.value ? 'default' : 'outline'}
            onClick={() => {
              setAction(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <DataTable
        fill
        data={data}
        columns={columns}
        loading={loading}
        error={error}
        rowKey={(r) => r.id}
        emptyText="Бичлэг алга"
        onPageChange={setPage}
        onRowClick={setDetail}
      />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {detail ? (ACTION_LABEL[detail.action] ?? detail.action) : ''}
            </DialogTitle>
            <DialogDescription>
              Хэн, хэзээ, юуг өөрчилсний бүрэн бичлэг
            </DialogDescription>
          </DialogHeader>
          {detail && <AuditDetail row={detail} />}
        </DialogContent>
      </Dialog>

      <p className="text-muted-foreground text-xs">
        Автомат үйлдэл (онлайн төлбөрөөр сунгах, хугацаа дуусгах) энд
        бичигдэхгүй — эдгээр нь өөрсдийн бүртгэлтэй. Энэ лог зөвхөн ажилтны
        гараар хийсэн, мөнгө/эрхэд нөлөөлөх үйлдлийг харуулна.
      </p>
    </div>
  );
}

/**
 * Аудитын нэг бичлэгийн дэлгэрэнгүй.
 *
 * Хүснэгтэд `before`/`after` багтахгүй тул энд ХАРЬЦУУЛЖ харуулна —
 * «юу байснаас юу болсон» нь маргаан шийдвэрлэхэд гол мэдээлэл.
 */
function AuditDetail({ row }: { row: AuditRow }) {
  const changed = diffKeys(row.before, row.after);
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2">
        <dt className="text-muted-foreground text-xs">Цаг</dt>
        <dd className="font-mono text-xs">{dateTime(row.createdAt)}</dd>

        <dt className="text-muted-foreground text-xs">Ажилтан</dt>
        <dd>
          {row.staffName ?? '—'}
          {row.staffEmail && (
            <span className="text-muted-foreground ml-1.5 text-xs">
              {row.staffEmail}
            </span>
          )}
        </dd>

        {row.memberName && (
          <>
            <dt className="text-muted-foreground text-xs">Гишүүн</dt>
            <dd>
              <Link
                href={`/members/${row.memberId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {row.memberName}
                {row.memberNo !== null && ` №${row.memberNo}`}
              </Link>
            </dd>
          </>
        )}

        <dt className="text-muted-foreground text-xs">Обьект</dt>
        <dd className="font-mono text-xs break-all">
          {row.entity}
          {row.entityId ? ` · ${row.entityId}` : ''}
        </dd>

        {row.reason && (
          <>
            <dt className="text-muted-foreground text-xs">Шалтгаан</dt>
            <dd>{row.reason}</dd>
          </>
        )}
      </dl>

      {changed.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs">Өөрчлөлт</p>
          <div className="divide-border overflow-hidden rounded-md border">
            {changed.map((k) => (
              <div
                key={k}
                className="grid grid-cols-[8rem_1fr_1fr] gap-2 px-3 py-2 text-xs odd:bg-muted/40"
              >
                <span className="text-muted-foreground font-mono">{k}</span>
                <span className="text-muted-foreground line-through">
                  {fmtVal(row.before?.[k])}
                </span>
                <span className="font-medium">{fmtVal(row.after?.[k])}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** `before`/`after`-т ялгаатай түлхүүрүүд. */
function diffKeys(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): string[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  return [...keys].filter(
    (k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]),
  );
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return dateTime(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
