'use client';

import { SettingsSection, type Settings } from '@/components/settings-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const MODES: {
  value: Settings['entry_charge_mode'];
  label: string;
  hint: string;
}[] = [
  {
    value: 'window',
    label: 'Давтан уншуулахад хасахгүй',
    hint:
      'Оролт хасагдсаны дараа тогтсон хугацааны дотор дахин царай уншуулбал ' +
      'шинэ оролт тооцохгүй (гарч орох, ус авах г.м.).',
  },
  {
    value: 'day',
    label: 'Өдөрт 1 оролт',
    hint: 'Нэг өдөрт хэдэн ч удаа орсон 1 л оролт хасагдана.',
  },
  {
    value: 'every',
    label: 'Уншуулалт бүр',
    hint:
      'Зөвшөөрөгдсөн уншуулалт бүрд 1 оролт хасагдана. (1 минутын дотор ' +
      'давхардсан уншуулалтыг терминалын давхар эвент гэж үзэж тоолохгүй.)',
  },
];

/**
 * Оролтын багцын тохиргоо — царай уншуулахад оролт ХЭРХЭН хасагдах.
 *
 * ⚠ Шийдвэр нь уншуулалт бүр дээр хадгалагддаг тул тохиргоо солиход
 * өмнөх хасалт дахин тоологдохгүй — зөвхөн цаашдынх нөлөөлнө.
 */
export default function EntrySettings() {
  return (
    <SettingsSection
      title="Оролтын багц"
      description="Оролтоор тоолдог багцтай гишүүн царай уншуулахад оролт хэрхэн хасагдах"
      keys={['entry_charge_mode', 'entry_rescan_minutes']}
    >
      {(form, set) => (
        <div className="max-w-xl space-y-5">
          <div className="space-y-2" role="radiogroup">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={form.entry_charge_mode === m.value}
                onClick={() => set('entry_charge_mode', m.value)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                  form.entry_charge_mode === m.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-accent/50',
                )}
              >
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="text-muted-foreground block text-xs">
                  {m.hint}
                </span>
              </button>
            ))}
          </div>

          {form.entry_charge_mode === 'window' && (
            <div className="space-y-2">
              <Label htmlFor="rescan">Давтан уншуулах хугацаа (минут)</Label>
              <Input
                id="rescan"
                inputMode="numeric"
                className="w-28"
                value={String(form.entry_rescan_minutes ?? '')}
                onChange={(e) =>
                  set(
                    'entry_rescan_minutes',
                    Math.min(1440, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)),
                  )
                }
              />
              <p className="text-muted-foreground text-xs">
                Жишээ нь 180 = оролт хасагдсанаас хойш 3 цагийн дотор дахин
                уншуулбал үнэгүй. Сүүлийн оролтоо ашигласан гишүүн ч энэ хугацаанд
                дахин орж чадна.
              </p>
            </div>
          )}

          <p className="text-muted-foreground bg-muted/50 rounded-md px-3 py-2 text-xs">
            Оролт дуусахад эрх терминал дээр автоматаар хаагдана. Терминал
            хаалтыг хүлээн авах хүртэлх хэдхэн секундэд нэг удаа илүү нэвтрэх
            боломжтой. Тохиргоо солиход өмнөх хасалтууд хөндөгдөхгүй.
          </p>
        </div>
      )}
    </SettingsSection>
  );
}
