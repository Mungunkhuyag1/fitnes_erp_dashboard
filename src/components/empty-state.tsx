'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Хоосон хүснэгтийн төлөв.
 *
 * ЯАГААД ГАНЦ МӨР ТЕКСТ ХАНГАЛТГҮЙ ВЭ: «Нэвтрэлт алга» гэдэг нь ажилтанд
 * ЮУ БОЛСОНЫГ хэлдэг ч ДАРААГИЙН АЛХМЫГ хэлдэггүй. Шүүлтүүр хэт нарийн
 * тавьсан үү, эсвэл үнэхээр өгөгдөл алга юу — ялгаа нь чухал. Тиймээс
 * гарчиг (юу болсон), зөвлөмж (яагаад), үйлдэл (яах вэ) гэсэн гурван
 * хэсэгтэй.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 py-6">
      <div className="bg-muted/60 text-muted-foreground rounded-full p-3">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {hint && (
        <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
