import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PaginationControls } from "@/components/PaginationControls";
import { AiUsageStatus } from "@/components/AiUsageStatus";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import {
  AlertCircle,
  Bot,
  Crown,
  FileHeart,
  Heart,
  Loader2,
  Lock,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { generateEmbedding, generateMatchExplanation, parseSearchFilters } from "@/lib/ai";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Profile } from "@/types";
import { Link } from "react-router-dom";
import { useAiAccess } from "@/hooks/useAiAccess";
import { Badge } from "@/components/ui/badge";
import { useAiStore } from "@/stores/useAiStore";

interface MatchResult extends Profile {
  similarity: number;
}

const MATCH_LIMIT = 12;

const promptSuggestions = [
  {
    icon: Heart,
    title: "Values-first match",
    prompt: "Find someone family-oriented, kind, emotionally mature, and serious about marriage.",
  },
  {
    icon: Wand2,
    title: "Lifestyle fit",
    prompt: "I want a partner who enjoys travel, fitness, good conversations, and a balanced modern lifestyle.",
  },
  {
    icon: FileHeart,
    title: "Career and city",
    prompt: "Show me ambitious professionals in my city who share similar education and long-term goals.",
  },
];

function profileImage(match: MatchResult) {
  return match.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${match.id}`;
}

export default function AiMatch() {
  const { profile } = useAuth();
  const {
    hasAccess,
    isLoading: accessLoading,
    planName,
    aiTokenLimit,
    aiTokensUsed,
    aiTokensRemaining,
    usageLoading,
    refreshUsage,
  } = useAiAccess();

  const { matchQuery, matchResults, matchExplanation, matchPage, setMatchData } = useAiStore();

  const [query, setQuery] = useState(matchQuery);
  const [submittedQuery, setSubmittedQuery] = useState(matchQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>(matchResults);
  const [aiExplanation, setAiExplanation] = useState<string>(matchExplanation);
  const [hasSearched, setHasSearched] = useState(matchResults.length > 0);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(matchPage);
  const [totalCount, setTotalCount] = useState(matchResults.length);

  const handleSearch = useCallback(async (page: number = 1, searchText = query) => {
    const cleanQuery = searchText.trim();
    if (!cleanQuery) return;

    setSubmittedQuery(cleanQuery);
    setQuery(cleanQuery);
    setIsSearching(true);
    setError(null);
    if (page === 1) {
      setHasSearched(true);
      setMatches([]);
      setAiExplanation("");
    }

    try {
      const parsedFilters = await parseSearchFilters(cleanQuery);
      const queryEmbedding = await generateEmbedding(cleanQuery, { featureName: "ai_match_embedding" });
      const offset = (page - 1) * MATCH_LIMIT;

      let targetGender = parsedFilters?.gender || null;
      if (!targetGender) {
        if (profile?.gender === "male") {
          targetGender = "female";
        } else if (profile?.gender === "female") {
          targetGender = "male";
        }
      }

      let data: any = null;
      let searchError: any = null;

      const rpcV2Res = await supabase.rpc("match_profiles_v2", {
        query_embedding: `[${queryEmbedding.join(",")}]`,
        match_limit: MATCH_LIMIT,
        match_offset: offset,
        filter_age_min: parsedFilters?.age_min || 18,
        filter_age_max: parsedFilters?.age_max || 100,
        filter_gender: targetGender,
        filter_religion: parsedFilters?.religion,
        current_user_id: profile?.id,
      });

      if (rpcV2Res.error) {
        // Fallback to legacy v1 RPC if v2 not yet deployed on database instance
        const rpcV1Res = await supabase.rpc("match_profiles", {
          query_embedding: `[${queryEmbedding.join(",")}]`,
          match_limit: MATCH_LIMIT,
          match_offset: offset,
          filter_age_min: parsedFilters?.age_min || 18,
          filter_age_max: parsedFilters?.age_max || 100,
          filter_gender: targetGender,
          filter_religion: parsedFilters?.religion,
          exclude_user_id: profile?.id,
        });
        data = rpcV1Res.data;
        searchError = rpcV1Res.error;
      } else {
        data = rpcV2Res.data;
      }

      if (searchError) throw searchError;

      const newMatches = data || [];
      setMatches(newMatches);
      setTotalCount(newMatches.length === MATCH_LIMIT ? page * MATCH_LIMIT + 1 : page * MATCH_LIMIT);

      let finalExplanation = aiExplanation;
      if (page === 1) {
        finalExplanation = newMatches.length
          ? await generateMatchExplanation(cleanQuery, newMatches)
          : "I couldn't find any profiles that strongly match your description. Try using broader details around values, city, lifestyle, or profession.";
        setAiExplanation(finalExplanation);
      }

      setMatchData(cleanQuery, newMatches, finalExplanation, page);
    } catch (err: any) {
      console.error("AI Match error:", err);
      setError(err.message || "Failed to search profiles");
      toast.error("Search failed. Please ensure API keys are set and try again.");
    } finally {
      setIsSearching(false);
      refreshUsage();
    }
  }, [query, profile?.id, aiExplanation, setMatchData, refreshUsage]);

  useEffect(() => {
    if (hasSearched && currentPage > 1) {
      handleSearch(currentPage, submittedQuery);
    }
  }, [currentPage]);

  const onNewSearch = () => {
    setCurrentPage(1);
    handleSearch(1, query);
  };

  const startFresh = () => {
    setQuery("");
    setSubmittedQuery("");
    setMatches([]);
    setAiExplanation("");
    setError(null);
    setHasSearched(false);
    setCurrentPage(1);
  };

  if (accessLoading) {
    return (
      <Layout>
        <div className="flex min-h-full items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return (
      <Layout>
        <div className="flex min-h-full items-center justify-center p-4 md:p-8">
        <div className="premium-card flex max-w-2xl flex-col items-center rounded-lg p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <Badge className="mt-6 border-primary/20 bg-primary/10 text-primary">
              <Crown className="mr-1.5 h-3.5 w-3.5" />
              Premium Feature
            </Badge>
            <h1 className="premium-gradient-text mt-4 font-serif text-3xl font-bold md:text-5xl">AI Match Assistant</h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              Unlock natural-language matching for lifestyle, values, profession, and long-term compatibility.
            </p>
            <Button asChild size="lg" className="premium-cta mt-6 h-12 rounded-full px-7 font-bold shadow-none">
              <Link to="/subscriptions">
                <Crown className="h-5 w-5" />
                Upgrade to Premium
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-white/60 bg-white/40 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar text-white shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Vivaah Vedika AI Match</p>
              <p className="text-xs text-muted-foreground">Compatibility search</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden h-9 rounded-full bg-white/60 px-3 text-xs shadow-none dark:bg-white/5 sm:inline-flex">
              <Bot className="h-3.5 w-3.5" />
              Vivaah AI 2.0
            </Button>
            <Button size="sm" className="premium-cta h-9 rounded-full px-3 text-xs font-bold shadow-none" onClick={startFresh}>
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New Chat
            </Button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 md:px-6">
          <AiUsageStatus
            className="mb-5"
            planName={planName}
            used={aiTokensUsed}
            limit={aiTokenLimit}
            remaining={aiTokensRemaining}
            isLoading={usageLoading}
            onRefresh={refreshUsage}
          />

          {!hasSearched ? (
            <div className="flex flex-1 flex-col items-center justify-center pb-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-sidebar shadow-[0_16px_32px_rgba(0,0,0,0.14)]">
                <Heart className="h-8 w-8 fill-primary text-primary" />
              </div>
              <p className="mt-5 text-sm text-muted-foreground">Hi, {profile?.name?.split(" ")[0] || "there"}</p>
              <h1 className="mt-2 text-2xl font-bold md:text-4xl">Who should we look for?</h1>

              <div className="mt-8 grid w-full max-w-3xl gap-3 md:grid-cols-3">
                {promptSuggestions.map(({ icon: Icon, title, prompt }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setQuery(prompt)}
                    className="premium-card rounded-xl p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="mt-4 block text-sm font-semibold text-foreground">{title}</span>
                    <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-5 pb-6">
              <div className="ml-auto max-w-2xl rounded-xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground shadow-sm">
                <p className="text-sm leading-relaxed">{submittedQuery}</p>
              </div>

              <div className="premium-card mr-auto max-w-4xl rounded-xl rounded-bl-md p-4 shadow-none md:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {isSearching && currentPage === 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold">AI Match Analysis</p>
                    <p className="text-xs text-muted-foreground">
                      {isSearching && currentPage === 1 ? "Curating your best matches..." : `${matches.length} recommendation${matches.length === 1 ? "" : "s"} ready`}
                    </p>
                  </div>
                </div>

                {error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
                    <h3 className="text-lg font-semibold">Search failed</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                    <Button onClick={onNewSearch} variant="outline" className="mt-4 rounded-full">
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                ) : isSearching && currentPage === 1 ? (
                  <div className="space-y-3 py-3">
                    <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  </div>
                ) : (
                  <>
                    {aiExplanation && (
                      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
                        {aiExplanation.split("\n\n").map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    )}

                    {matches.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Search className="mb-3 h-12 w-12 text-muted-foreground/25" />
                        <h3 className="text-lg font-semibold">No direct matches found</h3>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                          Try a broader description with values, city, lifestyle, or profession.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 overflow-hidden rounded-xl border border-card-border bg-background/70">
                        <AnimatedTestimonials
                          autoplay
                          testimonials={matches.map((match) => ({
                            quote: match.bio || `Meet ${match.name}, a ${match.age} year old ${match.profession || "professional"} from ${match.city || "their city"}.`,
                            name: `${match.name}, ${match.age}`,
                            designation: `${Math.round(match.similarity * 100)}% Match | ${match.city || "Location N/A"} | ${match.religion || "Open preference"}`,
                            src: profileImage(match),
                            id: match.id,
                          }))}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {matches.length > 0 && !error && (
                <div className="pb-2 pt-2">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={Math.ceil(totalCount / MATCH_LIMIT)}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-white/60 bg-white/55 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/40 md:px-6">
          <div className="premium-card mx-auto flex max-w-3xl items-end gap-2 rounded-xl p-2 shadow-none">
            <Textarea
              placeholder="Ask for the kind of partner you want to meet..."
              className="max-h-32 min-h-11 resize-none border-0 bg-transparent px-3 py-3 text-sm shadow-none focus-visible:ring-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onNewSearch();
                }
              }}
            />
            <Button
              onClick={onNewSearch}
              disabled={!query.trim() || isSearching}
              size="icon"
              className="premium-cta h-10 w-10 shrink-0 rounded-lg shadow-none"
              aria-label="Send match search"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
