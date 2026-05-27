import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useBlockStore } from "@/stores/useBlockStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { Interest, Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { ProfileCard } from "@/components/ProfileCard";
import { PaginationControls } from "@/components/PaginationControls";
import { UserAvatar } from "@/components/UserAvatar";
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
import {
  AlertCircle,
  ArrowRight,
  Filter,
  MessageCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  User,
} from "lucide-react";
import { toast } from "sonner";

// Constants
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other", "Spiritual", "Agnostic"];
const PROFESSIONS = ["Engineer", "Doctor", "Teacher", "Business", "Artist", "Student", "Retired", "Other"];
const EDUCATION_LEVELS = ["High School", "Bachelor's", "Master's", "PhD", "Professional Degree"];
const PAGE_SIZE = 12;
const DEBOUNCE_DELAY = 300;

type BrowseFilters = {
  gender: string;
  minAge: string;
  maxAge: string;
  city: string;
  religion: string;
  profession: string;
  education: string;
};

// Utility functions
const normalized = (value?: string | null) => value?.trim().toLowerCase() || "";
const sameValue = (a?: string | null, b?: string | null) => Boolean(normalized(a) && normalized(a) === normalized(b));
const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

// Custom hooks
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Filter component
interface FilterSectionProps {
  filters: BrowseFilters;
  onFilterChange: (filters: Partial<BrowseFilters>) => void;
  onReset: () => void;
  smartSort: boolean;
  onSmartSortChange: (value: boolean) => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  filters,
  onFilterChange,
  onReset,
  smartSort,
  onSmartSortChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="premium-card rounded-[26px] shadow-none">
      <CardContent className="p-4">
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Advanced Filters</h3>
            <Badge variant="secondary" className="ml-2">
              {Object.values(filters).filter(v => v && v !== "all").length} active
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Gender</Label>
                <Select
                  value={filters.gender || "all"}
                  onValueChange={(v) => onFilterChange({ gender: v === "all" ? "" : v })}
                >
                  <SelectTrigger className="h-10 rounded-2xl bg-white/70 dark:bg-white/5">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Age Range</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={18}
                    max={100}
                    placeholder="Min"
                    value={filters.minAge}
                    onChange={(e) => onFilterChange({ minAge: e.target.value })}
                    className="h-10 rounded-2xl bg-white/70 dark:bg-white/5"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    min={18}
                    max={100}
                    placeholder="Max"
                    value={filters.maxAge}
                    onChange={(e) => onFilterChange({ maxAge: e.target.value })}
                    className="h-10 rounded-2xl bg-white/70 dark:bg-white/5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">City</Label>
                <Input
                  placeholder="Search city..."
                  value={filters.city}
                  onChange={(e) => onFilterChange({ city: e.target.value })}
                  className="h-10 rounded-2xl bg-white/70 dark:bg-white/5"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Religion</Label>
                <Select
                  value={filters.religion || "all"}
                  onValueChange={(v) => onFilterChange({ religion: v === "all" ? "" : v })}
                >
                  <SelectTrigger className="h-10 rounded-2xl bg-white/70 dark:bg-white/5">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {RELIGIONS.map((religion) => (
                      <SelectItem key={religion} value={religion}>{religion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Profession</Label>
                <Select
                  value={filters.profession || "all"}
                  onValueChange={(v) => onFilterChange({ profession: v === "all" ? "" : v })}
                >
                  <SelectTrigger className="h-10 rounded-2xl bg-white/70 dark:bg-white/5">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {PROFESSIONS.map((prof) => (
                      <SelectItem key={prof} value={prof.toLowerCase()}>{prof}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Education</Label>
                <Select
                  value={filters.education || "all"}
                  onValueChange={(v) => onFilterChange({ education: v === "all" ? "" : v })}
                >
                  <SelectTrigger className="h-10 rounded-2xl bg-white/70 dark:bg-white/5">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    {EDUCATION_LEVELS.map((level) => (
                      <SelectItem key={level} value={level.toLowerCase()}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Label className="text-sm">Smart Sort</Label>
                  <Switch checked={smartSort} onCheckedChange={onSmartSortChange} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={onReset} className="h-8 px-3 text-xs">
                  <X className="mr-1 h-3 w-3" />
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main component
export default function Browse() {
  const { currentUser, profile: myProfile } = useAuth();
  const { blocks, fetchBlocks } = useBlockStore();
  const { createNotification } = useNotificationStore();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileRelations, setProfileRelations] = useState<Record<string, ProfileRelationStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [smartSort, setSmartSort] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedView, setSelectedView] = useState<"grid" | "list">("grid");
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  const [sendingInterestId, setSendingInterestId] = useState<string | null>(null);

  const [filters, setFilters] = useState<BrowseFilters>({
    gender: "",
    minAge: "",
    maxAge: "",
    city: "",
    religion: "",
    profession: "",
    education: "",
  });

  const debouncedFilters = useDebouncedValue(filters, DEBOUNCE_DELAY);

  const preferredGender = useMemo(() => {
    if (myProfile?.gender === "male") return "female";
    if (myProfile?.gender === "female") return "male";
    return "";
  }, [myProfile?.gender]);

  const preferredProfession = myProfile?.profession || "";
  const preferredAge = myProfile?.age || 30;

  useEffect(() => {
    if (currentUser) fetchBlocks(currentUser.id);
  }, [currentUser, fetchBlocks]);

  // Load saved profiles from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("savedProfiles");
    if (saved) {
      setSavedProfiles(new Set(JSON.parse(saved)));
    }
  }, []);

  const saveProfile = useCallback((profileId: string) => {
    setSavedProfiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
        toast.success("Profile removed from saved");
      } else {
        newSet.add(profileId);
        toast.success("Profile saved for later");
      }
      localStorage.setItem("savedProfiles", JSON.stringify(Array.from(newSet)));
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

      // Apply all filters
      if (debouncedFilters.minAge) query = query.gte("age", parseInt(debouncedFilters.minAge));
      if (debouncedFilters.maxAge) query = query.lte("age", parseInt(debouncedFilters.maxAge));
      if (debouncedFilters.city) query = query.ilike("city", `%${debouncedFilters.city}%`);
      if (debouncedFilters.religion) query = query.eq("religion", debouncedFilters.religion);
      if (debouncedFilters.profession) query = query.ilike("profession", `%${debouncedFilters.profession}%`);
      if (debouncedFilters.education) query = query.ilike("education", `%${debouncedFilters.education}%`);

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

        // Smart sorting algorithm
        if (smartSort && myProfile) {
          result.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;

            // Location match (highest weight)
            if (sameValue(a.city, myProfile.city)) scoreA += 10;
            if (sameValue(b.city, myProfile.city)) scoreB += 10;

            // Religion match
            if (a.religion === myProfile.religion) scoreA += 7;
            if (b.religion === myProfile.religion) scoreB += 7;

            // Profession match
            if (preferredProfession && a.profession === preferredProfession) scoreA += 5;
            if (preferredProfession && b.profession === preferredProfession) scoreB += 5;

            // Age compatibility
            const ageDiffA = Math.abs((a.age || 0) - preferredAge);
            const ageDiffB = Math.abs((b.age || 0) - preferredAge);
            scoreA += Math.max(0, 5 - ageDiffA);
            scoreB += Math.max(0, 5 - ageDiffB);

            // Profile completeness
            const completenessA = [a.bio, a.profession, a.education].filter(Boolean).length;
            const completenessB = [b.bio, b.profession, b.education].filter(Boolean).length;
            scoreA += completenessA;
            scoreB += completenessB;

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
  }, [currentUser, currentPage, debouncedFilters, blocks, smartSort, myProfile, preferredGender, preferredProfession, preferredAge]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const resetFilters = () => {
    setFilters({ gender: "", minAge: "", maxAge: "", city: "", religion: "", profession: "", education: "" });
    setCurrentPage(1);
    toast.success("All filters cleared");
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
  const activeFilterCount = Object.values(filters).filter((value) => value && value !== "all").length;
  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (preferredGender && !filters.gender) chips.push(`Showing ${preferredGender} profiles`);
    if (smartSort) chips.push("Smart sort on");
    if (filters.gender) chips.push(`Gender: ${filters.gender}`);
    if (filters.minAge || filters.maxAge) {
      chips.push(`Age: ${filters.minAge || "18"}-${filters.maxAge || "100"}`);
    }
    if (filters.city) chips.push(`City: ${filters.city}`);
    if (filters.religion) chips.push(`Religion: ${filters.religion}`);
    if (filters.profession) chips.push(`Profession: ${filters.profession}`);
    if (filters.education) chips.push(`Education: ${filters.education}`);
    return chips;
  }, [filters, preferredGender, smartSort]);

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
      <div className="min-h-screen px-4 pb-8 pt-2 md:px-7 md:pb-9">
        <div className="mx-auto max-w-7xl">
          {/* Header Section */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="premium-gradient-text font-serif text-4xl font-bold tracking-tight md:text-5xl">Discover Matches</h1>
              <p className="mt-1 text-muted-foreground">
                Find your perfect connection based on compatibility and shared values
              </p>
            </div>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            {/* Main Content */}
            <div className="min-w-0 space-y-6">
              {/* Hero Card */}
              <Card className="mobile-card-custom animate-soft-enter relative isolate overflow-hidden rounded-[30px] border-0 bg-[linear-gradient(135deg,#111827,#be123c_55%,#0f766e)] text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                <CardContent className="relative p-4 sm:p-6 md:p-8">
                  <div className="relative z-10">
                    <Badge variant="secondary" className="mb-3 bg-white/20 text-white">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Smart Matchmaking
                    </Badge>
                    <h2 className="text-xl font-bold leading-tight sm:text-2xl md:text-3xl">
                      {loading
                        ? "Finding your perfect matches..."
                        : `${profiles.length} ${profiles.length === 1 ? "profile" : "profiles"} ready to review`}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90">
                      {highCompatibilityCount > 0
                        ? `${highCompatibilityCount} profiles have multiple signals in common with you. Send interest from a card when someone feels right.`
                        : "Review suggested profiles, open the full profile, and send interest when you want to start the connection."}
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="pressable w-full justify-center rounded-full bg-white text-slate-950 hover:bg-white/90 sm:w-auto"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        Advanced Filters
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="pressable w-full justify-center rounded-full text-white hover:bg-white/20 sm:w-auto">
                        <Link to="/ai-match">
                          AI Match Insights
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className="pointer-events-none absolute -bottom-8 -right-8 opacity-10 sm:bottom-0 sm:right-0 sm:opacity-20">
                    <Users className="h-32 w-32 sm:h-48 sm:w-48" />
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2">
                {activeFilterChips.map((chip) => (
                  <Badge key={chip} variant="secondary" className="rounded-full px-3 py-1">
                    {chip}
                  </Badge>
                ))}
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 rounded-full px-3 text-xs">
                    Clear filters
                  </Button>
                )}
              </div>

              {/* Filter Section */}
              {showFilters && (
                <div className="animate-soft-enter">
                  <FilterSection
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onReset={resetFilters}
                    smartSort={smartSort}
                    onSmartSortChange={setSmartSort}
                  />
                </div>
              )}

              {/* Profile Results */}
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Suggested Matches</h2>
                    <p className="text-sm text-muted-foreground">
                      {loading
                        ? "Searching for matches..."
                        : `Showing ${profiles.length} of ${totalCount} profiles`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex rounded-full border border-border bg-white/60 p-1 shadow-sm backdrop-blur dark:bg-white/5">
                      <button
                        onClick={() => setSelectedView("grid")}
                        className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                          selectedView === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        Grid
                      </button>
                      <button
                        onClick={() => setSelectedView("list")}
                        className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                          selectedView === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        List
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="gap-2 rounded-full bg-white/60 shadow-none dark:bg-white/5"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                    </Button>
                  </div>
                </div>

                {/* Error State */}
                {error && (
                  <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
                      <h3 className="text-lg font-semibold">Something went wrong</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                      <Button onClick={() => fetchProfiles()} variant="outline" className="mt-4 gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Loading State */}
                {loading && !error && (
                  <div className={selectedView === "grid"
                    ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    : "space-y-3"
                  }>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-14 w-14 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-5 w-3/4" />
                              <Skeleton className="h-4 w-1/2" />
                            </div>
                          </div>
                          <Skeleton className="mt-4 h-20 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && profiles.length === 0 && (
                  <Card className="premium-card rounded-[28px] shadow-none">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="mb-4 rounded-full bg-muted p-4">
                        <Search className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold">No profiles found</h3>
                      <p className="mt-2 max-w-md text-muted-foreground">
                        We couldn't find any profiles matching your criteria. Try adjusting your filters or expanding your search radius.
                      </p>
                      <Button variant="link" onClick={resetFilters} className="mt-4">
                        Clear all filters
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Profile Cards */}
                {!loading && !error && profiles.length > 0 && (
                  <>
                    <div className={selectedView === "grid"
                      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      : "space-y-3"
                    }>
                      {profiles.map((profile) => (
                        <ProfileCard
                          key={profile.id}
                          profile={profile}
                          isSaved={savedProfiles.has(profile.id)}
                          relationStatus={profileRelations[profile.id] || "none"}
                          matchReasons={getMatchReasons(profile, myProfile)}
                          actionLoading={sendingInterestId === profile.id}
                          onSave={saveProfile}
                          onSendInterest={handleSendInterest}
                        />
                      ))}
                    </div>

                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
              {/* Profile Summary */}
              <Card className="premium-card rounded-[28px] shadow-none">
                <CardContent className="p-5">
                  {myProfile ? (
                    <>
                      <div className="flex flex-col items-center text-center">
                        <UserAvatar
                          name={myProfile.name}
                          avatarUrl={myProfile.avatar_url}
                          className="h-20 w-20"
                        />
                        <h3 className="mt-3 font-bold">{myProfile.name}</h3>
                        <p className="text-xs text-muted-foreground">{myProfile.profession || "Member since 2024"}</p>
                        <div className="mt-2 flex gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {profileCompletion}% Complete
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <Link to="/profile/edit">
                            <User className="h-3 w-3" />
                            Edit
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <Link to="/chat">
                            <MessageCircle className="h-3 w-3" />
                            Chat
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <Link to="/ai-match">
                            <Sparkles className="h-3 w-3" />
                            AI
                          </Link>
                        </Button>
                      </div>

                      <div className="mt-4 space-y-2 border-t border-border pt-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Location</span>
                          <span className="font-medium">{myProfile.city || "Not set"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Religion</span>
                          <span className="font-medium">{myProfile.religion || "Not set"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Age</span>
                          <span className="font-medium">{myProfile.age || "-"}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <Skeleton className="mx-auto h-20 w-20 rounded-full" />
                      <Skeleton className="mx-auto h-4 w-3/4" />
                      <Skeleton className="mx-auto h-4 w-1/2" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card className="overflow-hidden rounded-[28px] border-0 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(20,184,166,0.12))] shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <h4 className="font-semibold text-sm">Pro Tip</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {profileCompletion < 80
                          ? "Complete your profile before sending more interests. Better details make replies easier."
                          : "Your profile has enough detail for better match suggestions."}
                      </p>
                      {profileCompletion < 80 && (
                        <Button size="sm" variant="link" className="mt-2 h-auto p-0 text-xs" asChild>
                          <Link to="/profile/edit">Complete Profile</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </Layout>
  );
}
