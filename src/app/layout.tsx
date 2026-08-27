import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

/**
 * Урьдчилан харах зургийн БҮТЭН хаяг.
 *
 * Эрэмбэ:
 *   1. `NEXT_PUBLIC_SITE_URL` — өөрийн домэйн тавьсан бол
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel өөрөө өгнө, тохиргоо
 *      мартсан ч зураг ажиллана
 *   3. localhost — хөгжүүлэлт
 *
 * ⚠ Харьцангуй зам ҮЛДЭЭЖ БОЛОХГҮЙ: чат, сошиалын урьдчилан харагч
 * бүтэн http хаяг шаарддаг тул зураггүй хоосон карт гарна.
 */
function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3101';
}

const TITLE = 'WinFit — Фитнесийн удирдлагын систем';
const DESCRIPTION =
  'Гишүүнчлэл, царай таних нэвтрэлт, төлбөр, шүүгээ — бүгд нэг дороос. ' +
  'Гишүүд эрхээ Apple болон Google Wallet картаасаа шууд харна.';

export const metadata: Metadata = {
  /**
   * ⚠ `metadataBase` ЗААВАЛ. Үүнгүй бол OG зургийн зам ХАРЬЦАНГУЙ
   * үлдэж, чат болон сошиалын урьдчилан харах нь зураг татаж чадахгүй —
   * тэдгээр нь бүтэн http хаяг шаарддаг.
   */
  metadataBase: new URL(siteUrl()),
  title: {
    default: TITLE,
    // Дотоод хуудсууд «Гишүүд · WinFit» болно.
    template: '%s · WinFit',
  },
  description: DESCRIPTION,
  applicationName: 'WinFit',
  openGraph: {
    type: 'website',
    siteName: 'WinFit',
    locale: 'mn_MN',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  /**
   * Ажилтны хэсэг — хайлтын системд индексжих ёсгүй. Чат дахь
   * урьдчилан харах нь энэ тугаас хамаарахгүй тул алдагдахгүй.
   */
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="mn"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
