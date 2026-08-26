'use client';

import { Button } from '@/components/ui/button';

export type Gender = 'male' | 'female' | 'other';

export const GENDER_LABEL: Record<Gender, string> = {
  male: 'Эрэгтэй',
  female: 'Эмэгтэй',
  other: 'Бусад',
};

const OPTIONS: Gender[] = ['male', 'female', 'other'];

/**
 * Хүйс сонгох — унждаг жагсаалт биш, ТОВЧ.
 *
 * Ресепшн яаралтай ажилладаг: гурван сонголтод унждаг жагсаалт нь илүү
 * товшилт шаарддаг. Сонгосон утгыг дахин дарвал цуцална — заавал биш
 * талбар учир «буцаах» арга байх ёстой.
 */
export function GenderPicker({
  value,
  onChange,
  id,
}: {
  value: Gender | null;
  onChange: (v: Gender | null) => void;
  id?: string;
}) {
  return (
    <div id={id} className="flex flex-wrap gap-2">
      {OPTIONS.map((g) => (
        <Button
          key={g}
          type="button"
          size="sm"
          variant={value === g ? 'default' : 'outline'}
          aria-pressed={value === g}
          onClick={() => onChange(value === g ? null : g)}
        >
          {GENDER_LABEL[g]}
        </Button>
      ))}
    </div>
  );
}
