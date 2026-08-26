'use client';

import { SettingsSection } from '@/components/settings-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function GeneralSettings() {
  return (
    <SettingsSection
      title="Ерөнхий"
      description="Байгууллагын үндсэн мэдээлэл"
      keys={['gym_name']}
    >
      {(form, set) => (
        <div className="max-w-md space-y-2">
          <Label htmlFor="gym">Фитнесийн нэр</Label>
          <Input
            id="gym"
            value={form.gym_name}
            onChange={(e) => set('gym_name', e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Wallet карт, төлбөрийн хуудсанд харагдана
          </p>
        </div>
      )}
    </SettingsSection>
  );
}
