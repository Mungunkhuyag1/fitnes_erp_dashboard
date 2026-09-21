'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Page } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Хуудсан дахь мөрийн тооны сонголт.
 *
 * Backend-ийн `MAX_LIMIT` нь 200 тул дээд тал нь түүнээс хэтрэхгүй —
 * хэтэрвэл 400 алдаа буцаана.
 */
export const PAGE_SIZES = [50, 100, 150, 200] as const;
export const DEFAULT_PAGE_SIZE = 50;

export interface Column<T> {
  key: string;
  header: ReactNode;
  /**
   * Backend-ийн `sort` параметрын утга. ӨГВӨЛ толгой нь дарах
   * боломжтой болно.
   *
   * ★ СОНГОЛТООР — бүх багана эрэмбэлэгддэггүй. Зураг,
   * товч зэрэг баганад сум харуулах нь төөрөгдүүлнэ. Мөн энэ
   * утгыг backend ЦАГААЖСАН жагсаалтаас шалгадаг.
   */
  sortKey?: string;
  cell: (row: T) => ReactNode;
  /** Утасны дэлгэцэд нуух (хоёрдогч багана). */
  hideOnMobile?: boolean;
  className?: string;
}

interface Props<T> {
  data: Page<T> | null;
  columns: Column<T>[];
  loading?: boolean;
  error?: string | null;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  /**
   * Баялаг хоосон төлөв — дүрс, гарчиг, зөвлөмж, үйлдэл.
   *
   * `emptyText` нь ганц мөр текст. Гэвч хоосон хүснэгт нь ихэвчлэн ХОЁР
   * өөр утгатай: «өгөгдөл алга» ба «шүүлтүүрт тохирох зүйл олдсонгүй».
   * Хоёр дахь тохиолдолд ажилтанд шүүлтүүрээ цэвэрлэх зам хэрэгтэй —
   * үүнийг хуудас өөрөө мэднэ. Өгөгдсөн бол `emptyText`-ийг дарна.
   */
  empty?: ReactNode;
  onPageChange: (page: number) => void;
  /**
   * Одоогийн эрэмбэ. `onSortChange`-тэй ХАМТ өгвөл л толгой
   * дарах боломжтой болно — хоёрын нэг нь дутвал дарж болох
   * боловч юу ч болдоггүй толгой гарах байсан.
   */
  sort?: { key: string; dir: 'ASC' | 'DESC' };
  onSortChange?: (sort: { key: string; dir: 'ASC' | 'DESC' }) => void;
  /**
   * Нэг хуудасанд хэдэн мөр. `onPageSizeChange`-тэй хамт өгвөл
   * хуудаслалтын хажууд сонгогч гарна.
   */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  /**
   * Үлдсэн өндрийг ДҮҮРГЭЖ, зөвхөн хүснэгтийн БИЕ дотроо гүйнэ.
   *
   * Үүнгүй бол урт жагсаалт хуудсыг сунгаж, карт бүхэлдээ дэлгэцээс
   * гарах ба хуудаслалт харагдахгүй болно. Дүүргэх горимд толгой,
   * шүүлтүүр, хуудаслалт үргэлж харагдана.
   *
   * Эцэг элемент нь `flex h-full flex-col` байх ёстой.
   */
  fill?: boolean;
}

/**
 * Жагсаалтын нэгдсэн хүснэгт.
 *
 * Backend-ийн бүх жагсаалт `PageResult` буцаадаг тул энэ компонент шинэ
 * дэлгэц нэмэх бүрд дахин бичигдэхгүй — зөвхөн `columns` тодорхойлно.
 */
