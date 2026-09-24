/** Йогийн дэлгэцүүдэд нийтлэг төрөл, туслахууд. */

export interface YogaCourse {
  id: string;
  name: string;
  instructor: string | null;
  startsOn: string;
  endsOn: string;
  /** 0 = Ням … 6 = Бямба. */
  weekdays: number[];
  startTime: string;
  durationMin: number;
  capacity: number | null;
  price: number;
  note: string | null;
  archivedAt: string | null;
  state: 'upcoming' | 'active' | 'finished';
  sessions: number;
  nextOn: string | null;
  enrolled: number;
  due: number;
  paid: number;
  owed: number;
}

export interface YogaEnrollment {
  id: string;
  memberId: string | null;
  name: string;
  phone: string | null;
  amountDue: number;
  amountPaid: number;
  owed: number;
  payment: 'paid' | 'partial' | 'unpaid';
  attended: number;
  lastOn: string | null;
  note: string | null;
  createdAt: string;
}

/** ⚠ Индекс нь `getDay()`-тай ижил — 0 = Ням. */
export const WEEKDAY = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
export const WEEKDAY_FULL = [
  'Ням',
  'Даваа',
  'Мягмар',
  'Лхагва',
  'Пүрэв',
  'Баасан',
  'Бямба',
];

export const COURSE_STATE: Record<
  YogaCourse['state'],
  { label: string; tone: string }
> = {
  upcoming: {
    label: 'Эхлээгүй',
    tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  active: {
    label: 'Явагдаж буй',
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  finished: {
    label: 'Хугацаа дууссан',
    tone: 'bg-muted text-muted-foreground',
  },
};

export const PAYMENT_STATE: Record<
  YogaEnrollment['payment'],
  { label: string; tone: string }
> = {
  paid: {
    label: 'Төлсөн',
    tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  partial: {
    label: 'Үлдэгдэлтэй',
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  unpaid: {
    label: 'Төлөөгүй',
    tone: 'bg-destructive/10 text-destructive',
  },
};

/** `19:00:00` → `19:00` */
export function hhmm(t: string): string {
  return t.slice(0, 5);
}
