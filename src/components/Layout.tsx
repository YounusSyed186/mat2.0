import { Link, useLocation } from "wouter";
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
  Mail,
  Menu,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  UserCircle,
  Users,
  X,
  Settings,
  HelpCircle,
  Bell,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAiAccess } from "@/hooks/useAiAccess";
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
  icon: any;
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
            href={isLocked ? "/subscriptions" : href}
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
const HeaderActions = memo(({ profile, onSignOut }: { profile: any; onSignOut: () => void }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Search className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative">
              <Mail className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Messages</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

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
                    <Button variant="ghost" size="sm" className="justify-start gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start gap-2">
                      <HelpCircle className="h-4 w-4" />
                      Help
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
  const [location] = useLocation();
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
    } catch (error) {
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

  const activeItem = navItems.find(({ href }) => location === href || location.startsWith(href + "/"));
  const pageTitle = activeItem?.label ?? "Vivah";
  const sidebarCompact = false;

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
    <div className="relative h-[100dvh] overflow-hidden bg-[#080606] px-[0.5vw] py-[0.5dvh] text-foreground">
      <div className="pointer-events-none fixed inset-0 opacity-95">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(236,72,153,0.15),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(236,72,153,0.08)_0,transparent_42%,rgba(97,18,50,0.12)_100%)]" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-none overflow-hidden rounded-[28px] bg-background shadow-xl">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "group/sidebar m-2 mr-0 hidden w-[260px] shrink-0 flex-col overflow-hidden rounded-[22px] bg-gradient-to-b from-sidebar to-sidebar/95 text-sidebar-foreground shadow-lg md:flex"
          )}
        >
          <Link
            href="/browse"
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
                  isActive={location === item.href || location.startsWith(item.href + "/")}
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
                    <Link href="/subscriptions">
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
        <section className="m-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-background/70 md:m-2 md:ml-2">
          {/* Mobile Header */}
          <div className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/browse" className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm">
                  <img
                    src={logoSrc}
                    alt="Vivah"
                    className="h-full w-full rounded object-cover"
                  />
                </div>
                <span className="font-serif text-lg font-bold">Vivah</span>
              </Link>
              <div className="flex items-center gap-1">
                <ModeToggle />
                <NotificationBell />
                <button
                  type="button"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted transition-colors"
                  data-testid="button-mobile-menu"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
              <div className="border-t border-border/60 bg-sidebar px-3 py-3 animate-in slide-in-from-top-2">
                <ScrollArea className="max-h-[calc(100vh-120px)]">
                  <div className="space-y-1">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.href}
                        {...item}
                        compactOnDesktop={false}
                        hasAiAccess={aiAccessReady}
                        isActive={location === item.href || location.startsWith(item.href + "/")}
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}
                    <Separator className="my-2" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </ScrollArea>
              </div>
            )}
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
          <main ref={mainRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            <div className="container mx-auto p-4 md:p-6">
              {children}
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
