'use client';

import { Download } from 'lucide-react';
import type { ReactNode } from 'react';
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
import { downloadCsv } from '@/lib/csv';

/**
 * График бүрийн бүрхүүл — гарчиг, тайлбар, CSV татах товч.
 *
 * CSV нь ХАРАГДАЖ БУЙ өгөгдлөөс гарна (сервер рүү дахин явахгүй): ажилтны
 * сонгосон хугацаа, шүүлтүүр яг тусна. Өгөгдөл ачаалагдаагүй эсвэл хоосон
 * бол товч идэвхгүй — хоосон файл татах нь төөрөгдүүлнэ.
 */
export function ChartCard({
  title,
  description,
  filename,
  headers,
  rows,
  loading,
  empty = 'Өгөгдөл алга',
  className,
  children,
}: {
  title: string;
  description?: string;
  filename: string;
  headers: string[];
  rows: unknown[][];
  loading?: boolean;
  empty?: string;
  className?: string;
  children: ReactNode;
}) {
  const has = rows.length > 0;
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <Button
            size="sm"
            variant="ghost"
            disabled={!has}
            onClick={() => downloadCsv(filename, headers, rows)}
            aria-label={`${title} — CSV татах`}
          >
            <Download className="size-3.5" />
            CSV
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56" />
        ) : has ? (
          children
        ) : (
          <p className="text-muted-foreground py-16 text-center text-sm">
            {empty}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
