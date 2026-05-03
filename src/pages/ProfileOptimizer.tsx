import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Crown,
  ListChecks,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  SaveAll,
  Sparkles,
  TrendingUp,
  Wand2,
  XCircle,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAiAccess } from "@/hooks/useAiAccess";
import { generateEmbedding, generateProfileOptimization } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useAiStore } from "@/stores/useAiStore";

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
  improved_prompts: Record<string, string>;
  match_boost_estimate: string;
  tips?: string[];
}

type CoreOptimizationField = "bio" | "profession" | "hobbies" | "habits";
type OptimizableFieldKey = CoreOptimizationField | `prompt:${string}`;
type ApplyingTarget = OptimizableFieldKey | "all" | null;

const PROMPT_PREFIX = "prompt:";

const CORE_FIELD_LABELS: Record<CoreOptimizationField, string> = {
  bio: "Bio",
  profession: "Profession",
  hobbies: "Hobbies",
  habits: "Habits",
};

const normalizeText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const hasText = (value: unknown) => normalizeText(value).length > 0;

const toStringList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const areListsEqual = (left: unknown, right: unknown) => {
  const normalizedLeft = toStringList(left).map((item) => item.toLowerCase());
  const normalizedRight = toStringList(right).map((item) => item.toLowerCase());

  if (normalizedLeft.length !== normalizedRight.length) return false;
  return normalizedLeft.every((item, index) => item === normalizedRight[index]);
};

const getPromptQuestion = (fieldKey: OptimizableFieldKey) => {
  if (!fieldKey.startsWith(PROMPT_PREFIX)) return "";
  return fieldKey.slice(PROMPT_PREFIX.length);
};

const getFieldLabel = (fieldKey: OptimizableFieldKey) => {
  if (fieldKey.startsWith(PROMPT_PREFIX)) return "Prompt";
  return CORE_FIELD_LABELS[fieldKey as CoreOptimizationField];
};

function TextValue({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <div
      className={cn(
        "min-h-[76px] rounded-lg border px-3 py-2.5 text-sm leading-6",
        muted
          ? "border-border/70 bg-muted/35 text-muted-foreground"
          : "border-primary/20 bg-primary/5 text-foreground"
      )}
    >
      {children}
    </div>
  );
}

