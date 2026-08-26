'use client';

import { Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function ChangePasswordPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setError('Шинэ нууц үг таарахгүй байна');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      toast.success('Нууц үг солигдлоо. Дахин нэвтэрнэ үү.');
      // Backend бүх сессийг тасалдаг тул дахин нэвтрэх шаардлагатай.
      signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Нууц үг солих</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          {user?.mustChangePassword
            ? 'Түр нууц үгээ солих шаардлагатай. Үүнийг хийтэл системд орох боломжгүй.'
            : 'Солисны дараа бүх төхөөрөмж дээр дахин нэвтэрнэ.'}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current">
              {user?.mustChangePassword ? 'Түр нууц үг' : 'Одоогийн нууц үг'}
            </Label>
            <div className="relative">
              <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="current"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next">Шинэ нууц үг</Label>
            <div className="relative">
              <KeyRound className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="next"
                type={show ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="h-10 pr-10 pl-9"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Нууц үгийг нуух' : 'Нууц үгийг харуулах'}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 outline-none focus-visible:ring-3"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              Хамгийн багадаа 8 тэмдэгт
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Шинэ нууц үг (давтах)</Label>
            <div className="relative">
              <KeyRound className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={mismatch}
                className="h-10 pl-9"
              />
            </div>
            {mismatch && (
              <p className="text-destructive text-xs">Таарахгүй байна</p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="text-destructive bg-destructive/8 rounded-md px-3 py-2 text-sm"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy || mismatch}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Хадгалах
          </Button>

          {/* Албадсан солилтод буцах зам БАЙХГҮЙ — тэр нь зорилготой:
              түр нууц үгтэй хэвээр системд орох боломжгүй байх ёстой. */}
          {!user?.mustChangePassword && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.back()}
            >
              Буцах
            </Button>
          )}
        </form>
      </div>
    </AuthShell>
  );
}
