'use client';

import { CreditCard, Smartphone, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardStage = 'not_allowed' | 'no_card' | 'no_wallet' | 'active';

/**
 * Wallet картын явц.
 *
 * Гурван «дутуу» байдал нь ТЭС ӨӨР арга хэмжээ шаарддаг тул тус бүрд
 * ажилтны хийх зүйлийг ил бичнэ — зөвхөн төлөвийн нэр хангалтгүй.
 */
export const CARD_STAGE = {
  not_allowed: {
    label: 'Бүртгэгдээгүй',
    hint: 'Loopy руу дугаар нь хүрээгүй — гишүүн карт үүсгэж ЧАДАХГҮЙ. Тулгалт ажиллуулна уу.',
    icon: TriangleAlert,
    // Ганц үнэхээр АЛДААТАЙ байдал — тодруулна.
    tone: 'text-destructive bg-destructive/10 border-destructive/20',
    dot: 'bg-destructive',
  },
  no_card: {
    label: 'Карт үүсгээгүй',
    hint: 'Дугаар нь зөвшөөрөгдсөн. Гишүүнд enroll линк илгээнэ үү.',
    icon: CreditCard,
    tone: 'text-muted-foreground bg-muted border-transparent',
    dot: 'bg-muted-foreground/40',
  },
  no_wallet: {
    label: 'Wallet-д нэмээгүй',
    hint: 'Карт үүссэн ч утсандаа нэмээгүй — эрх дуусах МЭДЭГДЭЛ ХҮРЭХГҮЙ. Залгана уу.',
    icon: Smartphone,
    tone: 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  active: {
    label: 'Идэвхтэй',
    hint: 'Карт Wallet дээр байна — мэдэгдэл хүрнэ.',
    icon: Smartphone,
    tone: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
} as const satisfies Record<
  CardStage,
  {
    label: string;
    hint: string;
    icon: typeof CreditCard;
    tone: string;
    dot: string;
  }
>;

/** Жагсаалтын нүдэнд — зай багатай тул зөвхөн цэг + нэр. */
export function CardStageDot({ stage }: { stage: CardStage }) {
  const s = CARD_STAGE[stage];
  return (
    <span
      title={s.hint}
      className="text-muted-foreground inline-flex items-center gap-1.5 text-xs whitespace-nowrap"
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

/** Гишүүний хуудсанд — тайлбартай бүтэн шошго. */
export function CardStageBadge({
  stage,
  className,
}: {
  stage: CardStage;
  className?: string;
}) {
  const s = CARD_STAGE[stage];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
        s.tone,
        className,
      )}
    >
      <Icon className="size-3.5" />
      {s.label}
    </span>
  );
}

/** «Юу хийх ёстой» гэдгийг ил бичнэ. */
export function CardStageHint({ stage }: { stage: CardStage }) {
  return (
    <span className="text-muted-foreground text-xs">{CARD_STAGE[stage].hint}</span>
  );
}
