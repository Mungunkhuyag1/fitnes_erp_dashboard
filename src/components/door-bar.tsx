'use client';

import { DoorOpen, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorToast } from '@/lib/errors';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DeviceBrief {
  id: string;
  name: string;
  online: boolean;
  lastSeenAt: string | null;
}

/**
 * ХААЛГА НЭЭХ — програмын ТОЛГОЙН мөрөнд.
 *
 * ★ ЯАГААД ТОЛГОЙД ВЭ
 *
 * Эхлээд «Терминал» картын дотор, нүүр хуудасны хамгийн ДООД талд байв.
 * Гишүүн хаалганы гадаа зогсоод байхад ажилтан бүтэн хуудсыг гүйлгэж,
 * график, хүснэгт ачаалагдахыг хүлээж, тэгээд жижиг товчийг олох
 * шаардлагатай байлаа.
 *
 * Дараа нь нүүрийн дээд мөрөнд гаргасан. Гэвч тэр ч хангалтгүй:
 * ажилтан ирцийн жагсаалт, гишүүний дэлгэц, йогийн анги дээр байхад
 * НҮҮР ЛҮҮ буцах шаардлагатай хэвээр байв. Хаалга нээх нь ресепшний
 * ХАМГИЙН яаралтай үйлдэл — «Гишүүн нэмэх»-тэй ижилхэн БҮХ дэлгэцээс
 * хүрдэг байх ёстой.
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
export function DoorBar() {
  const { can } = useAuth();
  const [opening, setOpening] = useState<string | null>(null);

  /*
   * ⚠ ХӨНГӨН endpoint (`/devices/brief`) — `/devices` нь entity-г
   * бүтнээр (хост, порт, хэрэглэгч) буцаадаг. Энэ бол БҮХ хуудсан
   * дээр амьдардаг бүрэлдэхүүн тул хамгийн бага өгөгдөл л зөв.
   *
   * 60 секунд — төлөвийн цэг хэт хоцрохгүй, гэхдээ backend нь
   * 5 минут тутам л шалгадаг тул илүү ойрхон татах нь дэмий.
   */
  const { data } = useApi<DeviceBrief[]>(
    can('manager') ? '/devices/brief' : null,
    { refreshMs: 60_000 },
  );

  const devices = data ?? [];
  // Эрхгүй хүн, эсвэл терминал тохируулаагүй бол толгойн зайг эзлэхгүй.
  if (!can('manager') || devices.length === 0) return null;

  const offline = devices.filter((d) => !d.online);

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
    <div className="flex items-center gap-1.5">
      {devices.map((dev) => (
        <Tooltip key={dev.id}>
          <TooltipTrigger
            render={
              <Button
                size="sm"
                variant="outline"
                onClick={() => void open(dev)}
                disabled={opening === dev.id}
                aria-label={`${dev.name} — хаалга нээх`}
              />
            }
          >
            {opening === dev.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <DoorOpen className="size-4" />
            )}
            {/*
              ⚠ Утсан дээр ЗӨВХӨН икон — толгойн мөрөнд «Гишүүн нэмэх»-
              тэй хамт хоёр бичвэртэй товч багтахгүй.
            */}
            <span className="hidden sm:inline">Хаалга нээх</span>
            {/*
              ТӨЛӨВИЙН ЦЭГ товчны ДОТОР — жижиг дэлгэцэд ганц үлддэг
              дохио. Энэ нь «дарвал ажиллах болов уу» гэдгийг УРЬДЧИЛАН
              хэлнэ; товчийг хаадаггүй.
            */}
            <span
              className={cn(
                'size-1.5 rounded-full',
                dev.online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
              )}
            />
          </TooltipTrigger>
          <TooltipContent>
            {dev.name} ·{' '}
            {dev.online
              ? 'терминал холбогдсон'
              : `сүүлд ${relative(dev.lastSeenAt)}`}
          </TooltipContent>
        </Tooltip>
      ))}

      {/*
        ⚠ БИЧВЭРЭЭР төлөв — зөвхөн ӨРГӨН дэлгэцэд (`lg`).
        Ресепшн терминал унтарсныг товч дарж байж мэдэх ёсгүй: хаалганы
        гадаа хүн зогсож байхад тэр нь хэдэн секундын алдагдал. Гэвч
        толгойн мөр нарийн тул жижиг дэлгэцэд цэг + tooltip хангалттай.
      */}
      <span className="text-muted-foreground hidden items-center gap-1.5 text-xs lg:flex">
        {offline.length === 0
          ? 'Терминал холбогдсон'
          : `Терминал унтарсан · сүүлд ${relative(offline[0].lastSeenAt)}`}
      </span>
    </div>
  );
}
