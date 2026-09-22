'use client';

import { UserRound } from 'lucide-react';
import { dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Чатын хуваалцах бүрдлүүд.
 *
 * ★ ЯАГААД ТУСДАА ФАЙЛ ВЭ
 *
 * Чат нь ХОЁР газар харагдана: `/inbox` бүтэн дэлгэц ба баруун доод
 * буланд хөвөгч цонх. Хоёулаа ижил өгөгдөл, ижил дүрэм (цонхны
 * хугацаа, алдааны харагдац) ашигладаг тул давхардуулбал аль нэг нь
 * л засагдаж, хоёр өөр байдалтай болно.
 */

export interface ChatMember {
  id: string;
  name: string;
  memberNo: string;
  status: string;
}

export interface Conversation {
  id: string;
  psid: string;
  name: string | null;
  pictureUrl: string | null;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  unread: number;
  /** Хариу бичих боломж — backend-ийн тооцоолсон цонх. */
  window: 'open' | 'agent' | 'closed';
  member: ChatMember | null;
}

export interface Message {
  id: string;
  mid: string;
  direction: 'in' | 'out';
  text: string | null;
  attachments: { type?: string; payload?: { url?: string } }[] | null;
  error: string | null;
  sentAt: string;
}

export interface ChatStatus {
  connected: boolean;
  pageName: string | null;
}

/**
 * Цонхны төлөв → ажилтанд хэлэх үг.
 *
 * ⚠ Эдгээр нь Meta-гийн бодлого, бидний сонголт БИШ. Ажилтанд
 * шалтгааныг хэлэхгүй бол «яагаад илгээгдэхгүй байна» гэж ойлгохгүй.
 */
export const WINDOW_NOTE: Record<Conversation['window'], string | null> = {
  open: null,
  agent:
    '24 цаг өнгөрсөн — Facebook энэ хариуг «хүн гараар хариулж байна» ' +
    'гэж тэмдэглэн илгээнэ. 7 хоногийн дотор л боломжтой.',
  closed:
    'Хариу бичих хугацаа дууссан. Facebook нь хэрэглэгч сүүлд бичсэнээс ' +
    'хойш 7 хоногийн дараа хариулахыг зөвшөөрдөггүй.',
};

/** Профайл зураг — татагдаагүй бол эхний үсэг. */
export function ChatAvatar({
  name,
  url,
  className,
}: {
  name: string | null;
  url: string | null;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- гадаад CDN
      <img
        src={url}
        alt=""
        className={cn('size-8 shrink-0 rounded-full object-cover', className)}
      />
    );
  }
  return (
    <span
      className={cn(
        'bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
        className,
      )}
    >
      {name?.[0] ?? <UserRound className="size-4" />}
    </span>
  );
}

/**
 * Нэг мессеж. Ирсэн нь зүүн, илгээсэн нь баруун талд.
 *
 * ⚠ Илгээгдээгүй мессеж УЛААН хүрээтэй, алдааны текстээ дагуулж
 * жагсаалтад үлдэнэ — чимээгүй алга болвол ажилтан хариулсан гэж бодно.
 */
export function ChatBubble({ m }: { m: Message }) {
  const out = m.direction === 'out';
  return (
    <div className={cn('flex', out ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-3 py-2 text-sm',
          m.error
            ? 'border-destructive/40 text-destructive border'
            : out
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted',
        )}
      >
        {m.text && <p className="break-words whitespace-pre-wrap">{m.text}</p>}

        {/* Хавсралт — зургийг харуулж, бусдыг холбоосоор. */}
        {m.attachments?.map((a, i) =>
          a.payload?.url ? (
            a.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element -- гадаад CDN
              <img
                key={i}
                src={a.payload.url}
                alt=""
                className="mt-1 max-h-48 rounded"
              />
            ) : (
              <a
                key={i}
                href={a.payload.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block underline underline-offset-2"
              >
                {a.type ?? 'Хавсралт'}
              </a>
            )
          ) : null,
        )}

        <p
          className={cn(
            'mt-1 text-[10px]',
            out && !m.error
              ? 'text-primary-foreground/70'
              : 'text-muted-foreground',
          )}
        >
          {dateTime(m.sentAt)}
          {m.error && ` · Илгээгдсэнгүй: ${m.error}`}
        </p>
      </div>
    </div>
  );
}
