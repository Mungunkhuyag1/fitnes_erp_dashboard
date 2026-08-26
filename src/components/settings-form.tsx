'use client';

import { Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';

export interface Settings {
  allow_reception_extend: boolean;
  reminder_milestones: string[];
  gym_name: string;
  locker_zones: string[];
  locker_zone_by_gender: Record<string, string>;
  locker_price_per_month: number;
}

/**
 * Тохиргооны нэг хэсгийн бүрхүүл.
 *
 * ЯАГААД БҮРХҮҮЛ ВЭ: хэсэг бүр нь `/settings`-ийг уншиж, засаад, зөвхөн
 * ӨӨРИЙН түлхүүрүүдийг буцааж бичдэг. Энэ давтагдах ажлыг нэг дор
 * төвлөрүүлснээр хэсэг нэмэхэд зөвхөн формын талбарууд бичигдэнэ.
 *
 * `PATCH /settings` нь ХЭСЭГЧИЛСЭН — илгээгээгүй түлхүүр хөндөгдөхгүй.
 * Тиймээс хэсгүүд бие биенээ дарж бичихгүй.
 *
 * Серверийн утгыг `key`-ээр дахин mount хийж авна — `useEffect` доторх
 * `setState`-ээс зайлсхийнэ (`react-hooks/set-state-in-effect`).
 */
export function SettingsSection({
  title,
  description,
  keys,
  children,
}: {
  title: string;
  description?: string;
  /** Хадгалахад илгээх түлхүүрүүд. */
  keys: (keyof Settings)[];
  children: (
    form: Settings,
    set: <K extends keyof Settings>(k: K, v: Settings[K]) => void,
  ) => ReactNode;
}) {
  const { data, loading, reload } = useApi<Settings>('/settings');
  const [version, setVersion] = useState(0);

  if (loading && !data) return <Skeleton className="h-72" />;
  if (!data) return null;

  return (
    <Inner
      key={version}
      initial={data}
      title={title}
      description={description}
      keys={keys}
      onSaved={() => {
        reload();
        setVersion((v) => v + 1);
      }}
    >
      {children}
    </Inner>
  );
}

function Inner({
  initial,
  title,
  description,
  keys,
  onSaved,
  children,
}: {
  initial: Settings;
  title: string;
  description?: string;
  keys: (keyof Settings)[];
  onSaved: () => void;
  children: (
    form: Settings,
    set: <K extends keyof Settings>(k: K, v: Settings[K]) => void,
  ) => ReactNode;
}) {
  const [form, setForm] = useState<Settings>(initial);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const dirty = keys.some(
    (k) => JSON.stringify(form[k]) !== JSON.stringify(initial[k]),
  );

  async function save() {
    setBusy(true);
    try {
      const body = Object.fromEntries(keys.map((k) => [k, form[k]]));
      await api.patch('/settings', body);
      toast.success('Хадгалагдлаа');
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">
        {children(form, set)}
        <Button onClick={save} disabled={busy || !dirty}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Хадгалах
        </Button>
      </CardContent>
    </Card>
  );
}
