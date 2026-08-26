'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/use-api';

interface Loaded {
  id: string;
  memberNo: number;
  name: string;
  phone: string;
  email: string | null;
  note: string | null;
  gender: Gender | null;
  birthDate: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
}

export default function EditMemberPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useApi<Loaded>(`/members/${id}`);

  if (loading || !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }
  // Ачаалж дуустал форм нь өгөгдөлгүй байх тул `key`-ээр дахин холбоно —
  // эс тэгвээс эхний утгуудыг useState-д хийх шаардлага гарч, effect дотор
  // setState дуудах болно.
  return <EditForm key={data.id} m={data} />;
}

function EditForm({ m }: { m: Loaded }) {
  const router = useRouter();
  const [name, setName] = useState(m.name);
  const [phone, setPhone] = useState(m.phone);
  const [email, setEmail] = useState(m.email ?? '');
  const [note, setNote] = useState(m.note ?? '');
  const [gender, setGender] = useState<Gender | null>(m.gender);
  const [birthDate, setBirthDate] = useState(m.birthDate ?? '');
  const [emName, setEmName] = useState(m.emergencyName ?? '');
  const [emPhone, setEmPhone] = useState(m.emergencyPhone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const phoneChanged = phone.replace(/\D/g, '') !== m.phone;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Хоосон талбарыг ЗААВАЛ илгээнэ (undefined биш) — эс бөгөөс
      // хэрэглэгч утгыг устгаж чадахгүй болно.
      await api.patch(`/members/${m.id}`, {
        name,
        phone,
        email,
        note,
        gender,
        birthDate,
        emergencyName: emName,
        emergencyPhone: emPhone,
      });
      toast.success('Хадгаллаа');
      router.replace(`/members/${m.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Засах" description={`${m.name} · №${m.memberNo}`}>
        <LinkButton variant="ghost" href={`/members/${m.id}`}>
          <ArrowLeft className="size-4" />
          Буцах
        </LinkButton>
      </PageHeader>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Хоёр багана: зүүнд ЗААВАЛ талбарууд (богино, төвлөрсөн),
            баруунд заавал биш нь. Ингэснээр өргөн дэлгэц дээр хоосон зай
            үлдэхгүй бөгөөд «юуг заавал бөглөх вэ» нь ил харагдана. */}
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Үндсэн мэдээлэл</CardTitle>
              <CardDescription>Терминал, Wallet карт хоёулаа ашиглана</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Нэр *</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                />
                {phoneChanged && (
                  <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    Утас өөрчлөгдөж байна. Хуучин дугаараар шинэ Wallet карт
                    үүсгэх боломж хаагдаж, шинэ дугаар нээгдэнэ. Одоо байгаа
                    карт хэвээр ажиллана.
                  </p>
                )}
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

        {/* Хадгалах товч наалдамхай — урт форм гүйлгэсэн ч хүрэлцээтэй. */}
        <div className="bg-background/80 sticky bottom-0 flex gap-2 border-t py-3 backdrop-blur">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Хадгалах
          </Button>
          <LinkButton variant="ghost" href={`/members/${m.id}`}>
            Цуцлах
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
