import { useMemo } from "react";
import type { Profile } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ClipboardList, Minus } from "lucide-react";

interface PartnerPreferencesMatchProps {
  profile: Profile;
  myProfile: Profile | null;
}

interface PreferenceCriterion {
  id: string;
  label: string;
  preferenceText: string;
  isMatched: boolean;
  moreText?: string;
}

export function PartnerPreferencesMatch({ profile, myProfile }: PartnerPreferencesMatchProps) {
  const gender = profile.gender || "female";
  const pronounPossessive = gender === "female" ? "her" : gender === "male" ? "his" : "their";
  const pronounCapitalized = gender === "female" ? "She" : gender === "male" ? "He" : "They";
  const leftLabel = gender === "female" ? "Her Preferences" : gender === "male" ? "His Preferences" : "Their Preferences";

  const criteria = useMemo<PreferenceCriterion[]>(() => {
    const list: PreferenceCriterion[] = [];

    // 1. Age
    let minAge = Math.max(18, (profile.age || 25) - (gender === "female" ? 1 : 5));
    let maxAge = (profile.age || 25) + (gender === "female" ? 6 : 2);
    const isAgeMatched = Boolean(myProfile?.age && myProfile.age >= minAge && myProfile.age <= maxAge);
    list.push({
      id: "age",
      label: "Age",
      preferenceText: `${minAge} to ${maxAge} yrs`,
      isMatched: isAgeMatched,
    });

    // 2. Height
    const targetHeight = profile.height || (gender === "female" ? 162 : 175);
    const minHeight = gender === "female" ? targetHeight + 3 : Math.max(145, targetHeight - 15);
    const maxHeight = gender === "female" ? targetHeight + 25 : targetHeight + 5;
    const formatCmToFtIn = (cm: number) => {
      const totalInches = cm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}' ${inches}" (${cm}cm)`;
    };
    const isHeightMatched = Boolean(
      myProfile?.height ? myProfile.height >= minHeight && myProfile.height <= maxHeight : true
    );
    list.push({
      id: "height",
      label: "Height",
      preferenceText: `${formatCmToFtIn(minHeight)} to ${formatCmToFtIn(maxHeight)}`,
      isMatched: isHeightMatched,
    });

    // 3. Marital Status / Family Goals
    const familyGoalsText = profile.family_goals || "Wants family & children";
    const isFamilyGoalsMatched = Boolean(
      myProfile?.family_goals
        ? true
        : myProfile
        ? true
        : false
    );
    list.push({
      id: "family_goals",
      label: "Marital Status & Family Goals",
      preferenceText: familyGoalsText,
      isMatched: isFamilyGoalsMatched,
    });

    // 4. Religion / Community
    const religionText = profile.ethnicity
      ? `${profile.religion || "Open"} (${profile.ethnicity})`
      : profile.religion || "Open to all faiths";
    const isReligionMatched = Boolean(
      myProfile?.religion &&
        profile.religion &&
        (myProfile.religion.toLowerCase() === profile.religion.toLowerCase() ||
          profile.religion.toLowerCase() === "other")
    );
    list.push({
      id: "religion",
      label: "Religion / Community",
      preferenceText: religionText,
      isMatched: isReligionMatched,
    });

    // 5. Mother Tongue / Languages
    const languagesText =
      profile.languages && profile.languages.length > 0
        ? profile.languages.join(", ")
        : "English, Hindi";
    const isLanguageMatched = Boolean(
      myProfile?.languages &&
        profile.languages &&
        myProfile.languages.some((l) =>
          profile.languages.map((pl) => pl.toLowerCase().trim()).includes(l.toLowerCase().trim())
        )
    );
    list.push({
      id: "languages",
      label: "Mother Tongue & Languages",
      preferenceText: languagesText,
      isMatched: isLanguageMatched,
    });

    // 6. Country / City Living in
    const locationText = profile.willing_to_relocate
      ? `${profile.city || "India"} (Open to Relocate)`
      : profile.city || "Current location";
    const isLocationMatched = Boolean(
      myProfile?.city && profile.city
        ? myProfile.city.toLowerCase() === profile.city.toLowerCase() ||
          profile.willing_to_relocate ||
          myProfile.willing_to_relocate
        : true
    );
    list.push({
      id: "location",
      label: "Country / City Living in",
      preferenceText: locationText,
      isMatched: isLocationMatched,
    });

    // 7. Working With / Profession
    const careerText = profile.career_ambition
      ? `${profile.career_ambition} Ambition / ${profile.profession || "Professional"}`
      : profile.profession || "Working Professional / Business";
    const isCareerMatched = Boolean(
      myProfile?.profession || (myProfile?.career_ambition && profile.career_ambition)
    );
    list.push({
      id: "profession",
      label: "Working With & Career",
      preferenceText: careerText,
      isMatched: isCareerMatched,
    });

    return list;
  }, [profile, myProfile, gender]);

  const matchedCount = criteria.filter((c) => c.isMatched).length;
  const totalCount = criteria.length;

  return (
    <Card className="overflow-hidden border-card-border bg-card/95 shadow-sm">
      <CardContent className="p-5 sm:p-7">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/80 text-primary shadow-xs">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              What {pronounCapitalized} Is Looking For
            </h2>
            <p className="text-xs text-muted-foreground">
              Mutual compatibility breakdown based on {pronounPossessive} partner preferences
            </p>
          </div>
        </div>

        {/* Visual Match Comparison Header */}
        <div className="mt-6 rounded-2xl border border-border/70 bg-background/50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Candidate side */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <UserAvatar
                  name={profile.name}
                  avatarUrl={profile.avatar_url}
                  className="h-16 w-16 border-2 border-primary/20 shadow-md sm:h-20 sm:w-20"
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-muted-foreground sm:text-sm">
                {leftLabel}
              </p>
            </div>

            {/* Middle dotted line & Match pill */}
            <div className="relative flex flex-1 items-center justify-center px-1 sm:px-3">
              {/* Dotted line */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b-2 border-dashed border-border" />

              {/* Badge */}
              <Badge
                variant="secondary"
                className="relative z-10 whitespace-nowrap rounded-full border border-border/80 bg-card px-3 py-1.5 text-center text-[11px] font-semibold text-foreground shadow-xs sm:px-4 sm:py-2 sm:text-xs"
              >
                You match{" "}
                <span className="font-bold text-primary">
                  {matchedCount}/{totalCount}
                </span>{" "}
                of {pronounPossessive} Preferences
              </Badge>
            </div>

            {/* My side */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <UserAvatar
                  name={myProfile?.name || "You"}
                  avatarUrl={myProfile?.avatar_url}
                  className="h-16 w-16 border-2 border-primary/20 shadow-md sm:h-20 sm:w-20"
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-muted-foreground sm:text-sm">
                You match
              </p>
            </div>
          </div>
        </div>

        {/* Criteria Breakdown Rows */}
        <div className="mt-6 divide-y divide-border/60 rounded-xl border border-border/70 bg-background/40">
          {criteria.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-background/80 sm:px-5 sm:py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-500/90 dark:text-rose-400">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                  {item.preferenceText}
                </p>
              </div>

              <div className="shrink-0">
                {item.isMatched ? (
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                    title="You match this preference"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </span>
                ) : (
                  <span
                    className="flex h-6 w-6 items-center justify-center text-muted-foreground/40"
                    title="Preference not directly matched"
                  >
                    <Minus className="h-4 w-4 stroke-[2]" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
