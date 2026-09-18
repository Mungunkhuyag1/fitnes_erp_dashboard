import type { NextConfig } from 'next';

/**
 * Төлбөрийн хуудас нь НҮҮР сайт руу нүүсэн (winfit.mn).
 *
 * ⚠ Хуучин холбоосууд ҮЛДЭНЭ: гишүүдэд илгээсэн `/pay/<token>` линк,
 * хадгалсан хавчуурга, Loopy картан дээрх хаяг. Тэднийг 404 болгож
 * орхивол гишүүн төлбөрөө хийж чадахгүй болно — тиймээс шилжүүлнэ.
 */
const PUBLIC_SITE =
  process.env.NEXT_PUBLIC_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
  'https://winfit.mn';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/pay', destination: `${PUBLIC_SITE}/pay`, permanent: false },
      {
        source: '/pay/:path*',
        destination: `${PUBLIC_SITE}/pay/:path*`,
        permanent: false,
      },
      /*
       * Урамшуулал тохиргооноос ҮНДСЭН цэс рүү нүүсэн. Админы
       * хавчуурга, зуршил хоёр хоёулаа хуучин хаяг руу заасаар байх
       * тул 404 болгож орхихгүй.
       */
      {
        source: '/settings/promotions',
        destination: '/promotions',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
