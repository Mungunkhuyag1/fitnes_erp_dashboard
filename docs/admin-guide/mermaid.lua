--[[
  Pandoc-ийн ```mermaid блокийг mermaid.js уншиж чадах хэлбэрт хөрвүүлнэ.

  ★ ЯАГААД ЭНЭ ШААРДЛАГАТАЙ ВЭ

  Pandoc нь кодын блокийг `<pre class="mermaid"><code>...</code></pre>` болгодог.
  mermaid.js харин элементийн `textContent`-ийг диаграмын эх бичвэр гэж үзээд
  `innerHTML`-ийг нь SVG-ээр СОЛИНО. Дотор нь `<code>` байвал зурахгүй, эсвэл
  хагас зурсан хог үлдээнэ.

  Тиймээс энгийн `<div class="mermaid">`-ээр орлуулна.
--]]

function CodeBlock(el)
  if el.classes:includes('mermaid') then
    return pandoc.RawBlock('html', '<div class="mermaid">' .. el.text .. '</div>')
  end
end
