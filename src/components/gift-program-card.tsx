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

interface ProgramsResponse {
  programs: ProgramRow[];
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
  const { data } = useApi<ProgramsResponse>("/loyalty/programs");
  const { data: settings, reload } = useApi<{
    loopy_gift_program_id: string | null;
    loopy_program_id: string | null;
  }>("/settings");
  const [saving, setSaving] = useState(false);

  async function select(id: string) {
    if (id && id === settings?.loopy_program_id) {
      toast.error("Гишүүнчлэлийн программыг сонгож болохгүй", {
        description: "Бэлгийн карт тусдаа программ дээр байх ёстой.",
      });
      return;
    }
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

  const options = [
    { value: "", label: "Сонгоогүй" },
    ...(data?.programs ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gift className="text-muted-foreground size-4" />
          Бэлгийн картын программ
        </CardTitle>
        <CardDescription>
          Гишүүнчлэлийнхээс <strong>тусдаа</strong> программ сонгоно — талбар,
          дизайн, хугацаа нь тэс өөр.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={settings?.loopy_gift_program_id ?? ""}
            onChange={select}
            options={options}
            placeholder="Программ сонгох"
            className="min-w-56"
          />
          {saving && (
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          )}
        </div>
        {!settings?.loopy_gift_program_id && (
          <p className="text-muted-foreground text-xs">
            Сонгоогүй тул бэлгийн карт үүсгэх боломжгүй.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
