import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileCard } from "@/components/ProfileCard";
import { PaginationControls } from "@/components/PaginationControls";
import { Heart, Sparkles, Loader2, Crown, Lock, Search, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { generateEmbedding, generateMatchExplanation, parseSearchFilters } from "@/lib/ai";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Profile } from "@/types";
import { Link } from "wouter";
import { useAiAccess } from "@/hooks/useAiAccess";
import { Badge } from "@/components/ui/badge";

import { useAiStore } from "@/stores/useAiStore";

interface MatchResult extends Profile {
  similarity: number;
}

const MATCH_LIMIT = 12;

export default function AiMatch() {
  const { profile } = useAuth();
  const { hasAccess, isLoading: accessLoading } = useAiAccess();
  
  const { matchQuery, matchResults, matchExplanation, matchPage, setMatchData } = useAiStore();
  
  const [query, setQuery] = useState(matchQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>(matchResults);
  const [aiExplanation, setAiExplanation] = useState<string>(matchExplanation);
  const [hasSearched, setHasSearched] = useState(matchResults.length > 0);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(matchPage);
  const [totalCount, setTotalCount] = useState(0);

  const handleSearch = useCallback(async (page: number = 1) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    if (page === 1) {
      setHasSearched(true);
      setMatches([]);
      setAiExplanation("");
    }

    try {
      // 1. Parse structured filters from natural language query (Hybrid Search)
      const parsedFilters = await parseSearchFilters(query);

      // 2. Convert query to embedding
      const queryEmbedding = await generateEmbedding(query);

      // 3. Perform vector search in Supabase using the paginated RPC
      const offset = (page - 1) * MATCH_LIMIT;
      
      // Automatic gender filter (opposite by default)
      let targetGender = parsedFilters?.gender || null;
      if (!targetGender) {
        if (profile?.gender === 'male') {
          targetGender = 'female';
        } else if (profile?.gender === 'female') {
          targetGender = 'male';
        }
      }

      const { data, error: searchError } = await supabase.rpc("match_profiles", {
        query_embedding: `[${queryEmbedding.join(",")}]`,
        match_limit: MATCH_LIMIT,
        match_offset: offset,
        filter_age_min: parsedFilters?.age_min || 18,
        filter_age_max: parsedFilters?.age_max || 100,
        filter_gender: targetGender,
        filter_religion: parsedFilters?.religion,
        exclude_user_id: profile?.id
      });

      if (searchError) throw searchError;

      const newMatches = data || [];
      setMatches(newMatches);
      setTotalCount(newMatches.length === MATCH_LIMIT ? page * MATCH_LIMIT + 1 : page * MATCH_LIMIT);

      let finalExplanation = aiExplanation;
      if (page === 1) {
        if (data && data.length > 0) {
          finalExplanation = await generateMatchExplanation(query, data);
        } else {
          finalExplanation = "I couldn't find any profiles that strongly match your description. Try using different keywords or broadening your criteria.";
        }
        setAiExplanation(finalExplanation);
      }

      setMatchData(query, newMatches, finalExplanation, page);

    } catch (err: any) {
      console.error("AI Match error:", err);
      setError(err.message || "Failed to search profiles");
      toast.error("Search failed. Please ensure API keys are set and try again.");
    } finally {
      setIsSearching(false);
    }
  }, [query, profile?.id]);

  useEffect(() => {
    if (hasSearched && currentPage > 1) {
      handleSearch(currentPage);
    }
  }, [currentPage]);

  const onNewSearch = () => {
    setCurrentPage(1);
    handleSearch(1);
  };

  // Paywall gate
  if (accessLoading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200">
              <Crown className="w-3.5 h-3.5 mr-1.5" />
              Premium Feature
            </Badge>
            <h1 className="text-4xl font-serif font-bold">AI Match Assistant</h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Unlock the power of AI to find matches using natural language. Exclusive to <strong>Gold</strong> and <strong>Diamond</strong> members.
            </p>
          </div>
          <Button asChild size="lg" className="gap-2 h-14 px-8 text-lg">
            <Link href="/subscriptions">
              <Crown className="h-5 w-5" />
              Upgrade to Premium
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-serif font-bold text-foreground flex items-center justify-center md:justify-start gap-3">
            <Sparkles className="h-10 w-10 text-primary" />
            AI Matchmaker
          </h1>
          <p className="text-muted-foreground text-lg">
            Describe your ideal partner in plain English. Our AI understands preferences, lifestyle, and values.
          </p>
        </div>

        {/* Search Input Section */}
        <Card className="border-primary/20 shadow-lg overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder='e.g., "I am looking for an ambitious software engineer who loves trekking, speaks Hindi, and lives in Bangalore..."'
                  className="min-h-[120px] resize-none text-lg border-none focus-visible:ring-0 p-0 shadow-none"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onNewSearch();
                    }
                  }}
                />
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">Tip: Be as specific as you like about hobbies, values, and location.</p>
                  <p className="text-xs text-muted-foreground hidden md:block">Press Enter to search</p>
                </div>
              </div>
              <Button 
                onClick={onNewSearch} 
                disabled={!query.trim() || isSearching}
                className="md:h-auto gap-2 min-w-[160px] text-lg font-semibold h-14"
              >
                {isSearching ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
                {isSearching ? "Thinking..." : "Find Matches"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {hasSearched && (
          <div className="space-y-10">
            
            {/* AI Explanation Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex flex-col items-center text-center">
                  <div className="bg-primary/10 p-4 rounded-full mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-semibold text-primary">AI Match Analysis</h4>
                  <p className="text-xs text-muted-foreground mt-2">Insights based on semantic similarity and shared values.</p>
                </div>
              </div>
              
              <div className="lg:col-span-3">
                <Card className="bg-muted/30 border-muted shadow-inner min-h-[160px] flex items-center">
                  <CardContent className="pt-6 w-full">
                    {isSearching && currentPage === 1 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="h-10 w-10 animate-spin mb-3 text-primary" />
                        <p className="font-medium">Curating your best matches...</p>
                      </div>
                    ) : aiExplanation ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {aiExplanation.split('\n\n').map((paragraph, i) => (
                          <p key={i} className="text-base leading-relaxed text-foreground/90">{paragraph}</p>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-2xl font-serif font-bold flex items-center gap-2">
                  <Heart className="h-6 w-6 text-primary fill-primary" />
                  Recommended Matches
                </h3>
                {matches.length > 0 && !isSearching && (
                  <span className="text-sm text-muted-foreground">Page {currentPage}</span>
                )}
              </div>

              {error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <div>
                    <h3 className="text-xl font-semibold">Search failed</h3>
                    <p className="text-muted-foreground">{error}</p>
                  </div>
                  <Button onClick={onNewSearch} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Try Again
                  </Button>
                </div>
              ) : isSearching && currentPage === 1 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="border-card-border h-[400px]">
                      <div className="h-40 bg-muted animate-pulse" />
                      <CardContent className="p-6 space-y-4">
                        <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                        <div className="space-y-2">
                          <div className="h-4 w-full bg-muted animate-pulse rounded" />
                          <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <Search className="h-16 w-16 text-muted-foreground/20 mb-4" />
                  <h3 className="text-xl font-semibold">No direct matches found</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Try rephrasing your search or using broader terms like "software engineer" or "active lifestyle".</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {matches.map((match) => (
                      <ProfileCard 
                        key={match.id} 
                        profile={match} 
                        similarity={match.similarity}
                      />
                    ))}
                  </div>

                  <div className="pt-10 pb-20">
                    <PaginationControls 
                      currentPage={currentPage} 
                      totalPages={Math.ceil(totalCount / MATCH_LIMIT)} 
                      onPageChange={setCurrentPage} 
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
