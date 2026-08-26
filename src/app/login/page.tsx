'use client';

import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';

function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await signIn(email, password);
      // Түр нууц үгтэй бол эхлээд солиулна.
      router.replace(
        user.mustChangePassword ? '/change-password' : (params.get('next') ?? '/'),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Нэвтрэх боломжгүй');
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-3xl font-semibold tracking-tight">Нэвтрэх</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Ажилтны хэсэгт нэвтрэхийн тулд мэдээллээ оруулна уу
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">И-мэйл</Label>
          {/* Иконыг талбарын дотор байрлуулна — жишиг дизайны нэгэн адил.
              `pl-9` нь текстийг икон дээр давхарлахаас сэргийлнэ. */}
          <div className="relative">
            <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@winfit.mn"
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Нууц үг</Label>
          <div className="relative">
            <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
        </div>

        {error && (
          <p
            role="alert"
            className="text-destructive bg-destructive/8 rounded-md px-3 py-2 text-sm"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Нэвтрэх
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link
          href="/forgot-password"
          className="hover:text-foreground underline-offset-4 transition-colors hover:underline"
        >
          Нууц үгээ мартсан уу?
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
