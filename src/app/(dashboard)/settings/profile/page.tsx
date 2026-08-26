'use client';

import { Camera, Loader2, LogOut, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth, type AuthUser } from '@/lib/auth';

/** Зургийн дээд хэмжээ — талбарын хязгаараас ЯЛИМГҮЙ доогуур. */
const AVATAR_PX = 128;

/**
 * Зургийг браузер дээр 128×128 болгож жижигрүүлнэ.
 *
 * ЯАГААД КЛИЕНТ ДЭЭР ВЭ: утасны камерын зураг 3–5МБ байдаг. Түүнийг
 * шууд илгээвэл сүлжээ, сан хоёуланг дэмий дарамтална. 128px нь дугуй
 * аватарт хангалттай (~10КБ) бөгөөд сервер тал 200КБ-аас татгалзана.
 *
 * Дөрвөлжин болгож ТАСАЛНА — сунгавал царай гажина.
 */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Файл уншиж чадсангүй'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Зураг таних боломжгүй'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_PX;
        canvas.height = AVATAR_PX;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas дэмжигдэхгүй'));
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          AVATAR_PX,
          AVATAR_PX,
        );
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { user, refreshUser, signOut } = useAuth();
  if (!user) return null;
  return <ProfileForm key={user.id} user={user} onSaved={refreshUser} onSignOut={signOut} />;
}

function ProfileForm({
  user,
  onSaved,
  onSignOut,
}: {
  user: AuthUser;
  onSaved: () => Promise<void>;
  onSignOut: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState<string | null>(user.avatar ?? null);
  const [busy, setBusy] = useState(false);


  const dirty = name !== user.name || avatar !== (user.avatar ?? null);

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      setAvatar(await shrink(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Зураг боловсруулж чадсангүй');
    }
  }

  async function save() {
    setBusy(true);
    try {
      await api.patch('/auth/me', { name, avatar: avatar ?? '' });
      await onSaved();
      toast.success('Хадгаллаа');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="space-y-5">
      <div className="grid items-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Хувийн мэдээлэл</CardTitle>
            <CardDescription>
              И-мэйл болон эрхийг зөвхөн админ өөрчилнө
            </CardDescription>
            <CardAction>
              <Button size="sm" variant="outline" onClick={onSignOut}>
                <LogOut className="size-4" />
                Гарах
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <span className="bg-accent text-accent-foreground relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-medium">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image шаардлагагүй
                  <img
                    src={avatar}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  (user.name?.[0] ?? '?')
                )}
              </span>
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void pick(e.target.files?.[0]);
                    // Ижил файлыг дахин сонгоход `change` дахин галлагаана.
                    e.target.value = '';
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Camera className="size-3.5" />
                    Зураг сонгох
                  </Button>
                  {avatar && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAvatar(null)}
                    >
                      <Trash2 className="size-3.5" />
                      Хасах
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  PNG, JPEG, WEBP — {AVATAR_PX}×{AVATAR_PX} болж жижигрэнэ
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Нэр</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>И-мэйл</Label>
                <Input value={user.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Эрх</Label>
                <Input value={user.roleLabel ?? user.role} disabled />
              </div>
            </div>

            <Button onClick={save} disabled={busy || !dirty || !name.trim()}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Хадгалах
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
