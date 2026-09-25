'use client';

import { DoorOpen, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorToast } from '@/lib/errors';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DeviceBrief } from '@/components/terminal-quick-actions';

/**
 * ХААЛГА НЭЭХ — нүүр хуудасны ХАМГИЙН ДЭЭД мөр.
 *
 * ★ ЯАГААД ДООРООС ДЭЭР ЗӨӨВ
 *
 * Товч нь «Терминал» картын дотор, нүүр хуудасны хамгийн ДООД талд
 * байв. Гишүүн хаалганы гадаа зогсоод байхад ажилтан:
 *
 *   1. нүүр хуудсыг бүхэлд гүйлгэж доош хүрэх
 *   2. график, түлхүүрийн хүснэгт зэрэг БҮГД ачаалагдахыг хүлээх
 *   3. тэгээд л жижиг `size="sm"` товчийг олох
 *
 * Хаалга нээх нь ресепшний хамгийн ЯАРАЛТАЙ үйлдэл — хүн гадаа хүлээж
 * байна. Тиймээс гүйлгэлгүйгээр, хамгийн дээр, ТОМ товчоор.
 *
 * ⚠ Баталгаажуулах цонх ЗОРИУДААР байхгүй. Хаалга хэдэн секундын дараа
 * өөрөө хаагдах ба үйлдэл аудитад бичигдэнэ — нэмэлт алхам нь зөвхөн
 * яаралтай үед саад болно.
 *
 * ⚠ Терминал ОФЛАЙН байсан ч товчийг битгий хаа. `online` нь 5 минут
 * тутмын шалгалтын үр дүн тул 5 минут ХОЦРОГДСОН байж болно: заалны PC
 * сая асчихсан байхад товч «disabled» байвал ажилтан гарц хайна. Оронд
 * нь дарж үзээд, амжилтгүй бол тодорхой алдаа харуулна.
 */
export function DoorBar({ devices }: { devices: DeviceBrief[] }) {
  const { can } = useAuth();
  const [opening, setOpening] = useState<string | null>(null);

  // Эрхгүй хүнд хоосон мөр харуулах нь зай эзлэхээс өөр үүрэггүй.
  if (!can('manager') || devices.length === 0) return null;

  async function open(dev: DeviceBrief) {
    setOpening(dev.id);
    try {
      await api.post(`/devices/${dev.id}/open-door`, {});
      toast.success(`${dev.name} — хаалга нээгдлээ`, {
        description: 'Үйлдэл аудитад бичигдэв',
      });
    } catch (e) {
      errorToast(e, 'Хаалга нээгдсэнгүй');
    } finally {
      setOpening(null);
    }
  }

  return (
    // `flex-wrap` — хоёр ба түүнээс дээш терминалтай үед мөр тасална.
    <div className="flex flex-wrap items-center gap-3">
      {devices.map((dev) => (
        <Button
          key={dev.id}
          // ⚠ `lg` — гүйлгэлгүйгээр, хараад шууд дарах хэмжээ.
          size="lg"
          onClick={() => void open(dev)}
          disabled={opening === dev.id}
          className="flex-1 justify-start sm:flex-none"
        >
          {opening === dev.id ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <DoorOpen className="size-4" />
          )}
          Хаалга нээх
          {/*
            Терминал нэг л байвал нэрийг давтах нь дэмий — «Хаалга нээх»
            гэдэг нь аль хэдийн тодорхой. Хоёр байвал ЗААВАЛ хэрэгтэй.
          */}
          {devices.length > 1 && (
            <span className="text-primary-foreground/70 text-xs font-normal">
              {dev.name}
            </span>
          )}
        </Button>
      ))}

      {/*
        Төлөвийг товчны ХАЖУУД, тайван өнгөөр. Товчийг хаадаггүй тул энэ
        нь «дарвал бүтэхгүй байж магадгүй» гэсэн УРЬДЧИЛСАН мэдээлэл.
      */}
      {devices.some((d) => !d.online) && (
        <p className="text-muted-foreground text-xs">
          {devices
            .filter((d) => !d.online)
            .map((d) => `${d.name}: сүүлд ${relative(d.lastSeenAt)}`)
            .join(' · ')}
        </p>
      )}
      {devices.every((d) => d.online) && (
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span className={cn('size-2 rounded-full', 'bg-emerald-500')} />
          Терминал холбогдсон
        </span>
      )}
    </div>
  );
}
