'use client';

import {
  DoorOpen,
  Loader2,
  PlugZap,
  RefreshCw,
  ScanFace,
  Stethoscope,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { LinkButton } from '@/components/link-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface DeviceBrief {
  id: string;
  name: string;
  online: boolean;
  lastSeenAt: string | null;
}

/**
 * Терминалын ӨДӨР ТУТМЫН үйлдлүүд.
 *
 * ★ ЯАГААД НҮҮР ХУУДСАНД ВЭ
 *
 * Ресепшний ажилтан өдөржин нүүр хуудсан дээр байдаг. Хаалга нээх нь
 * ялангуяа яаралтай хэрэгцээ: хүн гадаа зогсоод байхад «Терминал»
 * дэлгэц рүү шилжиж, хүснэгт ачаалагдахыг хүлээх нь урт. Урьд нь энэ
 * хэсэг зөвхөн «холбогдсон эсэх»-ийг харуулдаг байсан — мэдээлэл өгдөг
 * ч юу ч ХИЙЖ чаддаггүй байв.
 *
 * ⚠ Баталгаажуулах цонх ЗОРИУДААР байхгүй — «Терминал» дэлгэц дээрхтэй
 * ижил зан. Хаалга нээх нь буцаах боломжгүй үйлдэл БИШ (хэдэн секундын
 * дараа өөрөө хаагдана) бөгөөд аудитад бичигдэнэ. Нэмэлт алхам нь
 * яаралтай үед л саад болно.
 */
export function TerminalQuickActions({ devices }: { devices: DeviceBrief[] }) {
  const { can } = useAuth();
  const [opening, setOpening] = useState<string | null>(null);
  const [busy, setBusy] = useState<'ping' | 'events' | 'face' | null>(null);

  async function openDoor(id: string, name: string) {
    setOpening(id);
    try {
      await api.post(`/devices/${id}/open-door`, {});
      toast.success(`${name} — хаалга нээгдлээ`, {
        description: 'Үйлдэл аудитад бичигдэв',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setOpening(null);
    }
  }

  async function ping() {
    setBusy('ping');
    try {
      const r = await api.get<{ ok: boolean; detail?: string }>('/devices/ping');
      if (r.ok) toast.success('Терминалтай холбогдлоо');
      else toast.error('Холбогдсонгүй', { description: r.detail });
    } catch (e) {
      toast.error('Холбогдсонгүй', {
        description: e instanceof Error ? e.message : 'Алдаа',
      });
    } finally {
      setBusy(null);
    }
  }

  /**
   * Ирцийг ЯГ ОДОО нөхөж татах.
   *
   * Хуваарь нь 5 минут тутам өөрөө ажилладаг. Гэвч «сая уншуулсан хүн
   * жагсаалтад алга» гэдэг нь ресепшний хамгийн түгээмэл асуулт —
   * хүлээхийн оронд дарж болно.
   */
  async function pollEvents() {
    setBusy('events');
    try {
      const r = await api.post<{ fetched: number; ingested: number }>(
        '/sync/run/acs-events',
        {},
      );
      toast.success(
        r.ingested ? `${r.ingested} шинэ ирц орлоо` : 'Шинэ ирц алга',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  /** Царай бүртгүүлсэн хүнийг ТЭР ДАРУЙ баталгаажуулах. */
  async function faceCheck() {
    setBusy('face');
    try {
      const r = await api.post<{ enrolled: number }>('/sync/run/face-check', {});
      toast.success(
        r.enrolled
          ? `${r.enrolled} хүний царай баталгаажлаа`
          : 'Шинээр бүртгэгдсэн царай алга',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      {/*
        ⚠ `CardHeader` нь GRID. Товчнуудыг `CardAction` дотор тавьж байж
        баруун талд очно (`grid-cols-[1fr_auto]`). Жижиг дэлгэцэд тэд
        өөрсдөө мөр тасна.
      */}
      <CardHeader>
        <CardTitle className="text-base">Терминал</CardTitle>
        <CardAction className="col-start-1 row-span-1 row-start-2 justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={ping}
            disabled={busy !== null}
          >
            {busy === 'ping' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PlugZap className="size-4" />
            )}
            Холболт шалгах
          </Button>
          {/* Эдгээр нь ADMIN-д нээлттэй — тайлан/синкийн ажил дуудна. */}
          {can('admin') && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={pollEvents}
                disabled={busy !== null}
              >
                {busy === 'events' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Ирц татах
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={faceCheck}
                disabled={busy !== null}
              >
                {busy === 'face' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ScanFace className="size-4" />
                )}
                Царай шалгах
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/terminal/diagnose" />}
          >
            <Stethoscope className="size-4" />
            Оношилгоо
          </Button>
          <LinkButton size="sm" variant="ghost" href="/terminal">
            Дэлгэрэнгүй
          </LinkButton>
        </div>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-3">
        {devices.map((dev) => (
          <div
            key={dev.id}
            className="flex items-center gap-3 rounded-lg border px-3 py-2"
          >
            <span
              className={cn(
                'size-2 rounded-full',
                dev.online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
              )}
            />
            <div className="mr-1">
              <p className="text-sm font-medium">{dev.name}</p>
              <p className="text-muted-foreground text-xs">
                {dev.online ? 'Холбогдсон' : `Сүүлд ${relative(dev.lastSeenAt)}`}
              </p>
            </div>
            {can('manager') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openDoor(dev.id, dev.name)}
                disabled={opening === dev.id}
              >
                {opening === dev.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <DoorOpen className="size-3.5" />
                )}
                Хаалга нээх
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
