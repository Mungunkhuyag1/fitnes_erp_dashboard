'use client';

import { ImageOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Терминал дээрх зураг — ирцийн кадр, гишүүний царай.
 *
 * ★ ЯАГААД ЭНГИЙН `<img src>` БИШ ВЭ
 *
 * Зам нь терминалын ДОТООД хаяг бөгөөд digest нэвтрэлт шаарддаг. Мөн
 * WinFit-ийн токен нь `localStorage`-д байдаг тул `<img>` түүнийг
 * дамжуулж чадахгүй. Backend дамжуулагчаас fetch-ээр татаж, `blob:`
 * хаяг болгоно.
 *
 * ⚠ Зураг ОЛДОХГҮЙ байх нь ХЭВИЙН: терминалын санах ой дүүрэхэд хуучин
 * кадр дарагдана, stub горимд огт байхгүй. Тиймээс алдааг чанга
 * зарлахгүй — зүгээр л дүрс үзүүлнэ.
 */
export function TerminalImage({
  path,
  alt,
  className,
  emptyText,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  /**
   * Зам огт байхгүй үед харуулах бичвэр.
   *
   * Өгөөгүй бол ЮУ Ч гарахгүй (хүснэгтийн мөр бүрд хоосон хайрцаг
   * гарвал нүд ядрана). Гишүүний карт шиг ганц газарт байрлах үед
   * харин ч эсрэгээр: хэсэг нь бүрмөсөн алга болвол «зураг байдаг
   * юм болов уу» гэдэг нь ойлгогдохгүй.
   */
  emptyText?: string;
}) {
  /*
   * ⚠ Үр дүнг ЗАМТАЙГАА ХАМТ хадгална. Тусдаа `url`/`failed` төлөв
   * баривал зам солигдоход тэднийг эффектийн биед цэвэрлэх шаардлага
   * гарч, нэмэлт дүрслэл (cascading render) үүсгэнэ. Зам таарахгүй
   * бол хуучин үр дүнг зүгээр л үл тоомсорлоно.
   */
  const [shot, setShot] = useState<{
    path: string;
    url: string | null;
  } | null>(null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!path) return;
    let revoke: string | null = null;
    const ctrl = new AbortController();

    api
      .blob(`/devices/image?path=${encodeURIComponent(path)}`, ctrl.signal)
      .then((u) => {
        revoke = u;
        setShot({ path, url: u });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setShot({ path, url: null });
      });

    return () => {
      ctrl.abort();
      // ⚠ `blob:` хаягийг суллахгүй бол хуудас нээлттэй байх хугацаанд
      // санах ойд зураг бүр хуримтлагдана.
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [path]);

  if (!path) {
    if (!emptyText) return null;
    return (
      <div
        className={cn(
          'text-muted-foreground flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed',
          className,
        )}
        title={alt}
      >
        <ImageOff className="size-4" />
        <span className="text-[10px] leading-none">{emptyText}</span>
      </div>
    );
  }

  const current = shot?.path === path ? shot : null;
  const url = current?.url ?? null;
  const failed = current !== null && current.url === null;

  /*
   * Ачаалагдсан зураг нь ТОВЧ болно: жижиг хайрцагт царай танихад
   * хэцүү, ирцийн кадраас хэн болохыг ялгах бүр ч хэцүү. Дарвал
   * бүтэн хэмжээгээр нээнэ.
   */
  const Frame = url ? 'button' : 'div';

  return (
    <>
    <Frame
      {...(url
        ? {
            type: 'button' as const,
            onClick: () => setZoom(true),
            'aria-label': `${alt} — томруулах`,
          }
        : {})}
      className={cn(
        'bg-muted text-muted-foreground flex items-center justify-center overflow-hidden rounded-lg',
        url && 'cursor-zoom-in transition-opacity hover:opacity-90',
        className,
      )}
      /* Татагдаагүй үед ЯАГААД гэдгийг хэлнэ — хоосон дүрс нь
         «зураг байхгүй» гэж ойлгогдож, маргаан шийдэхэд төөрөгдүүлнэ. */
      title={
        failed
          ? `${alt} — татагдсангүй. Терминал холбогдохгүй эсвэл зураг нь дарагдсан байна.`
          : alt
      }
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="size-full object-cover" />
      ) : failed ? (
        <ImageOff className="size-4" />
      ) : (
        <Loader2 className="size-4 animate-spin" />
      )}
    </Frame>

      {url && (
        <Dialog open={zoom} onOpenChange={setZoom}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{alt}</DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt}
              className="max-h-[70svh] w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
