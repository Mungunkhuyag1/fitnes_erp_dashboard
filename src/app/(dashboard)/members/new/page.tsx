'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { GenderPicker, type Gender } from '@/components/gender-picker';
import { LinkButton } from '@/components/link-button';
import { PageHeader } from '@/components/page-header';
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
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

export default function NewMemberPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [emName, setEmName] = useState('');
  const [emPhone, setEmPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<{ id: string; memberNo: number }>('/members', {
        name,
        phone,
        email: email || undefined,
        note: note || undefined,
        gender: gender ?? undefined,
        birthDate: birthDate || undefined,
        emergencyName: emName || undefined,
        emergencyPhone: emPhone || undefined,
      });
      toast.success(`№${created.memberNo} бүртгэгдлээ`, {
        description: 'Дараа нь терминал дээр царайгаа уншуулна',
      });
      router.replace(`/members/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Шинэ гишүүн" description="Бүртгэл үүсгэх">
        <LinkButton variant="ghost" href="/members">
          <ArrowLeft className="size-4" />
          Буцах
        </LinkButton>
      </PageHeader>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Зүүнд ЗААВАЛ талбар, баруунд заавал биш — өргөн дэлгэц дээр
            хоосон зай үлдэхгүй бөгөөд «юуг заавал бөглөх вэ» нь ил. */}
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Үндсэн мэдээлэл</CardTitle>
              <CardDescription>
                Терминал, Wallet карт хоёулаа ашиглана
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Нэр *</Label>
                <Input
                  id="name"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Батаа"
                />
                <p className="text-muted-foreground text-xs">
                  Терминал дээр гарч байдаг цорын ганц талбар.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Утас *</Label>
                <Input
                  id="phone"
                  required
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="99112233"
                />
                <p className="text-muted-foreground text-xs">
                  +976, зай, зураас зөвшөөрнө. Wallet карттай холбогдох гол
                  түлхүүр тул зөв байх нь чухал.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Нэмэлт мэдээлэл</CardTitle>
              <CardDescription>
                Заавал биш — аль нэгийг нь орхиж болно
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Хүйс</Label>
                <GenderPicker id="gender" value={gender} onChange={setGender} />
                <p className="text-muted-foreground text-xs">
                  Шүүгээ олгоход аль өрөөний гэдгийг урьдчилан сонгоно.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Төрсөн огноо</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">И-мэйл</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emName">Яаралтай үед холбоо барих</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    id="emName"
                    value={emName}
                    onChange={(e) => setEmName(e.target.value)}
                    placeholder="Нэр, хэн болох"
                  />
                  <Input
                    id="emPhone"
                    inputMode="tel"
                    value={emPhone}
                    onChange={(e) => setEmPhone(e.target.value)}
                    placeholder="Утас"
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Бэртэл, эрүүл мэндийн асуудал гарвал ажилтан хэнд залгахаа
                  мэдэж байх ёстой.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Тэмдэглэл</Label>
                <Textarea
                  id="note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Эрүүл мэндийн онцлог, гэрээний дугаар г.м."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <p className="text-destructive bg-destructive/8 rounded-md px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="bg-background/80 sticky bottom-0 flex flex-wrap items-center gap-3 border-t py-3 backdrop-blur">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Бүртгэх
          </Button>
          <LinkButton variant="ghost" href="/members">
            Цуцлах
          </LinkButton>
          <p className="text-muted-foreground ml-auto text-xs">
            Бүртгэсний дараа гишүүнийг терминал руу автоматаар бичнэ. Дараа нь
            терминал дээр царайгаа нэг удаа уншуулахад л хангалттай.
          </p>
        </div>
      </form>
    </div>
  );
}
