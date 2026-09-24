import { memo } from "react";
import { Link } from "react-router-dom";
import type { Profile } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface CustomSidebarProps {
  myProfile: Profile | null;
  profileCompletion: number;
  highCompatibilityCount?: number;
  className?: string;
}

export const CustomSidebar = memo(function CustomSidebar({
  myProfile,
  profileCompletion,
  highCompatibilityCount = 0,
  className = "",
}: CustomSidebarProps) {
  return (
    <aside className={`space-y-4 xl:sticky xl:top-6 ${className}`}>
      {/* CARD 1 — YOUR PROFILE COMPLETION */}
      <Card className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="relative h-12 bg-gradient-to-r from-primary/15 via-rose-500/10 to-amber-500/15" />
        <CardContent className="relative px-5 pb-5 pt-0">
          {myProfile ? (
            <div className="-mt-6 flex flex-col items-center text-center">
              <div className="rounded-full ring-4 ring-background shadow-xs">
                <UserAvatar
                  name={myProfile.name}
                  avatarUrl={myProfile.avatar_url}
                  className="h-16 w-16"
                />
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <h3 className="font-serif text-base font-bold text-foreground">
                  {myProfile.name}
                </h3>
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">
                {myProfile.profession || "Vivaah Vedika Member"}
              </p>

              {/* Profile Strength Bar */}
              <div className="mt-4 w-full space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">
                    Profile Strength
                  </span>
                  <span className="font-bold text-primary">
                    {profileCompletion}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-rose-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, profileCompletion)}%` }}
                  />
                </div>
              </div>

              {/* Complete Profile CTA */}
              <Button
                asChild
                size="sm"
                variant={profileCompletion < 85 ? "default" : "outline"}
                className={`mt-4 w-full h-9 rounded-xl text-xs font-semibold ${
                  profileCompletion < 85
                    ? "premium-cta shadow-none"
                    : "border-border/70 hover:bg-muted/50"
                }`}
              >
                <Link to="/profile/edit">
                  {profileCompletion < 85 ? "Complete Profile" : "Edit Profile"}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-3">
              <Skeleton className="mx-auto h-16 w-16 rounded-full" />
              <Skeleton className="mx-auto h-4 w-32" />
              <Skeleton className="mx-auto h-3 w-20" />
              <Skeleton className="mt-3 h-2 w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* CARD 2 — MATCH INSIGHT / STRONG MATCHES */}
      <Card className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-amber-500/5 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Strong Matches
            </span>
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-primary/10 text-primary border-primary/20">
              {highCompatibilityCount} found
            </Badge>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            {highCompatibilityCount > 0
              ? `${highCompatibilityCount} profiles closely match your lifestyle, faith, and location preferences.`
              : "Discover compatible matches ranked by bilateral preference alignment."}
          </p>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mt-3 h-8 w-full justify-between rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            <Link to="/ai-match">
              Explore AI Compatibility
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
});
