'use client';

import {
  Bell,
  Building2,
  KeyRound,
  Mail,
  Plug,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { useAuth, type Role } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface Section {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Шаардлагатай хамгийн доод эрх. Байхгүй бол БҮХ ажилтанд нээлттэй. */
  min?: Role;
}

/**
 * Тохиргооны дэд цэс.
 *
 * Эхний бүлэг нь ХУВИЙН (профайл, нууц үг) — бүх ажилтанд нээлттэй.
 * Хоёр дахь нь БАЙГУУЛЛАГЫН — зөвхөн админ. Ийм дараалал нь ресепшн
 * ажилтан тохиргоо нээхэд өөрт хамаатай зүйлээ шууд хардаг.
 */
const SECTIONS: { label: string; items: Section[] }[] = [
  {
    label: 'Хувийн',
    items: [
      { href: '/settings/profile', label: 'Профайл', icon: User },
      { href: '/settings/password', label: 'Нууц үг', icon: KeyRound },
    ],
  },
  {
    label: 'Байгууллага',
    items: [
      { href: '/settings/general', label: 'Ерөнхий', icon: Building2, min: 'admin' },
      { href: '/settings/staff', label: 'Ажилтны эрх', icon: ShieldCheck, min: 'admin' },
      { href: '/settings/lockers', label: 'Шүүгээ', icon: KeyRound, min: 'admin' },
      { href: '/settings/reminders', label: 'Сануулга', icon: Bell, min: 'admin' },
      { href: '/settings/staff-users', label: 'Ажилтан', icon: Users, min: 'admin' },
      { href: '/settings/mail', label: 'Мэдэгдэл', icon: Mail, min: 'admin' },
      { href: '/settings/connections', label: 'Холболт', icon: Plug, min: 'admin' },
    ],
  },
];

const RANK: Record<Role, number> = { reception: 1, manager: 2, admin: 3 };

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const groups = SECTIONS.map((g) => ({
    ...g,
    items: g.items.filter(
      (i) => !i.min || (user && RANK[user.role] >= RANK[i.min]),
    ),
  })).filter((g) => g.items.length);

  return (
    <div className="space-y-5">
      <PageHeader title="Тохиргоо" description="Хувийн ба ажиллагааны тохируулга" />

      <div className="grid gap-5 lg:grid-cols-[14rem_1fr]">
        {/* Жижиг дэлгэц дээр хэвтээ гүйдэг мөр болно. */}
        <nav className="flex gap-4 overflow-x-auto pb-1 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
          {groups.map((g) => (
            <div key={g.label} className="flex shrink-0 gap-1 lg:flex-col">
              <p className="text-muted-foreground hidden px-3 pb-1 text-[0.7rem] font-medium tracking-wider uppercase lg:block">
                {g.label}
              </p>
              {g.items.map((it) => {
                const Icon = it.icon;
                const on = pathname === it.href;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      'focus-visible:ring-ring/50 outline-none focus-visible:ring-3',
                      on
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent/50',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
