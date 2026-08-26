'use client';

import {
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  LogOut,
  Moon,
  MoreVertical,
  Settings,
  Sun,
  User,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { NAV } from '@/components/app-nav';
import { Breadcrumb } from '@/components/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth, type Role } from '@/lib/auth';
import { cn } from '@/lib/utils';

const RANK: Record<Role, number> = { reception: 1, manager: 2, admin: 3 };

/** Дугуй аватар — зурагтай бол зураг, эс бөгөөс нэрийн эхний үсэг. */
function Avatar({ className }: { className?: string }) {
  const { user } = useAuth();
  return (
    <span
      className={cn(
        'bg-accent text-accent-foreground flex shrink-0 items-center justify-center overflow-hidden rounded-lg text-xs font-medium',
        className,
      )}
    >
      {user?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URL
        <img src={user.avatar} alt="" className="size-full object-cover" />
      ) : (
        (user?.name?.[0] ?? '?')
      )}
    </span>
  );
}

/** Хэрэглэгчийн цэс — блокийн `NavUser` бүтэц. */
function NavUser() {
  const { user, signOut } = useAuth();
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user?.email}
                  </span>
                </div>
                <MoreVertical className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            {/*
              `DropdownMenuLabel` нь Base UI-ийн `Menu.GroupLabel` — ЗААВАЛ
              `Menu.Group` дотор байх ёстой, үгүй бол ажиллахгүй.
            */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user?.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/settings/profile" />}>
                <User className="size-4" />
                Профайл
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings/password" />}>
                <KeyRound className="size-4" />
                Нууц үг солих
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} variant="destructive">
              <LogOut className="size-4" />
              Гарах
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const settingsActive = pathname.startsWith('/settings');

  return (
    // `collapsible="icon"` — хураахад цэс АЛГА БОЛОХГҮЙ, зөвхөн икон
    // болж нарийсна. (`offcanvas` бол бүхэлдээ шургадаг.)
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              {/*
                Тэмдэг нь тод ногоон тул ЦАЙВАР дэвсгэр дээр уншигдахгүй.
                Харанхуй дөрвөлжин дээр байрлуулснаар хоёр загварт ч
                ижил тод харагдана — логоны эх хувилбар ч ийм байдаг.
                eslint-disable-next-line @next/next/no-img-element -- статик, хэмжээ тогтмол
              */}
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-950">
                <Image
                  src="/brand/mark.png"
                  alt=""
                  width={32}
                  height={32}
                  className="size-6"
                  priority
                />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-base font-semibold">WinFit</span>
                <span className="text-muted-foreground truncate text-xs">
                  Фитнесийн удирдлага
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => {
          const items = group.items.filter(
            (i) => !i.min || (user && RANK[user.role] >= RANK[i.min]),
          );
          if (!items.length) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active =
                      item.href === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        {/* `tooltip` — хураасан үед нэрийг харуулна. */}
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={item.label}
                          render={<Link href={item.href} />}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={settingsActive}
              tooltip="Тохиргоо"
              render={<Link href="/settings/profile" />}
            >
              <Settings />
              <span>Тохиргоо</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

/**
 * Загвар солих.
 *
 * `mounted` төлөв хэрэглэхгүй — хоёр иконыг хоёуланг render хийж, `dark:`
 * class-аар нуухад hydration зөрчил гарахгүй бөгөөд effect дотор setState
 * дуудах шаардлагагүй болно.
 */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Загвар солих"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </Button>
  );
}

/**
 * Хураах/дэлгэх товч — агуулгын картын ЗҮҮН ИРМЭГ дээр, босоо голд.
 *
 * `SidebarTrigger`-ийг толгойд биш эндээс дуудна: ирмэг дээр байрлуулснаар
 * цэс болон агуулгын ХИЛ дээр байх ба «энэ хоёрын хоорондын зайг өөрчилнө»
 * гэдэг нь зөн совингоор ойлгогдоно.
 *
 * Зөвхөн `lg`-ээс дээш — жижиг дэлгэц дээр цэс нь давхаргаар нээгддэг тул
 * ирмэг гэсэн ойлголт байхгүй.
 */
function EdgeToggle() {
  const { toggleSidebar, state } = useSidebar();
  return (
    <Button
      variant="outline"
      size="icon-xs"
      aria-label={state === 'collapsed' ? 'Цэсийг дэлгэх' : 'Цэсийг хураах'}
      onClick={toggleSidebar}
      className="bg-background absolute top-1/2 -left-3 z-20 hidden -translate-y-1/2 rounded-full shadow-sm lg:inline-flex"
    >
      {state === 'collapsed' ? (
        <ChevronsRight className="size-3" />
      ) : (
        <ChevronsLeft className="size-3" />
      )}
    </Button>
  );
}

/** Толгой — блокийн `SiteHeader`: зам заагч + загвар солих. */
function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Гар утсанд цэсийг нээх цорын ганц зам — ирмэг дэх товч
            зөвхөн `lg`-ээс дээш харагдана. */}
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 lg:hidden"
        />
        <div className="min-w-0 flex-1">
          <Breadcrumb />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    // `h-svh` — `SidebarProvider` нь `min-h-svh` тул хуудас бүхэлдээ гүйдэг
    // байсан. Тэр үед ирмэг дэх товчны `top-1/2` нь ДЭЛГЭЦИЙН биш
    // АГУУЛГЫН голыг заах ба гүйлгэхэд хөдөлж харагдана. Өндрийг
    // дэлгэцээр хатууд тогтоож, зөвхөн `main`-ыг гүйлгэнэ.
    <SidebarProvider
      className="h-svh"
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 68)',
          '--header-height': 'calc(var(--spacing) * 16)',
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="relative min-h-0">
        <EdgeToggle />
        <SiteHeader />
        {/* Агуулга нь ЭНД гүйнэ — хуудас бүхэлдээ гүйхгүй. */}
        {/* `min-h-0` — flex хүүхэд агшихыг зөвшөөрнө; үүнгүй бол
            `overflow-y-auto` ажиллахгүй. */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
