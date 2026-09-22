import { redirect } from 'next/navigation';

/**
 * Холболтын хэсэг нь дэд цэс болсон.
 *
 * Урьд нь бүх холболт НЭГ хуудсанд байсан бөгөөд Facebook нэмэгдэхэд
 * таван карт болж, гүйлгэхгүйгээр юу ч олдохгүй болсон. Одоо тус
 * бүрдээ хуудастай — энэ зам нь эхнийх рүү нь шилжүүлнэ.
 */
export default function ConnectionsIndex() {
  redirect('/settings/connections/terminal');
}
