#!/usr/bin/env bash
#
# Админ самбарын гарын авлагыг README.md-ээс PDF болгоно.
#
#   ./build.sh          → admin-guide.html + admin-guide.pdf
#
# ★ ЯАГААД ХОЁР АЛХАМ ВЭ
#
# Pandoc PDF-ийг LaTeX-ээр гаргадаг бөгөөд LaTeX нь Mermaid диаграмыг
# зурж чадахгүй (тэр нь браузерт ажилладаг JS). Иймд эхлээд HTML болгоод,
# Chrome-оор хэвлэнэ — диаграм, монгол фонт, CSS бүгд зөв гарна.

set -euo pipefail
cd "$(dirname "$0")"

OUT_HTML="admin-guide.html"
OUT_PDF="admin-guide.pdf"

# ── Шаардлага шалгах ────────────────────────────────────────────────
if ! command -v pandoc >/dev/null 2>&1; then
  echo "✗ pandoc олдсонгүй. Суулгах:  brew install pandoc" >&2
  exit 1
fi

# Chrome-ийн байршил — macOS, Linux хоёуланд нь.
CHROME=""
for c in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "$(command -v google-chrome || true)" \
  "$(command -v chromium || true)" \
  "$(command -v chromium-browser || true)"
do
  if [ -n "$c" ] && [ -x "$c" ]; then CHROME="$c"; break; fi
done

if [ -z "$CHROME" ]; then
  echo "✗ Google Chrome олдсонгүй — PDF гаргаж чадахгүй." >&2
  echo "  HTML-ийг гаргаад зогсоно. Chrome суулгаад дахин ажиллуулна уу." >&2
fi

# ── 1. Markdown → HTML ──────────────────────────────────────────────
echo "→ HTML үүсгэж байна…"
pandoc README.md \
  --from=gfm \
  --to=html5 \
  --standalone \
  --toc --toc-depth=2 \
  --metadata lang=mn \
  --lua-filter=mermaid.lua \
  --include-in-header=head.html \
  --embed-resources \
  --output="$OUT_HTML"

echo "  ✓ $OUT_HTML"

# ── 2. HTML → PDF ───────────────────────────────────────────────────
if [ -n "$CHROME" ]; then
  echo "→ PDF хэвлэж байна… (диаграм зурагдахыг хүлээнэ)"
  # ⚠ `--virtual-time-budget` байхгүй бол Mermaid зурж дуусахаас нь өмнө
  #   хэвлэж, диаграмын оронд ХООСОН зай үлдээнэ.
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --no-sandbox \
    --no-pdf-header-footer \
    --virtual-time-budget=20000 \
    --run-all-compositor-stages-before-draw \
    --print-to-pdf="$OUT_PDF" \
    "file://$PWD/$OUT_HTML" 2>/dev/null

  if [ -f "$OUT_PDF" ]; then
    echo "  ✓ $OUT_PDF ($(du -h "$OUT_PDF" | cut -f1))"
  else
    echo "✗ PDF үүсээгүй." >&2
    exit 1
  fi
fi
