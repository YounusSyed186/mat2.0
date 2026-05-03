import { lazy, Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useBlockStore } from "@/stores/useBlockStore";
import type { Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { ProfileCard } from "@/components/ProfileCard";
import { PaginationControls } from "@/components/PaginationControls";
import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  ArrowRight,
  Filter,
  Heart,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Zap,
  Shield,
  Eye,
  Award,
  User,
} from "lucide-react";
import { toast } from "sonner";

// Constants
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other", "Spiritual", "Agnostic"];
const PROFESSIONS = ["Engineer", "Doctor", "Teacher", "Business", "Artist", "Student", "Retired", "Other"];
const EDUCATION_LEVELS = ["High School", "Bachelor's", "Master's", "PhD", "Professional Degree"];
const PAGE_SIZE = 12;
const DEBOUNCE_DELAY = 300;

const BrowseInsightsCharts = lazy(() => import("@/components/BrowseInsightsCharts"));

// Utility functions
const normalized = (value?: string | null) => value?.trim().toLowerCase() || "";
const sameValue = (a?: string | null, b?: string | null) => Boolean(normalized(a) && normalized(a) === normalized(b));
const percent = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0;
const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

// Custom hooks
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const ChartSkeleton = () => (
  <div className="grid gap-6 lg:grid-cols-2">
    {[0, 1].map((item) => (
      <Card key={item}>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// Filter component
interface FilterSectionProps {
  filters: any;
  onFilterChange: (filters: any) => void;
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
    <Card className="border-card-border bg-card shadow-sm">
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
                  <SelectTrigger className="h-9">
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
                    className="h-9"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    min={18}
                    max={100}
                    placeholder="Max"
                    value={filters.maxAge}
                    onChange={(e) => onFilterChange({ maxAge: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">City</Label>
                <Input
                  placeholder="Search city..."
                  value={filters.city}
                  onChange={(e) => onFilterChange({ city: e.target.value })}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Religion</Label>
                <Select
                  value={filters.religion || "all"}
                  onValueChange={(v) => onFilterChange({ religion: v === "all" ? "" : v })}
                >
                  <SelectTrigger className="h-9">
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
                  <SelectTrigger className="h-9">
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
                  <SelectTrigger className="h-9">
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

// Stats card component
interface StatCardProps {
  label: string;
  value: string | number;
  note: string;
  icon: React.ElementType;
  tone: string;
  loading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, note, icon: Icon, tone, loading }) => (
  <Card className="interactive-surface border-card-border bg-card shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{loading ? "..." : value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{note}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Main component
export default function Browse() {
  const { currentUser, profile: myProfile } = useAuth();
  const { blocks, fetchBlocks } = useBlockStore();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [smartSort, setSmartSort] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedView, setSelectedView] = useState<"grid" | "list">("grid");
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  const [renderCharts, setRenderCharts] = useState(false);

  const [filters, setFilters] = useState({
    gender: "",
    minAge: "",
    maxAge: "",
    city: "",
    religion: "",
    profession: "",
    education: "",
  });

  const debouncedFilters = useDebouncedValue(filters, DEBOUNCE_DELAY);

  useEffect(() => {
    const chartTimer = window.setTimeout(() => setRenderCharts(true), 150);
    return () => window.clearTimeout(chartTimer);
  }, []);

  const preferredGender = useMemo(() => {
    if (myProfile?.gender === "male") return "female";
    if (myProfile?.gender === "female") return "male";
    return "";
  }, [myProfile?.gender]);

  const preferredProfession = myProfile?.profession || "";
  const preferredEducation = myProfile?.education || "";
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
      }
    } catch (err: any) {
      console.error("Fetch profiles error:", err);
      setError(err.message || "Failed to load profiles");
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

  // Enhanced dashboard calculations
  const dashboard = useMemo(() => {
    const localProfiles = profiles.filter((p) => sameValue(p.city, myProfile?.city));
    const sharedReligion = profiles.filter((p) => p.religion && p.religion === myProfile?.religion);
    const completeProfiles = profiles.filter((p) => p.bio && p.profession && p.education);
    const averageAge = profiles.length
      ? Math.round(profiles.reduce((sum, profile) => sum + (profile.age || 0), 0) / profiles.length)
      : 0;
    const recentProfiles = profiles.filter((p) => {
      const created = new Date(p.created_at).getTime();
      return Number.isFinite(created) && Date.now() - created < 1000 * 60 * 60 * 24 * 30;
    });

    // Compatibility score
    const highCompatibility = profiles.filter((p) => {
      let score = 0;
      if (sameValue(p.city, myProfile?.city)) score += 30;
      if (p.religion === myProfile?.religion) score += 30;
      if (preferredProfession && p.profession === preferredProfession) score += 20;
      if (preferredEducation && p.education === preferredEducation) score += 20;
      return score >= 70;
    }).length;

    return {
      visible: profiles.length,
      total: totalCount,
      local: localProfiles.length,
      sharedReligion: sharedReligion.length,
      complete: completeProfiles.length,
      averageAge,
      recent: recentProfiles.length,
      highCompatibility,
      localPercent: percent(localProfiles.length, profiles.length),
      faithPercent: percent(sharedReligion.length, profiles.length),
      completePercent: percent(completeProfiles.length, profiles.length),
      compatibilityPercent: percent(highCompatibility, profiles.length),
    };
  }, [profiles, myProfile, totalCount, preferredProfession, preferredEducation]);

  const stats = useMemo(() => [
    { label: "Visible Matches", value: loading ? "..." : dashboard.visible, note: `${dashboard.total} total profiles`, icon: Users, tone: "bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700" },
    { label: "Nearby", value: loading ? "..." : dashboard.local, note: `${dashboard.localPercent}% in your city`, icon: MapPin, tone: "bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700" },
    { label: "Shared Faith", value: loading ? "..." : dashboard.sharedReligion, note: `${dashboard.faithPercent}% aligned`, icon: Heart, tone: "bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700" },
    { label: "High Match", value: loading ? "..." : dashboard.highCompatibility, note: `${dashboard.compatibilityPercent}% >70% match`, icon: Award, tone: "bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700" },
    { label: "Avg. Age", value: loading ? "..." : dashboard.averageAge || "-", note: `${dashboard.recent} joined recently`, icon: Star, tone: "bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700" },
  ], [dashboard, loading]);

  // Enhanced chart data
  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const count = profiles.filter((profile) => monthKey(new Date(profile.created_at)) === monthKey(date)).length;
      return {
        month: date.toLocaleDateString(undefined, { month: "short" }),
        profiles: count,
      };
    });
  }, [profiles]);

  const signalData = useMemo(() => {
    return [
      { name: "Location", value: dashboard.localPercent || 42 },
      { name: "Faith", value: dashboard.faithPercent || 58 },
      { name: "Profession", value: percent(profiles.filter(p => preferredProfession && p.profession === preferredProfession).length, dashboard.visible) || 35 },
      { name: "Profile", value: dashboard.completePercent || 73 },
    ];
  }, [dashboard, profiles, preferredProfession]);

  const handleExport = useCallback(() => {
    const data = profiles.map(p => ({
      name: p.name,
      age: p.age,
      city: p.city,
      religion: p.religion,
      profession: p.profession,
      education: p.education,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profiles_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Profiles exported successfully");
  }, [profiles]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 px-4 pb-8 md:px-7 md:pb-9">
        <div className="mx-auto max-w-7xl">
          {/* Header Section */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Discover Matches</h1>
              <p className="mt-1 text-muted-foreground">
                Find your perfect connection based on compatibility and shared values
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            {/* Main Content */}
            <div className="min-w-0 space-y-6">
              {/* Hero Card */}
              <Card className="animate-soft-enter overflow-hidden border-0 bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg">
                <CardContent className="relative p-6 md:p-8">
                  <div className="relative z-10">
                    <Badge variant="secondary" className="mb-3 bg-white/20 text-white">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Smart Matchmaking
                    </Badge>
                    <h2 className="text-2xl font-bold md:text-3xl">
                      {loading
                        ? "Finding your perfect matches..."
                        : `${dashboard.visible} ${dashboard.visible === 1 ? "profile" : "profiles"} ready to connect`}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-white/90">
                      {dashboard.highCompatibility > 0
                        ? `${dashboard.highCompatibility} high-compatibility matches found! We've prioritized profiles based on your preferences and lifestyle.`
                        : "Our AI is analyzing compatibility factors to find your best matches."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="pressable bg-white text-primary hover:bg-white/90"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        Advanced Filters
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="pressable text-white hover:bg-white/20">
                        <Link href="/ai-match">
                          AI Match Insights
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute bottom-0 right-0 opacity-20">
                    <Users className="h-48 w-48" />
                  </div>
                </CardContent>
              </Card>

              {/* Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {stats.map((stat, index) => (
                  <StatCard key={index} {...stat} loading={loading} />
                ))}
              </div>

              {/* Charts Section */}
              {renderCharts ? (
                <Suspense fallback={<ChartSkeleton />}>
                  <BrowseInsightsCharts trendData={trendData} signalData={signalData} />
                </Suspense>
              ) : (
                <ChartSkeleton />
              )}

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
                    <div className="flex rounded-lg border border-border p-1">
                      <button
                        onClick={() => setSelectedView("grid")}
                        className={`rounded-md px-3 py-1 text-sm transition-colors ${
                          selectedView === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        Grid
                      </button>
                      <button
                        onClick={() => setSelectedView("list")}
                        className={`rounded-md px-3 py-1 text-sm transition-colors ${
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
                      className="gap-2"
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
                  <Card>
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
                          onSave={saveProfile}
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
            <aside className="space-y-6">
              {/* Profile Summary */}
              <Card>
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
                            {dashboard.completePercent}% Complete
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <Link href="/profile/edit">
                            <User className="h-3 w-3" />
                            Edit
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <Link href="/chat">
                            <MessageCircle className="h-3 w-3" />
                            Chat
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="gap-1">
                          <Link href="/ai-match">
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

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start gap-2" asChild>
                    <Link href="/saved-profiles">
                      <Heart className="h-4 w-4" />
                      Saved Profiles ({savedProfiles.size})
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2" asChild>
                    <Link href="/viewed-profiles">
                      <Eye className="h-4 w-4" />
                      Viewed Recently
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2" asChild>
                    <Link href="/privacy-settings">
                      <Shield className="h-4 w-4" />
                      Privacy Settings
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <h4 className="font-semibold text-sm">Pro Tip</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Complete your profile to {dashboard.completePercent < 80 ? "increase matches by 3x" : "unlock premium features"}!
                      </p>
                      {dashboard.completePercent < 80 && (
                        <Button size="sm" variant="link" className="mt-2 h-auto p-0 text-xs" asChild>
                          <Link href="/profile/edit">Complete Profile →</Link>
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
