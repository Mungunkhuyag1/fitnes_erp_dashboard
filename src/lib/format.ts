/** Дэлгэц дээр харагдах формат — бүх газарт нэг ижил. */

const TZ = 'Asia/Ulaanbaatar';

/**
 * Мөнгөн дүн.
 *
 * `₮` (U+20AE)-ийн өмнө НАРИЙН ЗАЙ (U+2009) тавина: моно фонтод энэ тэмдэгт
 * өмнөх цифртэйгээ давхцаж уншигдахгүй болдог.
 */
export function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  // Мянгатыг таслалаар — `en-US` нь бүх браузерт байдаг.
  return `${value.toLocaleString('en-US')}\u2009₮`;
}

/**
 * Огнооны хэсгүүдийг заасан цагийн бүсээр авна.
 *
 * `mn-MN` локалыг браузер бүр дэмждэггүй (en-US руу унаж `01/31/2027` гэж
 * америк дараалалтай болно). Тиймээс локалд ТҮШИГЛЭХГҮЙ — хэсгүүдийг өөрсдөө
 * авч `YYYY-MM-DD` хэлбэрээр угсарна.
 */
function parts(value: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return Object.fromEntries(
    fmt.formatToParts(value).map((p) => [p.type, p.value]),
  );
}

/** `2027-01-31` */
export function date(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const p = parts(new Date(value));
  return `${p.year}-${p.month}-${p.day}`;
}

/** `01-31 14:22` — хүснэгтэд багтахуйц. */
export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const p = parts(new Date(value));
  return `${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/** `14:22` */
export function time(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const p = parts(new Date(value));
  return `${p.hour}:${p.minute}`;
}

/** «3 хоногийн өмнө», «Өнөөдөр 14:22» — ирцийн урсгалд. */
export function relative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return 'Дөнгөж сая';
  if (diffMin < 60) return `${diffMin} мин`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} цаг`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `${diffD} хоног`;
  return date(d);
}

export function phone(value: string | null | undefined): string {
  if (!value) return '—';
  return value.length === 8 ? `${value.slice(0, 4)}-${value.slice(4)}` : value;
}

/** Үлдсэн хоногийг өнгөний ангилалтай нь буцаана. */
export function daysLeftTone(days: number | null): 'ok' | 'warn' | 'danger' | 'none' {
  if (days === null) return 'none';
  if (days < 0) return 'danger';
  if (days <= 7) return 'warn';
  return 'ok';
}

export const MEMBER_STATUS: Record<string, { label: string; tone: string }> = {
  lead: { label: 'Шинэ', tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-400' },
  active: { label: 'Идэвхтэй', tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' },
  expired: { label: 'Хугацаа дууссан', tone: 'bg-amber-500/12 text-amber-600 dark:text-amber-400' },
  suspended: { label: 'Түр зогссон', tone: 'bg-orange-500/12 text-orange-600 dark:text-orange-400' },
  cancelled: { label: 'Цуцлагдсан', tone: 'bg-muted text-muted-foreground' },
};

export const SOURCE_LABEL: Record<string, string> = {
  cash: 'Бэлэн',
  bonum: 'Онлайн',
  manual: 'Гараар',
};
