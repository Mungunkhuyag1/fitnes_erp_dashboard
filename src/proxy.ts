import { NextResponse, type NextRequest } from 'next/server';

/**
 * Хөнгөн чиглүүлэлт — нэвтрээгүй бол `/login` руу.
 *
 * Next.js 16-д `middleware` нь `proxy` болж нэр солигдсон (ижил ажиллагаа).
 *
 * ⚠ Энэ нь ХАМГААЛАЛТ БИШ. `winfit_in` cookie-д нууц мэдээлэл байхгүй, зүгээр
 * л «токен байгаа» гэсэн тэмдэглэгээ. Жинхэнэ эрхийн шалгалт backend дээр
 * (JWT + дүр) хийгддэг — cookie-г гараар тавьсан ч API юу ч буцаахгүй.
 */
/**
 * Нэвтрэхгүйгээр хандах замууд.
 *
 * `/forgot-password` — нууц үгээ мартсан хүн ЯГ ЭНЭ ҮЕД нэвтэрч чадахгүй
 * байгаа тул нээлттэй байх ёстой (эс бөгөөс нэвтрэх шаардана гэсэн
 * тойрог үүснэ).
 */
const PUBLIC = ['/login', '/forgot-password', '/pay'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = req.cookies.get('winfit_in')?.value === '1';
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!signedIn && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  // Нэвтэрсэн хүнд нэвтрэх/сэргээх хуудас утгагүй — нүүр рүү.
  if (signedIn && (pathname === '/login' || pathname === '/forgot-password')) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)).*)'],
};
