'use client';

import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email, note: note || undefined });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Алдаа гарлаа');
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        {sent ? (
          <div className="text-center">
            <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              Хүсэлт хүлээн авлаа
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Админ таны хүсэлтийг хараад{' '}
              <span className="font-medium">түр нууц үг</span> тавьж танд
              мэдэгдэнэ. Түүгээр нэвтрэхэд шинэ нууц үг тохируулах дэлгэц
              гарч ирнэ.
            </p>
            <Button
              variant="outline"
              className="mt-6 w-full"
              render={<Link href="/login" />}
            >
              <ArrowLeft className="size-4" />
              Нэвтрэх хуудас руу
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">
              Нууц үгээ мартсан уу?
            </h1>
            {/*
              Систем и-мэйл ИЛГЭЭДЭГГҮЙ. Үүнийг эхнээс нь ил хэлэх нь зөв:
              эс бөгөөс хэрэглэгч мэйлээ хүлээж цаг алдана.
            */}
            <p className="text-muted-foreground mt-1.5 text-sm">
              Админд хүсэлт үлдээнэ. И-мэйл илгээгдэхгүй — админ тантай
              шууд холбогдож түр нууц үг өгнө.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">И-мэйл</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="bataa@winfit.mn"
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Тэмдэглэл</Label>
                <Textarea
                  id="note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Холбоо барих утас г.м. (заавал биш)"
                />
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
                Хүсэлт илгээх
              </Button>
            </form>

            <Button
              variant="ghost"
              className="mt-4 w-full"
              render={<Link href="/login" />}
            >
              <ArrowLeft className="size-4" />
              Буцах
            </Button>
          </>
        )}
      </div>
    </AuthShell>
  );
}
