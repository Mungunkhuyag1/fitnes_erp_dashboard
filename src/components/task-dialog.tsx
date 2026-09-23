'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorToast } from '@/lib/errors';
import { FilterSelect, type FilterOption } from '@/components/filter-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export type TaskKind = 'once' | 'daily' | 'weekly' | 'monthly';

export const KIND_LABEL: Record<TaskKind, string> = {
  once: 'Нэг удаа',
  daily: 'Өдөр бүр',
  weekly: '7 хоног бүр',
  monthly: 'Сар бүр',
};

const KIND_OPTIONS: FilterOption[] = (
  ['once', 'daily', 'weekly', 'monthly'] as TaskKind[]
).map((k) => ({ value: k, label: KIND_LABEL[k] }));

export interface TaskRule {
  id: string;
  title: string;
  notes: string | null;
  kind: TaskKind;
  startsOn: string;
  atTime: string | null;
  endsOn: string | null;
  assigneeId: string | null;
  active: boolean;
}

interface StaffBrief {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Админ',
  manager: 'Менежер',
  reception: 'Ресепшн',
};

/** Хоосон маягтын анхны утга — «өнөөдөр, нэг удаа». */
function blank(day: string): TaskRule {
  return {
    id: '',
    title: '',
    notes: null,
    kind: 'once',
    startsOn: day,
    atTime: null,
    endsOn: null,
    assigneeId: null,
    active: true,
  };
}

/**
 * Ажил төлөвлөх / засах цонх.
 *
 * ★ ТУЛГУУР ОГНОО НЬ ДАВТАЛТЫГ ТОДОРХОЙЛНО
 *
 * Гараг, сарын өдрийг ТУСДАА сонгуулахгүй: тэдгээр нь эхлэх огноотой
 * зөрөх боломжтой хоёр дахь эх сурвалж болно. «7 хоног бүр» гэж
 * сонгоод 9-р сарын 21 (Даваа) гэж тавибал даваа бүр давтагдана.
 * Дэлгэц үүнийг ХЭЛЖ өгнө — таах шаардлагагүй.
 */
export function TaskDialog({
  open,
  onClose,
  task,
  defaultDay,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** `null` = шинэ ажил. */
  task: TaskRule | null;
  /** Календарь дээр сонгосон өдөр — шинэ ажлын анхны утга. */
  defaultDay: string;
  onSaved: () => void;
}) {
  const { can } = useAuth();
  const manager = can('manager');
  /*
    ★ ТӨЛӨВИЙГ `key`-ЭЭР ШИНЭЧЛЭНЭ, ЭФФЕКТЭЭР БИШ.

    Урьд нь `useEffect` дотроо `setForm` дууддаг байв — төслийн
    `react-hooks/set-state-in-effect` дүрэм түүнийг хориглодог: эффектээс
    setState дуудвал нэмэлт дүрслэл үүсэж, цонх нээхэд хуучин утга
    агшаар анивчдаг.

    Эцэг нь `key`-г солиход компонент бүхэлдээ дахин үүсэх тул
    анхны утга ҮРГЭЛЖ зөв байна (React-ын зөвлөдөг арга:
    «төлөвийг key-гээр шинэчлэх»).
  */
  const [form, setForm] = useState<TaskRule>(task ?? blank(defaultDay));
  const [saving, setSaving] = useState(false);

  // Хариуцагчийн жагсаалт — MANAGER-ээс дээш эрхтэйд л нээлттэй.
  const { data: staff } = useApi<StaffBrief[]>(manager ? '/staff/brief' : null);

  const staffOptions: FilterOption[] = [
    { value: '', label: 'Хэн ч — бүгдэд харагдана' },
    ...(staff ?? [])
      .filter((s) => s.active || s.id === form.assigneeId)
      .map((s) => ({
        value: s.id,
        label: `${s.name} · ${ROLE_LABEL[s.role] ?? s.role}`,
      })),
  ];

  async function save() {
    if (form.title.trim().length < 2) {
      toast.error('Гарчиг хэтэрхий богино байна');
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        notes: form.notes?.trim() || undefined,
        kind: form.kind,
        startsOn: form.startsOn,
        atTime: form.atTime || null,
        // «Нэг удаа» дээр төгсгөл утгагүй — backend татгалзана.
        endsOn: form.kind === 'once' ? null : form.endsOn || null,
        assigneeId: form.assigneeId || null,
      };
      if (form.id) await api.patch(`/tasks/${form.id}`, body);
      else await api.post('/tasks', body);
      toast.success(form.id ? 'Хадгаллаа' : 'Ажил төлөвлөгдлөө');
      onSaved();
      onClose();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    setSaving(true);
    try {
      await api.del(`/tasks/${form.id}`);
      toast.success('Ажлыг унтраалаа', {
        description: 'Өнгөрсөн түүх хэвээр үлдэнэ',
      });
      onSaved();
      onClose();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{form.id ? 'Ажил засах' : 'Ажил төлөвлөх'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Гарчиг">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Жишээ: Шүүгээний түлхүүр тоолох"
              disabled={!manager}
            />
          </Field>

          <Field label="Давталт">
            <FilterSelect
              value={form.kind}
              onChange={(v) => setForm({ ...form, kind: v as TaskKind })}
              options={KIND_OPTIONS}
              placeholder="Давталт"
              className="w-full"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={form.kind === 'once' ? 'Огноо' : 'Эхлэх огноо'}
              hint={
                form.kind === 'weekly'
                  ? 'Энэ огнооны ГАРАГААР давтана'
                  : form.kind === 'monthly'
                    ? 'Энэ огнооны ӨДРӨӨР давтана'
                    : undefined
              }
            >
              <Input
                type="date"
                value={form.startsOn}
                onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
                disabled={!manager}
              />
            </Field>
            <Field label="Цаг (заавал биш)">
              <Input
                type="time"
                value={form.atTime ?? ''}
                onChange={(e) =>
                  setForm({ ...form, atTime: e.target.value || null })
                }
                disabled={!manager}
              />
            </Field>
          </div>

          {/* «Нэг удаа» дээр төгсгөл байхгүй — талбарыг нуух нь
              идэвхгүй болгохоос ойлгомжтой. */}
          {form.kind !== 'once' && (
            <Field label="Дуусах огноо (заавал биш)">
              <Input
                type="date"
                value={form.endsOn ?? ''}
                onChange={(e) =>
                  setForm({ ...form, endsOn: e.target.value || null })
                }
                disabled={!manager}
              />
            </Field>
          )}

          {manager && (
            <Field label="Хэн хийх вэ">
              <FilterSelect
                value={form.assigneeId ?? ''}
                onChange={(v) => setForm({ ...form, assigneeId: v || null })}
                options={staffOptions}
                placeholder="Хэн ч"
                className="w-full"
              />
            </Field>
          )}

          <Field label="Тэмдэглэл (заавал биш)">
            <Input
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
              disabled={!manager}
            />
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {/* Унтраах нь ЗӨВХӨН байгаа ажил дээр. Устгадаггүйг
              тайлбарлана — эс бөгөөс «устгасан ч түүхэнд байна» гэж
              гайхна. */}
          {form.id && manager ? (
            <Button variant="ghost" onClick={deactivate} disabled={saving}>
              <Trash2 className="size-4" />
              Унтраах
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Болих
            </Button>
            {manager && (
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Хадгалах
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      {children}
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  );
}
