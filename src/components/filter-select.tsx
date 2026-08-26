'use client';

import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FilterOption {
  /** Хоосон мөр = «бүгд» буюу шүүлтүүргүй. */
  value: string;
  label: string;
  /** Сонголтын өмнөх өнгөт цэг (төлөв илэрхийлэхэд). */
  dot?: string;
}

/**
 * Нэг талбарын шүүлтүүр — УНЖДАГ жагсаалт.
 *
 * ЯАГААД ТОВЧНЫ ЭГНЭЭ БИШ ВЭ:
 *
 * Өмнө нь сонголт бүр тусдаа товч байсан. Гурван талбарт 12 товч зэрэгцэж,
 * толгойн мөр хоёр эгнээ болж, аль нь идэвхтэйг ялгахад хэцүү байв. Мөн
 * шүүлтүүр нэмэх бүрд мөр уртсана.
 *
 * Унждаг жагсаалтад: талбар бүр НЭГ хяналт, сонгосон утга нь дээрээ
 * харагдана, шинэ сонголт нэмэхэд өргөн өөрчлөгдөхгүй.
 */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  placeholder: string;
  className?: string;
  icon?: ReactNode;
}) {
  const active = options.find((o) => o.value === value && o.value !== '');

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(String(v ?? ''))}
      items={options}
    >
      <SelectTrigger
        className={cn(
          // Өндрийг ГАРААР тавихгүй: `SelectTrigger` нь `data-[size=...]`
          // variant-аар өндрөө тогтоодог бөгөөд энгийн `h-9` түүнтэй
          // мөргөлдөж, талбар бүр өөр өндөртэй болдог байв.
          'w-auto min-w-36 gap-2',
          // Шүүлтүүр идэвхтэй эсэхийг ХҮРЭЭ + дэвсгэрээр ялгана — зөвхөн
          // текстээр ялгавал хурдан хараанд анзаарагдахгүй.
          active && 'border-primary/40 bg-primary/5',
          className,
        )}
      >
        {icon}
        {/*
          Сонгосон утгыг `SelectValue`-ийн children функцээр биш, ШУУД
          гаргана. Base UI нь тэр функцэд түүхий утгыг дамжуулдаг тул
          шошго/өнгийг өөрсдөө хайх шаардлагатай — тэгсэн ч ижил ажил.
          Ил бичих нь уншихад ойлгомжтой бөгөөд алдаа гарах магадлал бага.
        */}
        <SelectValue>
          {active ? (
            <span className="flex items-center gap-1.5">
              {active.dot && (
                <span
                  className={cn('size-1.5 shrink-0 rounded-full', active.dot)}
                />
              )}
              {active.label}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || 'all'} value={o.value}>
            <span className="flex items-center gap-2">
              {o.dot ? (
                <span className={cn('size-1.5 shrink-0 rounded-full', o.dot)} />
              ) : (
                o.value === '' && <span className="size-1.5 shrink-0" />
              )}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
