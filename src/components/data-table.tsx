'use client';

import {
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

export interface Column<T> {
  key: string;
  header: ReactNode;
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
                {columns.map((c) => (
                  <TableHead
                    key={c.key}
                    className={cn(c.hideOnMobile && 'hidden md:table-cell', c.className)}
                  >
                    {c.header}
                  </TableHead>
                ))}
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
          <div className="flex w-full items-center gap-6 lg:w-fit">
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
