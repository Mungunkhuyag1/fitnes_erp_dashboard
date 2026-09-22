'use client';

import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Loader2,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ChatAvatar,
  ChatBubble,
  WINDOW_NOTE,
  type ChatStatus,
  type Conversation,
  type Message,
} from '@/components/chat-parts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Хөвөгч чат — Facebook-ийн бөмбөлөг шиг, баруун доод буланд.
 *
 * ★ ЯАГААД ХЭРЭГТЭЙ ВЭ
 *
 * Ресепшн өдөржин Гишүүд, Ирц, Шүүгээ дээр ажилладаг. Чат ирэхэд
 * ажлаа орхиж өөр дэлгэц рүү шилжих нь тэр ажлаа алдана — эрх сунгаж
 * байсан маягт хаагдана. Хөвөгч цонх нь байгаа дэлгэцээ хөндөхгүйгээр
 * хариулах зам.
 *
 * ★ ГУРВАН ТӨЛӨВ
 *
 *  · хаалттай  — зөвхөн бөмбөлөг + уншаагүйн тоо
 *  · жагсаалт  — яриануудын товч жагсаалт
 *  · яриа      — нэг хүнтэй бичих
 *
 * ⚠ `/inbox` дээр ХАРАГДАХГҮЙ: тэнд ижил зүйл бүтэн дэлгэцээр байгаа.
 *
 * ⚠ Хуудас солиход ТӨЛӨВ ХЭВЭЭР үлдэнэ — `AppShell` дотор байрлах тул
 * маршрут солигдоход дахин үүсэхгүй.
 */