function ListValue({ items, muted = false }: { items: string[]; muted?: boolean }) {
  if (items.length === 0) {
    return (
      <TextValue muted={muted}>
        <span className="text-muted-foreground">Not added</span>
      </TextValue>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[76px] flex-wrap content-start gap-2 rounded-lg border px-3 py-2.5",
        muted ? "border-border/70 bg-muted/35" : "border-primary/20 bg-primary/5"
      )}
    >
      {items.map((item) => (
        <Badge
          key={item}
          variant="outline"
          className={cn(
            "max-w-full whitespace-normal break-words px-2.5 py-1",
            muted ? "bg-background/70 text-muted-foreground" : "border-primary/25 bg-background/80 text-primary"
          )}
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

function InsightList({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  tone: "green" | "red" | "amber" | "neutral";
}) {
  const toneClasses = {
    green: "border-emerald-200/80 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300",
    red: "border-red-200/80 bg-red-50/70 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300",
    amber: "border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300",
    neutral: "border-border/70 bg-card text-foreground",
  }[tone];

  return (
    <Card className={cn("overflow-hidden", toneClasses)}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={`${title}-${index}`} className="flex items-start gap-2 text-sm leading-6">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No items found.</p>
        )}
      </CardContent>
    </Card>
  );
}

function OptimizationFieldCard({
  title,
  subtitle,
  current,
  suggested,
  applied,
  applying,
  disabled,
  onApply,
}: {
  title: string;
  subtitle?: string;
  current: ReactNode;
  suggested: ReactNode;
  applied: boolean;
  applying: boolean;
  disabled: boolean;
  onApply: () => void;
}) {
  return (
    <Card className={cn("overflow-hidden border-border/80", applied && "border-emerald-200 bg-emerald-50/35 dark:border-emerald-900/60 dark:bg-emerald-950/10")}>
      <CardHeader className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4 text-primary" />
              <span className="truncate">{title}</span>
            </CardTitle>
            {subtitle && <CardDescription className="break-words">{subtitle}</CardDescription>}
          </div>
          <Button
            type="button"
            size="sm"
            variant={applied ? "secondary" : "default"}
            onClick={onApply}
            disabled={disabled || applied || applying}
            className="shrink-0"
          >
            {applying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : applied ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {applying ? "Applying" : applied ? "Applied" : `Apply ${title}`}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 pt-0 lg:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Current</Label>
          {current}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-primary">AI suggestion</Label>
          {suggested}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfileOptimizer() {
  const { profile, refetchProfile, session } = useAuth();
  const { toast } = useToast();
  const { hasAccess, isLoading: accessLoading } = useAiAccess();
  const { optimizationResult, setOptimizationData } = useAiStore();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [applyingTarget, setApplyingTarget] = useState<ApplyingTarget>(null);
  const [appliedFields, setAppliedFields] = useState<Set<OptimizableFieldKey>>(() => new Set());
  const [result, setResult] = useState<OptimizationResult | null>(optimizationResult as OptimizationResult | null);

  const promptEntries = useMemo(() => {
    return Object.entries(result?.improved_prompts || {}).filter(([, answer]) => hasText(answer));
  }, [result]);

  const availableFieldKeys = useMemo<OptimizableFieldKey[]>(() => {
    if (!result) return [];

    const keys: OptimizableFieldKey[] = [];
    if (hasText(result.improved_bio)) keys.push("bio");
    if (hasText(result.improved_profession)) keys.push("profession");
    if (toStringList(result.improved_hobbies).length > 0) keys.push("hobbies");
    if (hasText(result.improved_habits)) keys.push("habits");
    promptEntries.forEach(([question]) => keys.push(`${PROMPT_PREFIX}${question}`));

    return keys;
  }, [promptEntries, result]);

  const buildEmbeddingText = (updates: Record<string, unknown>) => {
    if (!profile) return "";

    const nextPrompts = (updates.prompts as Record<string, string> | undefined) || profile.prompts || {};
    const nextHobbies = (updates.hobbies as string[] | undefined) || profile.hobbies || [];

    return [
      profile.name,
      profile.age,
      profile.gender,
      profile.religion,
      profile.city,
      updates.profession ?? profile.profession,
      updates.bio ?? profile.bio,
      profile.languages?.join(", "),
      profile.ethnicity,
      profile.willing_to_relocate ? "willing to relocate" : "",
      nextHobbies.join(", "),
      profile.career_ambition,
      profile.search_intent,
      profile.weight ? `${profile.weight}kg` : "",
      JSON.stringify(nextPrompts),
    ]
      .filter(Boolean)
      .join(" ");
  };

  const buildProfileUpdates = (fieldKeys: OptimizableFieldKey[]) => {
    if (!profile || !result) return null;

    const updates: Record<string, unknown> = {};
    const promptUpdates: Record<string, string> = {};

    fieldKeys.forEach((fieldKey) => {
      if (fieldKey === "bio" && hasText(result.improved_bio)) {
        updates.bio = normalizeText(result.improved_bio);
      }

      if (fieldKey === "profession" && hasText(result.improved_profession)) {
        updates.profession = normalizeText(result.improved_profession);
      }

      if (fieldKey === "hobbies") {
        const hobbies = toStringList(result.improved_hobbies);
        if (hobbies.length > 0) updates.hobbies = hobbies;
      }

      if (fieldKey === "habits" && hasText(result.improved_habits)) {
        updates.habits = normalizeText(result.improved_habits);
      }

      if (fieldKey.startsWith(PROMPT_PREFIX)) {
        const question = getPromptQuestion(fieldKey);
        const answer = result.improved_prompts?.[question];
        if (hasText(answer)) promptUpdates[question] = normalizeText(answer);
      }
    });

    if (Object.keys(promptUpdates).length > 0) {
      updates.prompts = {
        ...(profile.prompts || {}),
        ...promptUpdates,
      };
    }

    return updates;
  };

  const doesFieldMatchProfile = (fieldKey: OptimizableFieldKey) => {
    if (!profile || !result) return false;

    if (fieldKey === "bio") {
      return normalizeText(profile.bio) === normalizeText(result.improved_bio);
    }

    if (fieldKey === "profession") {
      return normalizeText(profile.profession) === normalizeText(result.improved_profession);
    }

    if (fieldKey === "hobbies") {
      return areListsEqual(profile.hobbies, result.improved_hobbies);
    }

    if (fieldKey === "habits") {
      return normalizeText(profile.habits) === normalizeText(result.improved_habits);
    }

    const question = getPromptQuestion(fieldKey);
    return normalizeText(profile.prompts?.[question]) === normalizeText(result.improved_prompts?.[question]);
  };

  const isFieldApplied = (fieldKey: OptimizableFieldKey) => {
    return appliedFields.has(fieldKey) || doesFieldMatchProfile(fieldKey);
  };

  const unappliedFieldKeys = availableFieldKeys.filter((fieldKey) => !isFieldApplied(fieldKey));
  const applyingAll = applyingTarget === "all";
  const isApplying = applyingTarget !== null;

  const handleAnalyze = async () => {
    if (!profile) return;
    setIsAnalyzing(true);
    setResult(null);
    setAppliedFields(new Set());

    try {
      const analysis = await generateProfileOptimization(profile);
      setResult(analysis);
      setOptimizationData(analysis);
      toast({
        title: "Analysis complete",
        description: "Your AI optimization is ready.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: err.message || "Could not analyze profile.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyFields = async (fieldKeys: OptimizableFieldKey[], target: ApplyingTarget = fieldKeys[0]) => {
    if (!profile || !result || !session?.user.id || fieldKeys.length === 0) return;

    const profileUpdates = buildProfileUpdates(fieldKeys);
    if (!profileUpdates || Object.keys(profileUpdates).length === 0) {
      toast({
        variant: "destructive",
        title: "Nothing to apply",
        description: "The AI result did not include a usable value for this field.",
      });
      return;
    }

    setApplyingTarget(target);

    try {
      const updates: Record<string, unknown> = {
        ...profileUpdates,
        updated_at: new Date().toISOString(),
      };

      try {
        const embeddingText = buildEmbeddingText(updates);
        const newEmbedding = await generateEmbedding(embeddingText);
        updates.embedding = `[${newEmbedding.join(",")}]`;
        updates.needs_embedding = false;
      } catch (embErr) {
        console.error("Failed to generate new embedding:", embErr);
        updates.needs_embedding = true;
      }

      const { error } = await supabase.from("profiles").update(updates).eq("id", session.user.id);
      if (error) throw error;

      setAppliedFields((current) => new Set([...current, ...fieldKeys]));
      await refetchProfile();

      const appliedLabel = target === "all" ? "AI improvements" : getFieldLabel(fieldKeys[0]);
      toast({
        title: target === "all" ? "Profile optimized" : `${appliedLabel} updated`,
        description: target === "all" ? "All selected AI improvements have been applied." : "The suggested change is now on your profile.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err.message || "Failed to apply the AI suggestion.",
      });
    } finally {
      setApplyingTarget(null);
    }
  };

  if (accessLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return (
      <Layout>
        <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center space-y-6 p-4 text-center md:p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div>
            <Badge className="mb-3 border-yellow-200 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
              <Crown className="mr-1 h-3 w-3" />
              Gold & Diamond Feature
            </Badge>
            <h1 className="mb-3 font-serif text-3xl font-bold">AI Profile Optimizer</h1>
            <p className="text-lg text-muted-foreground">
              AI profile analysis is exclusive to <strong>Gold</strong> and <strong>Diamond</strong> plan members.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/subscriptions">
              <Crown className="h-5 w-5" />
              Upgrade Plan
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-full bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--accent)/0.22)_46%,hsl(var(--secondary)/0.5))] p-3 pb-24 sm:p-5 lg:p-8">
        <div className="mx-auto max-w-[1180px] space-y-6">
          <section className="rounded-lg border border-border/70 bg-card/95 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <Badge variant="outline" className="mb-2 border-primary/20 bg-primary/5 text-primary">
                    <Sparkles className="mr-1 h-3 w-3" />
                    AI coach
                  </Badge>
                  <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    Profile Optimizer
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Sharpen your visible profile details, review the AI edits, and apply only the parts you like.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:items-center">
                <Button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || isApplying || !profile}
                  size="lg"
                  className="shadow-sm sm:min-w-[180px]"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : result ? (
                    <RefreshCw className="h-5 w-5" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                  {isAnalyzing ? "Analyzing" : result ? "Run New Analysis" : "Analyze Profile"}
                </Button>
              </div>
            </div>
          </section>

          {!result && !isAnalyzing && (
            <Card className="border-dashed border-primary/25 bg-card/85">
              <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_280px] md:items-center">
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Ready for a profile tune-up?</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    The optimizer scores your profile, spots weak areas, and drafts better public-facing fields.
                  </p>
                </div>
                <div className="grid gap-3 text-sm">
                  {["Profile score", "Better bio", "Prompt rewrites"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {isAnalyzing && (
            <Card className="overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center p-10 text-center sm:p-14">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <h2 className="text-xl font-bold">Analyzing your profile</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Scoring strengths, finding missing details, and preparing profile-ready edits.
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
              <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                <Card className="overflow-hidden">
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase text-muted-foreground">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Profile Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <div className="mb-4 flex items-end gap-2">
                      <span className="text-5xl font-bold tracking-tight text-primary">{result.profile_score}</span>
                      <span className="pb-1 text-lg text-muted-foreground">/ 100</span>
                    </div>
                    <Progress value={result.profile_score} className="h-2" />
                    <div className="mt-4 rounded-lg border border-emerald-200/80 bg-emerald-50/80 p-3 text-sm leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
                      <span className="font-bold">Potential boost:</span> {result.match_boost_estimate || "More complete profile signals"}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <ListChecks className="h-4 w-4 text-primary" />
                      Apply Queue
                    </CardTitle>
                    <CardDescription>
                      {availableFieldKeys.length - unappliedFieldKeys.length} of {availableFieldKeys.length} fields applied
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5 pt-0">
                    <Progress
                      value={availableFieldKeys.length ? ((availableFieldKeys.length - unappliedFieldKeys.length) / availableFieldKeys.length) * 100 : 0}
                      className="h-2"
                    />
                    <Button
                      type="button"
                      className="w-full"
                      size="lg"
                      onClick={() => handleApplyFields(unappliedFieldKeys, "all")}
                      disabled={isApplying || unappliedFieldKeys.length === 0}
                    >
                      {applyingAll ? <Loader2 className="h-5 w-5 animate-spin" /> : <SaveAll className="h-5 w-5" />}
                      {applyingAll ? "Applying All" : unappliedFieldKeys.length === 0 ? "All Applied" : "Apply All Improvements"}
                    </Button>
                  </CardContent>
                </Card>

                {result.missing_fields?.length > 0 && (
                  <InsightList
                    title="Missing Info"
                    icon={<AlertCircle className="h-4 w-4" />}
                    items={result.missing_fields}
                    tone="amber"
                  />
                )}
              </aside>

              <main className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <InsightList
                    title="Strengths"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    items={result.strengths || []}
                    tone="green"
                  />
                  <InsightList
                    title="Weaknesses"
                    icon={<XCircle className="h-4 w-4" />}
                    items={result.weaknesses || []}
                    tone="red"
                  />
                </div>

                <InsightList
                  title="Actionable Suggestions"
                  icon={<Sparkles className="h-4 w-4 text-primary" />}
                  items={result.suggestions || []}
                  tone="neutral"
                />

                <section className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/95 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2 border-primary/20 bg-primary/5 text-primary">
                        Recommended edits
                      </Badge>
                      <h2 className="font-serif text-2xl font-bold">AI Optimization Results</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Compare each profile field before applying it to your public profile.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleApplyFields(unappliedFieldKeys, "all")}
                      disabled={isApplying || unappliedFieldKeys.length === 0}
                      className="sm:min-w-[190px]"
                    >
                      {applyingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveAll className="h-4 w-4" />}
                      {applyingAll ? "Applying All" : unappliedFieldKeys.length === 0 ? "All Applied" : "Apply All"}
                    </Button>
                  </div>

                  {hasText(result.improved_bio) && (
                    <OptimizationFieldCard
                      title="Bio"
                      current={<TextValue muted>{profile?.bio || <span className="text-muted-foreground">Not added</span>}</TextValue>}
                      suggested={<TextValue>{result.improved_bio}</TextValue>}
                      applied={isFieldApplied("bio")}
                      applying={applyingTarget === "bio"}
                      disabled={isApplying}
                      onApply={() => handleApplyFields(["bio"], "bio")}
                    />
                  )}

                  {hasText(result.improved_profession) && (
                    <OptimizationFieldCard
                      title="Profession"
                      current={<TextValue muted>{profile?.profession || <span className="text-muted-foreground">Not added</span>}</TextValue>}
                      suggested={<TextValue>{result.improved_profession}</TextValue>}
                      applied={isFieldApplied("profession")}
                      applying={applyingTarget === "profession"}
                      disabled={isApplying}
                      onApply={() => handleApplyFields(["profession"], "profession")}
                    />
                  )}

                  {toStringList(result.improved_hobbies).length > 0 && (
                    <OptimizationFieldCard
                      title="Hobbies"
                      current={<ListValue muted items={toStringList(profile?.hobbies)} />}
                      suggested={<ListValue items={toStringList(result.improved_hobbies)} />}
                      applied={isFieldApplied("hobbies")}
                      applying={applyingTarget === "hobbies"}
                      disabled={isApplying}
                      onApply={() => handleApplyFields(["hobbies"], "hobbies")}
                    />
                  )}

                  {hasText(result.improved_habits) && (
                    <OptimizationFieldCard
                      title="Habits"
                      current={<TextValue muted>{profile?.habits || <span className="text-muted-foreground">Not added</span>}</TextValue>}
                      suggested={<TextValue>{result.improved_habits}</TextValue>}
                      applied={isFieldApplied("habits")}
                      applying={applyingTarget === "habits"}
                      disabled={isApplying}
                      onApply={() => handleApplyFields(["habits"], "habits")}
                    />
                  )}

                  {promptEntries.map(([question, answer]) => {
                    const fieldKey = `${PROMPT_PREFIX}${question}` as OptimizableFieldKey;

                    return (
                      <OptimizationFieldCard
                        key={fieldKey}
                        title="Prompt"
                        subtitle={question}
                        current={<TextValue muted>{profile?.prompts?.[question] || <span className="text-muted-foreground">Not added</span>}</TextValue>}
                        suggested={<TextValue>{answer}</TextValue>}
                        applied={isFieldApplied(fieldKey)}
                        applying={applyingTarget === fieldKey}
                        disabled={isApplying}
                        onApply={() => handleApplyFields([fieldKey], fieldKey)}
                      />
                    );
                  })}
                </section>
              </main>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
