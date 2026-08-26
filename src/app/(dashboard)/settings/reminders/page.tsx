'use client';

import { SettingsSection } from '@/components/settings-form';
import { Button } from '@/components/ui/button';

const MILESTONES = ['T-14', 'T-7', 'T-3', 'T-1', 'T0'];

export default function ReminderSettings() {
  return (
    <SettingsSection
      title="Сануулга"
      description="Эрх дуусахаас өмнө Wallet карт руу мэдэгдэл илгээх цэгүүд. Өдөр бүр 09:00 цагт шалгана."
      keys={['reminder_milestones']}
    >
      {(form, set) => (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {MILESTONES.map((m) => {
              const on = form.reminder_milestones.includes(m);
              return (
                <Button
                  key={m}
                  size="sm"
                  variant={on ? 'default' : 'outline'}
                  onClick={() =>
                    set(
                      'reminder_milestones',
                      on
                        ? form.reminder_milestones.filter((x) => x !== m)
                        : [...form.reminder_milestones, m],
                    )
                  }
                >
                  {m === 'T0' ? 'Дуусах өдөр' : `${m.slice(2)} хоногийн өмнө`}
                </Button>
              );
            })}
          </div>
          <p className="text-muted-foreground max-w-2xl text-xs">
            ⚠ Картаа Wallet-д нэмээгүй гишүүнд мэдэгдэл ХҮРЭХГҮЙ. Тэднийг
            Гишүүд хуудасны «Wallet-д нэмээгүй» шүүлтүүрээр олж залгана.
          </p>
        </div>
      )}
    </SettingsSection>
  );
}
