import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useBlockStore } from "@/stores/useBlockStore";
import type { Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { ProfileCard } from "@/components/ProfileCard";
import { PaginationControls } from "@/components/PaginationControls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"];
const PAGE_SIZE = 12;

export default function Browse() {
  const [] = useLocation();
  const { currentUser, profile: myProfile } = useAuth();
  const { blocks, fetchBlocks } = useBlockStore();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [smartSort, setSmartSort] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState({
    gender: "",
    minAge: "",
    maxAge: "",
    city: "",
    religion: "",
  });

  useEffect(() => {
    if (currentUser) fetchBlocks(currentUser.id);
  }, [currentUser, fetchBlocks]);

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

      // Apply automatic gender filter (opposite by default)
      if (!filters.gender) {
        if (myProfile?.gender === 'male') {
          query = query.eq('gender', 'female');
        } else if (myProfile?.gender === 'female') {
          query = query.eq('gender', 'male');
        }
      } else {
        query = query.eq("gender", filters.gender);
      }

      if (filters.minAge) query = query.gte("age", parseInt(filters.minAge));
      if (filters.maxAge) query = query.lte("age", parseInt(filters.maxAge));
      if (filters.city) query = query.ilike("city", `%${filters.city}%`);
      if (filters.religion) query = query.eq("religion", filters.religion);

      // Pagination
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;
      
      if (fetchError) throw fetchError;

      if (data) {
        let result = data as Profile[];

        // Filter out blocked users (both directions)
        const blockedIds = new Set(
          blocks.map(b => b.blocker_id === currentUser.id ? b.blocked_id : b.blocker_id)
        );
        result = result.filter(p => !blockedIds.has(p.id));

        // Smart sorting (on the current page results)
        if (smartSort && myProfile) {
          result.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            if (a.city?.toLowerCase() === myProfile.city?.toLowerCase()) scoreA += 3;
            if (b.city?.toLowerCase() === myProfile.city?.toLowerCase()) scoreB += 3;
            if (a.religion === myProfile.religion) scoreA += 2;
            if (b.religion === myProfile.religion) scoreB += 2;
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
  }, [currentUser, currentPage, filters, blocks, smartSort, myProfile]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const resetFilters = () => {
    setFilters({ gender: "", minAge: "", maxAge: "", city: "", religion: "" });
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <Layout>
      <div className="px-4 py-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Browse Profiles</h1>
            <p className="text-muted-foreground mt-1">
              {loading ? "Searching..." : `${totalCount} profiles matching your criteria`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={smartSort ? "default" : "outline"}
              size="sm"
              onClick={() => setSmartSort(!smartSort)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Smart Sort
            </Button>
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

        {showFilters && (
          <Card className="border-card-border shadow-sm animate-in slide-in-from-top-2 duration-300">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</Label>
                  <Select value={filters.gender || "all"} onValueChange={(v) => handleFilterChange({ gender: v === "all" ? "" : v })}>
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
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min Age</Label>
                  <Input
                    type="number"
                    min={18}
                    max={100}
                    placeholder="18"
                    value={filters.minAge}
                    onChange={(e) => handleFilterChange({ minAge: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Age</Label>
                  <Input
                    type="number"
                    min={18}
                    max={100}
                    placeholder="80"
                    value={filters.maxAge}
                    onChange={(e) => handleFilterChange({ maxAge: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</Label>
                  <Input
                    placeholder="Search city..."
                    value={filters.city}
                    onChange={(e) => handleFilterChange({ city: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Religion</Label>
                  <Select value={filters.religion || "all"} onValueChange={(v) => handleFilterChange({ religion: v === "all" ? "" : v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      {RELIGIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-primary">
                  Clear all filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="bg-destructive/10 p-4 rounded-full">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Something went wrong</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => fetchProfiles()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <Card key={i} className="border-card-border overflow-hidden">
                <Skeleton className="h-24 w-full" />
                <CardContent className="pt-12 pb-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <Skeleton className="h-10 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Search className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-xl font-semibold text-foreground">No profiles found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your filters or clearing them to see more results.</p>
            <Button variant="link" onClick={resetFilters} className="mt-4">Clear all filters</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
              {profiles.map((p) => (
                <ProfileCard key={p.id} profile={p} />
              ))}
            </div>
            
            <div className="pt-8 pb-12">
              <PaginationControls 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
              />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
