'use client';

import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface RecordField {
  label: string;
  value: ReactNode;
}

/**
 * Нэг бичлэгийн дэлгэрэнгүй — НЭР/УТГА хосуудаар.
 *
 * ★ ЯАГААД ДАХИН ТАТАХГҮЙ ВЭ
 *
 * Худалдан авалт, шүүгээний түрээсэнд ТУСДАА `GET /:id` endpoint
 * байхгүй. Гэхдээ хүснэгтийн мөр нь харуулах бүх утгыг аль хэдийн
 * агуулж байгаа — зөвхөн өргөн багтахгүй тул нуугдсан байдаг
 * (`hideOnMobile`, богиносгосон бичвэр). Тиймээс ачаалагдсан мөрийг
 * шууд дэлгэнэ: сервер рүү нэмэлт хүсэлт ч явахгүй, хүлээлт ч байхгүй.
 *
 * Хэрэв хожим дэлгэрэнгүй endpoint гарвал энэ цонхыг ӨӨРЧЛӨХГҮЙГЭЭР
 * түүний өгөгдлийг дамжуулж болно.
 */
export function RecordDialog({
  open,
  onClose,
  title,
  fields,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: RecordField[];
  footer?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="divide-border divide-y">
          {fields.map((f) => (
            <div
              key={f.label}
              className="flex items-baseline justify-between gap-4 py-1.5"
            >
              <span className="text-muted-foreground shrink-0 text-xs">
                {f.label}
              </span>
              {/* Утга нь урт байвал мөр таслана — хэвтээ гүйлт үүсгэхгүй. */}
              <span className="min-w-0 text-right text-sm break-words">
                {f.value}
              </span>
            </div>
          ))}
        </div>
        {footer}
      </DialogContent>
    </Dialog>
  );
}
