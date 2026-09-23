import { toast } from 'sonner';
import { ApiError } from '@/lib/api';

/**
 * Алдааг ажилтанд харуулах ГАНЦ цэг.
 *
 * ★ ЯАГААД ТУСДАА ТУСЛАХ ВЭ
 *
 * Дэлгэц бүр «алдаа бол мессежийг нь toast-оор харуул» гэсэн ижил
 * мөрийг давтдаг байв — 40 гаруй газар. Backend нь зарим алдаанд ЮУ
 * ХИЙХИЙГ зааж өгдөг нэмэлт мөр (`hint`) илгээдэг боловч тэр бүгд
 * хаягдаж байсан.
 *
 * Хамгийн чухал жишээ: терминалын тунел унахад
 *
 *     «Терминалтай холболт салсан байна — тунел ажиллахгүй байна.»
 *     + «Заалан дээрх компьютер асаалттай эсэхийг шалгана уу. Гишүүд
 *        хаалгаар ҮРГЭЛЖЛҮҮЛЭН орно.»
 *
 * Хоёр дахь мөр нь сандрахаас сэргийлнэ: ажилтан «хаалга зогссон уу»
 * гэж бодохоо больж, зөв газар шалгана.
 */
export function errorToast(e: unknown, fallback = 'Алдаа гарлаа'): void {
  const message = e instanceof Error ? e.message : fallback;
  const hint = e instanceof ApiError ? e.hint : undefined;

  toast.error(message, {
    description: hint,
    /*
     * Заавартай алдааг удаан харуулна: нэг мөр биш хоёр мөр уншина,
     * мөн ихэвчлэн ажилтны хийх зүйл дагалддаг.
     */
    duration: hint ? 8_000 : undefined,
  });
}

/** Холболт салсны улмаас унасан уу — дэлгэцэн дээр тусгайлан харуулах. */
export function isOffline(e: unknown): boolean {
  return e instanceof ApiError && e.code === 'DeviceUnreachable';
}
