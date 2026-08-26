'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function PasswordSettings() {
  const { signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error('Шинэ нууц үг хоёр удаа адил байх ёстой');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      // Нууц үг солиход сервер БҮХ refresh токеныг хүчингүй болгодог —
      // эндээс гаргаж, дахин нэвтрүүлэх нь цорын ганц зөв үйлдэл.
      toast.success('Нууц үг солигдлоо', { description: 'Дахин нэвтэрнэ үү' });
      signOut();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Нууц үг солих</CardTitle>
        <CardDescription>
          Солиход бүх төхөөрөмж дээрх сесс тасарч, дахин нэвтэрнэ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cur">Одоогийн нууц үг</Label>
            <Input
              id="cur"
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">Шинэ нууц үг</Label>
            <Input
              id="new"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Хамгийн багадаа 8 тэмдэгт
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="conf">Шинэ нууц үг (давтах)</Label>
            <Input
              id="conf"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch}
            />
            {mismatch && (
              <p className="text-destructive text-xs">Таарахгүй байна</p>
            )}
          </div>
          <Button type="submit" disabled={busy || mismatch}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Нууц үг солих
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
