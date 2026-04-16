import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, GraduationCap, Briefcase, Search, SlidersHorizontal } from "lucide-react";

const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"];

export default function Browse() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: "",
    minAge: "",
    maxAge: "",
    city: "",
    religion: "",
  });

  const fetchProfiles = async () => {
    if (!currentUser) return;
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("*")
      .neq("id", currentUser.id)
      .eq("is_blocked", false)
      .order("created_at", { ascending: false });

    if (filters.gender) query = query.eq("gender", filters.gender);
    if (filters.minAge) query = query.gte("age", parseInt(filters.minAge));
    if (filters.maxAge) query = query.lte("age", parseInt(filters.maxAge));
    if (filters.city) query = query.ilike("city", `%${filters.city}%`);
    if (filters.religion) query = query.eq("religion", filters.religion);

    const { data, error } = await query;
    if (!error) setProfiles((data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, [currentUser, filters]);

  const resetFilters = () => {
    setFilters({ gender: "", minAge: "", maxAge: "", city: "", religion: "" });
  };

  return (
    <Layout>
      <div className="px-4 py-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Browse Profiles</h1>
            <p className="text-muted-foreground text-sm mt-1">{profiles.length} profiles found</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <Card className="mb-6 border-card-border">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Gender</Label>
                  <Select value={filters.gender} onValueChange={(v) => setFilters({ ...filters, gender: v === "all" ? "" : v })}>
                    <SelectTrigger className="h-8 text-sm" data-testid="filter-gender">
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
                  <Label className="text-xs">Min Age</Label>
                  <Input
                    type="number"
                    min={18}
                    max={80}
                    placeholder="18"
                    value={filters.minAge}
                    onChange={(e) => setFilters({ ...filters, minAge: e.target.value })}
                    className="h-8 text-sm"
                    data-testid="filter-min-age"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Age</Label>
                  <Input
                    type="number"
                    min={18}
                    max={80}
                    placeholder="60"
                    value={filters.maxAge}
                    onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })}
                    className="h-8 text-sm"
                    data-testid="filter-max-age"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input
                    placeholder="Search city..."
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    className="h-8 text-sm"
                    data-testid="filter-city"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Religion</Label>
                  <Select value={filters.religion} onValueChange={(v) => setFilters({ ...filters, religion: v === "all" ? "" : v })}>
                    <SelectTrigger className="h-8 text-sm" data-testid="filter-religion">
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
              <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-3 text-muted-foreground">
                Clear filters
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No profiles found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p) => (
              <Card
                key={p.id}
                className="border-card-border shadow-sm hover:shadow-md transition-shadow cursor-pointer group overflow-hidden"
                onClick={() => setLocation(`/user/${p.id}`)}
                data-testid={`card-profile-${p.id}`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <UserAvatar name={p.name} avatarUrl={p.avatar_url} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {p.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {p.age} years · {p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.city && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />{p.city}
                          </span>
                        )}
                        {p.religion && (
                          <Badge variant="secondary" className="text-xs py-0 px-2">{p.religion}</Badge>
                        )}
                      </div>
                      {p.profession && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Briefcase className="h-3 w-3" />{p.profession}
                        </p>
                      )}
                      {p.education && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <GraduationCap className="h-3 w-3" />{p.education}
                        </p>
                      )}
                    </div>
                  </div>
                  {p.bio && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 border-t border-border pt-2">
                      {p.bio}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
