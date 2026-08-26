'use client';

import { SettingsSection } from '@/components/settings-form';
import { Checkbox } from '@/components/ui/checkbox';

export default function StaffSettings() {
  return (
    <SettingsSection
      title="Ажилтны эрх"
      description="Мөнгөтэй холбоотой үйлдлийг хэн хийж болох вэ"
      keys={['allow_reception_extend']}
    >
      {(form, set) => (
        <label className="flex max-w-2xl cursor-pointer items-start gap-3">
          <Checkbox
            checked={form.allow_reception_extend}
            onCheckedChange={(v) => set('allow_reception_extend', v === true)}
          />
          <span>
            <span className="block text-sm font-medium">
              Ресепшн бэлнээр эрх сунгаж болно
            </span>
            <span className="text-muted-foreground block text-xs">
              Унтраалттай бол зөвхөн менежер сунгана. Аль ч тохиолдолд үйлдэл
              аудитад бичигдэнэ.
            </span>
          </span>
        </label>
      )}
    </SettingsSection>
  );
}
