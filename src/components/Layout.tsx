import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { ModeToggle } from "@/components/ModeToggle";
import { Heart, Users, MessageCircle, UserCircle, LayoutDashboard, LogOut, Menu, X, Star, Sparkles, TrendingUp, Lock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAiAccess } from "@/hooks/useAiAccess";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toast } = useToast();
  const { hasAccess: hasAiAccess } = useAiAccess();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
  };

  const navItems = [
    { href: "/browse", label: "Browse", icon: Users, aiGated: false },
    { href: "/interests", label: "Interests", icon: Heart, aiGated: false },
    { href: "/chat", label: "Messages", icon: MessageCircle, aiGated: false },
    { href: "/ai-match", label: "AI Match", icon: Sparkles, aiGated: true },
    { href: "/profile-optimizer", label: "AI Optimizer", icon: TrendingUp, aiGated: true },
    { href: "/subscriptions", label: "Premium", icon: Star, aiGated: false },
    { href: "/profile/edit", label: "My Profile", icon: UserCircle, aiGated: false },
  ];

  if (profile?.role === "admin" || profile?.role === "primary_admin") {
    navItems.push({ href: "/admin", label: "Admin", icon: LayoutDashboard, aiGated: false });
  }

  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/20">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-sidebar/80 backdrop-blur-2xl border-r border-sidebar-border/50 fixed inset-y-0 left-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border/50">
          <Heart className="h-6 w-6 text-primary fill-primary drop-shadow-sm" />
          <span className="font-serif font-semibold text-lg text-foreground tracking-tight">Vivah</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon, aiGated }) => {
            const isActive = location === href || location.startsWith(href + "/");
            const isLocked = aiGated && !hasAiAccess;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isLocked
                    ? "text-muted-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                {isLocked && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                    <Lock className="h-2.5 w-2.5" />
                    Gold
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border/50">
          {profile && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-background/50 rounded-lg border border-border/50">
              <UserAvatar name={profile.name} avatarUrl={profile.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
              </div>
              <ModeToggle />
              <NotificationBell />
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
            data-testid="button-signout"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar/80 backdrop-blur-2xl border-b border-sidebar-border/50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary fill-primary drop-shadow-sm" />
            <span className="font-serif font-semibold text-base text-foreground">Vivah</span>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="px-3 pb-3 space-y-1">
            {navItems.map(({ href, label, icon: Icon, aiGated }) => {
              const isActive = location === href;
              const isLocked = aiGated && !hasAiAccess;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isLocked
                      ? "text-muted-foreground/60 hover:bg-sidebar-accent"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{label}</span>
                  {isLocked && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                      <Lock className="h-2.5 w-2.5" />
                      Gold
                    </span>
                  )}
                </Link>
              );
            })}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        )}
      </div>

      <main className="flex-1 md:ml-60 min-h-screen">
        <div className="md:hidden h-14" />
        {children}
      </main>
    </div>
  );
}
