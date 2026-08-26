import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Дэлгэц гар утасны хэмжээтэй эсэх.
 *
 * shadcn-ий эх хувилбар нь `useEffect` дотор `setState` дууддаг бөгөөд энэ
 * төслийн `react-hooks/set-state-in-effect` дүрэмд нийцэхгүй. Мөн тэр нь
 * эхний render-т `undefined` буцаадаг тул нэмэлт render үүсгэдэг.
 *
 * `useSyncExternalStore` нь сервер болон клиентийн утгыг ТУСДАА авдаг тул
 * hydration зөрчилгүй бөгөөд effect огт шаардлагагүй.
 */
const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(cb: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // Сервер дээр ширээний хувилбарыг сонгоно — эхний render тогтвортой.
    () => false,
  );
}
