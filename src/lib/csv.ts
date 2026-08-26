/**
 * Хүснэгтийг CSV болгож татаж авах.
 *
 * ГУРВАН нарийн зүйл:
 *
 * 1. **BOM (`﻿`)** — Excel нь BOM-гүй файлыг системийн кодчилолоор
 *    уншдаг тул кирилл үсэг «Ð¡Ð°Ñ€Ð°Ð°» болж эвдэрнэ. BOM нь UTF-8 гэдгийг
 *    хэлнэ.
 * 2. **`;` тусгаарлагч** — олон улсын Excel-д таслал бол аравтын тэмдэг.
 *    Цэг таслал ашиглавал баганууд зөв сална.
 * 3. **Мөр бүрийг хашилтад** — нэр дотор `;`, `"`, мөр таслалт байж болно.
 *    `"` тэмдэгтийг хоёр дахин бичиж мултална.
 */
function cell(v: unknown): string {
  if (v === null || v === undefined) return '""';
  if (v instanceof Date) return `"${v.toISOString()}"`;
  return `"${String(v).replace(/"/g, '""')}"`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: unknown[][],
): void {
  const body = [headers, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
  const blob = new Blob([`﻿${body}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Хөтөч татаж эхлэхийг хүлээнэ — шууд чөлөөлвөл татагдахгүй үлдэж болно.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
