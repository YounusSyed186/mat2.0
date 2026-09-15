import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import {
  ArrowRight,
  Ban,
  Briefcase,
  CheckCircle2,
  Clock,
  GraduationCap,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Profile } from "@/types";
import type { ProfileRelationStatus } from "@/lib/profileJourney";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface ProfileCardProps {
  profile: Profile;
  similarity?: number;
  isSaved?: boolean;
  relationStatus?: ProfileRelationStatus;
  matchReasons?: string[];
  actionLoading?: boolean;
  onSave?: (profileId: string) => void;
  onSendInterest?: (profileId: string) => void;
  className?: string;
}

export const ProfileCard = memo(function ProfileCard({
  profile,
  similarity,
  isSaved = false,
  relationStatus = "none",
  matchReasons = [],
  actionLoading = false,
  onSave,
  onSendInterest,
  className,
}: ProfileCardProps) {
  const hasSimilarity = typeof similarity === "number";
  const profileHref = `/user/${profile.id}`;
  const canSendInterest = relationStatus === "none" && onSendInterest;

  return (
    <Card
      className={cn(
        "premium-card interactive-surface group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 dark:bg-card/90",
        className
      )}
      data-testid={`card-profile-${profile.id}`}
    >
      <div className="space-y-3">
        {/* Header: Avatar, Name, Location & Save Button */}
        <div className="flex items-start justify-between gap-3">
          <Link to={profileHref} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative shrink-0">
              <UserAvatar name={profile.name} avatarUrl={profile.avatar_url} size="lg" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-serif text-base font-bold text-foreground transition-colors group-hover:text-primary">
                {profile.name}
              </h3>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/80">{profile.age} yrs</span>
                {profile.city && (
                  <>
                    <span>•</span>
                    <span className="truncate">{profile.city}</span>
                  </>
                )}
              </p>
            </div>
          </Link>

          {onSave && (
            <button
              type="button"
              onClick={() => onSave(profile.id)}
              aria-pressed={isSaved}
              aria-label={isSaved ? "Remove saved profile" : "Save profile"}
              className={cn(
                "pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/40 bg-muted/30 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/20",
                isSaved && "border-primary/20 bg-primary/10 text-primary"
              )}
            >
              <Heart className={cn("h-4 w-4 transition-transform active:scale-125", isSaved && "fill-current")} />
            </button>
          )}
        </div>

        {/* Compatibility / Match Highlights (Compact) */}
        {(hasSimilarity || matchReasons.length > 0 || profile.religion) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {hasSimilarity && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-3 w-3" />
                {Math.round(similarity * 100)}% Match
              </span>
            )}
            {profile.religion && (
              <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {profile.religion}
              </span>
            )}
            {matchReasons.slice(0, 2).map((reason) => (
              <span
                key={reason}
                className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Bio preview */}
        <Link to={profileHref} className="block">
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {profile.bio || profile.search_intent || "Looking for a meaningful connection with shared values."}
          </p>
        </Link>

        {/* Key professional & education details */}
        {(profile.profession || profile.education) && (
          <Link to={profileHref} className="space-y-1.5 rounded-xl bg-muted/30 p-2.5 text-xs">
            {profile.profession && (
              <div className="flex items-center gap-2 text-foreground/85">
                <Briefcase className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span className="truncate font-medium">{profile.profession}</span>
              </div>
            )}
            {profile.education && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                <span className="truncate">{profile.education}</span>
              </div>
            )}
          </Link>
        )}
      </div>

      {/* Action Buttons Footer */}
      <div className="mt-4 grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
        {relationStatus === "accepted" ? (
          <Button asChild size="sm" className="premium-cta pressable h-9 gap-1.5 rounded-xl text-xs shadow-none">
            <Link to={`/chat/${profile.id}`}>
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </Link>
          </Button>
        ) : relationStatus === "received_pending" ? (
          <Button asChild size="sm" className="premium-cta pressable h-9 gap-1.5 rounded-xl text-xs shadow-none">
            <Link to="/interests">
              <Heart className="h-3.5 w-3.5" />
              Review
            </Link>
          </Button>
        ) : relationStatus === "sent_pending" ? (
          <Button size="sm" variant="outline" disabled className="h-9 gap-1.5 rounded-xl text-xs">
            <Clock className="h-3.5 w-3.5" />
            Sent
          </Button>
        ) : relationStatus === "rejected" ? (
          <Button size="sm" variant="outline" disabled className="h-9 gap-1.5 rounded-xl text-xs">
            <XCircle className="h-3.5 w-3.5" />
            Closed
          </Button>
        ) : relationStatus === "blocked" ? (
          <Button size="sm" variant="outline" disabled className="h-9 gap-1.5 rounded-xl text-xs">
            <Ban className="h-3.5 w-3.5" />
            Unavailable
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onSendInterest?.(profile.id)}
            disabled={!canSendInterest || actionLoading}
            className="premium-cta pressable h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-none"
          >
            {actionLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Heart className="h-3.5 w-3.5" />
            )}
            Interest
          </Button>
        )}

        <Button asChild size="sm" variant="outline" className="pressable h-9 gap-1.5 rounded-xl border-border/60 bg-background text-xs font-medium text-foreground hover:bg-muted/50 shadow-none">
          <Link to={profileHref}>
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
            View Profile
          </Link>
        </Button>
      </div>
    </Card>
  );
});