export function ChatWidget({ unread }: { unread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const { data: status } = useApi<ChatStatus>('/meta/status');

  /*
   * ⚠ Зөвхөн НЭЭЛТТЭЙ үед татна.
   *
   * Цонх хаалттай байхад жагсаалтыг татах нь бүх дэлгэц дээр 10
   * секунд тутмын хүсэлт болно. Уншаагүйн тоог `AppShell` аль хэдийн
   * авдаг — бөмбөлөгт тэр хангалттай.
   */
  const { data: list, loading, reload } = useApi<Conversation[]>(
    open ? '/meta/conversations' : null,
    { refreshMs: 10_000 },
  );

  const { data: thread, reload: reloadThread } = useApi<{
    conversation: Conversation;
    messages: Message[];
  }>(open && active ? `/meta/conversations/${active}` : null, {
    refreshMs: 10_000,
  });

  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  // Шинэ мессеж ирэхэд л доош гүйлгэнэ — шинэчлэл бүрд биш.
  useEffect(() => {
    const n = thread?.messages.length ?? 0;
    if (n !== lastCount.current) {
      lastCount.current = n;
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [thread?.messages.length]);

  /*
    НЭЭЛТТЭЙ ЯРИА ДЭЭР ШИНЭ МЕССЕЖ ИРВЭЛ ШУУД УНШСАН ГЭЖ ТЭМДЭГЛЭНЭ.

    Үүнгүй бол ажилтан яриагаа шагайж байхад тэмдэг нь өссөөр
    байна — «уншаагүй 3» гэж бичигдээд бүгд нь нүдний өмнө байна.

    `reload` нь `useCallback([])` — тогтвортой тул эффект давтахгүй.
    Тэмдэглэсний дараа `unread` 0 болж өөрөө зогсоно.
  */
  useEffect(() => {
    const u = thread?.conversation.unread ?? 0;
    if (!open || !active || u === 0) return;
    void api
      .post(`/meta/conversations/${active}/read`, {})
      .then(() => reload())
      .catch(() => {
        // Уншсан тэмдэглэгээ чухал биш.
      });
  }, [open, active, thread?.conversation.unread, reload]);

  async function openThread(c: Conversation) {
    setActive(c.id);
    setDraft('');
    if (c.unread > 0) {
      try {
        await api.post(`/meta/conversations/${c.id}/read`, {});
        reload();
      } catch {
        // Уншсан тэмдэглэгээ чухал биш.
      }
    }
  }

  async function send() {
    if (!active || !draft.trim()) return;
    setSending(true);
    try {
      const r = await api.post<{ ok: boolean; error?: string }>(
        `/meta/conversations/${active}/send`,
        { text: draft.trim() },
      );
      if (r.ok) setDraft('');
      else toast.error('Илгээгдсэнгүй', { description: r.error });
      reloadThread();
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setSending(false);
    }
  }

  // Холбогдоогүй эсвэл хайрцгийн дэлгэц дээр байвал огт харуулахгүй.
  if (!status?.connected || pathname.startsWith('/inbox')) return null;

  const c = thread?.conversation;
  const note = c ? WINDOW_NOTE[c.window] : null;

  return (
    /*
      ⚠ `z-40` — ЦОНХ (Dialog/Sheet) НЬ ДЭЭГҮҮР БАЙХ ЁСТОЙ.
        shadcn цонхнууд `z-50` ашигладаг бөгөөд энэ нь `main`-ы ДАРАА
        дүрслэгдэх тул тэнцүү үед хөвөгч цонх нь диалогыг дарна.

      ⚠ `hidden lg:flex` — УТАСАН ДЭЭР ХАРАГДАХГҮЙ.
        Бөмбөлөг нь хүснэгтийн сүүлийн мөр, хуудаслалтыг дарна; самбар
        нь 360px өргөн дээр бараг бүтэн дэлгэц болж `/inbox`-ыг давхардуулна.
        Утаснаас «Чат» цэсээр орно.
    */
    <div className="fixed right-4 bottom-4 z-40 hidden flex-col items-end gap-2 lg:flex print:hidden">
      {open && (
        <div
          className={cn(
            'bg-card flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-xl border shadow-lg',
            'h-[min(28rem,calc(100svh-8rem))]',
          )}
        >
          {/* ── Толгой ── */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            {active ? (
              <>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Буцах"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <ChatAvatar
                  name={c?.name ?? null}
                  url={c?.pictureUrl ?? null}
                  className="size-6"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {c?.name ?? 'Нэргүй'}
                </span>
              </>
            ) : (
              <>
                <MessageSquare className="text-muted-foreground size-4" />
                <span className="flex-1 text-sm font-medium">Чат</span>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Хураах"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>

          {/* ── Бие ── */}
          {!active ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading && !list ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : list?.length ? (
                <ul className="divide-border divide-y">
                  {list.map((x) => (
                    <li key={x.id}>
                      <button
                        type="button"
                        onClick={() => openThread(x)}
                        className="hover:bg-accent flex w-full items-start gap-2 px-3 py-2 text-left transition-colors"
                      >
                        <ChatAvatar
                          name={x.name}
                          url={x.pictureUrl}
                          className="size-7"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={cn(
                                'truncate text-sm',
                                x.unread > 0 ? 'font-semibold' : 'font-medium',
                              )}
                            >
                              {x.name ?? 'Нэргүй'}
                            </span>
                            <span className="text-muted-foreground ml-auto shrink-0 text-[10px]">
                              {relative(x.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-muted-foreground truncate text-xs">
                            {x.lastMessageText ?? '—'}
                          </p>
                        </div>
                        {x.unread > 0 && (
                          <span className="bg-primary text-primary-foreground mt-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium tabular-nums">
                            {x.unread}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground py-12 text-center text-sm">
                  Мессеж алга
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {thread?.messages.map((m) => (
                  <ChatBubble key={m.id} m={m} />
                ))}
                <div ref={endRef} />
              </div>

              {note && (
                <div
                  className={cn(
                    'flex items-start gap-1.5 border-t px-3 py-1.5 text-[11px]',
                    c?.window === 'closed'
                      ? 'text-destructive bg-destructive/5'
                      : 'text-muted-foreground bg-muted/40',
                  )}
                >
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  <span>{note}</span>
                </div>
              )}

              <div className="flex items-end gap-2 border-t p-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    // ⚠ Кирилл/IME гар утга баталгаажуулахад Enter илгээдэг.
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={
                    c?.window === 'closed' ? 'Хугацаа дууссан' : 'Хариу бичих…'
                  }
                  disabled={c?.window === 'closed' || sending}
                  rows={1}
                  className="max-h-24 min-h-0 resize-none text-sm"
                />
                <Button
                  size="icon"
                  onClick={send}
                  disabled={c?.window === 'closed' || sending || !draft.trim()}
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Бөмбөлөг ── */}
      <Button
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative size-12 rounded-full shadow-lg"
        aria-label={open ? 'Чатыг хаах' : 'Чат нээх'}
      >
        {open ? <X className="size-5" /> : <MessageSquare className="size-5" />}
        {/* Хаалттай үед л тоог харуулна — нээлттэй бол жагсаалт дээр байна. */}
        {!open && unread > 0 && (
          <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full px-1 py-0.5 text-[10px] leading-none font-medium tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>
    </div>
  );
}
