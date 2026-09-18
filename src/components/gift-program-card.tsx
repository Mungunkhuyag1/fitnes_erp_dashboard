"use client";

import { Gift, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FilterSelect } from "@/components/filter-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";

interface ProgramRow {
  id: string;
  name: string;
}

/**
 * ⚠ `/loyalty/programs` нь `{ items, selected, envFallback }` буцаана.
 *
 * Урьд нь энэ бүрэлдэхүүн `programs` гэсэн БАЙХГҮЙ талбарыг уншдаг
 * байсан тул жагсаалт ҮРГЭЛЖ хоосон байв: Loopy дээр программ
 * үүсгэсэн ч сонгох юм гарч ирэхгүй.
 */
interface ProgramsResponse {
  items: ProgramRow[];
  selected: string | null;
}

/**
 * Бэлгийн картын Loopy программ.
 *
 * ⚠ Гишүүнчлэлийн программаас ТУСДАА байх ёстой. Гишүүнчлэлийн карт нь
 * эрхийн огноо, төлөв, гишүүний дугаартай; бэлгийн карт нь бэлэглэсэн
 * хүн, хүлээн авагч, дүн, ашигласан эсэх — тэс өөр талбарууд. Нэг
 * программд багтаах гэвэл аль аль нь эвгүй харагдана.
 */
export function GiftProgramCard() {
  const { data, error } = useApi<ProgramsResponse>("/loyalty/programs");
  const { data: settings, reload } = useApi<{
    loopy_gift_program_id: string | null;
    loopy_program_id: string | null;
  }>("/settings");
  const [saving, setSaving] = useState(false);

  /** Гишүүнчлэлд ажиллаж буй программ — сонголтоос ХАСНА. */
  const memberProgramId = settings?.loopy_program_id ?? data?.selected ?? null;
  const chosen = settings?.loopy_gift_program_id ?? "";

  async function select(id: string) {
    setSaving(true);
    try {
      await api.patch("/settings", { loopy_gift_program_id: id || null });
      toast.success(id ? "Программ сонгогдлоо" : "Сонголт арилгав");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Хадгалж чадсангүй");
    } finally {
      setSaving(false);
    }
  }

  const programs = (data?.items ?? []).filter(
    // Аль хэдийн сонгогдсон нь жагсаалтад ҮЛДЭНЭ — эс бөгөөс сонголт
    // нь хоосон харагдана.
    (p) => p.id !== memberProgramId || p.id === chosen,
  );

  const options = [
    { value: "", label: "Сонгоогүй" },
    ...programs.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gift className="text-muted-foreground size-4" />
          Бэлгийн картын программ
        </CardTitle>
        <CardDescription>
          Loopy дээр гишүүнчлэлийнхээс <strong>тусдаа</strong> программ үүсгээд
          энд сонгоно — талбар, дизайн, хугацаа нь тэс өөр.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={chosen}
            onChange={select}
            options={options}
            placeholder="Программ сонгох"
            className="min-w-56"
          />
          {saving && (
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          )}
        </div>

        {error ? (
          <p className="text-destructive bg-destructive/8 rounded-lg px-3 py-2.5 text-xs">
            Loopy-гийн программуудыг татаж чадсангүй: {error}
          </p>
        ) : !data ? null : programs.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
            Loopy дээр <strong>хоёр дахь программ</strong> алга байна. Одоо
            байгаа цорын ганц программыг гишүүнчлэл ашиглаж байгаа тул бэлгийн
            картад тусдаа программ үүсгэнэ үү.
          </p>
        ) : chosen ? (
          /*
            Сонгосны дараа ЮУ БОЛОХЫГ хэлнэ. Программаа сонгоод «одоо
            яах вэ» гэж эргэлзэх нь хамгийн олон удаа гардаг асуулт.
          */
          <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-xs">
            <li>
              <strong>Бэлгийн карт</strong> цэснээс дүн, хүлээн авагчийн
              нэр/утсаар карт үүсгэнэ.
            </li>
            <li>
              Тэнд гарах <strong>бүртгэлийн холбоосыг</strong> хүлээн авагчид
              илгээнэ — зөвшөөрөгдсөн дугаар л карт авч чадна.
            </li>
            <li>
              Хүлээн авагч Wallet-даа авсны дараа{" "}
              <strong>«Wallet шалгах»</strong> дарж холбоно.
            </li>
            <li>
              Ресепшн дээр уншуулаад эрхийг <strong>гараар</strong> сунгаж,
              «Ашигласан» гэж тэмдэглэнэ.
            </li>
          </ol>
        ) : (
          <p className="text-muted-foreground text-xs">
            Сонгоогүй тул бэлгийн карт үүсгэх боломжгүй.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
