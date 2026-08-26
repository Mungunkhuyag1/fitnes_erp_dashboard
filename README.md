# WinFit Dashboard

Next.js 16 (App Router) · React 19 · **shadcn/ui** (Base UI) · Tailwind CSS 4 · TypeScript

## Ажиллуулах

```bash
cp .env.example .env.local     # NEXT_PUBLIC_API_URL
npm install
npm run dev                    # → http://localhost:3101
```

Backend (`../backend`) нь **3100** порт дээр ажиллаж байх ёстой.

## Бүтэц

```
src/
├── app/
│   ├── (dashboard)/        ← ажилтны хэсэг (нэвтрэлт шаардана)
│   ├── login/
│   ├── change-password/
│   ├── layout.tsx · providers.tsx
│   └── globals.css         ← shadcn токенууд (light + dark)
├── components/
│   ├── ui/                 ← shadcn компонентууд (өөрийн эзэмшилд)
│   ├── app-shell.tsx       ← sidebar + header
│   └── app-nav.tsx         ← цэсний тодорхойлолт (эрхээр шүүгддэг)
├── hooks/use-api.ts        ← GET + автомат сэргээлт
├── lib/
│   ├── api.ts              ← fetch + токен + 401 дээр автомат refresh
│   ├── auth.tsx            ← AuthProvider, useAuth, can(role)
│   ├── format.ts           ← мөнгө/огноо/утас — НЭГ эх сурвалж
│   └── utils.ts            ← cn()
└── proxy.ts                ← нэвтрээгүй бол /login (Next 16-д middleware→proxy)
```

## Дүрмүүд

1. **Загварын токен ашиглана** — `bg-background`, `text-muted-foreground`,
   `border-border`. Түүхий hex, `bg-gray-900` бичихгүй
2. **Форматлалт зөвхөн `lib/format.ts`-ээр** — огноо бүр `Asia/Ulaanbaatar`
   бүсээр, мөнгө бүр ижил харагдана
3. **Жагсаалт бүр хуудаслалттай** — backend `PageResult` буцаадаг
   (`{items, total, page, limit, totalPages}`)
4. **Эрхийн шалгалт хоёр талд** — UI-д `can('manager')`-аар нуух, гэхдээ
   жинхэнэ хамгаалалт backend дээр. `proxy.ts` нь зөвхөн чиглүүлэлт
5. **`₮` тэмдэгтийг моно фонтоор бүү бич** — өмнөх цифртэйгээ давхцана.
   `money()` нь нарийн зай нэмдэг
6. **Огноог `mn-MN` локалаар бүү форматла** — браузер бүр дэмждэггүй, en-US
   руу уначихдаг (`01/31/2027`). `lib/format.ts` нь `YYYY-MM-DD` угсардаг
7. **`Date.now()`-ыг render үед бүү дууд** — хугацааны хүрээг backend-д
   `days=N` гэж илгээж СЕРВЕРТ тооцуулна (клиентийн цагийн зөрүү ч арилна)
8. **`<Button render={<Link/>}>` бүү бич** — `LinkButton` хэрэглэ
   (Base UI-д `nativeButton={false}` шаардлагатай)

## Графикийн палитр

`globals.css`-ийн `--chart-1..5` нь **батлагдсан категорийн палитр**:

| Слот | Light | Dark | Хэрэглээ |
|---|---|---|---|
| 1 | `#2a78d6` хөх | `#3987e5` | Бэлэн орлого · нэг цувралын анхдагч |
| 2 | `#eb6834` хүрэн | `#d95926` | Онлайн орлого |
| 3 | `#1baf7a` номин | `#199e70` | Шүүгээний орлого |
| 4 | `#eda100` шар | `#c98500` | Гараар бүртгэсэн |
| 5 | `#e87ba4` бэж | `#d55181` | Нөөц |

shadcn-ийн neutral анхдагч нь **бүгд саарал** (chroma 0) байсныг сольсон.

Дүрмүүд:
- **Дараалал тогтмол** — цуврал алга болоход бусад нь өнгө солихгүй
- Хоёулаа загварт өнгөний ялгааны шалгалт (CVD ΔE, contrast, lightness band)
  давсан. Light: worst adjacent CVD ΔE 9.1 · dark: 8.4 (≥8 шаардлага)
- Stacked график дээр хэсгүүдийн хооронд **2px дэвсгэрийн зай**
- Light загварт номин/шар өнгө 3:1 контрастад хүрэхгүй тул график доор
  **дүнг бичгээр** харуулна — өнгө дангаараа таних цорын ганц арга байж болохгүй
- Оргил утгыг **өөр өнгөөр биш**, ижил өнгийн тодоор онцолно

## Токен

`localStorage` (`winfit.access` / `winfit.refresh`) + нууц биш `winfit_in=1`
cookie. Cookie нь зөвхөн `proxy.ts`-д «нэвтэрсэн үү» гэдгийг мэдэгдэнэ —
эрхийн шалгалт хийхгүй.

Access токен 15 минутын дараа дуусахад `api.ts` өөрөө refresh хийж хүсэлтийг
дахин илгээнэ; ажилтан юу ч мэдрэхгүй.
