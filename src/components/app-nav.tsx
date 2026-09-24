'use client';

import {
  BarChart3,
  CalendarCheck,
  MessageSquare,
  DoorOpen,
  Flower2,
  Gift,
  KeyRound,
  LayoutDashboard,
  MonitorSmartphone,
  Package,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Tag,
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
      // Йог — заалны бүртгэлээс ТУСДАА. Терминал оролцохгүй, хаалгыг
      // админ өөрөө нээдэг тул энэ нь цэвэр хичээлийн бүртгэл.
      { href: '/yoga', label: 'Йог', icon: Flower2 },
      // Ажилтны ДОТООД даалгавар — гишүүдэд хамааралгүй тул
      // «Удирдлага» биш «Ажил» бүлэгт: өдөр тутам харах зүйл.
      { href: '/tasks', label: 'Ажлын төлөвлөгөө', icon: CalendarCheck },
      // Facebook-ын чат — ресепшн хариулдаг тул эрхийн хязгааргүй.
      { href: '/inbox', label: 'Чат', icon: MessageSquare },
      { href: '/terminal', label: 'Терминал', icon: MonitorSmartphone },
      { href: '/invoices', label: 'Төлбөр', icon: Receipt },
    ],
  },
  {
    label: 'Удирдлага',
    items: [
      { href: '/packages', label: 'Багц', icon: Package },
      { href: '/promotions', label: 'Урамшуулал', icon: Tag, min: 'admin' },
      { href: '/gift-cards', label: 'Бэлгийн карт', icon: Gift, min: 'manager' },
      { href: '/reports', label: 'Тайлан', icon: BarChart3 },
      { href: '/sync', label: 'Синк', icon: RefreshCw, min: 'manager' },
      { href: '/audit', label: 'Аудит', icon: ShieldCheck, min: 'manager' },
    ],
  },
];
