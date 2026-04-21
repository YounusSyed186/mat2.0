import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, XCircle, AlertCircle, TrendingUp, Loader2, Crown, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { generateProfileOptimization, generateEmbedding } from "@/lib/ai";
import { useToast } from "@/hooks/use-toast";
import { useAiAccess } from "@/hooks/useAiAccess";
import { Link } from "wouter";
import { Label } from "@radix-ui/react-label";

interface OptimizationResult {
  profile_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_fields: string[];
  suggestions: string[];
  improved_bio: string;
  improved_profession: string;
  improved_hobbies: string[];
  improved_habits: string;
  match_boost_estimate: string;
}

import { useAiStore } from "@/stores/useAiStore";

export default function ProfileOptimizer() {
  const { profile, session } = useAuth();
  const { toast } = useToast();
  const { hasAccess, isLoading: accessLoading } = useAiAccess();
  
  const { optimizationResult, setOptimizationData, clearOptimizationData } = useAiStore();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(optimizationResult);

  const handleAnalyze = async () => {
    if (!profile) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      // Send current profile data to Groq
      const analysis = await generateProfileOptimization(profile);
      setResult(analysis);
      setOptimizationData(analysis);
      toast({
        title: "Analysis Complete",
        description: "Your AI profile optimization is ready."
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: err.message || "Could not analyze profile."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyImprovements = async () => {
    if (!profile || !result || !session?.user.id) return;
    setIsApplying(true);

    try {
      const updates: any = {
        bio: result.improved_bio,
        profession: result.improved_profession,
        hobbies: result.improved_hobbies,
        habits: result.improved_habits,
        prompts: {
          ...(profile.prompts || {}),
          ...(result.improved_prompts || {})
        },
        updated_at: new Date().toISOString()
      };

      // Regenerate embedding with new data
      let newEmbedding = null;
      try {
        const profileText = [
          profile.name,
          profile.age,
          profile.gender,
          profile.religion,
          profile.city,
          result.improved_profession,
          result.improved_bio,
          profile.languages?.join(', '),
          profile.ethnicity,
          profile.willing_to_relocate ? 'willing to relocate' : '',
          result.improved_hobbies?.join(', '),
          profile.career_ambition,
          profile.search_intent,
          profile.weight ? `${profile.weight}kg` : '',
          JSON.stringify(result.improved_prompts || {}),
        ].filter(Boolean).join(' ');
        
        newEmbedding = await generateEmbedding(profileText);
      } catch (embErr) {
        console.error("Failed to generate new embedding:", embErr);
      }

      if (newEmbedding) {
        updates.embedding = `[${newEmbedding.join(",")}]`;
        updates.needs_embedding = false;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);

      if (error) throw error;

      toast({
        title: "Profile Optimized",
        description: "All suggested improvements have been applied!"
      });

      setResult(null);
      window.location.reload();

    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Optimization Failed",
        description: err.message || "Failed to apply improvements."
      });
    } finally {
      setIsApplying(false);
    }
  };

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
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <div>
            <Badge className="mb-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200">
              <Crown className="w-3 h-3 mr-1" />
              Gold & Diamond Feature
            </Badge>
            <h1 className="text-3xl font-serif font-bold mb-3">AI Profile Optimizer</h1>
            <p className="text-muted-foreground text-lg">
              AI profile analysis is exclusive to <strong>Gold</strong> and <strong>Diamond</strong> plan members.
              Upgrade to get an AI coach to improve your profile.
            </p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link href="/subscriptions">
              <Crown className="h-5 w-5" />
              Upgrade to Gold or Diamond
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              Profile Optimizer
            </h1>
            <p className="text-muted-foreground">
              Let AI analyze your profile and suggest improvements to increase your match rate.
            </p>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || isApplying || !profile}
            size="lg"
            className="gap-2 shadow-md"
          >
            {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            {isAnalyzing ? "Analyzing..." : "Analyze Profile"}
          </Button>
        </div>

        {!result && !isAnalyzing && (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Ready to improve your profile?</h3>
              <p className="max-w-md">
                Our AI coach will review your current bio and details, score your profile, and give you actionable suggestions to attract better matches.
              </p>
            </CardContent>
          </Card>
        )}

        {isAnalyzing && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-medium">Analyzing your profile...</h3>
                <p className="text-sm text-muted-foreground animate-pulse">Checking strengths, identifying missing info, and rewriting your bio.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Score & Boost Section */}
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Profile Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-5xl font-bold tracking-tighter text-primary">{result.profile_score}</span>
                    <span className="text-xl text-muted-foreground mb-1">/ 100</span>
                  </div>
                  <Progress value={result.profile_score} className="h-2 mb-2" />
                  <p className="text-sm text-muted-foreground mt-4 flex items-start gap-2 bg-muted/50 p-3 rounded-md">
                    <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span><strong>Potential Boost:</strong> {result.match_boost_estimate}</span>
                  </p>
                </CardContent>
              </Card>

              {/* Missing Fields */}
              {result.missing_fields && result.missing_fields.length > 0 && (
                <Card className="border-orange-200 dark:border-orange-900/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Missing Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.missing_fields.map((field, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                          {field}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Analysis & Suggestions */}
            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.strengths.map((str, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          {str}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Weaknesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.weaknesses.map((weak, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          {weak}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Actionable Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {result.suggestions.map((sug, i) => (
                      <li key={i} className="text-sm bg-muted/30 p-3 rounded-md border border-border/50">
                        {sug}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Improved Details Section */}
              <Card className="border-primary/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-serif">AI Optimization Results</CardTitle>
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">Recommended</Badge>
                  </div>
                  <CardDescription>
                    We've rewritten your key profile fields to be more engaging and attractive.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Bio */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Improved Bio
                      </Label>
                      <div className="p-4 bg-muted/40 rounded-lg italic text-foreground/90 border border-border/50">
                        "{result.improved_bio}"
                      </div>
                    </div>

                    {/* Improved Prompts */}
                    {result.improved_prompts && Object.entries(result.improved_prompts).map(([question, answer], i) => (
                      <div key={i} className="space-y-2">
                        <Label className="text-sm font-semibold text-primary flex items-center gap-2">
                          <Sparkles className="h-4 w-4" /> {question}
                        </Label>
                        <div className="p-3 bg-muted/40 rounded-lg text-foreground/90 border border-border/50">
                          {answer as string}
                        </div>
                      </div>
                    ))}

                  {/* Profession */}
                  {result.improved_profession !== profile?.profession && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Improved Profession Description
                      </Label>
                      <div className="p-3 bg-muted/40 rounded-lg text-foreground/90 border border-border/50">
                        {result.improved_profession}
                      </div>
                    </div>
                  )}

                  {/* Hobbies */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-primary flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Improved Hobbies
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {result.improved_hobbies.map((hobby, i) => (
                        <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                          {hobby}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Habits */}
                  {result.improved_habits && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-primary flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Improved Habits/Lifestyle
                      </Label>
                      <div className="p-3 bg-muted/40 rounded-lg text-foreground/90 border border-border/50">
                        {result.improved_habits}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/10 border-t flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    className="w-full sm:w-auto h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all" 
                    onClick={handleApplyImprovements}
                    disabled={isApplying}
                  >
                    {isApplying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    {isApplying ? "Optimizing..." : "Apply All Improvements"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center sm:text-left mt-2 sm:mt-0 max-w-xs leading-tight">
                    This will update your bio, profession, hobbies, and habits across your profile.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
