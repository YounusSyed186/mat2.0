import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Ban,
  CheckCircle2,
  Clock,
  Heart,
  Loader2,
  Lock,
  MessageCircle,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { Profile } from "@/types";
import type { ProfileRelationStatus } from "@/lib/profileJourney";
import { cn } from "@/lib/utils";
import React, { memo, useState } from "react";
import { usePlanEntitlements } from "@/hooks/usePlanEntitlements";

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
  cardIndex?: number;
}

// Optimize image URL for portrait 4:5 card
function getOptimizedPhotoUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes("images.unsplash.com")) {
    const base = url.split("?")[0];
    return `${base}?auto=format&fit=crop&crop=faces,top&w=600&h=750&q=85`;
  }
  return url;
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
  cardIndex,
}: ProfileCardProps) {
  const navigate = useNavigate();
  const { canViewProfilePhoto } = usePlanEntitlements();
  const photoUnlocked = canViewProfilePhoto(cardIndex);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const profileHref = `/user/${profile.id}`;
  const canSendInterest = relationStatus === "none" && Boolean(onSendInterest);
  const photoUrl = getOptimizedPhotoUrl(profile.avatar_url);

  // Derive marital status fallback
  const maritalStatus = profile.marital_status || "Never Married";
  const religionDisplay = profile.ethnicity
    ? `${profile.religion} (${profile.ethnicity.split(" ")[0]})`
    : profile.religion;

  // Compatibility signals (max 2 concise tags or summarized tag)
  const matchedPrefs = (profile as any).matched_preferences || matchReasons;
  const matchCount = matchedPrefs.length;
  const matchScore = typeof (profile as any).final_match_score === "number"
    ? Math.round((profile as any).final_match_score * 100)
    : typeof similarity === "number"
    ? Math.round(similarity * 100)
    : null;

  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if the user didn't click an interactive element
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) {
      return;
    }
    navigate(profileHref);
  };

  const handleShortlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(profile.id);
  };

  const handleInterestClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSendInterest?.(profile.id);
  };

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl dark:bg-card/90 cursor-pointer",
        className
      )}
      data-testid={`card-profile-${profile.id}`}
    >
      {/* 1. PHOTO-FIRST HERO CONTAINER (4:5 Portrait Ratio, ~55-65% of Card) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted/40 select-none">
        {/* Skeleton placeholder before image loads */}
        {!imageLoaded && !imageError && photoUrl && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/60 to-primary/10" />
        )}

        {photoUrl && !imageError ? (
          <img
            src={photoUrl}
            alt={`${profile.name}'s profile photo`}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageLoaded(true);
              setImageError(true);
            }}
            className={cn(
              "h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105",
              !photoUnlocked && "filter blur-md scale-110 pointer-events-none brightness-90",
              !imageLoaded && "opacity-0",
              imageLoaded && "opacity-100 transition-opacity duration-300"
            )}
          />
        ) : (
          /* Fallback Portrait Container */
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/30 text-muted-foreground">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-background/80 shadow-xs">
              <User className="h-10 w-10 text-primary/60" />
            </div>
            <span className="mt-3 text-xs font-medium text-muted-foreground">
              {profile.name}
            </span>
          </div>
        )}

        {/* LOCKED / BLURRED PHOTO OVERLAY */}
        {!photoUnlocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 p-4 text-center backdrop-blur-xs">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/90 text-white shadow-md">
              <Lock className="h-5 w-5" />
            </div>
            <p className="mt-2 text-xs font-semibold text-white drop-shadow-sm">
              Photo available on request
            </p>
            <p className="mt-0.5 text-[11px] text-white/80">
              Upgrade to view full photos
            </p>
          </div>
        )}

        {/* Subtle photo bottom gradient for visual depth */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Top-Right Heart / Shortlist Floating Button */}
        {onSave && (
          <button
            type="button"
            onClick={handleShortlistClick}
            aria-pressed={isSaved}
            aria-label={isSaved ? `Remove ${profile.name} from shortlist` : `Add ${profile.name} to shortlist`}
            className={cn(
              "absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 active:scale-95 shadow-md",
              isSaved
                ? "bg-white text-rose-600 ring-2 ring-rose-500/30"
                : "bg-black/35 text-white/90 hover:bg-black/55 hover:text-white border border-white/20"
            )}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-transform group-hover:scale-110",
                isSaved && "fill-current"
              )}
            />
          </button>
        )}

        {/* Bottom Photo Badges (e.g., Match % or Horoscope Indicator) */}
        <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between gap-1 text-white">
          {matchScore !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-xs">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              {matchScore}% Match
            </span>
          ) : (
            <span />
          )}

          {profile.horoscope_available && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-amber-200 border border-amber-400/30 backdrop-blur-md">
              ◇ Horoscope
            </span>
          )}
        </div>
      </div>

      {/* 2. PROGRESSIVE DISCLOSURE DETAILS */}
      <div className="flex flex-1 flex-col justify-between p-4 pt-3.5 space-y-3">
        <div className="space-y-1.5">
          {/* PRIMARY: Name */}
          <Link
            to={profileHref}
            className="block group/title focus:outline-hidden"
          >
            <h3 className="truncate font-serif text-lg font-bold tracking-tight text-foreground transition-colors group-hover/title:text-primary">
              {profile.name}
            </h3>
          </Link>

          {/* SECONDARY: Age • Location */}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span className="font-semibold text-foreground/90">{profile.age} yrs</span>
            {profile.city && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span className="truncate">{profile.city}</span>
              </>
            )}
          </p>

          {/* TERTIARY: Religion / Community • Marital Status */}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground/90">
            {religionDisplay && <span className="truncate font-medium">{religionDisplay}</span>}
            {religionDisplay && maritalStatus && <span className="text-muted-foreground/60">•</span>}
            {maritalStatus && <span className="truncate">{maritalStatus}</span>}
          </p>

          {/* COMPATIBILITY SUMMARY (Max 2 concise badges or summarized string) */}
          {matchCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {matchCount <= 2 ? (
                matchedPrefs.slice(0, 2).map((reason: string) => (
                  <span
                    key={reason}
                    className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary border border-primary/15"
                  >
                    ✓ {reason}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-medium text-primary border border-primary/15">
                  ✓ {matchCount} preferences match
                </span>
              )}
            </div>
          )}
        </div>

        {/* 3. CARD ACTIONS (View Profile + Interest / Connect) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="pressable h-9 gap-1.5 rounded-xl border-border/70 bg-background text-xs font-semibold text-foreground hover:bg-muted/60 shadow-none"
          >
            <Link to={profileHref}>
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              View Profile
            </Link>
          </Button>

          {relationStatus === "accepted" ? (
            <Button
              asChild
              size="sm"
              className="pressable h-9 gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-none"
            >
              <Link to={`/chat/${profile.id}`}>
                <MessageCircle className="h-3.5 w-3.5" />
                Chat
              </Link>
            </Button>
          ) : relationStatus === "received_pending" ? (
            <Button
              asChild
              size="sm"
              className="premium-cta pressable h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-none"
            >
              <Link to="/interests">
                <Heart className="h-3.5 w-3.5 fill-current" />
                Review
              </Link>
            </Button>
          ) : relationStatus === "sent_pending" ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="h-9 gap-1.5 rounded-xl border-border/60 bg-muted/30 text-xs text-muted-foreground"
            >
              <Clock className="h-3.5 w-3.5" />
              Sent
            </Button>
          ) : relationStatus === "rejected" ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="h-9 gap-1.5 rounded-xl border-border/60 bg-muted/30 text-xs text-muted-foreground"
            >
              <XCircle className="h-3.5 w-3.5" />
              Closed
            </Button>
          ) : relationStatus === "blocked" ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="h-9 gap-1.5 rounded-xl border-border/60 bg-muted/30 text-xs text-muted-foreground"
            >
              <Ban className="h-3.5 w-3.5" />
              Blocked
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleInterestClick}
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
        </div>
      </div>
    </Card>
  );
});
