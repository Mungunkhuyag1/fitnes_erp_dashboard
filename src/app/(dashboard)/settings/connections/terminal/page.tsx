'use client';

import { TerminalConnectionCard } from '@/components/terminal-connection-card';

/**
 * Царай таних терминалын холболт.
 *
 * ⚠ Бусад гадаад үйлчилгээнээс ЯЛГААТАЙ: терминалын хаяг DHCP-ээр
 * солигддог, нууц үгийг заалан дээр солино. Тиймээс `.env` биш,
 * ажилтан өөрөө засах ёстой.
 */
export default function TerminalConnectionSettings() {
  return <TerminalConnectionCard />;
}
