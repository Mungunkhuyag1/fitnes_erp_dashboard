import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {/*
        ⚠ `flex-wrap`, `shrink-0` БИШ.

        `shrink-0` нь бүлгийг агуулгынхаа өргөнөөс доош буулгахгүй тул
        товч олон болмогц (Синк дэлгэц дээр 5) НЭГ мөрөнд багтахаа
        болиод хуудсыг БАРУУН ТИЙШ хална. Хэвтээ гүйлт үүсч, хажуугийн
        цэс, толгой хоёр зөрнө.

        Бүлэг дотроо мөр таслах нь товчийг шахахгүй — `Button` нь
        өөрийн доод өргөнтэй тул шинэ мөр рүү БҮТНЭЭРЭЭ бууна.
      */}
      {children && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
