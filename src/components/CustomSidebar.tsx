import { memo } from "react";
import { Link } from "react-router-dom";
import type { Profile } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";
import {
  User,
  MessageCircle,
  Sparkles,
  Zap,
  MapPin,
  Heart,
  Calendar,
  ArrowRight,
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
    <aside className={`space-y-5 xl:sticky xl:top-6 ${className}`}>
      {/* Profile Overview Card */}
      <Card className="premium-card overflow-hidden rounded-xl border border-card-border shadow-none">
        <div className="relative h-14 bg-gradient-to-r from-primary/15 via-amber-500/15 to-teal-500/15" />
        <CardContent className="relative px-5 pb-5 pt-0">
          {myProfile ? (
            <>
              <div className="-mt-8 flex flex-col items-center text-center">
                <div className="rounded-full ring-4 ring-background">
                  <UserAvatar
                    name={myProfile.name}
                    avatarUrl={myProfile.avatar_url}
                    className="h-16 w-16"
                  />
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    {myProfile.name}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {myProfile.profession || "Vivah Member"}
                </p>

                {/* Profile Completion Bar */}
                <div className="mt-3 w-full space-y-1.5">
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
                      className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, profileCompletion)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Navigation Action Grid */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="pressable h-9 gap-1 rounded-lg text-xs font-semibold"
                >
                  <Link to="/profile/edit">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Edit
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="pressable h-9 gap-1 rounded-lg text-xs font-semibold"
                >
                  <Link to="/chat">
                    <MessageCircle className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    Chat
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="pressable h-9 gap-1 rounded-lg text-xs font-semibold"
                >
                  <Link to="/ai-match">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    AI
                  </Link>
                </Button>
              </div>

              {/* Quick Profile Bio/Preferences Snapshot */}
              <div className="mt-4 space-y-2 border-t border-border pt-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-teal-600" />
                    Location
                  </span>
                  <span className="max-w-[130px] truncate font-medium text-foreground">
                    {myProfile.city || "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Heart className="h-3.5 w-3.5 text-rose-600" />
                    Religion
                  </span>
                  <span className="max-w-[130px] truncate font-medium text-foreground">
                    {myProfile.religion || "Not set"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-violet-600" />
                    Age
                  </span>
                  <span className="font-medium text-foreground">
                    {myProfile.age ? `${myProfile.age} yrs` : "Not set"}
                  </span>
                </div>
              </div>
            </>
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

      {/* Match Insights Widget */}
      {highCompatibilityCount > 0 && (
        <Card className="premium-card overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-amber-500/5 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" /> High Match Radar
              </span>
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs font-bold">
                {highCompatibilityCount} found
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {highCompatibilityCount} profiles in your feed align closely with your lifestyle, religion, and location preferences.
            </p>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mt-2 h-7 w-full justify-between p-0 text-xs font-semibold text-primary hover:bg-transparent"
            >
              <Link to="/ai-match">
                Explore AI Compatibility Insights
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pro Tips Card */}
      <Card className="overflow-hidden rounded-xl border-0 bg-gradient-to-br from-amber-500/12 via-teal-500/10 to-transparent shadow-none">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/15 p-1.5 text-amber-600 dark:text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-serif text-xs font-bold text-foreground">
                Matchmaking Tip
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {profileCompletion < 80
                  ? "Adding your lifestyle habits & partner preferences increases profile views by up to 3x."
                  : "Your profile is in great shape! Keep reviewing your suggested matches to build connections."}
              </p>
              {profileCompletion < 80 && (
                <Button
                  size="sm"
                  variant="link"
                  className="mt-1.5 h-auto p-0 text-xs font-bold text-primary"
                  asChild
                >
                  <Link to="/profile/edit">Complete Profile &rarr;</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
});
