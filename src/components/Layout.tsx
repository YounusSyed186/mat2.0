import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { ModeToggle } from "@/components/ModeToggle";
import {
  Crown,
  Heart,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageCircle,
  Sparkles,
  Star,
  TrendingUp,
  UserCircle,
  Users,
  X,
  ArrowLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAiAccess } from "@/hooks/useAiAccess";
import type { Profile } from "@/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LayoutProps {
  children: React.ReactNode;
}

// Memoized NavLink component for better performance
const NavLink = memo(({
  href,
  label,
  icon: Icon,
  aiGated,
  compactOnDesktop = false,
  hasAiAccess,
  isActive,
  onClick
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  aiGated: boolean;
  compactOnDesktop?: boolean;
  hasAiAccess: boolean;
  isActive: boolean;
  onClick: () => void;
}) => {
  const isLocked = aiGated && !hasAiAccess;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={isLocked ? "/subscriptions" : href}
            className={cn(
              "group/nav relative flex items-center rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 ease-out",
              compactOnDesktop
                ? "justify-center gap-0 px-0 py-2.5"
                : "gap-3 px-3 py-2.5",
              isActive && !isLocked
                ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : isLocked
                  ? "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  : "text-sidebar-foreground/72 hover:bg-white/[0.07] hover:text-sidebar-foreground"
            )}
            onClick={onClick}
            data-testid={`nav-${label.toLowerCase().replace(/ /g, "-")}`}
          >
            <div className="relative">
              <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-150 ease-out group-hover/nav:scale-105",
                isActive && !isLocked && "text-primary"
              )} />
              {isLocked && (
                <Lock className="absolute -right-1 -top-1 h-2.5 w-2.5 text-amber-500" />
              )}
            </div>
            <span
              className={cn(
                "min-w-0 flex-1 truncate whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out",
                compactOnDesktop &&
                  "max-w-0 flex-none overflow-hidden opacity-0"
              )}
            >
              {label}
            </span>
            {isLocked && (
              <Badge
                variant="secondary"
                className={cn(
                  "ml-auto bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  compactOnDesktop && "hidden"
                )}
              >
                <Crown className="mr-1 h-2.5 w-2.5" />
                Premium
              </Badge>
            )}
          </Link>
        </TooltipTrigger>
        {compactOnDesktop && (
          <TooltipContent side="right" className="font-medium">
            {label}
            {isLocked && <span className="ml-1 text-amber-500"> (Premium)</span>}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
});

NavLink.displayName = "NavLink";

