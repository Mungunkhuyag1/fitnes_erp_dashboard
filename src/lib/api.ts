/**
 * Backend API клиент.
 *
 * Токеныг `localStorage`-д хадгална, `access` дуусахад `refresh`-ээр
 * АВТОМАТААР шинэчилж хүсэлтийг дахин илгээнэ. Хэрэглэгч 15 минут тутам
 * гарах шаардлагагүй.
 */

const BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3100/api';

const TOKEN_KEY = 'winfit.access';
const REFRESH_KEY = 'winfit.refresh';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /**
     * Юу хийхийг зааж өгөх нэмэлт мөр.
     *
     * Backend нь зарим алдаанд `hint` дагуулж илгээдэг — ялангуяа
     * терминалын холболт салсан үед («заалан дээрх компьютерээ
     * шалгана уу»). Мессежтэй нийлүүлбэл toast хэт урт болно тул
     * тусад нь, тайлбар мөр болгон харуулна.
     */
    readonly hint?: string,
    /** `DeviceUnreachable` гэх мэт машины уншдаг ангилал. */
    readonly code?: string,
  ) {
    super(message);
  }
}

// ── Токен ──

function read(key: string): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(key);
}

export function getToken(): string | null {
  return read(TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  setSignedInHint(true);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  setSignedInHint(false);
}

/**
 * Сервер (middleware) нь `localStorage`-ыг харж чаддаггүй тул НУУЦ БИШ
 * тэмдэглэгээ cookie-д үлдээнэ. Зөвхөн `1` — эрхийн шалгалт хийхгүй,
 * жинхэнэ хамгаалалт нь backend дээр.
 */
function setSignedInHint(on: boolean): void {
  document.cookie = on
    ? 'winfit_in=1; path=/; max-age=2592000; samesite=lax'
    : 'winfit_in=; path=/; max-age=0; samesite=lax';
}

// ── Токен шинэчлэх (зэрэг хүсэлтүүд нэг л удаа) ──

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const token = read(REFRESH_KEY);
  if (!token) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!data.accessToken || !data.refreshToken) return false;
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ── Үндсэн дуудлага ──

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Нэвтрэлтгүй дуудлага (login, /public/*). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (!opts.anonymous) {
      const t = getToken();
      if (t) headers.Authorization = `Bearer ${t}`;
    }
    return fetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  };

  /*
   * ★ СҮЛЖЭЭНИЙ ДОГОЛДЛЫГ ХҮНИЙ ХЭЛЭЭР
   *
   * `fetch` нь сервер хүрэхгүй, холболт тасрах, эсвэл хариу ирэхээс
   * өмнө таслагдахад «Failed to fetch» гэж шиддэг. Тэр мөр нь
   * ажилтанд юу ч хэлэхгүй.
   *
   * ⚠ ХАМГИЙН АЮУЛТАЙ ТАЛ: өөрчлөлт хийдэг дуудлага (POST/PATCH) дээр
   * энэ алдаа гарахад үйлдэл нь СЕРВЕР ДЭЭР БИЕЛСЭН байж болно —
   * зөвхөн хариу нь эргэж ирээгүй. Ажилтан «болсонгүй» гэж бодоод
   * дахин дарвал хоёр удаа хийгдэх эрсдэлтэй. Эрх сунгах нь
   * `idempotencyKey`-ээр хамгаалагдсан ч бусад нь үгүй.
   *
   * Railway дээр шинэ хувилбар гарах мөчид яг ингэж тохиолддог:
   * хүсэлт хуучин процесс дээр биелээд, хариу нь буцахаас өмнө тэр
   * процесс унтарна.
   */
  const mutating = (opts.method ?? 'GET') !== 'GET';
  const call = async (): Promise<Response> => {
    try {
      return await send();
    } catch (e) {
      // Зориуд цуцалсан бол хэвээр дамжуулна — алдаа биш.
      if ((e as Error)?.name === 'AbortError') throw e;
      throw new ApiError(
        0,
        mutating
          ? 'Сервертэй холбогдож чадсангүй. ⚠ Үйлдэл БИЕЛСЭН БАЙЖ БОЛЗОШГҮЙ — ' +
            'дахин оролдохын өмнө жагсаалтаа шинэчилж шалгана уу.'
          : 'Сервертэй холбогдож чадсангүй. Интернэтээ шалгаад дахин оролдоно уу.',
        undefined,
        'NetworkError',
      );
    }
  };

  let res = await call();

  // Access токен дууссан бол нэг удаа шинэчилж дахин оролдоно.
  if (res.status === 401 && !opts.anonymous && read(REFRESH_KEY)) {
    refreshing ??= refreshTokens().finally(() => {
      refreshing = null;
    });
    const ok = await refreshing;
    if (ok) {
      res = await call();
    } else {
      clearTokens();
      // Сесс бүрмөсөн дууссан — ХАТУУ шилжилт хийнэ. Router.push нь React
      // дотроос л боломжтой; энэ модуль React-аас гадна ажилладаг. Мөн хатуу
      // шилжилт нь санах ойд үлдсэн бүх төлөвийг цэвэрлэдэг нь зөв.
      if (typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        location.href = '/login';
      }
    }
  }

  if (!res.ok) {
    let message = `Алдаа гарлаа (${res.status})`;
    let hint: string | undefined;
    let code: string | undefined;
    try {
      const body = (await res.json()) as {
        message?: string | string[];
        hint?: string;
        error?: string;
      };
      if (Array.isArray(body.message)) message = body.message.join(', ');
      else if (body.message) message = body.message;
      hint = body.hint;
      code = body.error;
    } catch {
      /* JSON биш хариу — ерөнхий мессеж үлдээнэ */
    }
    throw new ApiError(res.status, message, hint, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * ЗУРАГ татах — `<img src>` нь толгой дамжуулж чаддаггүй.
 *
 * Токеныг `localStorage`-д хадгалдаг тул зургийг энгийн `src`-ээр авч
 * чадахгүй: нэвтрэлт явахгүй. Хаягт токен залгах нь лог, түүх,
 * referrer-ээр алдагдах эрсдэлтэй. Тиймээс fetch-ээр татаж, `blob:`
 * хаяг болгож өгнө.
 */
async function blob(path: string, signal?: AbortSignal): Promise<string> {
  const t = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
    signal,
  });
  if (!res.ok) throw new ApiError(res.status, `Зураг татагдсангүй (${res.status})`);
  return URL.createObjectURL(await res.blob());
}

export const api = {
  blob,
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  /*
   * `signal` нь заавал биш — урт хүсэлтийг таслахад (царай уншуулах).
   *
   * ⚠ Таслах нь СЕРВЕРИЙГ зогсоохгүй: тэр ажлаа үргэлжлүүлнэ. Серверийг
   * зогсоох шаардлагатай бол тусдаа «цуцлах» дуудлага хэрэгтэй.
   */
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  anon: {
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'POST', body, anonymous: true }),
    get: <T>(path: string) => request<T>(path, { anonymous: true }),
  },
};

/** Query string-ийг цэвэрхэн угсрах (хоосон утгыг алгасна). */
export function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Жагсаалтын нэгдсэн хариу — backend-ийн `PageResult`. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
