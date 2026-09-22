'use client';

import { ArrowRight, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AccessResult } from '@/components/access-result';
import { TerminalImage } from '@/components/terminal-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/use-api';
import { dateTime } from '@/lib/format';

const VERIFY_LABEL: Record<string, string> = {
  face: 'Царай',
  card: 'Карт',
  fp: 'Хурууны хээ',
  pin: 'ПИН',
};

const STATUS_LABEL: Record<string, string> = {
  lead: 'Шинэ',
  active: 'Идэвхтэй',
  expired: 'Хугацаа дууссан',
  suspended: 'Түр зогссон',
  cancelled: 'Цуцлагдсан',
};

interface Detail {
  id: string;
  eventAt: string;
  granted: boolean;
  reason: string;
  reasonLabel: string;
  verifyMode: string | null;
  picturePath: string | null;
  memberNo: string | null;
  /** Терминал дээр бичигдсэн нэр (регистр салгасан). */
  terminalName: string | null;
  terminalRegister: string | null;
  /** Эвент бүртгэгдэх АГШИНД гишүүн холбогдсон эсэх. */
  linkedAtIngest: boolean;
  member: {
    id: string;
    name: string;
    memberNo: string;
    phone: string | null;
    status: string;
  } | null;
  raw: Record<string, unknown> | null;
}

/** Нэр–утга хос. Утга байхгүй бол зураас — хоосон зай нь «алдаа юу» гэж эргэлзүүлнэ. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className="text-right text-sm">{children}</span>
    </div>
  );
}

/**
 * Нэг уншуулалтын дэлгэрэнгүй.
 *
 * ★ ЯАГААД ТУСДАА ЦОНХ ВЭ
 *
 * Хүснэгтийн мөрөнд багтахгүй зүйлс бий: бүтэн хэмжээний кадр, терминалын
 * түүхий өгөгдөл, гишүүний төлөв. Мөн «энэ хэн бэ» гэсэн асуулт нь
 * маргаан шийдэхэд хамгийн түгээмэл — жагсаалт дээр нэр нь харагдахгүй
 * байсан ч энд хэн болохыг нь тогтоож болно.
 */
export function CheckInDetail({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [showRaw, setShowRaw] = useState(false);

  // ⚠ Зам нь `null` бол `useApi` хүсэлт явуулахгүй — цонх хаалттай
  //   байхад сервер рүү дэмий хандахгүй.
  const { data, error, loading } = useApi<Detail>(
    id ? `/access-events/${id}` : null,
  );

  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Уншуулалтын дэлгэрэнгүй</DialogTitle>
        </DialogHeader>

        {error ? (
          <p className="text-destructive bg-destructive/8 rounded-lg px-3 py-2.5 text-sm">
            {error}
          </p>
        ) : loading || !data ? (
          /*
            ⚠ `loading`-ийг `data`-аас ӨМНӨ шалгана.

            `useApi` нь шинэчлэх үед дэлгэц анивчихгүйн тулд хуучин
            өгөгдлийг зориудаар үлдээдэг. Энэ нь нэг хуудсыг давтан
            татахад зөв — гэвч цонх ӨӨР бичлэг рүү шилжихэд өмнөх
            хүний зураг, нэр хэсэг зуур харагдаад дараа нь солигдоно.
            Буруу хүнийг харж байгаад андуурах эрсдэлтэй.
          */
          <div className="space-y-4">
            <Skeleton className="h-44 w-full" />
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/*
              Кадр — хамгийн эхэнд, том хэмжээгээр. Маргаан шийдэхэд
              хүснэгтийн жижиг дүрсээс тустай.
            */}
            <TerminalImage
              path={data.picturePath}
              alt="Уншуулах үеийн зураг"
              emptyText="Зураг алга"
              className="h-44 w-full"
            />

            <div className="divide-border divide-y">
              <Row label="Цаг">
                <span className="font-mono tabular-nums">
                  {dateTime(data.eventAt)}
                </span>
              </Row>
              <Row label="Үр дүн">
                <AccessResult
                  granted={data.granted}
                  reason={data.reason}
                  reasonLabel={data.reasonLabel}
                  className="items-end"
                />
              </Row>
              <Row label="Танилт">
                {data.verifyMode
                  ? (VERIFY_LABEL[data.verifyMode] ?? data.verifyMode)
                  : '—'}
              </Row>
              <Row label="Терминал дээрх дугаар">
                <span className="font-mono tabular-nums">
                  {data.memberNo ?? '—'}
                </span>
              </Row>
              {/* Терминал дээрх нэр — WinFit-ийн бүртгэлээс ТУСДАА.
                  Хоёулаа байвал зөрүүг нь шалгахад хэрэгтэй. */}
              {data.terminalName && (
                <Row label="Терминал дээрх нэр">{data.terminalName}</Row>
              )}
              {data.terminalRegister && (
                <Row label="Регистр">
                  <span className="font-mono">{data.terminalRegister}</span>
                </Row>
              )}
            </div>

            {/* ── Гишүүн ───────────────────────────────────────────── */}
            {data.member ? (
              <div className="bg-muted/40 space-y-3 rounded-lg p-3">
                <div>
                  <div className="font-medium">{data.member.name}</div>
                  <div className="text-muted-foreground font-mono text-xs tabular-nums">
                    №{data.member.memberNo}
                    {data.member.phone ? ` · ${data.member.phone}` : ''}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="font-normal">
                    {STATUS_LABEL[data.member.status] ?? data.member.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/members/${data.member!.id}`)}
                  >
                    Гишүүн рүү очих
                    <ArrowRight className="size-4" />
                  </Button>
                </div>

                {/*
                  ⚠ Эвент бүртгэгдэх үед холбогдоогүй ч ОДОО дугаараар нь
                  таарсан тохиолдол. Терминалаас түүх импортлоход гишүүд
                  WinFit-д ороогүй байсан бол ингэж таарна — хүснэгт дээр
                  «Бүртгэлгүй» гэж харагдсаар байх тул тайлбарлана.
                */}
                {!data.linkedAtIngest && (
                  <p className="text-muted-foreground text-xs">
                    Уншуулах үед энэ гишүүн WinFit-д бүртгэлгүй байсан тул
                    жагсаалтад «Бүртгэлгүй» гэж харагдана. Дугаараар нь
                    одоо тааруулав.
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-muted/40 flex gap-3 rounded-lg p-3">
                <UserX className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    Тохирох гишүүн байхгүй
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {data.terminalName ? (
                      <>
                        Терминал дээр <strong>{data.terminalName}</strong> (№
                        {data.memberNo ?? '—'}) гэж бүртгэлтэй боловч WinFit-д
                        тэр дугаартай гишүүн алга.
                      </>
                    ) : (
                      <>
                        Терминал дээр №{data.memberNo ?? '—'} гэсэн дугаараар
                        уншуулсан боловч WinFit-д тэр дугаартай гишүүн алга.
                      </>
                    )}{' '}
                    Терминалаас гишүүдийг импортлоход холбогдоно.
                  </p>
                </div>
              </div>
            )}

            {/* ── Түүхий өгөгдөл ───────────────────────────────────── */}
            {data.raw && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowRaw((v) => !v)}
                  className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
                >
                  {showRaw ? 'Түүхий өгөгдлийг нуух' : 'Түүхий өгөгдөл харах'}
                </button>
                {showRaw && (
                  <pre className="bg-muted mt-2 max-h-52 overflow-auto rounded-lg p-2 text-[11px] leading-relaxed">
                    {JSON.stringify(data.raw, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
