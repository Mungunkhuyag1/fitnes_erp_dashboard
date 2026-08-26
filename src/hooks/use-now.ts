'use client';

import { useSyncExternalStore } from 'react';

/**
 * Секунд тутам шинэчлэгддэг ОДООГИЙН цаг.
 *
 * ЯАГААД ЭНЭ ХЭРЭГТЭЙ ВЭ: `Date.now()`-ыг шууд render дотор дуудвал
 * `react-hooks/purity` дүрэм зөрчигдөнө — тэр функц дуудлага бүрд өөр утга
 * буцаадаг тул React-ийн хувьд «цэвэр биш». Мөн утга нь өөрөө шинэчлэгдэхгүй
 * тул тоолуур зогсоно.
 *
 * `useSyncExternalStore` нь гадаад эх сурвалжаас (энд — цаг) утга авах
 * ЗӨВ арга: React өөрөө захиалга, дахин зурахыг зохицуулна.
 *
 * Нэг таймер БҮХ хэрэглэгчид үйлчилнэ — 20 тоолуур байсан ч 20 таймер
 * үүсэхгүй.
 */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let snapshot = 0;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    timer = setInterval(() => {
      snapshot = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      // Эхний уншилтад таймер хараахан цохиогүй байж болно.
      if (!snapshot) snapshot = Date.now();
      return snapshot;
    },
    // Сервер дээр 0 — тоолуур зөвхөн клиент дээр утгатай.
    () => 0,
  );
}
