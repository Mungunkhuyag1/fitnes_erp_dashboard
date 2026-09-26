'use client';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  MessageSquare,
  Search,
  Send,
  UserPlus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { errorToast } from '@/lib/errors';
import { LinkButton } from '@/components/link-button';
import { MemberPicker } from '@/components/member-picker';
import { PageHeader } from '@/components/page-header';
import {
  ChatAvatar,
  ChatBubble,
  WINDOW_NOTE,
  type ChatStatus,
  type Conversation,
  type Message,
} from '@/components/chat-parts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { relative } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Facebook Messenger-ийн хайрцаг.
 *
 * ★ ЯАГААД WinFit ДОТОР ВЭ
 *
 * Business Suite нь чатад хариулах ажлыг илүү сайн хийдэг — үнэгүй,
 * утсан дээр ажилладаг, мэдэгдэл ирдэг. WinFit дотор барих ЦОРЫН ГАНЦ
 * шалтгаан бол ярианы хажууд ГИШҮҮНИЙ МЭДЭЭЛЭЛ харагдах: «Болд бичлээ
 * → №246, эрх нь маргааш дуусна → сунгах холбоос илгээе» гэсэн урсгал
 * нэг дэлгэцэд багтана.
 *
 * ⚠ Messenger утасны дугаар өгдөггүй тул гишүүнтэй холбохыг ажилтан
 * нэг удаа гараар хийнэ.
 */
