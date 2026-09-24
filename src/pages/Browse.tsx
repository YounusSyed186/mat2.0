import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useBlockStore } from "@/stores/useBlockStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { Interest, Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { ProfileCard } from "@/components/ProfileCard";
import { CustomSidebar } from "@/components/CustomSidebar";
import { PaginationControls } from "@/components/PaginationControls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  buildProfileRelationMap,
  getMatchReasons,
  getProfileCompletion,
  type ProfileRelationStatus,
} from "@/lib/profileJourney";
import { calculateBidirectionalCompatibility, checkDealBreakers } from "@/lib/matchmaking";
import {
  RASHI_LIST,
  NAKSHATRA_LIST,
  MANGLIK_OPTIONS,
  formatRashi,
  formatManglikStatus,
} from "@/lib/horoscope";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

// Constants
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Spiritual", "Other"];
const PROFESSIONS = ["Engineer", "Doctor", "Teacher", "Business", "Artist", "Student", "Other"];
const EDUCATION_LEVELS = ["High School", "Bachelor's", "Master's", "PhD", "Professional Degree"];
const PAGE_SIZE = 12;
const DEBOUNCE_DELAY = 300;

export type BrowseFilters = {
  gender: string;
  minAge: string;
  maxAge: string;
  city: string;
  religion: string;
  profession: string;
  education: string;
  // Horoscope & Kundli filters
  horoscopeAvailable: string; // 'any' | 'available'
  manglik: string; // 'any' | 'non_manglik' | 'manglik' | 'anshik_manglik' | 'dont_know'
  rashi: string[];
  nakshatra: string[];
};

const DEFAULT_FILTERS: BrowseFilters = {
  gender: "",
  minAge: "",
  maxAge: "",
  city: "",
  religion: "",
  profession: "",
  education: "",
  horoscopeAvailable: "any",
  manglik: "any",
  rashi: [],
  nakshatra: [],
};

// Utility functions
const normalized = (value?: string | null) => value?.trim().toLowerCase() || "";
const sameValue = (a?: string | null, b?: string | null) => Boolean(normalized(a) && normalized(a) === normalized(b));
const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

