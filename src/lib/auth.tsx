'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, clearTokens, getToken, setTokens } from './api';

export type Role = 'reception' | 'manager' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  roleLabel?: string;
  /** Профайл зураг — `data:` URL эсвэл `null`. */
  avatar?: string | null;
  mustChangePassword: boolean;
}

const RANK: Record<Role, number> = { reception: 1, manager: 2, admin: 3 };

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => void;
  /** `min` ба түүнээс дээш эрхтэй эсэх. */
  can: (min: Role) => boolean;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [tick, setTick] = useState(0);

  /**
   * Токен байхгүй үед ч `Promise.resolve(null)`-ээр дамжина.
   *
   * Шалтгаан: `setState`-ыг effect-ийн биед СИНХРОНООР дуудвал cascading
   * render үүсдэг (`react-hooks/set-state-in-effect`). Promise callback дотор
   * бол microtask-д ажиллах тул асуудалгүй.
   */
  useEffect(() => {
    let alive = true;
    const pending: Promise<AuthUser | null> = getToken()
      ? api.get<AuthUser>('/auth/me')
      : Promise.resolve(null);

    pending
      .then((u) => {
        if (!alive) return;
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [tick]);

  const load = useCallback(async () => {
    setTick((t) => t + 1);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.anon.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/login', { email, password });
    setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    return res.user;
  }, []);

  const signOut = useCallback(() => {
    clearTokens();
    setUser(null);
    router.replace('/login');
  }, [router]);

  const can = useCallback(
    (min: Role) => !!user && RANK[user.role] >= RANK[min],
    [user],
  );

  return (
    <Ctx.Provider value={{ user, loading, signIn, signOut, can, refreshUser: load }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth нь AuthProvider дотор байх ёстой');
  return ctx;
}
