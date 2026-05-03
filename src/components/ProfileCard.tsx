import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { ArrowRight, Briefcase, GraduationCap, Heart, MapPin, Sparkles } from "lucide-react";
import { Link } from "wouter";
import type { Profile } from "@/types";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface ProfileCardProps {
  profile: Profile;
  similarity?: number;
  isSaved?: boolean;
  onSave?: (profileId: string) => void;
  className?: string;
}

export const ProfileCard = memo(function ProfileCard({
  profile,
  similarity,
  isSaved = false,
  onSave,
  className,
}: ProfileCardProps) {
  const hasSimilarity = typeof similarity === "number";
  const profileHref = `/user/${profile.id}`;

  return (
    <Card
      className={cn(
        "interactive-surface group h-full border-card-border bg-card shadow-sm",
        className
      )}
      data-testid={`card-profile-${profile.id}`}
    >
      <div className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={profileHref} className="flex min-w-0 items-center gap-3">
            <UserAvatar name={profile.name} avatarUrl={profile.avatar_url} size="lg" />
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-foreground transition-colors group-hover:text-primary">
                {profile.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{profile.age} yrs</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {onSave && (
              <button
                type="button"
                onClick={() => onSave(profile.id)}
                aria-pressed={isSaved}
                aria-label={isSaved ? "Remove saved profile" : "Save profile"}
                className={cn(
                  "pressable flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-muted text-muted-foreground",
                  isSaved && "bg-primary/10 text-primary"
                )}
              >
                <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
              </button>
            )}
            <Link
              href={profileHref}
              aria-label={`View ${profile.name}'s profile`}
              className="pressable flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700 group-hover:bg-primary group-hover:text-primary-foreground"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {hasSimilarity && (
          <div className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            {Math.round(similarity * 100)}% Match
          </div>
        )}

        <Link href={profileHref} className="mt-4 block">
          <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-muted-foreground">
            {profile.bio || "Looking for a meaningful connection. Open to thoughtful conversations and shared family values."}
          </p>
        </Link>

        <Link href={profileHref} className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-teal-600" />
            <span className="truncate">{profile.city || "Location not listed"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4 text-rose-600" />
            <span className="truncate">{profile.profession || "Profession not listed"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-4 w-4 text-violet-600" />
            <span className="truncate">{profile.education || "Education not listed"}</span>
          </div>
        </Link>

        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {profile.religion && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Heart className="h-3.5 w-3.5 text-rose-500" />
              {profile.religion}
            </span>
          )}
          {profile.search_intent && (
            <span className="inline-flex rounded-full bg-[#fff0f5] px-2.5 py-1 text-xs font-medium text-primary">
              {profile.search_intent}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
});
