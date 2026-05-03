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

const logoSrc = "/vivah-logo.png";

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
              "group/nav relative flex items-center rounded-lg text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out",
              compactOnDesktop
                ? "justify-center gap-0 px-0 py-2.5"
                : "gap-3 px-3 py-2.5",
              isActive && !isLocked
                ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-sm"
                : isLocked
                  ? "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
  const [isScrolled, setIsScrolled] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const { toast } = useToast();
  const { hasAccess: hasAiAccess } = useAiAccess();
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
  const pageTitle = activeItem?.label ?? "Vivah";
  const sidebarCompact = false;
  const firstName = profile?.name?.trim().split(/\s+/)[0] || "there";
  const mobileTitle = pathname === "/browse" ? profile?.name || "Vivah" : pageTitle;
  const mobileEyebrow = pathname === "/browse" ? "Hello" : "Vivah";
  const mobileRootPaths = new Set(["/browse", "/interests", "/chat", "/ai-match", "/profile/edit"]);
  const showMobileBack = !mobileRootPaths.has(pathname) && !pathname.startsWith("/chat/");
  const showMobileBottomNav = !pathname.startsWith("/chat/");
  const mobilePrimaryNavItems = navItems.filter(({ href }) =>
    ["/browse", "/interests", "/chat", "/ai-match"].includes(href)
  );

  // Handle scroll events for header styling
  useEffect(() => {
    const mainContent = mainRef.current;
    if (!mainContent) return;

    let frame = 0;
    const handleScroll = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        const nextScrolled = mainContent.scrollTop > 10;
        setIsScrolled((current) => current === nextScrolled ? current : nextScrolled);
        frame = 0;
      });
    };

    handleScroll();
    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      mainContent.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="mobile-app-shell relative h-[100dvh] overflow-hidden bg-[#f7e8f0] p-2 text-foreground dark:bg-[#150b10] sm:p-3 md:bg-[#080606] md:px-[0.5vw] md:py-[0.5dvh] md:dark:bg-[#080606]">
      <div className="pointer-events-none fixed inset-0 hidden opacity-95 md:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(236,72,153,0.15),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(236,72,153,0.08)_0,transparent_42%,rgba(97,18,50,0.12)_100%)]" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-[430px] overflow-hidden rounded-[30px] bg-[#fff9fc] shadow-[0_26px_70px_rgba(173,38,95,0.18)] dark:bg-[#211219] dark:shadow-[0_26px_70px_rgba(0,0,0,0.38)] md:max-w-none md:rounded-[28px] md:bg-background md:shadow-xl md:dark:bg-background">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "group/sidebar m-2 mr-0 hidden w-[260px] shrink-0 flex-col overflow-hidden rounded-[22px] bg-gradient-to-b from-sidebar to-sidebar/95 text-sidebar-foreground shadow-lg md:flex"
          )}
        >
          <Link
            to="/browse"
            className={cn(
              "flex w-full items-center py-6 transition-opacity duration-150 hover:opacity-85",
              sidebarCompact
                ? "justify-center gap-0 px-0"
                : "gap-3 px-7"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-100 p-1 shadow-md">
              <img
                src={logoSrc}
                alt="Vivah"
                className="h-full w-full rounded-lg object-cover transition-transform duration-150 ease-out group-hover/sidebar:scale-105"
                style={{ objectPosition: "50% 40%" }}
              />
            </div>
            <span
              className={cn(
                "whitespace-nowrap bg-gradient-to-r from-white to-gray-300 bg-clip-text font-serif text-xl font-bold text-transparent transition-[max-width,opacity] duration-150 ease-out",
                sidebarCompact && "max-w-0 overflow-hidden opacity-0"
              )}
            >
              Vivah
            </span>
          </Link>

          <ScrollArea className="flex-1">
            <nav
              className={cn(
                "space-y-1 py-3 transition-[padding] duration-150 ease-out",
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
              <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 via-pink-500/10 to-purple-500/10 p-4">
                <div className="absolute right-0 top-0 h-20 w-20 bg-gradient-to-br from-amber-500/20 to-pink-500/20 blur-2xl" />
                <div className="relative z-10">
                  <div className="mb-2 flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    <p className="text-sm font-bold">Go Premium</p>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Unlock AI matching & profile optimization
                  </p>
                  <Button asChild size="sm" className="pressable h-8 w-full rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-xs font-semibold shadow-md">
                    <Link to="/subscriptions">
                      Upgrade Now
                    </Link>
                  </Button>
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
        <section className="relative m-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[30px] bg-[#fff9fc] dark:bg-[#211219] md:m-2 md:ml-2 md:rounded-[22px] md:bg-background/70 md:dark:bg-background/70">
          {/* Mobile Header */}
          <div
            className={cn(
              "sticky top-0 z-40 bg-[#fff9fc]/95 px-5 pb-3 pt-5 backdrop-blur-md dark:bg-[#211219]/95 md:hidden",
              isScrolled && "shadow-[0_12px_28px_rgba(173,38,95,0.10)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.26)]"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {showMobileBack ? (
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_8px_20px_rgba(173,38,95,0.12)] ring-1 ring-primary/10 dark:bg-white/10 dark:text-rose-100 dark:ring-white/10"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <Link
                    to="/browse"
                    className="pressable flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_8px_20px_rgba(173,38,95,0.12)] ring-1 ring-primary/10 dark:bg-white/10 dark:ring-white/10"
                    aria-label="Vivah dashboard"
                  >
                    <img
                      src={logoSrc}
                      alt="Vivah"
                      className="h-full w-full rounded-xl object-cover"
                    />
                  </Link>
                )}

                <div className="min-w-0">
                  <p className="text-[11px] font-medium leading-none text-slate-500 dark:text-rose-100/60">
                    {mobileEyebrow}
                  </p>
                  <h1 className="mt-1 truncate text-lg font-bold leading-tight text-slate-900 dark:text-rose-50">
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
            className={cn(
              "hidden shrink-0 items-center justify-between px-7 transition-[background-color,border-color] duration-150 md:flex",
              isScrolled && "border-b border-border/60 bg-background/90 backdrop-blur-md"
            )}
          >
            <div>
              <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
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
              "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain",
              showMobileBottomNav && "pb-[88px] md:pb-0"
            )}
          >
            <div className="container mx-auto h-full p-0 md:p-6">
              {children}
            </div>
          </main>

          {showMobileBottomNav && (
            <>
              {mobileOpen && (
                <button
                  type="button"
                  className="absolute inset-0 z-40 bg-rose-950/10 backdrop-blur-[1px] dark:bg-black/35 md:hidden"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                />
              )}

              {mobileOpen && (
                <div className="absolute inset-x-4 bottom-[92px] z-50 rounded-[24px] border border-white/90 bg-white/95 p-3 shadow-[0_24px_56px_rgba(173,38,95,0.18)] backdrop-blur-md dark:border-white/10 dark:bg-[#291721]/95 dark:shadow-[0_24px_56px_rgba(0,0,0,0.38)] md:hidden">
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={profile?.name || "Member"} avatarUrl={profile?.avatar_url} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-rose-50">
                          Hello, {firstName}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-rose-100/60">
                          {profile?.role === "primary_admin" ? "Admin" : profile?.role || "Member"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-slate-500 dark:text-rose-100/70 dark:hover:bg-white/10"
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
                            "pressable flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
                            isActive && !isLocked
                              ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.08)] dark:bg-primary/20 dark:text-rose-50 dark:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]"
                              : "bg-rose-50/60 text-slate-600 hover:bg-primary/5 dark:bg-white/5 dark:text-rose-100/75 dark:hover:bg-white/10 dark:hover:text-rose-50"
                          )}
                        >
                          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-current shadow-sm dark:bg-white/10">
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
                    className="mt-3 w-full justify-start rounded-2xl bg-rose-50/70 px-3 text-slate-600 hover:bg-primary/5 dark:bg-white/5 dark:text-rose-100/75 dark:hover:bg-white/10 dark:hover:text-rose-50"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              )}

              <nav className="absolute inset-x-0 bottom-0 z-50 px-4 pb-3 md:hidden" aria-label="Mobile navigation">
                <div className="flex h-16 items-center justify-between rounded-[24px] border border-sidebar-border bg-gradient-to-b from-sidebar to-sidebar/95 px-3 text-sidebar-foreground shadow-[0_18px_40px_rgba(32,18,26,0.28)] backdrop-blur-md">
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
