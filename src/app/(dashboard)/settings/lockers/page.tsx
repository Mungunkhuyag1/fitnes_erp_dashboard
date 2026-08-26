'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { GENDER_LABEL, type Gender } from '@/components/gender-picker';
import { SettingsSection } from '@/components/settings-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { money } from '@/lib/format';

export default function LockerSettings() {
  const [newZone, setNewZone] = useState('');

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Хувцас солих өрөө"
        description="Эрэгтэй/эмэгтэй өрөөний дугаарлалт тусдаа тул өрөө бүрийг заавал бүртгэнэ"
        keys={['locker_zones', 'locker_zone_by_gender']}
      >
        {(form, set) => (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {form.locker_zones.map((z) => (
                  <span
                    key={z}
                    className="bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm"
                  >
                    {z}
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          'locker_zones',
                          form.locker_zones.filter((x) => x !== z),
                        )
                      }
                      aria-label={`${z} өрөөг хасах`}
                      className="hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="Шинэ өрөө (жиш. 2 давхар)"
                  className="max-w-56"
                />
                <Button
                  variant="outline"
                  disabled={
                    !newZone.trim() || form.locker_zones.includes(newZone.trim())
                  }
                  onClick={() => {
                    set('locker_zones', [...form.locker_zones, newZone.trim()]);
                    setNewZone('');
                  }}
                >
                  <Plus className="size-4" />
                  Нэмэх
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Өрөө хасахад тэнд бүртгэгдсэн шүүгээ УСТАХГҮЙ — зөвхөн шинээр
                олгох формд харагдахаа болино.
              </p>
            </div>

            <div className="space-y-3 border-t pt-5">
              <Label>Хүйс → өрөө</Label>
              {(['male', 'female'] as Gender[]).map((g) => (
                <div key={g} className="flex flex-wrap items-center gap-2">
                  <span className="w-20 text-sm">{GENDER_LABEL[g]}</span>
                  {form.locker_zones.map((z) => (
                    <Button
                      key={z}
                      size="sm"
                      variant={
                        form.locker_zone_by_gender[g] === z ? 'default' : 'outline'
                      }
                      onClick={() =>
                        set('locker_zone_by_gender', {
                          ...form.locker_zone_by_gender,
                          [g]: form.locker_zone_by_gender[g] === z ? '' : z,
                        })
                      }
                    >
                      {z}
                    </Button>
                  ))}
                </div>
              ))}
              <p className="text-muted-foreground text-xs">
                Гишүүн сүүлд ашигласан өрөөтэй бол ТЭР нь давуу эрхтэй — хүйсийг
                зөвхөн анх удаа ирсэн хүнд ашиглана.
              </p>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Түрээсийн үнэ" keys={['locker_price_per_month']}>
        {(form, set) => (
          <div className="max-w-xs space-y-2">
            <Label htmlFor="lprice">Санал болгох үнэ (30 хоног)</Label>
            <Input
              id="lprice"
              inputMode="numeric"
              value={String(form.locker_price_per_month)}
              onChange={(e) =>
                set(
                  'locker_price_per_month',
                  Number(e.target.value.replace(/\D/g, '')) || 0,
                )
              }
              className="max-w-40"
            />
            <p className="text-muted-foreground text-xs">
              {money(form.locker_price_per_month)} — ажилтан олгох үед дүнг
              өөрчилж болно
            </p>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