export function DataTable<T>({
  data,
  columns,
  loading,
  error,
  rowKey,
  onRowClick,
  emptyText = 'Бичлэг алга',
  empty,
  onPageChange,
  sort,
  onSortChange,
  pageSize,
  onPageSizeChange,
  fill = false,
}: Props<T>) {
  const showSkeleton = loading && !data;

  return (
    <div
      className={cn(
        fill ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-3',
      )}
    >
      <Card
        className={cn(
          'overflow-hidden py-0',
          fill && 'flex min-h-0 flex-1 flex-col',
        )}
      >
        <div
          className={cn(
            'overflow-x-auto',
            fill && 'min-h-0 flex-1 overflow-y-auto',
          )}
        >
          <Table>
            {/* Урт жагсаалт гүйлгэхэд баганы нэр алга болвол аль багана
                юу болохыг санахад хэцүү — толгойг наана. */}
            <TableHeader
              className={cn(fill && 'bg-card sticky top-0 z-10')}
            >
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => {
                  const sortable = !!c.sortKey && !!onSortChange;
                  const active = sortable && sort?.key === c.sortKey;
                  return (
                    <TableHead
                      key={c.key}
                      className={cn(
                        c.hideOnMobile && 'hidden md:table-cell',
                        c.className,
                      )}
                      aria-sort={
                        active
                          ? sort!.dir === 'ASC'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      {sortable ? (
                        <button
                          type="button"
                          /*
                            Дарах бүрд ЧИГ солино. Шинэ багана сонгоход
                            `DESC`-ээс эхэлнэ: огноо, дүнгийн баганад «хамгийн
                            сүүлийн / хамгийн их» гэдэг нь бараг үргэлж хүссэн зүйл.
                          */
                          onClick={() =>
                            onSortChange({
                              key: c.sortKey!,
                              dir:
                                active && sort!.dir === 'DESC' ? 'ASC' : 'DESC',
                            })
                          }
                          className={cn(
                            '-mx-2 inline-flex items-center gap-1 rounded px-2 py-1',
                            'hover:text-foreground transition-colors',
                            active ? 'text-foreground' : 'text-muted-foreground',
                            // Баруун зэрэгцүүлсэн баганад товч бас баруундаа.
                            c.className?.includes('text-right') &&
                              'flex-row-reverse',
                          )}
                        >
                          {c.header}
                          {active ? (
                            sort!.dir === 'ASC' ? (
                              <ArrowUp className="size-3" />
                            ) : (
                              <ArrowDown className="size-3" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        c.header
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    {columns.map((c) => (
                      <TableCell
                        key={c.key}
                        className={cn(c.hideOnMobile && 'hidden md:table-cell')}
                      >
                        <Skeleton className="h-4 w-full max-w-28" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!showSkeleton && error && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="py-10 text-center">
                    <p className="text-destructive text-sm">{error}</p>
                  </TableCell>
                </TableRow>
              )}

              {!showSkeleton && !error && data?.items.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="py-10 text-center">
                    {empty ?? (
                      <p className="text-muted-foreground text-sm">{emptyText}</p>
                    )}
                  </TableCell>
                </TableRow>
              )}

              {!error &&
                data?.items.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((c) => (
                      <TableCell
                        key={c.key}
                        className={cn(c.hideOnMobile && 'hidden md:table-cell', c.className)}
                      >
                        {c.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/*
        Хуудаслалт — shadcn `dashboard-01` блокийн бүтэц: эхлэл / өмнөх /
        дараах / төгсгөл гэсэн ДӨРВӨН икон товч.

        Эхлэл ба төгсгөл нь зөвхөн `lg`-ээс дээш харагдана: жижиг дэлгэц
        дээр дөрвөн товч зай эзэлдэг ба хуруугаар дарахад андуурахад
        амархан. Тэдгээр нь хэрэгцээтэй боловч ЗААВАЛ биш үйлдэл.
      */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-muted-foreground hidden flex-1 text-sm lg:block">
            Нийт <span className="font-medium tabular-nums">{data.total}</span>{' '}
            бичлэг
            {loading && <Loader2 className="ml-2 inline size-3 animate-spin" />}
          </p>
          <div className="flex w-full items-center gap-4 lg:w-fit lg:gap-6">
            {/*
              Хуудсан дахь мөрийн тоо.

              ⚠ Хэмжээ солиход ЭХНИЙ хуудас руу. 7-р хуудсан дээр
              байгаад 200 болговол тэр хуудас огт байхгүй болж хоосон
              хүснэгт гарна.
            */}
            {pageSize !== undefined && onPageSizeChange && (
              <label className="text-muted-foreground hidden items-center gap-2 text-sm sm:flex">
                <span className="hidden lg:inline">Мөр</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    onPageSizeChange(Number(e.target.value));
                    onPageChange(1);
                  }}
                  className="border-input bg-background h-8 rounded-md border px-2 text-sm tabular-nums"
                  aria-label="Хуудсан дахь мөрийн тоо"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex w-fit items-center justify-center text-sm font-medium tabular-nums">
              {data.page} / {Math.max(1, data.totalPages)} хуудас
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                disabled={data.page <= 1 || loading}
                onClick={() => onPageChange(1)}
              >
                <span className="sr-only">Эхний хуудас</span>
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={data.page <= 1 || loading}
                onClick={() => onPageChange(data.page - 1)}
              >
                <span className="sr-only">Өмнөх хуудас</span>
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={data.page >= data.totalPages || loading}
                onClick={() => onPageChange(data.page + 1)}
              >
                <span className="sr-only">Дараах хуудас</span>
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden size-8 lg:flex"
                disabled={data.page >= data.totalPages || loading}
                onClick={() => onPageChange(data.totalPages)}
              >
                <span className="sr-only">Сүүлийн хуудас</span>
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