// Custom debounced value hook
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Filter Section with Progressive Disclosure
interface FilterSectionProps {
  filters: BrowseFilters;
  onFilterChange: (filters: Partial<BrowseFilters>) => void;
  onReset: () => void;
  smartSort: boolean;
  onSmartSortChange: (value: boolean) => void;
  onClose?: () => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  filters,
  onFilterChange,
  onReset,
  smartSort,
  onSmartSortChange,
  onClose,
}) => {
  const [horoscopeExpanded, setHoroscopeExpanded] = useState(
    Boolean(
      filters.horoscopeAvailable === "available" ||
      (filters.manglik && filters.manglik !== "any") ||
      filters.rashi.length > 0 ||
      filters.nakshatra.length > 0
    )
  );

  const [nakshatraSearch, setNakshatraSearch] = useState("");

  const filteredNakshatras = useMemo(() => {
    if (!nakshatraSearch.trim()) return NAKSHATRA_LIST;
    return NAKSHATRA_LIST.filter(n => n.toLowerCase().includes(nakshatraSearch.toLowerCase()));
  }, [nakshatraSearch]);

  const toggleRashi = (rashiVal: string) => {
    const exists = filters.rashi.includes(rashiVal);
    const updated = exists
      ? filters.rashi.filter(r => r !== rashiVal)
      : [...filters.rashi, rashiVal];
    onFilterChange({ rashi: updated });
  };

  const toggleNakshatra = (nakVal: string) => {
    const exists = filters.nakshatra.includes(nakVal);
    const updated = exists
      ? filters.nakshatra.filter(n => n !== nakVal)
      : [...filters.nakshatra, nakVal];
    onFilterChange({ nakshatra: updated });
  };

  return (
    <Card className="rounded-3xl border border-border/80 bg-card/95 shadow-sm backdrop-blur-md overflow-hidden">
      <CardContent className="p-5 sm:p-7 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-base font-bold text-foreground">Filter Matches</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onReset} className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground">
              Clear All
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 1. BASIC ATTRIBUTES */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Basic Information</h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Gender */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Seeking Gender</Label>
              <Select
                value={filters.gender || "all"}
                onValueChange={(v) => onFilterChange({ gender: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-10 rounded-xl bg-background border-border/70">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Age Range */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Age Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={18}
                  max={100}
                  placeholder="Min (18)"
                  value={filters.minAge}
                  onChange={(e) => onFilterChange({ minAge: e.target.value })}
                  className="h-10 rounded-xl bg-background border-border/70 text-sm"
                />
                <span className="text-muted-foreground text-xs font-bold">-</span>
                <Input
                  type="number"
                  min={18}
                  max={100}
                  placeholder="Max (60)"
                  value={filters.maxAge}
                  onChange={(e) => onFilterChange({ maxAge: e.target.value })}
                  className="h-10 rounded-xl bg-background border-border/70 text-sm"
                />
              </div>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">City</Label>
              <Input
                placeholder="Search city..."
                value={filters.city}
                onChange={(e) => onFilterChange({ city: e.target.value })}
                className="h-10 rounded-xl bg-background border-border/70 text-sm"
              />
            </div>

            {/* Religion */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Religion / Faith</Label>
              <Select
                value={filters.religion || "all"}
                onValueChange={(v) => onFilterChange({ religion: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-10 rounded-xl bg-background border-border/70">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Religion</SelectItem>
                  {RELIGIONS.map((religion) => (
                    <SelectItem key={religion} value={religion}>{religion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 2. CAREER & EDUCATION */}
        <div className="border-t border-border/60 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Career & Education</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Profession</Label>
              <Select
                value={filters.profession || "all"}
                onValueChange={(v) => onFilterChange({ profession: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-10 rounded-xl bg-background border-border/70">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Profession</SelectItem>
                  {PROFESSIONS.map((prof) => (
                    <SelectItem key={prof} value={prof.toLowerCase()}>{prof}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Education</Label>
              <Select
                value={filters.education || "all"}
                onValueChange={(v) => onFilterChange({ education: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-10 rounded-xl bg-background border-border/70">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Education</SelectItem>
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectItem key={level} value={level.toLowerCase()}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 3. HOROSCOPE & KUNDLI SECTION (Progressive Disclosure) */}
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-4.5 space-y-4">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setHoroscopeExpanded(!horoscopeExpanded)}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Compass className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-foreground">Horoscope & Kundli Preferences</h4>
                <p className="text-[11px] text-muted-foreground">Filter by Manglik status, Rashi (Moon Sign), and Nakshatra</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-primary font-semibold">
              {horoscopeExpanded ? (
                <>
                  <span>Collapse</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Configure</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {horoscopeExpanded && (
            <div className="space-y-5 pt-3 border-t border-border/50 animate-in fade-in duration-200">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Horoscope Availability Toggle */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Horoscope Availability</Label>
                  <Select
                    value={filters.horoscopeAvailable || "any"}
                    onValueChange={(v) => onFilterChange({ horoscopeAvailable: v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-background border-border/70">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any (Don't filter)</SelectItem>
                      <SelectItem value="available">Horoscope Details Available Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Manglik Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Manglik Preference</Label>
                  <Select
                    value={filters.manglik || "any"}
                    onValueChange={(v) => onFilterChange({ manglik: v })}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-background border-border/70">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {MANGLIK_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rashi Multi-Select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Rashi (Moon Sign) {filters.rashi.length > 0 && `(${filters.rashi.length} selected)`}
                  </Label>
                  {filters.rashi.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onFilterChange({ rashi: [] })}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Clear Rashi
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto p-1.5 rounded-xl border border-border/60 bg-background/50">
                  {RASHI_LIST.map((rashi) => {
                    const isSelected = filters.rashi.includes(rashi.value);
                    return (
                      <button
                        key={rashi.value}
                        type="button"
                        onClick={() => toggleRashi(rashi.value)}
                        className={`pressable flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                            : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="truncate">{rashi.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nakshatra Searchable Multi-Select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Nakshatra (Birth Star) {filters.nakshatra.length > 0 && `(${filters.nakshatra.length} selected)`}
                  </Label>
                  {filters.nakshatra.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onFilterChange({ nakshatra: [] })}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Clear Nakshatra
                    </button>
                  )}
                </div>

                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search 27 Nakshatras (e.g. Rohini, Pushya)..."
                    value={nakshatraSearch}
                    onChange={(e) => setNakshatraSearch(e.target.value)}
                    className="h-9 pl-8 text-xs rounded-xl bg-background border-border/70"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-1.5 rounded-xl border border-border/60 bg-background/50">
                  {filteredNakshatras.map((nak) => {
                    const isSelected = filters.nakshatra.includes(nak);
                    return (
                      <button
                        key={nak}
                        type="button"
                        onClick={() => toggleNakshatra(nak)}
                        className={`pressable flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                            : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="truncate">{nak}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. BILATERAL SMART SORT */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <Label className="text-xs font-bold text-foreground">Bilateral Smart Ranking</Label>
              <p className="text-[11px] text-muted-foreground">Prioritizes profiles matching both your mutual preferences and horoscope signals</p>
            </div>
          </div>
          <Switch checked={smartSort} onCheckedChange={onSmartSortChange} />
        </div>
      </CardContent>
    </Card>
  );
};

// Main Match Discovery Page
export default function Browse() {
  const { currentUser, profile: myProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const blocks = useBlockStore((state) => state.blocks);
  const fetchBlocks = useBlockStore((state) => state.fetchBlocks);
  const createNotification = useNotificationStore((state) => state.createNotification);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileRelations, setProfileRelations] = useState<Record<string, ProfileRelationStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [smartSort, setSmartSort] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  const [sendingInterestId, setSendingInterestId] = useState<string | null>(null);

  // Initialize filters from URL Search Params if available
  const [filters, setFilters] = useState<BrowseFilters>(() => {
    const rashiParam = searchParams.get("rashi");
    const nakshatraParam = searchParams.get("nakshatra");

    return {
      gender: searchParams.get("gender") || "",
      minAge: searchParams.get("minAge") || "",
      maxAge: searchParams.get("maxAge") || "",
      city: searchParams.get("city") || "",
      religion: searchParams.get("religion") || "",
      profession: searchParams.get("profession") || "",
      education: searchParams.get("education") || "",
      horoscopeAvailable: searchParams.get("horoscopeAvailable") || "any",
      manglik: searchParams.get("manglik") || "any",
      rashi: rashiParam ? rashiParam.split(",").filter(Boolean) : [],
      nakshatra: nakshatraParam ? nakshatraParam.split(",").filter(Boolean) : [],
    };
  });

  const debouncedFilters = useDebouncedValue(filters, DEBOUNCE_DELAY);

  // Synchronize URL query params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedFilters.gender) params.set("gender", debouncedFilters.gender);
    if (debouncedFilters.minAge) params.set("minAge", debouncedFilters.minAge);
    if (debouncedFilters.maxAge) params.set("maxAge", debouncedFilters.maxAge);
    if (debouncedFilters.city) params.set("city", debouncedFilters.city);
    if (debouncedFilters.religion) params.set("religion", debouncedFilters.religion);
    if (debouncedFilters.profession) params.set("profession", debouncedFilters.profession);
    if (debouncedFilters.education) params.set("education", debouncedFilters.education);
    if (debouncedFilters.horoscopeAvailable && debouncedFilters.horoscopeAvailable !== "any") {
      params.set("horoscopeAvailable", debouncedFilters.horoscopeAvailable);
    }
    if (debouncedFilters.manglik && debouncedFilters.manglik !== "any") {
      params.set("manglik", debouncedFilters.manglik);
    }
    if (debouncedFilters.rashi.length > 0) {
      params.set("rashi", debouncedFilters.rashi.join(","));
    }
    if (debouncedFilters.nakshatra.length > 0) {
      params.set("nakshatra", debouncedFilters.nakshatra.join(","));
    }

    setSearchParams(params, { replace: true });
  }, [debouncedFilters, setSearchParams]);

  const preferredGender = useMemo(() => {
    if (myProfile?.gender === "male") return "female";
    if (myProfile?.gender === "female") return "male";
    return "";
  }, [myProfile?.gender]);

  useEffect(() => {
    if (currentUser?.id) fetchBlocks(currentUser.id);
  }, [currentUser?.id, fetchBlocks]);

  // Load saved profiles from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("savedProfiles");
      if (saved) {
        setSavedProfiles(new Set(JSON.parse(saved)));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveProfile = useCallback((profileId: string) => {
    setSavedProfiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
        toast.success("Profile removed from shortlist");
      } else {
        newSet.add(profileId);
        toast.success("Profile added to shortlist");
      }
      try {
        localStorage.setItem("savedProfiles", JSON.stringify(Array.from(newSet)));
      } catch {
        // ignore
      }
      return newSet;
    });
  }, []);

  const fetchProfiles = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .neq("id", currentUser.id)
        .eq("is_blocked", false)
        .order("created_at", { ascending: false });

      // Gender filtering with preference fallback
      if (!debouncedFilters.gender) {
        if (preferredGender) {
          query = query.eq("gender", preferredGender);
        }
      } else {
        query = query.eq("gender", debouncedFilters.gender);
      }

      // Basic filters
      if (debouncedFilters.minAge) query = query.gte("age", parseInt(debouncedFilters.minAge));
      if (debouncedFilters.maxAge) query = query.lte("age", parseInt(debouncedFilters.maxAge));
      if (debouncedFilters.city) query = query.ilike("city", `%${debouncedFilters.city}%`);
      if (debouncedFilters.religion) query = query.eq("religion", debouncedFilters.religion);
      if (debouncedFilters.profession) query = query.ilike("profession", `%${debouncedFilters.profession}%`);
      if (debouncedFilters.education) query = query.ilike("education", `%${debouncedFilters.education}%`);

      // 1. Horoscope Availability Filter
      if (debouncedFilters.horoscopeAvailable === "available") {
        query = query.or("horoscope_available.eq.true,rashi.not.is.null,nakshatra.not.is.null,manglik_status.not.is.null");
      }

      // 2. Manglik Filter (Strict: Missing is not Non-Manglik unless Any is selected)
      if (debouncedFilters.manglik && debouncedFilters.manglik !== "any") {
        query = query.eq("manglik_status", debouncedFilters.manglik);
      }

      // 3. Rashi Multi-Select (OR within Rashi category)
      if (debouncedFilters.rashi && debouncedFilters.rashi.length > 0) {
        query = query.in("rashi", debouncedFilters.rashi);
      }

      // 4. Nakshatra Multi-Select (OR within Nakshatra category)
      if (debouncedFilters.nakshatra && debouncedFilters.nakshatra.length > 0) {
        query = query.in("nakshatra", debouncedFilters.nakshatra);
      }

      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      if (data) {
        let result = data as Profile[];

        // Filter out blocked users
        const blockedIds = new Set(
          blocks.map((b) => (b.blocker_id === currentUser.id ? b.blocked_id : b.blocker_id))
        );
        result = result.filter((p) => !blockedIds.has(p.id));

        // Smart sorting algorithm with Bidirectional & Horoscope Preferences
        if (smartSort && myProfile) {
          result.sort((a, b) => {
            const dbA = checkDealBreakers(myProfile, a).passed && checkDealBreakers(a, myProfile).passed;
            const dbB = checkDealBreakers(myProfile, b).passed && checkDealBreakers(b, myProfile).passed;

            const bidiA = calculateBidirectionalCompatibility(myProfile, a);
            const bidiB = calculateBidirectionalCompatibility(myProfile, b);

            let scoreA = bidiA.compositePreferenceScore * 50;
            let scoreB = bidiB.compositePreferenceScore * 50;

            if (!dbA) scoreA -= 100;
            if (!dbB) scoreB -= 100;

            // Basic attribute match boost
            if (sameValue(a.city, myProfile.city)) scoreA += 10;
            if (sameValue(b.city, myProfile.city)) scoreB += 10;

            if (a.religion === myProfile.religion) scoreA += 7;
            if (b.religion === myProfile.religion) scoreB += 7;

            // Horoscope match boost
            if (myProfile.partner_manglik && a.manglik_status === myProfile.partner_manglik) scoreA += 8;
            if (myProfile.partner_manglik && b.manglik_status === myProfile.partner_manglik) scoreB += 8;

            // Attach computed matched preferences for ProfileCard display
            (a as any).matched_preferences = bidiA.matchedPreferences;
            (b as any).matched_preferences = bidiB.matchedPreferences;

            return scoreB - scoreA;
          });
        }

        setProfiles(result);
        if (count !== null) setTotalCount(count);

        const { data: interestData } = await supabase
          .from("interests")
          .select("*")
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

        setProfileRelations(buildProfileRelationMap({
          currentUserId: currentUser.id,
          profiles: result,
          interests: (interestData as Interest[]) || [],
          blocks,
        }));
      }
    } catch (err: unknown) {
      console.error("Fetch profiles error:", err);
      setError(errorMessage(err, "Failed to load profiles"));
      toast.error("Error loading profiles. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentPage, debouncedFilters, blocks, smartSort, myProfile, preferredGender]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
    toast.success("All filters cleared");
  };

  const removeSingleFilter = (key: keyof BrowseFilters) => {
    if (key === "rashi" || key === "nakshatra") {
      setFilters(prev => ({ ...prev, [key]: [] }));
    } else if (key === "horoscopeAvailable" || key === "manglik") {
      setFilters(prev => ({ ...prev, [key]: "any" }));
    } else {
      setFilters(prev => ({ ...prev, [key]: "" }));
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const profileCompletion = getProfileCompletion(myProfile);
  const highCompatibilityCount = useMemo(
    () => profiles.filter((profile) => getMatchReasons(profile, myProfile).length >= 2).length,
    [profiles, myProfile]
  );
  
  // Calculate active filter count cleanly
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.gender && filters.gender !== "all") count++;
    if (filters.minAge || filters.maxAge) count++;
    if (filters.city) count++;
    if (filters.religion && filters.religion !== "all") count++;
    if (filters.profession && filters.profession !== "all") count++;
    if (filters.education && filters.education !== "all") count++;
    if (filters.horoscopeAvailable === "available") count++;
    if (filters.manglik && filters.manglik !== "any") count++;
    if (filters.rashi && filters.rashi.length > 0) count++;
    if (filters.nakshatra && filters.nakshatra.length > 0) count++;
    return count;
  }, [filters]);

  const handleSendInterest = useCallback(async (profileId: string) => {
    if (!currentUser) return;
    const targetProfile = profiles.find((profile) => profile.id === profileId);
    if (!targetProfile) return;

    setSendingInterestId(profileId);
    try {
      const { error: insertError } = await supabase
        .from("interests")
        .insert({ sender_id: currentUser.id, receiver_id: profileId, status: "pending" })
        .select()
        .maybeSingle();

      if (insertError) throw insertError;

      setProfileRelations((current) => ({
        ...current,
        [profileId]: "sent_pending",
      }));
      toast.success(`Interest sent to ${targetProfile.name}`);
      await createNotification(
        profileId,
        "interest_received",
        currentUser.id,
        myProfile?.name || "Someone"
      );
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Could not send interest. Please try again."));
    } finally {
      setSendingInterestId(null);
    }
  }, [createNotification, currentUser, myProfile?.name, profiles]);

  return (
    <Layout>
      <div className="w-full px-4 pb-12 pt-3 md:px-6 md:pb-16 lg:px-8 max-w-7xl mx-auto">
        {/* 1. CLEAN HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-5">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              Suggested Matches
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? (
                "Scanning matching profiles..."
              ) : (
                <>
                  <span className="font-semibold text-foreground/90">{totalCount} profiles</span> match your partner preferences
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Smart Sort Toggle Pill */}
            <button
              type="button"
              onClick={() => setSmartSort(!smartSort)}
              className={`pressable inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                smartSort
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Smart Sort: {smartSort ? "On" : "Off"}</span>
            </button>

            {/* Filter Toggle Button */}
            <Button
              variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-1.5 rounded-full h-9 px-4 text-xs font-semibold ${
                showFilters || activeFilterCount > 0 ? "premium-cta shadow-none" : "border-border/70"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-primary dark:text-slate-950">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* 2. ACTIVE FILTER CHIPS ROW */}
        {activeFilterCount > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
            {filters.gender && (
              <Badge variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs bg-muted border border-border">
                <span>Gender: {filters.gender}</span>
                <button onClick={() => removeSingleFilter("gender")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filters.minAge || filters.maxAge) && (
              <Badge variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs bg-muted border border-border">
                <span>Age: {filters.minAge || "18"} - {filters.maxAge || "100"}</span>
                <button onClick={() => { removeSingleFilter("minAge"); removeSingleFilter("maxAge"); }} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.city && (
              <Badge variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs bg-muted border border-border">
                <span>City: {filters.city}</span>
                <button onClick={() => removeSingleFilter("city")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.religion && (
              <Badge variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs bg-muted border border-border">
                <span>Religion: {filters.religion}</span>
                <button onClick={() => removeSingleFilter("religion")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.profession && (
              <Badge variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs bg-muted border border-border">
                <span>Profession: {filters.profession}</span>
                <button onClick={() => removeSingleFilter("profession")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.education && (
              <Badge variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs bg-muted border border-border">
                <span>Education: {filters.education}</span>
                <button onClick={() => removeSingleFilter("education")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {/* Horoscope Filter Badges */}
            {filters.horoscopeAvailable === "available" && (
              <Badge variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                <span>Horoscope: Details Available</span>
                <button onClick={() => removeSingleFilter("horoscopeAvailable")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.manglik && filters.manglik !== "any" && (
              <Badge variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                <span>Manglik: {formatManglikStatus(filters.manglik)}</span>
                <button onClick={() => removeSingleFilter("manglik")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.rashi.length > 0 && (
              <Badge variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                <span>
                  Rashi: {filters.rashi.length <= 2 ? filters.rashi.map(formatRashi).join(", ") : `${filters.rashi.length} selected`}
                </span>
                <button onClick={() => removeSingleFilter("rashi")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.nakshatra.length > 0 && (
              <Badge variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                <span>
                  Nakshatra: {filters.nakshatra.length <= 2 ? filters.nakshatra.join(", ") : `${filters.nakshatra.length} selected`}
                </span>
                <button onClick={() => removeSingleFilter("nakshatra")} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-6 rounded-full px-2.5 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              Clear All
            </Button>
          </div>
        )}

        {/* 3. FILTER DRAWER / SECTION */}
        {showFilters && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <FilterSection
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={resetFilters}
              smartSort={smartSort}
              onSmartSortChange={setSmartSort}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}

        {/* 4. MAIN DISCOVERY CONTENT LAYOUT */}
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* PROFILE DISCOVERY GRID */}
          <div className="min-w-0 space-y-6">
            {/* ERROR STATE */}
            {error && (
              <Card className="border-destructive/30 bg-destructive/5 rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
                  <h3 className="text-base font-bold text-foreground">Could not load profiles</h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm">{error}</p>
                  <Button onClick={() => fetchProfiles()} variant="outline" size="sm" className="mt-4 gap-2 rounded-full">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* SKELETON LOADING STATE (4:5 Portrait Cards) */}
            {loading && !error && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-card p-0 shadow-xs">
                    <Skeleton className="aspect-[4/5] w-full rounded-none" />
                    <div className="p-4 space-y-2.5">
                      <Skeleton className="h-5 w-3/4 rounded-md" />
                      <Skeleton className="h-3.5 w-1/2 rounded-md" />
                      <Skeleton className="h-3.5 w-2/3 rounded-md" />
                      <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2">
                        <Skeleton className="h-9 rounded-xl" />
                        <Skeleton className="h-9 rounded-xl" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* EMPTY STATE */}
            {!loading && !error && profiles.length === 0 && (
              <Card className="rounded-2xl border border-border/80 bg-card/60 shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Search className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No profiles match these criteria</h3>
                  <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
                    Try broadening your age, location, or horoscope criteria to explore more potential matches.
                  </p>
                  <div className="mt-5 flex gap-2">
                    <Button onClick={resetFilters} className="premium-cta rounded-full text-xs font-semibold">
                      Clear All Filters
                    </Button>
                    <Button asChild variant="outline" className="rounded-full text-xs font-semibold">
                      <Link to="/profile/edit">Adjust Partner Preferences</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PHOTO-FIRST PROFILE GRID */}
            {!loading && !error && profiles.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {profiles.map((profile, index) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      cardIndex={index}
                      isSaved={savedProfiles.has(profile.id)}
                      relationStatus={profileRelations[profile.id] || "none"}
                      matchReasons={getMatchReasons(profile, myProfile)}
                      actionLoading={sendingInterestId === profile.id}
                      onSave={saveProfile}
                      onSendInterest={handleSendInterest}
                    />
                  ))}
                </div>

                <div className="pt-4">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            )}
          </div>

          {/* 5. STREAMLINED DESKTOP SIDEBAR (Hidden on mobile) */}
          <div className="hidden xl:block">
            <CustomSidebar
              myProfile={myProfile}
              profileCompletion={profileCompletion}
              highCompatibilityCount={highCompatibilityCount}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
