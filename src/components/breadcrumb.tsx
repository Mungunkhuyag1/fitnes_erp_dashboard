'use client';

import { ChevronRight, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/components/app-nav';

/** Гүн хуудсуудын нэр — URL-аас гарахгүй тул гараар. */
const LEAF: Record<string, string> = {
  new: 'Шинэ',
  edit: 'Засах',
  // Тохиргооны дэд хуудсууд. Эдгээр нь үндсэн цэсэнд БАЙХГҮЙ тул
  // (Тохиргоо нь цэсний доод талд тусад нь байрладаг) энд нэрлэнэ.
  profile: 'Профайл',
  password: 'Нууц үг',
  general: 'Ерөнхий',
  staff: 'Ажилтны эрх',
  lockers: 'Шүүгээ',
  reminders: 'Сануулга',
  mail: 'Мэдэгдэл',
  connections: 'Холболт',
  'staff-users': 'Ажилтан',
  diagnose: 'Оношилгоо',
};

/** Үндсэн цэсэнд байхгүй боловч нэртэй байх ёстой үндсэн замууд. */
const ROOT: Record<string, string> = {
  '/settings': 'Тохиргоо',
};

/**
 * Толгойн зам заагч.
 *
 * Эхний хэсгийг цэснээс нь олж нэрлэнэ. Гүн хэсэг нь ихэвчлэн UUID байдаг —
 * түүнийг ХАРУУЛАХГҮЙ, «Дэлгэрэнгүй» гэж бичнэ: 36 тэмдэгтийн санамсаргүй
 * мөр толгойд байрлуулах нь ажилтанд юу ч хэлэхгүй.
 */
export function Breadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);

  const all = NAV.flatMap((g) => g.items);
  const root = parts.length ? `/${parts[0]}` : '/';
  const rootItem = all.find((i) => i.href === root);

  const crumbs: { label: string; href?: string }[] = [
    { label: 'Нүүр', href: '/' },
  ];
  if (rootItem && rootItem.href !== '/') {
    crumbs.push({ label: rootItem.label, href: rootItem.href });
  } else if (ROOT[root]) {
    crumbs.push({ label: ROOT[root], href: root });
  }
  for (const seg of parts.slice(1)) {
    crumbs.push({ label: LEAF[seg] ?? 'Дэлгэрэнгүй' });
  }

  return (
    <nav aria-label="Зам" className="flex min-w-0 items-center gap-1.5 text-sm">
      <LayoutGrid className="text-muted-foreground size-4 shrink-0" />
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="text-muted-foreground/60 size-3.5 shrink-0" />
            )}
            {c.href && !last ? (
              <Link
                href={c.href}
                className="text-muted-foreground hover:text-foreground truncate transition-colors"
              >
                {c.label}
              </Link>
            ) : (
              <span
                className="truncate font-medium"
                aria-current={last ? 'page' : undefined}
              >
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
