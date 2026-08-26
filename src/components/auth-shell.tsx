'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * Нэвтрэх, нууц үг сэргээх, нууц үг солих дэлгэцийн НЭГДСЭН бүрхүүл.
 *
 * Гурван дэлгэц ижил бүтэцтэй байх нь зөвхөн гоо сайхны асуудал биш:
 * хэрэглэгч нэгээс нөгөө рүү шилжихэд байрлал өөрчлөгдөхгүй тул «өөр
 * систем рүү оров уу» гэсэн эргэлзээ төрөхгүй.
 *
 * Зүүн тал жижиг дэлгэц дээр ОГТ харагдахгүй — утсан дээр форм бүтэн
 * дэлгэцийг эзэлсэн нь дээр.
 */
export function AuthShell({
  children,
  showBrandPanel = true,
}: {
  children: ReactNode;
  showBrandPanel?: boolean;
}) {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {showBrandPanel && (
        <div className="bg-foreground text-background relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
          <BrandPattern />

          {/* Бүтэн лого — брэндийн хэсэг үргэлж ХАРАНХУЙ тул цагаан
              бичвэртэй хувилбар. */}
          <Image
            src="/brand/wordmark-light.png"
            alt="WinFit Fitness"
            width={395}
            height={96}
            className="relative h-9 w-auto"
            priority
          />

          <div className="relative max-w-md">
            <h2 className="text-4xl leading-tight font-semibold">
              Фитнесийн удирдлагын
              <br />
              нэгдсэн систем
            </h2>
            <p className="text-background/70 mt-4 text-base">
              Гишүүнчлэл, нэвтрэлт, төлбөр, шүүгээ — бүгд нэг дороос. Гишүүд
              эрхээ Apple болон Google Wallet картаасаа шууд харна.
            </p>
          </div>

          <div className="text-background/60 relative flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span>Hikvision царай таних</span>
            <span aria-hidden>·</span>
            <span>Apple / Google Wallet</span>
            <span aria-hidden>·</span>
            <span>Bonum төлбөр</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center p-6 lg:p-10">
        {children}
      </div>
    </main>
  );
}

/**
 * Дэвсгэрийн хээ — CSS-ээр бүтнээрээ, ЗУРАГ АЧААЛАХГҮЙ.
 *
 * Гурван давхарга:
 *   1. Тодрох цэгэн тор — нарийн бүтэц өгнө
 *   2. Диагональ туяа — хөдөлгөөний мэдрэмж (фитнес)
 *   3. Радиаль гэрэлтэлт — төвийг тодотгож, ирмэг рүү бүдгэрнэ
 *
 * `mask-image` нь хээг ирмэг рүү аажим арилгана — тэгш хэмтэй тор нь
 * хайрцгийн ирмэг дээр огцом тасрахаас сэргийлнэ.
 */
function BrandPattern() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Цэгэн тор */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage:
            'radial-gradient(ellipse 85% 75% at 50% 45%, black 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 85% 75% at 50% 45%, black 40%, transparent 100%)',
        }}
      />
      {/* Диагональ туяа */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(115deg, currentColor 0 1px, transparent 1px 64px)',
          maskImage:
            'linear-gradient(200deg, black 0%, transparent 65%)',
          WebkitMaskImage:
            'linear-gradient(200deg, black 0%, transparent 65%)',
        }}
      />
      {/* Зөөлөн гэрэлтэлт */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 20% 15%, rgb(255 255 255 / 0.07), transparent 70%)',
        }}
      />
    </div>
  );
}
