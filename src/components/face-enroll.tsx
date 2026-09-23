'use client';

import { CheckCircle2, Loader2, ScanFace, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';

/**
 * Терминал дээр царай уншуулах — WinFit-ээс эхлүүлнэ.
 *
 * ★ ЯМАР АСУУДЛЫГ ШИЙДЭЖ БАЙНА ВЭ
 *
 * Шинэ гишүүнийг вэбээс бүртгэсний дараа царайг нь ТЕРМИНАЛЫН ДЭЛГЭЦЭЭС
 * гараар бүртгэх ёстой байв: админ ПИН оруулах → цэс → хүнийг дугаараар
 * нь олох → уншуулах. Ресепшн ачаалалтай үед энэ алхам мартагдаж,
 * гишүүн маргааш хаалган дээр зогсдог.
 *
 * Одоо: нэг товч → терминал камераа асаана → гишүүн зогсоно → бүртгэгдэнэ.
 *
 * ★ ЭНЭ НЬ УДААН ҮЙЛДЭЛ
 *
 * Хүсэлт нь терминал царай ОЛТОЛ хариу буцаадаггүй (60 секунд хүртэл).
 * Тиймээс энгийн товч хангалтгүй: юу болж байгааг, хүн хаана зогсохыг
 * харуулсан цонх ЗААВАЛ хэрэгтэй. Эс бөгөөс ажилтан «гацлаа» гэж бодож
 * дахин дарж, хоёр дахь оролдлого эхнийхээ тасална.
 */

type Phase = 'waiting' | 'done' | 'error';

export function FaceEnrollButton({
  memberId,
  name,
  synced,
  onDone,
  variant = 'default',
  size,
  label = 'Царай уншуулах',
}: {
  memberId: string;
  name: string;
  /**
   * Гишүүн терминал руу бичигдсэн эсэх (`hikSyncedAt`).
   *
   * ⚠ Царай нь `employeeNo`-д холбогддог: терминал дээр хэрэглэгч
   * байхгүй бол бичих ГАЗАР байхгүй. Товчийг идэвхгүй болгож
   * шалтгааныг нь хэлэх нь 60 секунд хүлээгээд алдаа авахаас дээр.
   */
  synced: boolean;
  onDone: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default';
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setOpen(true);
    setPhase('waiting');
    setError(null);
    try {
      await api.post(`/members/${memberId}/face`);
      setPhase('done');
      toast.success('Царай бүртгэгдлээ', { description: name });
      onDone();
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Алдаа гарлаа');
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={start}
        disabled={!synced}
        title={
          synced
            ? undefined
            : 'Гишүүн терминал руу бичигдэхийг хүлээж байна'
        }
      >
        <ScanFace className="size-4" />
        {label}
      </Button>

      <Dialog
        open={open}
        /*
          ⚠ Хүлээж байхад ХААГДАХГҮЙ. Хүсэлт сервер дээр үргэлжилж
          байгаа бөгөөд цонх хаагдвал ажилтан юу болсныг мэдэхгүй
          үлдэж, дахин дарна — терминал дээр хоёр барилт зэрэг явна.
        */
        onOpenChange={(v) => {
          if (!v && phase !== 'waiting') setOpen(false);
        }}
      >
        <DialogContent showCloseButton={phase !== 'waiting'}>
          {phase === 'waiting' && (
            <>
              <DialogHeader>
                <DialogTitle>Терминал царай хайж байна</DialogTitle>
                <DialogDescription>
                  {name} терминалын дэлгэц рүү харж, 30–50 см зайд зогсоно уу.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center gap-3 py-6">
                <span className="bg-primary/10 text-primary flex size-20 items-center justify-center rounded-full">
                  <ScanFace className="size-9 animate-pulse" />
                </span>
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Loader2 className="size-3.5 animate-spin" />
                  Хүлээж байна… 1 минут хүртэл
                </span>
              </div>

              <p className="text-muted-foreground bg-muted/50 rounded-md px-3 py-2 text-[11px] leading-relaxed">
                Энэ хооронд терминал дээр өөр хүн уншуулахгүй байх нь чухал —
                камер нэг бөгөөд эхэлж ирсэн царай бүртгэгдэнэ.
              </p>
            </>
          )}

          {phase === 'done' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                  Царай бүртгэгдлээ
                </DialogTitle>
                <DialogDescription>
                  {name} одооноос хаалгаар царайгаараа нэвтэрнэ.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Болсон</Button>
              </DialogFooter>
            </>
          )}

          {phase === 'error' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TriangleAlert className="text-destructive size-5" />
                  Бүртгэгдсэнгүй
                </DialogTitle>
                <DialogDescription>{error}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Хаах
                </Button>
                <Button onClick={start}>Дахин оролдох</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * «Царай бүртгүүлээгүй» сануулга — гишүүний дэлгэц дээр.
 *
 * Утасгүй гишүүний сануулгатай ижил хэлбэр: асуудал нь дээд талд,
 * засах товч нь ХАЖУУД НЬ. Ажилтан дэлгэц гүйлгэж хайх шаардлагагүй.
 *
 * ⚠ Өнгө нь УЛААН БИШ. Царай бүртгүүлээгүй гишүүн нь алдаа биш, зүгээр
 * л дараагийн алхам хүлээж байгаа хүн. Улаан сануулга өдөр бүр
 * харагдвал жинхэнэ улаан сануулгыг хүн харахаа болино.
 */
export function FaceEnrollBanner({
  memberId,
  name,
  synced,
  syncFailed,
  onDone,
}: {
  memberId: string;
  name: string;
  synced: boolean;
  /**
   * Терминал руу бичих оролдлого УНАСАН уу (`hikSyncError`).
   *
   * ⚠ Үүнгүйгээр энэ сануулга өөртэйгөө зөрчилддөг: дээр нь «Терминал
   * руу бичигдээгүй» гэсэн улаан анхааруулга гарч байхад энэ нь
   * «хэдхэн секундын дараа дахин үзнэ үү» гэж хэлэх ба хүлээлт нь
   * ХЭЗЭЭ Ч дуусахгүй (`DEVICE_WRITES=off` үед бичилт огт явахгүй).
   */
  syncFailed: boolean;
  onDone: () => void;
}) {
  // Бичигдэхийг хүлээж байгаа — унасан нь хүлээлт биш.
  const waiting = !synced && !syncFailed;

  /*
   * ★ ХҮЛЭЭХ ХООРОНД Л ӨӨРӨӨ ШИНЭЧЛЭНЭ
   *
   * Вэбээс бүртгэсэн гишүүн терминал руу outbox-оор бичигддэг — ойролцоогоор
   * 15 секунд. Тэр хүртэл товч идэвхгүй. Ажилтан бүртгэж дуусаад ШУУД энэ
   * дэлгэц дээр ирдэг тул яг тэр агшинд идэвхгүй товч л харагдана.
   *
   * Гараар F5 дарах шаардлагатай болгох нь «ажиллахгүй байна» гэсэн ойлголт
   * төрүүлнэ. Тиймээс бичигдэх хүртэл 4 секунд тутам өөрөө шалгана.
   *
   * ⚠ Бичигдмэгц ЗОГСОНО. Бичилт УНАСАН үед ч зогсоно — эс бөгөөс
   * дэлгэц нээлттэй байх туршид 4 секунд тутам дэмий хүсэлт явуулна.
   * Царай бүртгэгдвэл энэ бүрдэл бүхэлдээ алга болно.
   */
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(onDone, 4_000);
    return () => clearInterval(t);
  }, [waiting, onDone]);

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-sky-500/30 bg-sky-500/8 px-4 py-3">
      <ScanFace className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Царай бүртгүүлээгүй</p>
        <p className="text-muted-foreground text-xs">
          {synced
            ? 'Гишүүнийг терминалын өмнө дуудаад товчийг дарна уу — уншуулалт ' +
              'тэндээс эхэлнэ.'
            : syncFailed
              ? 'Гишүүн терминал дээр үүсээгүй тул царай бүртгэх газар алга. ' +
                'Эхлээд доорх синк алдааг засна уу.'
              : 'Гишүүн терминал руу бичигдэхийг хүлээж байна…'}
        </p>
      </div>
      <FaceEnrollButton
        memberId={memberId}
        name={name}
        synced={synced}
        onDone={onDone}
        size="sm"
        variant="outline"
      />
    </div>
  );
}
