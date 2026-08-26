'use client';

import {
  BarChart3,
  DoorOpen,
  KeyRound,
  LayoutDashboard,
  MonitorSmartphone,
  Package,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/auth';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Шаардлагатай хамгийн доод эрх. */
  min?: Role;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Хажуугийн цэс.
 *
 * Дараалал нь ресепшний ӨДӨР ТУТМЫН хэрэглээгээр: эхлээд нүүр, гишүүд,
 * шүүгээ, ирц — эдгээрийг өдөрт олон удаа нээнэ. Удирдлагын хэсэг доор.
 */
export const NAV: NavGroup[] = [
  {
    label: 'Ажил',
    items: [
      { href: '/', label: 'Нүүр', icon: LayoutDashboard },
      { href: '/members', label: 'Гишүүд', icon: Users },
      { href: '/lockers', label: 'Шүүгээ', icon: KeyRound },
      { href: '/check-ins', label: 'Ирц', icon: DoorOpen },
      { href: '/terminal', label: 'Терминал', icon: MonitorSmartphone },
      { href: '/invoices', label: 'Төлбөр', icon: Receipt },
    ],
  },
  {
    label: 'Удирдлага',
    items: [
      { href: '/packages', label: 'Багц', icon: Package },
      { href: '/reports', label: 'Тайлан', icon: BarChart3 },
      { href: '/sync', label: 'Синк', icon: RefreshCw, min: 'manager' },
      { href: '/audit', label: 'Аудит', icon: ShieldCheck, min: 'manager' },
    ],
  },
];
