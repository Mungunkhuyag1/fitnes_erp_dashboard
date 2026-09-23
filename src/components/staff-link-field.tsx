'use client';

import { Loader2, UserCog } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorToast } from '@/lib/errors';
import { FilterSelect, type FilterOption } from '@/components/filter-select';
import { useApi } from '@/hooks/use-api';
import { api, type Page } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Админ',
  manager: 'Менежер',
  reception: 'Ресепшн',
};

/**
 * Гишүүнийг АЖИЛТНЫ данстай холбох.
 *
 * ★ ЯАГААД ХЭРЭГТЭЙ ВЭ
 *
 * Терминал дээр ажилтан, дасгалжуулагч нар өөрсдийн царайгаа
 * бүртгүүлсэн байдаг ба төхөөрөмж тэднийг гишүүдээс ЯЛГАДАГГҮЙ —
 * бүлэг, төрлийн талбар байхгүй. Тиймээс импортлоход тэд ч гишүүн
 * болж орж ирдэг ба өдөр бүр уншуулдаг тул тайлангийн «хамгийн
 * идэвхтэй гишүүд» жагсаалтыг бүхэлд нь эзэлнэ.
 *
 * ⚠ Холбоос нь ЗӨВХӨН ТАЙЛАНГИЙН тэмдэг. Гишүүний эрх, ирц, төлбөр
 * бүгд хэвээр — ажилтан гишүүнчлэл худалдаж авч ч болно.
 *
 * ⚠ Аль хүн ажилтан болохыг ТААМАГЛАХГҮЙ. Нэрээр таних («admin»
 * гэсэн үг хайх гэх мэт) нь алдаатай: жинхэнэ гишүүн тийм нэртэй
 * байж болно. Хүн шийднэ.
 */
export function StaffLinkField({
  memberId,
  current,
  onChange,
}: {
  memberId: string;
  current: { id: string; name: string; email: string; role: string } | null;
  onChange: () => void;
}) {
  const { can } = useAuth();
  const admin = can('admin');

  /*
   * ⚠ Жагсаалтыг зөвхөн ADMIN татна. `GET /staff` нь ADMIN эрхтэй тул
   *   бусдад 403 буцаана — `null` зам өгвөл хүсэлт огт явахгүй.
   */
  const { data: staff } = useApi<Page<StaffRow>>(
    admin ? '/staff?limit=100' : null,
  );
  const [saving, setSaving] = useState(false);

  async function save(staffUserId: string) {
    setSaving(true);
    try {
      await api.patch(`/members/${memberId}/staff-user`, {
        staffUserId: staffUserId || null,
      });
      toast.success(
        staffUserId
          ? 'Ажилтны данстай холболоо — тайлангийн ирцээс хасагдана'
          : 'Ажилтны холбоосыг салгалаа',
      );
      onChange();
    } catch (e) {
      errorToast(e, 'Алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  /*
   * ADMIN биш ажилтанд ЗӨВХӨН үр дүнг харуулна. Сонгох хэрэгсэл
   * харуулаад 403 өгөх нь ойлгомжгүй.
   */
  if (!admin) {
    if (!current) return null;
    return (
      <div className="space-y-0.5">
        <p className="text-muted-foreground text-xs">Ажилтан</p>
        <div className="flex items-center gap-1.5 text-sm">
          <UserCog className="text-muted-foreground size-3.5" />
          {current.name}
        </div>
      </div>
    );
  }

  const options: FilterOption[] = [
    { value: '', label: 'Ажилтан биш (энгийн гишүүн)' },
    ...(staff?.items ?? [])
      .filter((u) => u.active || u.id === current?.id)
      .map((u) => ({
        value: u.id,
        label: `${u.name} · ${ROLE_LABEL[u.role] ?? u.role}`,
      })),
  ];

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs">Ажилтны данс</p>
      <div className="flex items-center gap-2">
        <FilterSelect
          value={current?.id ?? ''}
          onChange={save}
          options={options}
          placeholder="Ажилтан биш"
          className="min-w-0 flex-1"
          icon={<UserCog className="size-3.5" />}
        />
        {saving && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
      </div>
      {current ? (
        <p className="text-muted-foreground text-xs">
          Энэ терминалын хүн <strong>{current.name}</strong> ({current.email})
          гэсэн ажилтны данстай холбогдсон. Ирц нь тайлан, графикт
          тоологдохгүй.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Ажилтны данстай холбовол энэ хүний ирц тайлангийн тооцооллоос
          хасагдана. Гишүүний эрхэд НӨЛӨӨЛӨХГҮЙ.
        </p>
      )}
    </div>
  );
}
