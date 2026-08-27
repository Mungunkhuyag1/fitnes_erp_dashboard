"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoopyProgramCard } from "@/components/loopy-program-card";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    name: "loopy",
    label: "Loopy — Wallet карт",
    path: "/loyalty/ping",
    hint: "Карт үүсгэх зөвшөөрөл, эрхийн огноо, push мэдэгдэл",
  },
];

/**
 * Гадаад холболтын байдал.
 *
 * Нууц түлхүүрүүд `.env`-д байдаг тул ЭНД засварлахгүй — зөвхөн ажиллаж
 * байгаа эсэхийг шалгана. Тохиргоо буруу бол алдааны текстийг ил харуулна:
 * «холбогдсонгүй» гэхээс илүү шалтгаан нь хэрэгтэй.
 */
export default function ConnectionSettings() {
  const [result, setResult] = useState<
    Record<string, { ok: boolean; detail?: string }>
  >({});
  const [busy, setBusy] = useState<string | null>(null);

  async function check(name: string, path: string) {
    setBusy(name);
    try {
      const r = await api.get<{ ok: boolean; detail?: string }>(path);
      setResult((p) => ({ ...p, [name]: r }));
    } catch (e) {
      setResult((p) => ({
        ...p,
        [name]: { ok: false, detail: e instanceof Error ? e.message : "Алдаа" },
      }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Холболт</CardTitle>
          <CardDescription>
            Нууц түлхүүрийг серверийн .env-д тохируулна. Энд зөвхөн шалгана.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ITEMS.map((it) => {
            const r = result[it.name];
            return (
              <div
                key={it.name}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{it.label}</p>
                  <p className="text-muted-foreground text-xs">{it.hint}</p>
                  {r && (
                    <p
                      className={cn(
                        "mt-1 flex items-start gap-1.5 text-xs",
                        r.ok
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive",
                      )}
                    >
                      {r.ok ? (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                      ) : (
                        <XCircle className="mt-0.5 size-3.5 shrink-0" />
                      )}
                      <span className="break-all">
                        {r.ok ? "Холбогдлоо" : (r.detail ?? "Холбогдсонгүй")}
                      </span>
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === it.name}
                  onClick={() => check(it.name, it.path)}
                >
                  {busy === it.name && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Шалгах
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <LoopyProgramCard />
    </div>
  );
}
