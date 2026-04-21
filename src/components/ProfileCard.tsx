import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { MapPin, GraduationCap, Briefcase, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Profile } from "@/types";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  profile: Profile;
  similarity?: number;
  className?: string;
}

export function ProfileCard({ profile, similarity, className }: ProfileCardProps) {
  const hasSimilarity = typeof similarity === 'number';

  return (
    <Card
      className={cn(
        "group overflow-hidden border-card-border shadow-sm hover:shadow-md transition-all duration-300",
        className
      )}
      data-testid={`card-profile-${profile.id}`}
    >
      <div className="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative">
        <div className="absolute -bottom-10 left-6">
          <UserAvatar 
            name={profile.name} 
            avatarUrl={profile.avatar_url} 
            size="xl" 
            className="border-4 border-background shadow-sm" 
          />
        </div>
        {hasSimilarity && (
          <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-sm flex items-center gap-1 border border-primary/20 animate-in zoom-in-50 duration-500">
            <Sparkles className="h-3 w-3 text-primary" />
            {Math.round(similarity * 100)}% Match
          </div>
        )}
      </div>

      <CardContent className="pt-12 pb-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">
            {profile.name}, {profile.age}
          </h3>
        </div>
        
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          {profile.gender} · {profile.religion}
        </p>

        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {profile.city && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/60" />
              <span className="truncate">{profile.city}</span>
            </div>
          )}
          {profile.profession && (
            <div className="flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 shrink-0 text-primary/60" />
              <span className="truncate">{profile.profession}</span>
            </div>
          )}
          {profile.education && (
            <div className="flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 shrink-0 text-primary/60" />
              <span className="truncate">{profile.education}</span>
            </div>
          )}
        </div>

        {profile.bio && (
          <p className="mt-4 text-xs line-clamp-2 text-muted-foreground leading-relaxed border-t border-border pt-3 italic">
            "{profile.bio}"
          </p>
        )}
      </CardContent>

      <CardFooter className="bg-muted/30 pt-3 pb-3 px-6">
        <Button asChild variant="ghost" size="sm" className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 px-2 h-9">
          <Link href={`/user/${profile.id}`}>
            <span className="font-medium text-xs">View Profile</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
