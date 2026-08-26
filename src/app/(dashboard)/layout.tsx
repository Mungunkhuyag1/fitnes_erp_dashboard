'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    // Түр нууц үгтэй ажилтныг эхлээд солиулна (backend ч бусад замыг хаадаг).
    else if (user.mustChangePassword) router.replace('/change-password');
  }, [user, loading, router]);

  if (loading || !user || user.mustChangePassword) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}
