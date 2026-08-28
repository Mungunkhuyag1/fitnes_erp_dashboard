'use client';

import { Loader2, Radar, Save, Wifi } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';

interface Address {
  ip: string | null;
  source: 'db' | 'env' | 'none';
  envHost: string | null;
  model: string | null;
  firmware: string | null;
  lastSeenAt: string | null;
  subnet: string | null;
}

const SOURCE: Record<Address['source'], string> = {
  db: 'Хадгалсан хаяг',
  env: 'Серверийн .env',
  none: 'Тохируулаагүй',
};

/**
 * Терминалын сүлжээний хаяг.
 *
 * ЯАГААД ДЭЛГЭЦЭД ХЭРЭГТЭЙ ВЭ: фитнесийн router нь DHCP-ээр хаяг
 * тарааж, терминалын IP хугацаа өнгөрөхөд СОЛИГДДОГ. Ажилтан
 * серверийн `.env` засаж чадахгүй тул энд сольж чаддаг байх ёстой.
 */
export function TerminalAddressCard() {
  const { can } = useAuth();
  const { data, loading, reload } = useApi<Address>('/devices/address');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState<'scan' | 'save' | null>(null);

  async function scan() {
    setBusy('scan');
    try {
      const r = await api.post<{ found: string[]; chosen: string | null }>(
        '/devices/discover',
      );
      if (r.chosen) {
        toast.success(`Терминал олдлоо: ${r.chosen}`, {
          description:
            r.found.length > 1 ? `${r.found.length} төхөөрөмж хариулав` : undefined,
        });
        reload();
      } else {
        toast.warning('Терминал олдсонгүй', {
          description: 'Нэг сүлжээнд байгаа эсэхээ шалгана уу',
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Хайлт амжилтгүй');
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy('save');
    try {
      await api.patch('/devices/address', { ip: manual.trim() });
      toast.success('Хаяг хадгалагдлаа');
      setManual('');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Хадгалж чадсангүй');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Сүлжээний хаяг</CardTitle>
        <CardDescription>
          Router хаягийг өөрчлөхөд энд шинэчилнэ
        </CardDescription>
        {can('manager') && (
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              onClick={scan}
              disabled={busy !== null}
            >
              {busy === 'scan' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Radar className="size-3.5" />
              )}
              Сүлжээнээс хайх
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !data ? (
          <Skeleton className="h-16" />
        ) : (
          data && (
            <>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div>
                  <p className="text-muted-foreground text-xs">Хаяг</p>
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {data.ip ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Эх сурвалж</p>
                  <p className="text-sm">{SOURCE[data.source]}</p>
                </div>
                {data.model && (
                  <div>
                    <p className="text-muted-foreground text-xs">Төхөөрөмж</p>
                    <p className="text-sm">
                      {data.model}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {data.firmware}
                      </span>
                    </p>
                  </div>
                )}
                {data.lastSeenAt && (
                  <div>
                    <p className="text-muted-foreground text-xs">Сүүлд холбогдсон</p>
                    <p className="font-mono text-xs">{dateTime(data.lastSeenAt)}</p>
                  </div>
                )}
              </div>

              {data.source === 'env' && (
                <p className="text-muted-foreground flex items-start gap-2 text-xs">
                  <Wifi className="mt-0.5 size-3.5 shrink-0" />
                  Хаяг серверийн тохиргооноос ирж байна. Сүлжээнээс хайх
                  эсвэл доор гараар оруулбал энд хадгалагдаж, дараа нь
                  солигдоход дахин deploy хийх шаардлагагүй болно.
                </p>
              )}

              {can('manager') && (
                <div className="flex flex-wrap items-end gap-2 border-t pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ip">Гараар оруулах</Label>
                    <Input
                      id="ip"
                      value={manual}
                      onChange={(e) => setManual(e.target.value)}
                      placeholder={data.subnet ? `${data.subnet}.106` : '192.168.0.106'}
                      className="w-48 font-mono"
                      inputMode="decimal"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={save}
                    disabled={!manual.trim() || busy !== null}
                  >
                    {busy === 'save' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Хадгалах
                  </Button>
                  {data.subnet && (
                    <p className="text-muted-foreground pb-2 text-xs">
                      Энэ сервер {data.subnet}.x сүлжээнд байна
                    </p>
                  )}
                </div>
              )}
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}
