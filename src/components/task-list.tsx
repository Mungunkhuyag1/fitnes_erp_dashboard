'use client';

import { Loader2, Pencil, Repeat, UserRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { KIND_LABEL, type TaskKind } from '@/components/task-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface TaskOccurrence {
  key: string;
  taskId: string;
  title: string;
  notes: string | null;
  kind: TaskKind;
  on: string;
  atTime: string | null;
  assignee: { id: string; name: string; role: string } | null;
  done: boolean;
  doneAt: string | null;
  doneBy: string | null;
}

/**
 * Ажлын жагсаалт — календарийн өдөр ба нүүр хуудас ХОЁУЛАА ашиглана.
 *
 * ★ МӨРӨН ДЭЭР ШУУД ЗАСАХ
 *
 * Гарчгийг дарвал талбар болж, Enter эсвэл фокус алдахад хадгалагдана.
 * Ресепшн өдөрт хэдэн ч удаа жижиг засвар хийдэг — цонх нээж хаах нь
 * тэр бүрд гурван нэмэлт дарлага.
 *
 * ⚠ Зөвхөн ГАРЧИГ. Давталт, огноо, хариуцагчийг мөрөн дээр засвал
 * «энэ ганц өдрийг өөрчилж байна уу, бүх давталтыг юу» гэдэг нь
 * ойлгомжгүй болно — тэдгээр нь цонхон дотор, тайлбартайгаа.
 */
export function TaskList({
  items,
  onChanged,
  onOpen,
  canEdit = false,
  showKind = false,
  showDate = false,
  today,
}: {
  items: TaskOccurrence[];
  onChanged: () => void;
  /**
   * Дэлгэрэнгүй цонх нээх — БҮХ ажилтанд. Цонх өөрөө
   * эрхээрээ зөвхөн унших болно.
   */
  onOpen?: (taskId: string) => void;
  /**
   * МӨРӨН ДЭЭРХ засвар — ЗӨВХӨН MANAGER-т.
   *
   * ⚠ `PATCH /tasks/:id` нь MANAGER эрхтэй. Үүнгүйгээр засварыг
   * нээвэл ресепшн гарчиг дараад, бичээд, фокус алдахад 403
   * тусна — ажил алдагдсан мэт сэтгэгдэл төрүүлнэ.
   */
  canEdit?: boolean;
  showKind?: boolean;
  /** Нүүр хуудсанд — хоцорсон ажлын огноог харуулна. */
  showDate?: boolean;
  /**
   * Өнөөдрийн огноо (`YYYY-MM-DD`) — ХОЦОРСОНыг ялгахад.
   *
   * Өгөөгүй бол бүх ажил «хүлээгдэж буй» гэж үзэгдэнэ.
   */
  today?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  async function toggle(o: TaskOccurrence) {
    setBusy(o.key);
    try {
      if (o.done) await api.del(`/tasks/${o.taskId}/complete?on=${o.on}`);
      else await api.post(`/tasks/${o.taskId}/complete`, { on: o.on });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  async function saveTitle(o: TaskOccurrence) {
    const title = draft.trim();
    setEditing(null);
    // Өөрчлөгдөөгүй эсвэл хоосон бол сервер рүү дэмий очихгүй.
    if (!title || title === o.title) return;
    setBusy(o.key);
    try {
      await api.patch(`/tasks/${o.taskId}`, { title });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="divide-border divide-y">
      {items.map((o) => {
        /*
          ГУРВАН ТӨЛӨВ — НҮДЭЭР ЯЛГАГДАНА.

          Хоцорсон (цаг нь өнгөрсөн боловч хийгдээгүй) нь үлдсэн
          хоёроос ТҮРЭЭС өөр: тэр нь алдаагдлыг зааж байгаа тул
          хүлээгдэж буйгаас ялгахгүй бол үүргээ гүйцэтгэхгүй.
        */
        const overdue = !o.done && !!today && o.on < today;
        return (
        <li
          key={o.key}
          className={cn(
            'flex items-start gap-2.5 py-2 pl-2',
            // Зүүн талын зураас — өнгө ялгахгүй хүнд ч илэрнэ.
            'border-l-2',
            o.done
              ? 'border-emerald-500/60'
              : overdue
                ? 'border-destructive'
                : 'border-transparent',
          )}
        >
          <Checkbox
            checked={o.done}
            disabled={busy === o.key}
            onCheckedChange={() => toggle(o)}
            className="mt-0.5"
            aria-label={`${o.title} — гүйцэтгэсэн`}
          />

          <div className="min-w-0 flex-1">
            {canEdit && editing === o.key ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => saveTitle(o)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle(o);
                  // Escape нь хадгалахгүй — буруу бичсэнээ таслах зам.
                  if (e.key === 'Escape') setEditing(null);
                }}
                className="border-input w-full rounded border bg-transparent px-1.5 py-0.5 text-sm"
              />
            ) : (
              <button
                type="button"
                // Засах эрхгүй бол товч байсаар байна — дарахад юу ч болохгүй
                // боловч гарчгийн бүтэц өөрчлөгдөхгүй.
                disabled={!canEdit}
                onClick={() => {
                  setDraft(o.title);
                  setEditing(o.key);
                }}
                className={cn(
                  'w-full text-left text-sm',
                  canEdit && 'hover:underline',
                  o.done && 'text-muted-foreground line-through',
                )}
              >
                {o.title}
              </button>
            )}

            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
              {overdue && (
                <span className="text-destructive font-medium">Хоцорсон</span>
              )}
              {showDate && (
                <span className={cn('tabular-nums', overdue && 'text-destructive')}>
                  {o.on}
                </span>
              )}
              {o.atTime && <span className="tabular-nums">{o.atTime}</span>}
              {showKind && o.kind !== 'once' && (
                <span className="inline-flex items-center gap-1">
                  <Repeat className="size-3" />
                  {KIND_LABEL[o.kind]}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-3" />
                {o.assignee?.name ?? 'Хэн ч'}
              </span>
              {o.done && o.doneBy && <span>· {o.doneBy} гүйцэтгэв</span>}
              {o.notes && <span className="truncate">· {o.notes}</span>}
            </div>
          </div>

          {busy === o.key && (
            <Loader2 className="text-muted-foreground mt-1 size-3.5 shrink-0 animate-spin" />
          )}
          {onOpen && busy !== o.key && (
            <button
              type="button"
              onClick={() => onOpen(o.taskId)}
              className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
              aria-label="Дэлгэрэнгүй"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </li>
        );
      })}
    </ul>
  );
}
