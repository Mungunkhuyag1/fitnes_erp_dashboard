'use client';

import { TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Уншуулалтын үр дүн.
 *
 * ★ ХОЁР ӨӨР БАРИМТЫГ ЯЛГАНА
 *
 * `granted` — ТЕРМИНАЛ хаалга нээсэн үү. Төхөөрөмж өөрийн хүчинтэй
 *   хугацаагаар шийддэг, WinFit-ээс хамаарахгүй.
 * `reason`  — WinFit гишүүнчлэлийг ЯМАР гэж үзэж байгаа
 *   (`access.service.decide()`).
 *
 * ⚠ Урьд нь нэг тэмдэгт хольж харуулдаг байв: өнгө нь `granted`-аас,
 * бичвэр нь `reason`-оос. Тэгэхээр «Хугацаа дууссан» гэсэн бичвэр
 * НОГООН өнгөтэй гарч, ажилтан юу болсныг ойлгохгүй байв.
 *
 * ★ ГУРАВ ДАХЬ ТӨЛӨВ — ЗӨРҮҮ
 *
 * Терминал нэвтрүүлсэн ч WinFit «дууссан» гэж үзэж байвал тэр нь
 * АЛДАА БИШ, харин хоёр систем зөрсөн гэсэн үг: терминал дээрх
 * хугацаа шинэчлэгдээгүй эсвэл WinFit дээр гараар өөрчилсөн. Энэ нь
 * нуух биш, ХАРУУЛАХ ёстой зүйл — тиймээс шаргал өнгө + анхааруулга.
 */
export function AccessResult({
  granted,
  reason,
  reasonLabel,
  className,
}: {
  granted: boolean;
  /** `ok`, `expired`, `suspended`, `no_match`, `unknown_member`… */
  reason: string;
  reasonLabel: string;
  className?: string;
}) {
  const mismatch = granted && reason !== 'ok';

  return (
    <span className={cn('inline-flex flex-col items-start gap-0.5', className)}>
      <Badge
        variant="outline"
        className={cn(
          'font-normal',
          !granted
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : mismatch
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        )}
      >
        {mismatch && <TriangleAlert className="mr-1 size-3" />}
        {granted ? 'Зөвшөөрөв' : reasonLabel}
      </Badge>

      {/*
        Зөрүүтэй үед WinFit-ийн үзэл БАГА ҮСГЭЭР доор. Зөвшөөрсөн ба
        шалтгаан нь `ok` бол нэмэлт мөр хэрэггүй — давхардал болно.
      */}
      {mismatch && (
        <span className="text-muted-foreground text-[11px] leading-none">
          WinFit: {reasonLabel}
        </span>
      )}
    </span>
  );
}