// Header actions component
const HeaderActions = memo(({ profile, onSignOut }: { profile: Profile | null; onSignOut: () => void }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <ModeToggle />
        <NotificationBell />

        {profile && (
          <div className="relative ml-2">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="pressable flex items-center gap-3 rounded-full bg-card px-3 py-1.5 shadow-sm"
            >
              <div className="min-w-0 text-right">
                <p className="max-w-32 truncate text-sm font-semibold text-foreground">
                  {profile.name}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {profile.role === "primary_admin" ? "Admin" : profile.role}
                </p>
              </div>
              <UserAvatar name={profile.name} avatarUrl={profile.avatar_url} size="sm" />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                  <div className="flex flex-col space-y-1">
                    <Button asChild variant="ghost" size="sm" className="justify-start gap-2">
                      <Link to="/profile/edit" onClick={() => setShowUserMenu(false)}>
                        <UserCircle className="h-4 w-4" />
                        Edit Profile
                      </Link>
                    </Button>
                    <Separator className="my-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-600"
                      onClick={onSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </TooltipProvider>
    </div>
  );
});

HeaderActions.displayName = "HeaderActions";

export function Layout({ children }: LayoutProps) {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileHeaderRef = useRef<HTMLDivElement | null>(null);
  const desktopHeaderRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const { toast } = useToast();
  const { hasAccess: hasAiAccess, planName } = useAiAccess();
  const aiAccessReady = hasAiAccess === true;

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "We hope to see you again soon!"
      });
    } catch {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive"
      });
    }
  }, [toast]);

  const navItems = useMemo(() => {
    const items = [
      { href: "/browse", label: "Dashboard", icon: LayoutDashboard, aiGated: false },
      { href: "/interests", label: "Interests", icon: Heart, aiGated: false, badge: 3 },
      { href: "/chat", label: "Messages", icon: MessageCircle, aiGated: false, badge: 2 },
      { href: "/ai-match", label: "AI Match", icon: Sparkles, aiGated: true },
      { href: "/profile-optimizer", label: "AI Optimizer", icon: TrendingUp, aiGated: true },
      { href: "/subscriptions", label: "Premium", icon: Star, aiGated: false, highlight: true },
      { href: "/profile/edit", label: "My Profile", icon: UserCircle, aiGated: false },
    ];

    if (profile?.role === "admin" || profile?.role === "primary_admin") {
      items.push({ href: "/admin", label: "Admin", icon: Users, aiGated: false });
    }

    return items;
  }, [profile?.role]);

  const activeItem = navItems.find(({ href }) => pathname === href || pathname.startsWith(href + "/"));
  const pageTitle = activeItem?.label ?? "Vivaah Vedika";
  const sidebarCompact = false;
  const firstName = profile?.name?.trim().split(/\s+/)[0] || "there";
  const mobileTitle = pathname === "/browse" ? profile?.name || "Vivaah Vedika" : pageTitle;
  const mobileEyebrow = pathname === "/browse" ? "Hello" : "Vivaah Vedika";
  const mobileRootPaths = new Set(["/browse", "/interests", "/chat", "/ai-match", "/profile/edit"]);
  const showMobileBack = !mobileRootPaths.has(pathname) && !pathname.startsWith("/chat/");
  const showMobileBottomNav = !pathname.startsWith("/chat/");
  const mobilePrimaryNavItems = navItems.filter(({ href }) =>
    ["/browse", "/interests", "/chat", "/ai-match"].includes(href)
  );

  // Handle scroll events for header styling efficiently without triggering React re-renders on every tick
  useEffect(() => {
    const mainContent = mainRef.current;
    if (!mainContent) return;

    let isCurrentlyScrolled = false;
    let ticking = false;

    const checkScroll = () => {
      const scrolled = mainContent.scrollTop > 10 || window.scrollY > 10;
      if (scrolled !== isCurrentlyScrolled) {
        isCurrentlyScrolled = scrolled;
        if (mobileHeaderRef.current) {
          mobileHeaderRef.current.classList.toggle("shadow-[0_16px_36px_rgba(15,23,42,0.10)]", scrolled);
          mobileHeaderRef.current.classList.toggle("dark:shadow-[0_16px_36px_rgba(0,0,0,0.28)]", scrolled);
        }
        if (desktopHeaderRef.current) {
          desktopHeaderRef.current.classList.toggle("border-b", scrolled);
          desktopHeaderRef.current.classList.toggle("border-white/60", scrolled);
          desktopHeaderRef.current.classList.toggle("bg-white/60", scrolled);
          desktopHeaderRef.current.classList.toggle("backdrop-blur-xl", scrolled);
          desktopHeaderRef.current.classList.toggle("dark:border-white/10", scrolled);
          desktopHeaderRef.current.classList.toggle("dark:bg-slate-950/40", scrolled);
        }
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkScroll);
        ticking = true;
      }
    };

    checkScroll();
    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      mainContent.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="mobile-app-shell premium-shell-bg relative min-h-[100svh] overflow-x-hidden p-0 text-foreground md:h-[100dvh] md:overflow-hidden md:p-2 lg:p-2.5">
      <div className="pointer-events-none fixed inset-0 hidden opacity-80 md:block">
        <div className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,rgba(255,255,255,0.68),transparent)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />
        <div className="absolute -left-24 top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-28 bottom-24 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-[100svh] w-full max-w-none rounded-none bg-white/86 shadow-none ring-1 ring-white/70 dark:bg-slate-950/78 dark:ring-white/10 md:h-full md:min-h-0 md:overflow-hidden md:rounded-xl md:shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "group/sidebar m-2.5 mr-0 hidden w-[270px] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,hsl(var(--sidebar)),hsl(226_34%_11%))] text-sidebar-foreground shadow-[0_24px_70px_rgba(15,23,42,0.34)] md:flex"
          )}
        >
          <Link
            to="/browse"
            className={cn(
              "flex w-full items-center py-4 transition-opacity duration-150 hover:opacity-90",
              sidebarCompact
                ? "justify-center px-0"
                : "px-3 sm:px-4"
            )}
            aria-label="Vivaah Vedika"
          >
            <div
              className={cn(
                "flex items-center justify-center transition-all duration-150",
                sidebarCompact ? "h-10 w-10 overflow-hidden rounded-xl bg-white/90 p-1 dark:bg-white/10" : "w-full py-1"
              )}
            >
              <img
                src="/Viviha Vadika Light.png"
                alt="Vivaah Vedika"
                className={cn(
                  "transition-all duration-150",
                  sidebarCompact
                    ? "h-full w-full rounded-lg object-cover object-left"
                    : "w-[65%] h-auto max-h-12.5 object-contain mx-auto"
                )}
              />
            </div>
          </Link>

          <ScrollArea className="flex-1">
            <nav
              className={cn(
                "space-y-1.5 py-3 transition-[padding] duration-150 ease-out",
                sidebarCompact ? "px-2" : "px-3"
              )}
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  compactOnDesktop={sidebarCompact}
                  hasAiAccess={aiAccessReady}
                  isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  onClick={() => {
                    setMobileOpen(false);
                  }}
                />
              ))}
            </nav>
          </ScrollArea>

          <div className={cn("pb-5 transition-[padding] duration-150 ease-out", sidebarCompact ? "px-2" : "px-4")}>
            {!sidebarCompact && (
              <div className="relative mb-4 overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] p-4">
                <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-amber-400/30 to-primary/30 blur-2xl" />
                <div className="relative z-10">
                  {aiAccessReady || planName ? (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Crown className="h-4.5 w-4.5 shrink-0 text-amber-400" />
                          <p className="truncate text-sm font-bold text-white">
                            {planName ? `${planName} Plan` : "Premium Active"}
                          </p>
                        </div>
                        <Badge className="shrink-0 border-emerald-500/40 bg-emerald-500/20 px-2 py-0 text-[10px] font-bold text-emerald-300 shadow-none">
                          Active
                        </Badge>
                      </div>
                      <p className="mb-3 text-xs text-sidebar-foreground/70">
                        AI matching & premium features active
                      </p>
                      <Button asChild size="sm" variant="outline" className="h-8 w-full rounded-full border-white/20 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 shadow-none">
                        <Link to="/subscriptions">
                          Manage Subscription
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-500" />
                        <p className="text-sm font-bold">Go Premium</p>
                      </div>
                      <p className="mb-3 text-xs text-muted-foreground">
                        Unlock AI matching & profile optimization
                      </p>
                      <Button asChild size="sm" className="premium-cta pressable h-9 w-full rounded-full text-xs font-bold shadow-none">
                        <Link to="/subscriptions">
                          Upgrade Now
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              className={cn(
                "w-full text-sidebar-foreground/70 transition-[background-color,color] duration-150 hover:bg-sidebar-accent hover:text-white",
                sidebarCompact
                  ? "justify-center gap-0 px-0"
                  : "justify-start gap-3"
              )}
              onClick={handleSignOut}
              data-testid="button-signout"
            >
              <LogOut className="h-4 w-4" />
              <span
                className={cn(
                  "whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out",
                  sidebarCompact && "max-w-0 overflow-hidden opacity-0"
                )}
              >
                Sign Out
              </span>
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="relative m-0 flex min-h-[100svh] min-w-0 flex-1 flex-col rounded-none bg-transparent md:m-3 md:ml-2 md:min-h-0 md:overflow-hidden md:rounded-xl md:bg-white/64 md:ring-1 md:ring-white/70 md:dark:bg-white/[0.045] md:dark:ring-white/10">
          {/* Mobile Header */}
          <div
            ref={mobileHeaderRef}
            className="sticky top-0 z-50 bg-white/78 px-4 pb-3 pt-4 backdrop-blur-xl transition-shadow duration-150 dark:bg-slate-950/72 md:hidden"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {showMobileBack ? (
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_10px_24px_rgba(15,23,42,0.10)] ring-1 ring-black/5 dark:bg-white/10 dark:text-rose-100 dark:ring-white/10"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <Link
                    to="/browse"
                    className="pressable flex h-9 shrink-0 items-center justify-center"
                    aria-label="Vivaah Vedika dashboard"
                  >
                    <img
                      src="/Vivaah vedika.png"
                      alt="Vivaah Vedika"
                      className="h-8 w-auto max-w-[140px] object-contain dark:hidden"
                    />
                    <img
                      src="/Viviha Vadika Light.png"
                      alt="Vivaah Vedika"
                      className="hidden h-8 w-auto max-w-[140px] object-contain dark:block"
                    />
                  </Link>
                )}

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] leading-none text-slate-500 dark:text-rose-100/60">
                    {mobileEyebrow}
                  </p>
                  <h1 className="mt-1 truncate font-serif text-xl font-bold leading-tight text-slate-950 dark:text-rose-50">
                    {mobileTitle}
                  </h1>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <ModeToggle className="pressable" />
                <NotificationBell />
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <header
            ref={desktopHeaderRef}
            className="relative z-50 hidden shrink-0 items-center justify-between px-7 py-5 transition-[background-color,border-color] duration-150 md:flex"
          >
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">{pageTitle}</h1>
              <p className="text-xs text-muted-foreground">
                {activeItem?.aiGated && !aiAccessReady && "Premium feature"}
              </p>
            </div>
            <HeaderActions profile={profile} onSignOut={handleSignOut} />
          </header>

          {/* Main Content */}
          <main
            ref={mainRef}
            className={cn(
              "custom-scrollbar flex min-w-0 flex-1 flex-col overflow-x-hidden md:min-h-0 md:overflow-y-auto md:overscroll-contain",
              showMobileBottomNav && "pb-[88px] md:pb-0"
            )}
          >
            <div className="flex min-h-full w-full flex-1 flex-col p-0">
              {children}
            </div>
          </main>

          {showMobileBottomNav && (
            <>
              {mobileOpen && (
                <button
                  type="button"
                  className="fixed inset-0 z-40 bg-black/70 md:hidden"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                />
              )}

              {mobileOpen && (
              <div className="fixed inset-x-4 bottom-[92px] z-50 rounded-xl border border-white/10 bg-black p-3 text-white shadow-[0_24px_56px_rgba(0,0,0,0.42)] md:hidden">
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={profile?.name || "Member"} avatarUrl={profile?.avatar_url} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          Hello, {firstName}
                        </p>
                        <p className="truncate text-xs text-white/60">
                          {profile?.role === "primary_admin" ? "Admin" : profile?.role || "Member"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={() => setMobileOpen(false)}
                      aria-label="Close menu"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isLocked = item.aiGated && !aiAccessReady;
                      const destination = isLocked ? "/subscriptions" : item.href;
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                      return (
                        <Link
                          key={item.href}
                          to={destination}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "pressable flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                            isActive && !isLocked
                              ? "bg-primary text-white shadow-none"
                              : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
                          )}
                        >
                          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-current">
                            <Icon className="h-4 w-4" />
                            {isLocked && (
                              <Lock className="absolute -right-0.5 -top-0.5 h-3 w-3 text-amber-500" />
                            )}
                          </span>
                          <span className="min-w-0 truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <Button
                    variant="ghost"
                    className="mt-3 w-full justify-start rounded-lg bg-white/10 px-3 text-white/80 hover:bg-white/15 hover:text-white"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              )}

              <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-3 md:hidden" aria-label="Mobile navigation">
                <div className="flex h-16 items-center justify-between rounded-xl border border-white/10 bg-[linear-gradient(180deg,hsl(var(--sidebar)),hsl(226_34%_11%))] px-3 text-sidebar-foreground shadow-[0_18px_44px_rgba(15,23,42,0.32)] backdrop-blur-xl">
                  {mobilePrimaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isLocked = item.aiGated && !aiAccessReady;
                    const destination = isLocked ? "/subscriptions" : item.href;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.href}
                        to={destination}
                        className={cn(
                          "pressable relative flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                          isActive && !isLocked
                            ? "bg-primary/20 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                        aria-label={item.label}
                        title={item.label}
                      >
                        <Icon className="h-5 w-5" />
                        {isLocked && (
                          <Lock className="absolute right-1.5 top-1.5 h-2.5 w-2.5 text-amber-500" />
                        )}
                        {isActive && !isLocked && (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                        )}
                      </Link>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setMobileOpen((open) => !open)}
                    className={cn(
                      "pressable relative flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                      mobileOpen || pathname === "/profile/edit"
                        ? "bg-primary/20 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                    aria-label="Open menu"
                    data-testid="button-mobile-menu"
                  >
                    <UserCircle className="h-5 w-5" />
                    {(mobileOpen || pathname === "/profile/edit") && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                    )}
                  </button>
                </div>
              </nav>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
