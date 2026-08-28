'use client';

import { Check, Loader2, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useApi } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import { qs, type Page } from '@/lib/api';
import { phone as fmtPhone } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface PickedMember {
  id: string;
  memberNo: number;
  name: string;
  phone: string | null;
  status: string;
}

/**
 * Гишүүн хайж сонгох.
 *
 * Ресепшн хүний нэрийг бүтнээр бичихгүй — 2-3 тэмдэгт бичээд сонгоно.
 * Утсаар ч хайж болно (нормчилсон хэлбэрээр таардаг).
 */
export function MemberPicker({
  value,
  onChange,
  placeholder = 'Нэр эсвэл утсаар хайх…',
}: {
  value: PickedMember | null;
  onChange: (m: PickedMember | null) => void;
  placeholder?: string;
}) {
  const [term, setTerm] = useState('');
  const q = useDebounce(term, 250);
  const { data, loading } = useApi<Page<PickedMember>>(
    !value && q.trim().length >= 2
      ? `/members${qs({ q, limit: 8 })}`
      : null,
  );

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{value.name}</p>
          <p className="text-muted-foreground font-mono text-xs">
            №{value.memberNo} · {fmtPhone(value.phone)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setTerm('');
          }}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Сонголтыг цуцлах"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          autoFocus
        />
        {loading && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {q.trim().length >= 2 && (
        <div className="max-h-56 overflow-y-auto rounded-lg border">
          {data?.items.length ? (
            data.items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange(m)}
                className={cn(
                  'hover:bg-accent/50 flex w-full items-center justify-between gap-2',
                  'px-3 py-2 text-left transition-colors',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{m.name}</span>
                  <span className="text-muted-foreground block font-mono text-xs">
                    №{m.memberNo} · {fmtPhone(m.phone)}
                  </span>
                </span>
                <Check className="text-muted-foreground size-3.5 shrink-0 opacity-0" />
              </button>
            ))
          ) : (
            <p className="text-muted-foreground px-3 py-4 text-center text-sm">
              {loading ? 'Хайж байна…' : 'Олдсонгүй'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