export default function InboxPage() {
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  /*
   * ⚠ ЗӨВХӨН ЖИЖИГ ДЭЛГЭЦЭД — аль талбарыг харуулах вэ.
   *
   * `active`-ыг тэглэж «буцах»-ыг хийж БОЛОХГҮЙ: тэгвэл сонгосон
   * яриа алдагдаж, буцаад ороход эхнээс нь хайх болно. `lg`-ээс
   * дээш хоёулаа зэрэг харагддаг тул энэ төлөв нөлөөгүй.
   */
  const [mobileList, setMobileList] = useState(true);
  const [sending, setSending] = useState(false);
  const [linking, setLinking] = useState(false);

  const { data: status } = useApi<ChatStatus>('/meta/status');

  /*
   * 10 секунд тутам шинэчилнэ.
   *
   * SSE-г 1-р хувилбарт ЗОРИУДААР хийхгүй: холболт тасрах, дахин
   * холбогдох, олон таб зэрэг асуудал дагуулдаг. Ресепшний хэмжээнд
   * 10 секундын хоцрогдол мэдэгдэхгүй.
   */
  const { data: list, loading, reload } = useApi<Conversation[]>(
    status?.connected ? '/meta/conversations' : null,
    { refreshMs: 10_000 },
  );

  const { data: thread, reload: reloadThread } = useApi<{
    conversation: Conversation;
    messages: Message[];
  }>(active ? `/meta/conversations/${active}` : null, { refreshMs: 10_000 });

  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  /*
   * Шинэ мессеж ирэхэд доод тал руу гүйлгэнэ.
   *
   * ⚠ Мессежийн ТОО өөрчлөгдсөн үед л — эс бөгөөс 10 секунд тутмын
   *   шинэчлэл бүрд ажилтны гүйлгэсэн байрлалыг булаана.
   */
  useEffect(() => {
    const n = thread?.messages.length ?? 0;
    if (n !== lastCount.current) {
      lastCount.current = n;
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [thread?.messages.length]);

  /*
    НЭЭЛТТЭЙ ЯРИА ДЭЭР ШИНЭ МЕССЕЖ ИРВЭЛ ШУУД УНШСАН ГЭЖ ТЭМДЭГЛЭНЭ.

    Үүнгүй бол ажилтан яриагаа шагайж байхад цэс ба бөмбөлөг дээрх
    тоо өссөөр байна.
  */
  useEffect(() => {
    const u = thread?.conversation.unread ?? 0;
    if (!active || u === 0) return;
    void api
      .post(`/meta/conversations/${active}/read`, {})
      .then(() => reload())
      .catch(() => {
        // Уншсан тэмдэглэгээ чухал биш.
      });
  }, [active, thread?.conversation.unread, reload]);

  async function open(c: Conversation) {
    setActive(c.id);
    setDraft('');
    setMobileList(false);
    if (c.unread > 0) {
      try {
        await api.post(`/meta/conversations/${c.id}/read`, {});
        reload();
      } catch {
        // Уншсан тэмдэглэгээ чухал биш — алдааг чимээгүй өнгөрөөнө.
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
      if (r.ok) {
        setDraft('');
        reloadThread();
        reload();
      } else {
        // Backend нь мөрийг `error`-той хадгалсан — түүхэнд үлдэнэ.
        toast.error('Илгээгдсэнгүй', { description: r.error });
        reloadThread();
      }
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setSending(false);
    }
  }

  async function link(memberId: string | null) {
    if (!active) return;
    setLinking(true);
    try {
      await api.patch(`/meta/conversations/${active}/member`, { memberId });
      reloadThread();
      reload();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setLinking(false);
    }
  }

  // ── Холбогдоогүй ──
  if (status && !status.connected) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Чат" description="Facebook Page-ийн мессеж" />
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <span className="bg-muted mb-3 flex size-12 items-center justify-center rounded-full">
              <MessageSquare className="text-muted-foreground size-6" />
            </span>
            <p className="font-medium">Facebook хуудас холбогдоогүй байна</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Тохиргоо → Холболт хэсгээс хуудсаа холбоно. Meta-гийн талд
              апп үүсгэж, webhook хаягаа бүртгэсэн байх шаардлагатай.
            </p>
            <LinkButton href="/settings/connections" className="mt-4">
              Холболт тохируулах
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  const c = thread?.conversation;
  const note = c ? WINDOW_NOTE[c.window] : null;

  /*
   * Хайлт — КЛИЕНТ талд. Ярианы тоо хэдэн зуугаас хэтрэхгүй бөгөөд
   * бичих бүрд сервер рүү явахаас илүү шуурхай.
   */
  const t = search.trim().toLowerCase();
  const shown = (list ?? []).filter(
    (x) =>
      !t ||
      (x.name ?? '').toLowerCase().includes(t) ||
      (x.lastMessageText ?? '').toLowerCase().includes(t) ||
      (x.member?.name ?? '').toLowerCase().includes(t) ||
      (x.member?.memberNo ?? '').includes(t),
  );

  return (
    /*
     * ★ ДЭЛГЭЦИЙГ БҮТЭН ДҮҮРГЭНЭ.
     *
     * Урьд нь `max-h-[32rem]` ба `max-h-[22rem]` гэсэн ТОГТМОЛ өндөртэй
     * байсан. Үр дүнд нь том дэлгэц дээр доод талын тал хувь нь хоосон
     * үлдэж, тэр зуур мессежийн жагсаалт 22rem дотор шахагдаж 3-4
     * мөр л харагддаг байв — чат уншихад хамгийн муу хослол.
     *
     * ⚠ `h-full` нь `main`-ы (AppShell) өндрөөс тооцоологдоно. Тэр нь
     * `h-svh` дотор `flex-1 min-h-0` тул тодорхой өндөртэй. Гинжин
     * хэлхээний ХАА НЭГТЭЭ `min-h-0` дутвал бүхэлдээ нурна.
     */
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Чат"
        description={status?.pageName ?? 'Facebook Page-ийн мессеж'}
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[22rem_1fr]">
        {/* ── Ярианы жагсаалт ── */}
        {/*
          ⚠ Жижиг дэлгэцэд ХОЁРЫН НЭГ нь л харагдана. Хоёуланг нь
          дараалуулбал жагсаалт дэлгэцийг эзэлж, яриа нь доор
          нуугдана — гар утаснаас хариулах боломжгүй болно.
        */}
        <Card
          className={cn(
            // ⚠ `gap-0` — `Card` нь хүүхдүүдийн хооронд 1rem зай
            // үлдээдэг. Хайлт ба жагсаалтын хооронд салангид зурвас
            // үүсгэнэ.
            'flex min-h-0 flex-col gap-0 py-0',
            !mobileList && 'hidden lg:flex',
          )}
        >
          {/* Хайлт — жагсаалтын ДЭЭД талд тогтоно, гүйхгүй. */}
          <div className="shrink-0 border-b p-2">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Нэр, мессежээр хайх…"
                className="pl-9"
              />
            </div>
          </div>

          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
            {loading && !list ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : shown.length ? (
              <ul className="divide-border divide-y">
                {shown.map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => open(x)}
                      className={cn(
                        'hover:bg-accent flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                        active === x.id && 'bg-accent',
                      )}
                    >
                      <ChatAvatar name={x.name} url={x.pictureUrl} />
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
                          <span className="text-muted-foreground ml-auto shrink-0 text-[11px]">
                            {relative(x.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-muted-foreground truncate text-xs">
                          {x.lastMessageText ?? '—'}
                        </p>
                        {x.member && (
                          <p className="text-muted-foreground mt-0.5 truncate font-mono text-[11px]">
                            №{x.member.memberNo} · {x.member.name}
                          </p>
                        )}
                      </div>
                      {x.unread > 0 && (
                        <Badge className="mt-0.5 shrink-0 tabular-nums">
                          {x.unread}
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1 p-6 text-center text-sm">
                <MessageSquare className="mb-1 size-8 opacity-30" />
                {t ? (
                  <p>«{search.trim()}» олдсонгүй</p>
                ) : (
                  <>
                    <p>Мессеж алга</p>
                    {/*
                      ⚠ Хоосон байх нь АЛДАА байж болно: Development
                      горимд зөвхөн аппад үүрэгтэй хүний мессеж ирдэг.
                      Ажилтан үүнийг мэдэхгүй бол «эвдэрсэн» гэж бодно.
                    */}
                    <p className="max-w-56 text-xs">
                      Апп Development горимд байвал зөвхөн аппад үүрэгтэй
                      хүний мессеж ирнэ. Жирийн хүнийх ирэхэд App Review
                      шаардлагатай.
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Яриа ── */}
        <Card
          className={cn(
            // ⚠ `gap-0` — эс бөгөөс толгой / мессеж / бичих талбар
            // гурвын хооронд 1rem завсар үүсч, хүрээ нь тасарна.
            'flex min-h-0 flex-col gap-0 py-0',
            mobileList && 'hidden lg:flex',
          )}
        >
          {!c ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 text-sm">
              <MessageSquare className="size-10 opacity-20" />
              Зүүн талаас яриа сонгоно уу
            </div>
          ) : (
            <>
              {/* Толгой — хэн болох, гишүүнтэй холбоос. ГҮЙХГҮЙ. */}
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-b p-3">
                {/* Жижиг дэлгэцэд жагсаалт руу буцах цорын ганц зам. */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setMobileList(true)}
                  aria-label="Жагсаалт руу буцах"
                  className="lg:hidden"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <ChatAvatar name={c.name} url={c.pictureUrl} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {c.name ?? 'Нэргүй'}
                  </p>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    {c.psid}
                  </p>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {c.member ? (
                    <>
                      <Badge variant="outline" className="font-normal">
                        №{c.member.memberNo} · {c.member.name}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/members/${c.member!.id}`)}
                      >
                        Гишүүн
                        <ArrowRight className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => link(null)}
                        disabled={linking}
                      >
                        Салгах
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus className="text-muted-foreground size-4" />
                      <div className="w-56">
                        <MemberPicker
                          value={null}
                          onChange={(m) => m && link(m.id)}
                          placeholder="Гишүүнтэй холбох…"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/*
                ★ ЗӨВХӨН ЭНЭ ХЭСЭГ ГҮЙНЭ.
                `min-h-0` — flex хүүхэд агшихыг зөвшөөрнө; үүнгүй бол
                агуулга нь картыг сунгаж, `overflow-y-auto` огт
                ажиллахгүй.
              */}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {thread.messages.map((m) => (
                  <ChatBubble key={m.id} m={m} />
                ))}
                <div ref={endRef} />
              </div>

              {/* Цонхны анхааруулга */}
              {note && (
                <div
                  className={cn(
                    'flex shrink-0 items-start gap-2 border-t px-3 py-2 text-xs',
                    c.window === 'closed'
                      ? 'text-destructive bg-destructive/5'
                      : 'text-muted-foreground bg-muted/40',
                  )}
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{note}</span>
                </div>
              )}

              {/* Бичих талбар — ҮРГЭЛЖ ДООД талд тогтоно. */}
              <div className="flex shrink-0 items-end gap-2 border-t p-3">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    /*
                      Enter = илгээх, Shift+Enter = мөр таслах.

                      ⚠ `isComposing` — КИРИЛЛ/IME ГАРЫН АСУУДАЛ.
                      Зарим гарын арга утга баталгаажуулахад Enter илгээдэг
                      тул үүнийг шалгахгүй бол үг дундуур мессеж явна.
                    */
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={
                    c.window === 'closed'
                      ? 'Хариу бичих хугацаа дууссан'
                      : 'Хариу бичих…'
                  }
                  disabled={c.window === 'closed' || sending}
                  rows={2}
                  className="min-h-0 resize-none"
                />
                <Button
                  onClick={send}
                  disabled={c.window === 'closed' || sending || !draft.trim()}
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
        </Card>
      </div>
    </div>
  );
}
