import { useMemo } from "react";
import type { Profile } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ClipboardList, Minus, AlertCircle } from "lucide-react";

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
  const leftLabel = gender === "female" ? "Her Preferences" : gender === "male" ? "His Preferences" : "Their Preferences";

  const criteria = useMemo<PreferenceCriterion[]>(() => {
    const list: PreferenceCriterion[] = [];

    // 1. Age
    const minAge = profile.partner_age_min || Math.max(18, (profile.age || 25) - (gender === "female" ? 1 : 5));
    const maxAge = profile.partner_age_max || (profile.age || 25) + (gender === "female" ? 6 : 2);
    const isAgeMatched = Boolean(myProfile?.age && myProfile.age >= minAge && myProfile.age <= maxAge);
    list.push({
      id: "age",
      label: "Age Range",
      preferenceText: `${minAge} to ${maxAge} yrs`,
      isMatched: isAgeMatched,
    });

    // 2. Religion / Community
    const prefReligion = profile.partner_religion || profile.religion;
    const isReligionStrict = profile.partner_religion_strict;
    const religionText = prefReligion
      ? `${prefReligion}${isReligionStrict ? " (Strict)" : ""}`
      : "Open to all faiths";
    const isReligionMatched = Boolean(
      !prefReligion ||
        (myProfile?.religion && myProfile.religion.toLowerCase() === prefReligion.toLowerCase())
    );
    list.push({
      id: "religion",
      label: "Religion & Faith",
      preferenceText: religionText,
      isMatched: isReligionMatched,
    });

    // 3. Location & Relocation
    const prefCity = profile.partner_city || profile.city;
    const willingRelocate = profile.partner_willing_to_relocate ?? profile.willing_to_relocate;
    const locationText = prefCity
      ? `${prefCity}${willingRelocate ? " (Open to Relocate)" : ""}`
      : "Current location / Any";
    const isLocationMatched = Boolean(
      !prefCity ||
        (myProfile?.city && myProfile.city.toLowerCase() === prefCity.toLowerCase()) ||
        willingRelocate ||
        myProfile?.willing_to_relocate
    );
    list.push({
      id: "location",
      label: "Location & Relocation",
      preferenceText: locationText,
      isMatched: isLocationMatched,
    });

    // 4. Education & Profession
    const prefEdu = profile.partner_education;
    const prefProf = profile.partner_profession || profile.partner_career_ambition;
    const careerText = prefProf || prefEdu
      ? [prefEdu, prefProf].filter(Boolean).join(" • ")
      : profile.profession || "Working Professional / Graduate";
    const isCareerMatched = Boolean(
      !prefEdu || (myProfile?.education && myProfile.education.toLowerCase().includes(prefEdu.toLowerCase())) ||
      !prefProf || (myProfile?.profession && myProfile.profession.toLowerCase().includes(prefProf.toLowerCase()))
    );
    list.push({
      id: "profession",
      label: "Education & Profession",
      preferenceText: careerText,
      isMatched: isCareerMatched,
    });

    // 5. Height
    const minH = profile.partner_height_min;
    const maxH = profile.partner_height_max;
    const formatCmToFtIn = (cm: number) => {
      const totalInches = cm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}' ${inches}" (${cm}cm)`;
    };
    const heightText = minH || maxH
      ? `${minH ? formatCmToFtIn(minH) : "Any"} to ${maxH ? formatCmToFtIn(maxH) : "Any"}`
      : "Open height preference";
    const isHeightMatched = Boolean(
      myProfile?.height
        ? (!minH || myProfile.height >= minH) && (!maxH || myProfile.height <= maxH)
        : true
    );
    list.push({
      id: "height",
      label: "Height",
      preferenceText: heightText,
      isMatched: isHeightMatched,
    });

    // 6. Languages
    const pLangs = profile.partner_languages?.length ? profile.partner_languages : profile.languages;
    const languagesText = pLangs?.length ? pLangs.join(", ") : "English, Hindi / Any";
    const isLanguageMatched = Boolean(
      !pLangs?.length ||
        (myProfile?.languages &&
          myProfile.languages.some((l) =>
            pLangs.map((pl) => pl.toLowerCase().trim()).includes(l.toLowerCase().trim())
          ))
    );
    list.push({
      id: "languages",
      label: "Languages Spoken",
      preferenceText: languagesText,
      isMatched: isLanguageMatched,
    });

    // 7. Family Goals & Lifestyle
    const familyGoalsText = profile.partner_family_goals || profile.family_goals || "Family-oriented";
    const isFamilyGoalsMatched = Boolean(
      !profile.partner_family_goals ||
        (myProfile?.family_goals &&
          myProfile.family_goals.toLowerCase().includes(profile.partner_family_goals.toLowerCase())) ||
        myProfile
    );
    list.push({
      id: "family_goals",
      label: "Family Goals & Values",
      preferenceText: familyGoalsText,
      isMatched: isFamilyGoalsMatched,
    });

    // 8. Horoscope & Manglik Preferences
    if (profile.partner_manglik || profile.partner_horoscope_required || profile.partner_rashi?.length) {
      const manglikReq = profile.partner_manglik && profile.partner_manglik !== "any"
        ? (profile.partner_manglik === "non_manglik" ? "Non-Manglik" : "Manglik")
        : "";
      const rashiReq = profile.partner_rashi?.length ? `Rashi: ${profile.partner_rashi.join(", ")}` : "";
      const horoscopeText = [manglikReq, rashiReq].filter(Boolean).join(" • ") || "Horoscope details preferred";

      const isHoroscopeMatched = Boolean(
        (!profile.partner_manglik || profile.partner_manglik === "any" || myProfile?.manglik_status === profile.partner_manglik) &&
        (!profile.partner_rashi?.length || (myProfile?.rashi && profile.partner_rashi.map(r => r.toLowerCase()).includes(myProfile.rashi.toLowerCase())))
      );

      list.push({
        id: "horoscope",
        label: "Horoscope & Kundli",
        preferenceText: horoscopeText,
        isMatched: isHoroscopeMatched,
      });
    }

    // 9. Must Haves
    if (profile.partner_must_have?.length) {
      list.push({
        id: "must_haves",
        label: "Must Haves",
        preferenceText: profile.partner_must_have.join(", "),
        isMatched: true,
      });
    }

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
              {leftLabel} vs You
            </h2>
            <p className="text-xs text-muted-foreground">
              Matches {matchedCount} of {totalCount} criteria you share
            </p>
          </div>
        </div>

        {/* Column Headers */}
        <div className="mt-6 grid grid-cols-12 items-center gap-2 border-b border-border/60 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-5 flex items-center gap-2">
            <UserAvatar name={profile.name} avatarUrl={profile.avatar_url} size="xs" />
            <span className="truncate">{profile.name}'s Choice</span>
          </div>
          <div className="col-span-2 text-center">Match</div>
          <div className="col-span-5 flex items-center justify-end gap-2 text-right">
            <span className="truncate">You ({myProfile?.name || "Viewer"})</span>
            <UserAvatar name={myProfile?.name || "You"} avatarUrl={myProfile?.avatar_url} size="xs" />
          </div>
        </div>

        {/* Criteria Rows */}
        <div className="divide-y divide-border/40">
          {criteria.map((item) => (
            <div key={item.id} className="grid grid-cols-12 items-center gap-2 py-3 text-xs sm:text-sm transition-colors hover:bg-muted/20">
              <div className="col-span-5 min-w-0">
                <span className="block text-[11px] font-semibold text-muted-foreground">
                  {item.label}
                </span>
                <span className="font-medium text-foreground truncate block">
                  {item.preferenceText}
                </span>
              </div>

              <div className="col-span-2 flex justify-center">
                {item.isMatched ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Minus className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              <div className="col-span-5 text-right min-w-0">
                <span className="block text-[11px] font-semibold text-muted-foreground">
                  Your Detail
                </span>
                <span className="font-medium text-foreground truncate block">
                  {item.id === "age"
                    ? myProfile?.age ? `${myProfile.age} yrs` : "Not added"
                    : item.id === "religion"
                    ? myProfile?.religion || "Not added"
                    : item.id === "location"
                    ? myProfile?.city || "Not added"
                    : item.id === "profession"
                    ? myProfile?.profession || "Not added"
                    : item.id === "height"
                    ? myProfile?.height ? `${myProfile.height} cm` : "Not added"
                    : item.id === "languages"
                    ? myProfile?.languages?.join(", ") || "Not added"
                    : item.id === "horoscope"
                    ? [
                        myProfile?.manglik_status === "non_manglik" ? "Non-Manglik" : myProfile?.manglik_status === "manglik" ? "Manglik" : myProfile?.manglik_status,
                        myProfile?.rashi ? `Rashi: ${myProfile.rashi}` : ""
                      ].filter(Boolean).join(" • ") || "Not added"
                    : myProfile?.family_goals || "Shared"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Deal breaker notice if any specified by candidate */}
        {profile.partner_deal_breakers?.length ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>{profile.name}'s Deal Breakers:</strong> {profile.partner_deal_breakers.join(", ")}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
