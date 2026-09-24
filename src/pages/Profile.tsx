import { useState, useEffect, useMemo, useRef } from "react";
import { BlockedUsersList } from "@/components/BlockedUsersList";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { AuthSplitLayout } from "@/components/AuthSplitLayout";
import type { Profile as MemberProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  HeartHandshake,
  Info,
  Loader2,
  LockKeyhole,
  MapPin,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCircle,
  X,
} from "lucide-react";
import { generateEmbedding, buildProfileEmbeddingDocument } from "@/lib/ai";
import { getProfileCompletion } from "@/lib/profileJourney";
import { cn } from "@/lib/utils";

import { RASHI_LIST, NAKSHATRA_LIST, MANGLIK_OPTIONS } from "@/lib/horoscope";

interface ProfilePageProps {
  mode: "create" | "edit";
}

const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Spiritual", "Other"];
const GENDERS = ["male", "female", "other"];
const FITNESS_LEVELS = ["Any", "Casual", "Active", "Very Active"];
const SMOKING_OPTIONS = ["Doesn't Matter", "No", "Occasionally", "Yes"];
const DRINKING_OPTIONS = ["Doesn't Matter", "No", "Occasionally", "Yes"];
const CHILDREN_OPTIONS = ["Doesn't Matter", "Wants Children", "Doesn't Want Children", "Open to Either"];
const MARITAL_STATUS_OPTIONS = ["Any", "Never Married", "Divorced", "Widowed", "Separated"];

type ProfileFormState = {
  name: string;
  age: string;
  gender: string;
  religion: string;
  city: string;
  education: string;
  profession: string;
  bio: string;
  avatar_url: string;
  languages: string[];
  ethnicity: string;
  willing_to_relocate: boolean;

  // Horoscope & Kundli Details (Own)
  rashi: string;
  nakshatra: string;
  manglik_status: string;
  birth_place: string;
  birth_time: string;
  gotra: string;
  horoscope_url: string;

  introvert_extrovert: number;
  hobbies: string[];
  habits: string;
  social_preferences: string;
  career_ambition: string;
  family_goals: string;
  lifestyle_choices: string;
  height: string;
  fitness_level: string;
  style: string;
  skin_tone: string;
  search_intent: string;
  weight: string;
  prompts: Record<string, string>;
  voice_url: string;
  video_url: string;

  // Social Presence
  instagram_url: string;
  facebook_url: string;
  linkedin_url: string;
  twitter_url: string;
  other_social_url: string;

  // Partner Preferences
  partner_age_min: string;
  partner_age_max: string;
  partner_religion: string;
  partner_religion_strict: boolean;
  partner_city: string;
  partner_willing_to_relocate: boolean | null;
  partner_education: string;
  partner_profession: string;
  partner_height_min: string;
  partner_height_max: string;
  partner_fitness_level: string;
  partner_languages: string[];
  partner_lifestyle: string;
  partner_family_goals: string;
  partner_career_ambition: string;
  partner_hobbies: string[];
  partner_smoking: string;
  partner_drinking: string;
  partner_children_preference: string;
  partner_marital_status: string;
  partner_must_have: string[];
  partner_deal_breakers: string[];

  // Partner Horoscope Preferences
  partner_horoscope_required: boolean;
  partner_manglik: string;
  partner_rashi: string[];
  partner_nakshatra: string[];
};

export default function ProfilePage({ mode }: ProfilePageProps) {
  const navigate = useNavigate();
  const { currentUser, profile, refetchProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input states for tag arrays
  const [mustHaveInput, setMustHaveInput] = useState("");
  const [dealBreakerInput, setDealBreakerInput] = useState("");

  const [form, setForm] = useState<ProfileFormState>({
    name: "",
    age: "",
    gender: "",
    religion: "",
    city: "",
    education: "",
    profession: "",
    bio: "",
    avatar_url: "",
    languages: [] as string[],
    ethnicity: "",
    willing_to_relocate: false,

    // Horoscope & Kundli Details (Own)
    rashi: "",
    nakshatra: "",
    manglik_status: "dont_know",
    birth_place: "",
    birth_time: "",
    gotra: "",
    horoscope_url: "",

    introvert_extrovert: 5,
    hobbies: [] as string[],
    habits: "",
    social_preferences: "",
    career_ambition: "",
    family_goals: "",
    lifestyle_choices: "",
    height: "",
    fitness_level: "",
    style: "",
    skin_tone: "",
    search_intent: "",
    weight: "",
    prompts: {} as Record<string, string>,
    voice_url: "",
    video_url: "",

    // Social Presence
    instagram_url: "",
    facebook_url: "",
    linkedin_url: "",
    twitter_url: "",
    other_social_url: "",

    // Partner Preferences
    partner_age_min: "",
    partner_age_max: "",
    partner_religion: "",
    partner_religion_strict: false,
    partner_city: "",
    partner_willing_to_relocate: null,
    partner_education: "",
    partner_profession: "",
    partner_height_min: "",
    partner_height_max: "",
    partner_fitness_level: "",
    partner_languages: [] as string[],
    partner_lifestyle: "",
    partner_family_goals: "",
    partner_career_ambition: "",
    partner_hobbies: [] as string[],
    partner_smoking: "",
    partner_drinking: "",
    partner_children_preference: "",
    partner_marital_status: "",
    partner_must_have: [] as string[],
    partner_deal_breakers: [] as string[],

    // Partner Horoscope Preferences
    partner_horoscope_required: false,
    partner_manglik: "any",
    partner_rashi: [] as string[],
    partner_nakshatra: [] as string[],
  });

  useEffect(() => {
    if (mode === "edit" && profile) {
      const nextForm: ProfileFormState = {
        name: profile.name || "",
        age: profile.age?.toString() || "",
        gender: profile.gender || "",
        religion: profile.religion || "",
        city: profile.city || "",
        education: profile.education || "",
        profession: profile.profession || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
        languages: profile.languages || [],
        ethnicity: profile.ethnicity || "",
        willing_to_relocate: profile.willing_to_relocate || false,

        // Horoscope & Kundli Details (Own)
        rashi: profile.rashi || "",
        nakshatra: profile.nakshatra || "",
        manglik_status: profile.manglik_status || "dont_know",
        birth_place: profile.birth_place || "",
        birth_time: profile.birth_time || "",
        gotra: profile.gotra || "",
        horoscope_url: profile.horoscope_url || "",

        introvert_extrovert: profile.introvert_extrovert || 5,
        hobbies: profile.hobbies || [],
        habits: profile.habits || "",
        social_preferences: profile.social_preferences || "",
        career_ambition: profile.career_ambition || "",
        family_goals: profile.family_goals || "",
        lifestyle_choices: profile.lifestyle_choices || "",
        height: profile.height?.toString() || "",
        fitness_level: profile.fitness_level || "",
        style: profile.style || "",
        skin_tone: profile.skin_tone || "",
        search_intent: profile.search_intent || "",
        weight: profile.weight?.toString() || "",
        prompts: profile.prompts || {},
        voice_url: profile.voice_url || "",
        video_url: profile.video_url || "",

        // Social Presence
        instagram_url: profile.instagram_url || "",
        facebook_url: profile.facebook_url || "",
        linkedin_url: profile.linkedin_url || "",
        twitter_url: profile.twitter_url || "",
        other_social_url: profile.other_social_url || "",

        // Partner Preferences
        partner_age_min: profile.partner_age_min?.toString() || "",
        partner_age_max: profile.partner_age_max?.toString() || "",
        partner_religion: profile.partner_religion || "",
        partner_religion_strict: Boolean(profile.partner_religion_strict),
        partner_city: profile.partner_city || "",
        partner_willing_to_relocate: profile.partner_willing_to_relocate ?? null,
        partner_education: profile.partner_education || "",
        partner_profession: profile.partner_profession || "",
        partner_height_min: profile.partner_height_min?.toString() || "",
        partner_height_max: profile.partner_height_max?.toString() || "",
        partner_fitness_level: profile.partner_fitness_level || "",
        partner_languages: profile.partner_languages || [],
        partner_lifestyle: profile.partner_lifestyle || "",
        partner_family_goals: profile.partner_family_goals || "",
        partner_career_ambition: profile.partner_career_ambition || "",
        partner_hobbies: profile.partner_hobbies || [],
        partner_smoking: profile.partner_smoking || "",
        partner_drinking: profile.partner_drinking || "",
        partner_children_preference: profile.partner_children_preference || "",
        partner_marital_status: profile.partner_marital_status || "",
        partner_must_have: profile.partner_must_have || [],
        partner_deal_breakers: profile.partner_deal_breakers || [],

        // Partner Horoscope Preferences
        partner_horoscope_required: Boolean(profile.partner_horoscope_required),
        partner_manglik: profile.partner_manglik || "any",
        partner_rashi: profile.partner_rashi || [],
        partner_nakshatra: profile.partner_nakshatra || [],
      };

      const timeoutId = window.setTimeout(() => {
        setForm(nextForm);
        if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [mode, profile]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Photo must be under 5MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${currentUser.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Photo upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setAvatarPreview(profile?.avatar_url || null);
      setUploadingPhoto(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(filePath);

    const cleanUrl = urlData.publicUrl;
    const previewUrl = `${cleanUrl}?t=${Date.now()}`;
    setAvatarPreview(previewUrl);
    setForm((prev) => ({ ...prev, avatar_url: cleanUrl }));
    toast({ title: "Photo uploaded!" });
    setUploadingPhoto(false);
  };

  const handleClearHoroscopeDetails = () => {
    setForm((prev) => ({
      ...prev,
      rashi: "",
      nakshatra: "",
      manglik_status: "dont_know",
      gotra: "",
      birth_place: "",
      birth_time: "",
      horoscope_url: "",
    }));
    toast({
      title: "Horoscope details cleared",
      description: "Astrological fields have been reset.",
    });
  };

  const handleAddMustHave = () => {
    const text = mustHaveInput.trim();
    if (text && !form.partner_must_have.includes(text)) {
      setForm((prev) => ({ ...prev, partner_must_have: [...prev.partner_must_have, text] }));
      setMustHaveInput("");
    }
  };

  const handleRemoveMustHave = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      partner_must_have: prev.partner_must_have.filter((t) => t !== tag),
    }));
  };

  const handleAddDealBreaker = () => {
    const text = dealBreakerInput.trim();
    if (text && !form.partner_deal_breakers.includes(text)) {
      setForm((prev) => ({ ...prev, partner_deal_breakers: [...prev.partner_deal_breakers, text] }));
      setDealBreakerInput("");
    }
  };

  const handleRemoveDealBreaker = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      partner_deal_breakers: prev.partner_deal_breakers.filter((t) => t !== tag),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!form.name || !form.age || !form.gender || !form.religion || !form.city) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    // Validation for age and height bounds
    const pAgeMinNum = form.partner_age_min ? parseInt(form.partner_age_min) : null;
    const pAgeMaxNum = form.partner_age_max ? parseInt(form.partner_age_max) : null;
    if (pAgeMinNum && pAgeMaxNum && pAgeMinNum > pAgeMaxNum) {
      toast({ title: "Partner minimum age cannot exceed maximum age", variant: "destructive" });
      return;
    }

    const pHeightMinNum = form.partner_height_min ? parseInt(form.partner_height_min) : null;
    const pHeightMaxNum = form.partner_height_max ? parseInt(form.partner_height_max) : null;
    if (pHeightMinNum && pHeightMaxNum && pHeightMinNum > pHeightMaxNum) {
      toast({ title: "Partner minimum height cannot exceed maximum height", variant: "destructive" });
      return;
    }

    setLoading(true);

    const coreData: Record<string, unknown> = {
      id: currentUser.id,
      name: form.name,
      age: parseInt(form.age),
      gender: form.gender as "male" | "female" | "other",
      religion: form.religion,
      city: form.city,
      education: form.education || null,
      profession: form.profession || null,
      bio: form.bio || null,
      avatar_url: form.avatar_url || null,
      languages: form.languages,
      ethnicity: form.ethnicity || null,
      willing_to_relocate: form.willing_to_relocate,
      introvert_extrovert: form.introvert_extrovert,
      hobbies: form.hobbies,
      habits: form.habits || null,
      social_preferences: form.social_preferences || null,
      career_ambition: form.career_ambition || null,
      family_goals: form.family_goals || null,
      lifestyle_choices: form.lifestyle_choices || null,
      height: form.height ? parseInt(form.height) : null,
      fitness_level: form.fitness_level || null,
      style: form.style || null,
      skin_tone: form.skin_tone || null,
      search_intent: form.search_intent || null,
      weight: form.weight ? parseInt(form.weight) : null,
      prompts: form.prompts,
      voice_url: form.voice_url || null,
      video_url: form.video_url || null,

      // Social Presence
      instagram_url: form.instagram_url || null,
      facebook_url: form.facebook_url || null,
      linkedin_url: form.linkedin_url || null,
      twitter_url: form.twitter_url || null,
      other_social_url: form.other_social_url || null,

      // Own Horoscope Details
      rashi: form.rashi || null,
      nakshatra: form.nakshatra || null,
      manglik_status: form.manglik_status || null,
      birth_place: form.birth_place || null,
      birth_time: form.birth_time || null,
      gotra: form.gotra || null,
      horoscope_url: form.horoscope_url || null,
      horoscope_available: Boolean(form.rashi || form.nakshatra || (form.manglik_status && form.manglik_status !== 'dont_know') || (form.birth_time && form.birth_place)),

      // Partner Preferences
      partner_age_min: pAgeMinNum,
      partner_age_max: pAgeMaxNum,
      partner_religion: form.partner_religion || null,
      partner_religion_strict: form.partner_religion_strict,
      partner_city: form.partner_city || null,
      partner_willing_to_relocate: form.partner_willing_to_relocate,
      partner_education: form.partner_education || null,
      partner_profession: form.partner_profession || null,
      partner_height_min: pHeightMinNum,
      partner_height_max: pHeightMaxNum,
      partner_fitness_level: form.partner_fitness_level || null,
      partner_languages: form.partner_languages,
      partner_lifestyle: form.partner_lifestyle || null,
      partner_family_goals: form.partner_family_goals || null,
      partner_career_ambition: form.partner_career_ambition || null,
      partner_hobbies: form.partner_hobbies,
      partner_smoking: form.partner_smoking || null,
      partner_drinking: form.partner_drinking || null,
      partner_children_preference: form.partner_children_preference || null,
      partner_marital_status: form.partner_marital_status || null,
      partner_must_have: form.partner_must_have,
      partner_deal_breakers: form.partner_deal_breakers,

      // Partner Horoscope Preferences
      partner_horoscope_required: form.partner_horoscope_required,
      partner_manglik: form.partner_manglik || "any",
      partner_rashi: form.partner_rashi,
      partner_nakshatra: form.partner_nakshatra,

      role: profile?.role || "user",
      is_blocked: profile?.is_blocked || false,
    };

    try {
      // Create rich two-dimensional document for embedding
      const embeddingDocument = buildProfileEmbeddingDocument(coreData);
      const embedding = await generateEmbedding(embeddingDocument, { billable: false, featureName: "profile_embedding" });
      if (embedding) {
        coreData.embedding = `[${embedding.join(",")}]`;
        coreData.needs_embedding = false;
      }
    } catch (embErr) {
      console.error("Failed to generate embedding during profile save:", embErr);
      coreData.needs_embedding = true;
    }

    const { error: coreError } = await supabase.from("profiles").upsert(coreData);
    if (coreError) {
      toast({ title: "Error saving profile", description: coreError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    await refetchProfile();
    toast({ title: mode === "create" ? "Profile created!" : "Profile updated!" });
    navigate("/browse");
    setLoading(false);
  };

  const handleRemovePhoto = () => {
    setAvatarPreview(null);
    setForm((prev) => ({ ...prev, avatar_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const completionProfile = useMemo(
    () => ({
      id: currentUser?.id || "profile-preview",
      name: form.name,
      age: Number(form.age) || 0,
      gender: (form.gender || "other") as MemberProfile["gender"],
      religion: form.religion,
      city: form.city,
      education: form.education,
      profession: form.profession,
      bio: form.bio,
      role: profile?.role || "user",
      is_blocked: profile?.is_blocked || false,
      avatar_url: form.avatar_url,
      languages: form.languages,
      ethnicity: form.ethnicity,
      willing_to_relocate: form.willing_to_relocate,
      rashi: form.rashi || undefined,
      nakshatra: form.nakshatra || undefined,
      manglik_status: form.manglik_status || undefined,
      birth_place: form.birth_place || undefined,
      birth_time: form.birth_time || undefined,
      gotra: form.gotra || undefined,
      horoscope_url: form.horoscope_url || undefined,
      horoscope_available: Boolean(
        form.rashi ||
        form.nakshatra ||
        (form.manglik_status && form.manglik_status !== "dont_know") ||
        (form.birth_time && form.birth_place) ||
        form.horoscope_url
      ),
      introvert_extrovert: form.introvert_extrovert,
      hobbies: form.hobbies,
      habits: form.habits,
      social_preferences: form.social_preferences,
      career_ambition: form.career_ambition,
      family_goals: form.family_goals,
      lifestyle_choices: form.lifestyle_choices,
      height: form.height ? Number(form.height) : undefined,
      fitness_level: form.fitness_level,
      style: form.style,
      skin_tone: form.skin_tone,
      search_intent: form.search_intent,
      prompts: form.prompts,
      voice_url: form.voice_url,
      video_url: form.video_url,
      weight: form.weight ? Number(form.weight) : undefined,
      created_at: profile?.created_at || new Date().toISOString(),
      updated_at: profile?.updated_at,
    }) as MemberProfile,
    [currentUser?.id, form, profile]
  );
  const profileCompletion = getProfileCompletion(completionProfile);

  const steps = useMemo(
    () => [
      { id: "profile-basics", step: 1, label: "Essentials", shortLabel: "Essentials", icon: UserCircle, description: "Your public identity, photo, and must-have match details." },
      { id: "background", step: 2, label: "Background & Horoscope", shortLabel: "Background", icon: ShieldCheck, description: "Culture, education, horoscope & kundli, and relocation details." },
      { id: "lifestyle", step: 3, label: "Lifestyle", shortLabel: "Lifestyle", icon: Sparkles, description: "Personality, interests, appearance, and daily rhythm." },
      { id: "preferences", step: 4, label: "Goals & Intent", shortLabel: "Goals", icon: HeartHandshake, description: "Values, family goals, and what you are looking for." },
      { id: "social-presence", step: 5, label: "Social Presence", shortLabel: "Social", icon: Globe, description: "Optional public social profile links." },
      { id: "partner-preferences", step: 6, label: "Partner Preferences", shortLabel: "Partner", icon: SlidersHorizontal, description: "Ideal partner criteria and deal-breakers." },
      { id: "media", step: 7, label: "Story & Prompts", shortLabel: "Story", icon: BookOpen, description: "Bio, voice/video intro, and personality prompts." },
      ...(mode === "edit" ? [{ id: "privacy", step: 8, label: "Privacy", shortLabel: "Privacy", icon: LockKeyhole, description: "Manage accounts you have blocked." }] : []),
    ],
    [mode]
  );

  const currentStep = steps[currentStepIndex] || steps[0];

  const handleStepChange = (index: number) => {
    if (index < 0 || index >= steps.length) return;
    setCurrentStepIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep = () => {
    if (currentStepIndex === 0) {
      if (!form.name || !form.age || !form.gender || !form.religion || !form.city) {
        toast({
          title: "Required Fields Missing",
          description: "Please fill Name, Age, Gender, Religion, and City in Essentials before proceeding.",
          variant: "destructive",
        });
        return;
      }
    }
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const displayName = form.name || "You";
  const isCreateMode = mode === "create";

  const content = (
    <div
      className={cn(
        "min-h-full",
        isCreateMode
          ? "bg-transparent p-0"
          : "bg-[radial-gradient(circle_at_16%_0%,hsl(var(--primary)/0.12),transparent_28%),linear-gradient(135deg,hsl(var(--secondary)/0.54),hsl(var(--background))_58%,hsl(var(--accent)/0.22))] p-3 pb-24 dark:bg-[radial-gradient(circle_at_16%_0%,hsl(var(--primary)/0.18),transparent_28%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card))_60%,hsl(var(--accent)/0.12))] sm:p-4 sm:pb-24 lg:pb-4"
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-4 lg:items-start",
          isCreateMode ? "max-w-none" : "max-w-[1180px] lg:flex-row"
        )}
      >
        <aside className={cn("hidden w-[268px] shrink-0 overflow-hidden rounded-[24px] border border-border/70 bg-card/95 shadow-sm lg:sticky lg:top-4 lg:block", isCreateMode && "lg:hidden")}>
          <div className="border-b border-border/70 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Account settings</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{mode === "create" ? "Create profile" : "Profile studio"}</h2>
          </div>
          <div className="border-b border-border/70 p-4">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-primary/10">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-2xl font-bold text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{form.profession || "Profession not added"}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Profile strength</span>
                <span className="font-bold text-primary">{profileCompletion}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${profileCompletion}%` }} />
              </div>
            </div>
          </div>
          <nav className="space-y-1 p-3">
            {steps.map(({ id, step, label }, idx) => {
              const isCurrent = currentStepIndex === idx;
              const isPassed = currentStepIndex > idx;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleStepChange(idx)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isPassed
                      ? "text-primary hover:bg-primary/10"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      isCurrent
                        ? "bg-primary-foreground text-primary"
                        : isPassed
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isPassed ? <Check className="h-3 w-3" /> : step}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <form
          id="profile-form"
          onSubmit={handleSubmit}
          className={cn(
            "min-w-0 flex-1 overflow-hidden",
            isCreateMode
              ? "w-full rounded-none border-0 bg-transparent shadow-none"
              : "rounded-[24px] border border-border/70 bg-card/90 shadow-sm"
          )}
        >
          {!isCreateMode && (
            <div className="flex flex-col gap-4 border-b border-border/70 bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--accent)/0.54))] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Vivaah Vedika profile</p>
                <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
                  Shape your best first impression
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Complete each step at your own pace or navigate using the wizard pills below.
                </p>
              </div>
              <div className="hidden gap-2 sm:flex">
                <div className="mr-2 hidden items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground lg:flex">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {profileCompletion}% complete
                </div>
                <Button type="button" variant="outline" onClick={() => navigate("/browse")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || uploadingPhoto}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Progress"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEPPER PROGRESS HEADER */}
          <div className="border-b border-border/70 bg-gradient-to-r from-card via-card to-primary/5 px-5 py-4 sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 items-center justify-center rounded-full bg-primary/10 px-3 text-xs font-bold text-primary">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
                <h2 className="text-lg font-bold text-foreground">{currentStep.label}</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% Completed</span>
                <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stepper Pills Navigation */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {steps.map((s, idx) => {
                const isCurrent = currentStepIndex === idx;
                const isPassed = currentStepIndex > idx;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStepChange(idx)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                        : isPassed
                        ? "bg-primary/15 text-primary hover:bg-primary/25"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        isCurrent
                          ? "bg-primary-foreground text-primary"
                          : isPassed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isPassed ? <Check className="h-3 w-3" /> : s.step}
                    </span>
                    <span>{s.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 1: ESSENTIALS */}
          <section id="profile-basics" className={cn("scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7", currentStepIndex !== 0 && "hidden")}>
            <div className="grid gap-7 xl:grid-cols-[220px_1fr]">
              <div>
                <h2 className="text-base font-bold text-foreground">Essentials</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Your public identity, photo, and must-have match details.</p>
              </div>

              <div className="space-y-6">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <div className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-background/55 p-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="group relative h-28 w-28 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-32 sm:w-32"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={displayName} className="h-full w-full rounded-full border-4 border-primary/20 object-cover shadow-lg" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-primary/30 bg-primary/5 font-serif text-5xl font-bold text-primary">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={cn("absolute inset-0 flex flex-col items-center justify-center rounded-full transition-opacity", uploadingPhoto ? "bg-black/50 opacity-100" : "bg-black/0 opacity-0 group-hover:bg-black/45 group-hover:opacity-100")}>
                      {uploadingPhoto ? (
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      ) : (
                        <>
                          <Camera className="mb-1 h-6 w-6 text-white" />
                          <span className="text-xs font-medium text-white">Change</span>
                        </>
                      )}
                    </div>
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground">{displayName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">JPG, PNG or WebP. Max 5 MB.</p>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate">{form.city || "City"}</span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                        <Briefcase className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate">{form.profession || "Profession"}</span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate">{form.religion || "Faith"}</span>
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
                        Upload New
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={handleRemovePhoto} disabled={uploadingPhoto || (!avatarPreview && !form.avatar_url)}>
                        Delete avatar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age *</Label>
                    <Input id="age" type="number" min={18} max={100} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => <SelectItem key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Religion *</Label>
                    <Select value={form.religion} onValueChange={(v) => setForm({ ...form, religion: v })}>
                      <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
                      <SelectContent>
                        {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Hyderabad" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profession</Label>
                    <Input id="profession" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} placeholder="e.g. Software Engineer" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: BACKGROUND */}
          <section id="background" className={cn("scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7", currentStepIndex !== 1 && "hidden")}>
            <div className="grid gap-7 xl:grid-cols-[220px_1fr]">
              <div>
                <h2 className="text-base font-bold text-foreground">Background</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Culture, education, language, and relocation details.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Input id="education" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} placeholder="e.g. B.Tech, MBA" />
                </div>
                <div className="space-y-2">
                  <Label>Languages Spoken</Label>
                  <Input value={form.languages.join(", ")} onChange={(e) => setForm({ ...form, languages: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="English, Hindi, Telugu" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Ethnicity / Cultural Background</Label>
                  <Input value={form.ethnicity} onChange={(e) => setForm({ ...form, ethnicity: e.target.value })} placeholder="Optional" />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/55 px-4 py-3 sm:col-span-2">
                  <input type="checkbox" checked={form.willing_to_relocate} onChange={(e) => setForm({ ...form, willing_to_relocate: e.target.checked })} className="h-4 w-4 rounded border-border text-primary accent-primary" />
                  <span className="text-sm font-medium text-foreground">Willing to relocate for the right match</span>
                </label>

                {/* Horoscope & Kundli Section */}
                <div className="sm:col-span-2 mt-4 pt-6 border-t border-border/70 space-y-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Horoscope & Kundli Details</h3>
                        <p className="text-xs text-muted-foreground">Add or update your birth chart, rashi, nakshatra, and kundli document</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {Boolean(form.rashi || form.nakshatra || form.horoscope_url || form.birth_place || (form.manglik_status && form.manglik_status !== "dont_know")) ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            <Check className="h-3 w-3" />
                            Horoscope Active
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearHoroscopeDetails}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            title="Reset all horoscope fields"
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Clear
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Optional
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Structured Astrology Fields */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Rashi (Moon Sign)</Label>
                      <Select
                        value={form.rashi || "none"}
                        onValueChange={(v) => setForm({ ...form, rashi: v === "none" ? "" : v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/70">
                          <SelectValue placeholder="Select Rashi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          {RASHI_LIST.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nakshatra (Birth Star)</Label>
                      <Select
                        value={form.nakshatra || "none"}
                        onValueChange={(v) => setForm({ ...form, nakshatra: v === "none" ? "" : v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/70">
                          <SelectValue placeholder="Select Nakshatra" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          {NAKSHATRA_LIST.map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Manglik Status</Label>
                      <Select
                        value={form.manglik_status || "dont_know"}
                        onValueChange={(v) => setForm({ ...form, manglik_status: v })}
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/70">
                          <SelectValue placeholder="Select Manglik Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {MANGLIK_OPTIONS.filter(o => o.value !== "any").map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Gotra</Label>
                      <Input
                        value={form.gotra}
                        onChange={(e) => setForm({ ...form, gotra: e.target.value })}
                        placeholder="e.g. Kashyapa, Bharadwaja, Vatsa"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Birth Place</Label>
                      <Input
                        value={form.birth_place}
                        onChange={(e) => setForm({ ...form, birth_place: e.target.value })}
                        placeholder="e.g. Varanasi, Uttar Pradesh"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Birth Time (Optional)</Label>
                      <Input
                        type="time"
                        value={form.birth_time}
                        onChange={(e) => setForm({ ...form, birth_time: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: LIFESTYLE */}
          <section id="lifestyle" className={cn("scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7", currentStepIndex !== 2 && "hidden")}>
            <div className="grid gap-7 xl:grid-cols-[220px_1fr]">
              <div>
                <h2 className="text-base font-bold text-foreground">Lifestyle</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Personality, interests, appearance, and daily rhythm.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex justify-between">
                    <Label>Introvert vs Extrovert</Label>
                    <span className="text-xs text-muted-foreground">{form.introvert_extrovert <= 3 ? "Introvert" : form.introvert_extrovert >= 8 ? "Extrovert" : "Balanced"}</span>
                  </div>
                  <input type="range" min="1" max="10" step="1" value={form.introvert_extrovert} onChange={(e) => setForm({ ...form, introvert_extrovert: parseInt(e.target.value) })} className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Hobbies & Interests</Label>
                  <Input value={form.hobbies.join(", ")} onChange={(e) => setForm({ ...form, hobbies: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="Reading, Travelling, Fitness" />
                </div>
                <div className="space-y-2">
                  <Label>Daily Habits</Label>
                  <Input value={form.habits} onChange={(e) => setForm({ ...form, habits: e.target.value })} placeholder="e.g. Early riser, Gym regular" />
                </div>
                <div className="space-y-2">
                  <Label>Social Preferences</Label>
                  <Input value={form.social_preferences} onChange={(e) => setForm({ ...form, social_preferences: e.target.value })} placeholder="e.g. Calm evenings, Family dinners" />
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder="e.g. 175" />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 70" />
                </div>
                <div className="space-y-2">
                  <Label>Fitness Level</Label>
                  <Input value={form.fitness_level} onChange={(e) => setForm({ ...form, fitness_level: e.target.value })} placeholder="e.g. Athletic, Active, Moderate" />
                </div>
                <div className="space-y-2">
                  <Label>Personal Style</Label>
                  <Input value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} placeholder="e.g. Smart casual, Formal" />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: GOALS */}
          <section id="preferences" className={cn("scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7", currentStepIndex !== 3 && "hidden")}>
            <div className="grid gap-7 xl:grid-cols-[220px_1fr]">
              <div>
                <h2 className="text-base font-bold text-foreground">Goals</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Values, family goals, and what you are looking for.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Career Ambition Level</Label>
                  <Select value={form.career_ambition} onValueChange={(v) => setForm({ ...form, career_ambition: v })}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">Very Ambitious / Career Focused</SelectItem>
                      <SelectItem value="Moderate">Balanced / Moderate</SelectItem>
                      <SelectItem value="Low">Relaxed / Not a priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Family Goals</Label>
                  <Input value={form.family_goals} onChange={(e) => setForm({ ...form, family_goals: e.target.value })} placeholder="e.g. Wants a close family & children" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Lifestyle Choices</Label>
                  <Input value={form.lifestyle_choices} onChange={(e) => setForm({ ...form, lifestyle_choices: e.target.value })} placeholder="e.g. Non-smoker, Social drinker" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>What are you looking for in a partner?</Label>
                  <Textarea value={form.search_intent || ""} onChange={(e) => setForm({ ...form, search_intent: e.target.value })} placeholder="I am looking for someone who is family-oriented and respectful..." className="min-h-[100px]" />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 5: SOCIAL PRESENCE */}
          <section id="social-presence" className={cn("scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7", currentStepIndex !== 4 && "hidden")}>
            <div className="grid gap-7 xl:grid-cols-[220px_1fr]">
              <div>
                <h2 className="text-base font-bold text-foreground">Social Presence</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Optional public social profile links to help others learn more about you.</p>
              </div>
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <p>
                    Your social links are optional and can help other users learn more about you. Only add profiles you are comfortable sharing publicly.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="instagram_url">Instagram</Label>
                    <Input
                      id="instagram_url"
                      type="url"
                      value={form.instagram_url}
                      onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                      placeholder="https://instagram.com/username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facebook_url">Facebook</Label>
                    <Input
                      id="facebook_url"
                      type="url"
                      value={form.facebook_url}
                      onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
                      placeholder="https://facebook.com/username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn</Label>
                    <Input
                      id="linkedin_url"
                      type="url"
                      value={form.linkedin_url}
                      onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter_url">X / Twitter</Label>
                    <Input
                      id="twitter_url"
                      type="url"
                      value={form.twitter_url}
                      onChange={(e) => setForm({ ...form, twitter_url: e.target.value })}
                      placeholder="https://x.com/username"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="other_social_url">Other Social Profile</Label>
                    <Input
                      id="other_social_url"
                      type="url"
                      value={form.other_social_url}
                      onChange={(e) => setForm({ ...form, other_social_url: e.target.value })}
                      placeholder="https://yourwebsite.com or custom link"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 6: PARTNER PREFERENCES */}
          <section id="partner-preferences" className={cn("scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7", currentStepIndex !== 5 && "hidden")}>
            <div className="grid gap-7 xl:grid-cols-[220px_1fr]">
              <div>
                <h2 className="text-base font-bold text-foreground">Partner Preferences</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Define what you are looking for in an ideal life partner. Used for hybrid RAG & structured matching.</p>
              </div>
              <div className="space-y-6">

                {/* Age & Religion */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Preferred Age Range</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={18}
                        max={100}
                        placeholder="Min Age"
                        value={form.partner_age_min}
                        onChange={(e) => setForm({ ...form, partner_age_min: e.target.value })}
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="number"
                        min={18}
                        max={100}
                        placeholder="Max Age"
                        value={form.partner_age_max}
                        onChange={(e) => setForm({ ...form, partner_age_max: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Preferred Religion</Label>
                    <Select
                      value={form.partner_religion || "any"}
                      onValueChange={(v) => setForm({ ...form, partner_religion: v === "any" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Any Religion" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Religion</SelectItem>
                        {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.partner_religion_strict}
                        onChange={(e) => setForm({ ...form, partner_religion_strict: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                      />
                      <span>Strict preference (Exclude non-matching religions)</span>
                    </label>
                  </div>
                </div>

                {/* Location & Relocation */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Preferred City</Label>
                    <Input
                      placeholder="e.g. Hyderabad, Bangalore or Any"
                      value={form.partner_city}
                      onChange={(e) => setForm({ ...form, partner_city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Partner Willing to Relocate</Label>
                    <Select
                      value={
                        form.partner_willing_to_relocate === true
                          ? "yes"
                          : form.partner_willing_to_relocate === false
                          ? "no"
                          : "any"
                      }
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          partner_willing_to_relocate: v === "yes" ? true : v === "no" ? false : null,
                        })
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="Doesn't Matter" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Doesn't Matter</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Education, Profession, Career Ambition */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Preferred Education</Label>
                    <Input
                      placeholder="e.g. Graduate, Master's"
                      value={form.partner_education}
                      onChange={(e) => setForm({ ...form, partner_education: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preferred Profession</Label>
                    <Input
                      placeholder="e.g. Engineer, Doctor, Any"
                      value={form.partner_profession}
                      onChange={(e) => setForm({ ...form, partner_profession: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Partner Career Ambition</Label>
                    <Select
                      value={form.partner_career_ambition || "any"}
                      onValueChange={(v) => setForm({ ...form, partner_career_ambition: v === "any" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any / Doesn't Matter</SelectItem>
                        <SelectItem value="High">Very Ambitious / Career Focused</SelectItem>
                        <SelectItem value="Moderate">Balanced / Moderate</SelectItem>
                        <SelectItem value="Low">Relaxed / Family Focused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Height & Fitness */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Preferred Height Range (cm)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min Height"
                        value={form.partner_height_min}
                        onChange={(e) => setForm({ ...form, partner_height_min: e.target.value })}
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="number"
                        placeholder="Max Height"
                        value={form.partner_height_max}
                        onChange={(e) => setForm({ ...form, partner_height_max: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Fitness Level</Label>
                    <Select
                      value={form.partner_fitness_level || "any"}
                      onValueChange={(v) => setForm({ ...form, partner_fitness_level: v === "any" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {FITNESS_LEVELS.map((f) => (
                          <SelectItem key={f} value={f === "Any" ? "any" : f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Lifestyle, Habits, Family & Children */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Smoking</Label>
                    <Select
                      value={form.partner_smoking || "any"}
                      onValueChange={(v) => setForm({ ...form, partner_smoking: v === "any" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Doesn't Matter" /></SelectTrigger>
                      <SelectContent>
                        {SMOKING_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt === "Doesn't Matter" ? "any" : opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Drinking</Label>
                    <Select
                      value={form.partner_drinking || "any"}
                      onValueChange={(v) => setForm({ ...form, partner_drinking: v === "any" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Doesn't Matter" /></SelectTrigger>
                      <SelectContent>
                        {DRINKING_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt === "Doesn't Matter" ? "any" : opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Children</Label>
                    <Select
                      value={form.partner_children_preference || "any"}
                      onValueChange={(v) => setForm({ ...form, partner_children_preference: v === "any" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Doesn't Matter" /></SelectTrigger>
                      <SelectContent>
                        {CHILDREN_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt === "Doesn't Matter" ? "any" : opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Marital Status & Languages */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Marital Status</Label>
                    <Select
                      value={form.partner_marital_status || "any"}
                      onValueChange={(v) => setForm({ ...form, partner_marital_status: v === "any" ? "" : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {MARITAL_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt === "Any" ? "any" : opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Preferred Languages</Label>
                    <Input
                      value={form.partner_languages.join(", ")}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          partner_languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="English, Hindi, Telugu"
                    />
                  </div>
                </div>

                {/* Family Goals & Hobbies */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Partner Family Goals</Label>
                    <Input
                      value={form.partner_family_goals}
                      onChange={(e) => setForm({ ...form, partner_family_goals: e.target.value })}
                      placeholder="e.g. Values close family ties, wants children"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Partner Hobbies & Interests</Label>
                    <Input
                      value={form.partner_hobbies.join(", ")}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          partner_hobbies: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="Reading, Travelling, Cooking"
                    />
                  </div>
                </div>

                {/* PARTNER HOROSCOPE & KUNDLI PREFERENCES */}
                <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Horoscope & Kundli Preferences
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Define astrological compatibility criteria for your matches.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.partner_horoscope_required}
                        onChange={(e) => setForm({ ...form, partner_horoscope_required: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                      />
                      <span>Horoscope Required</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                    <div className="space-y-2">
                      <Label>Partner Manglik Preference</Label>
                      <Select
                        value={form.partner_manglik || "any"}
                        onValueChange={(v) => setForm({ ...form, partner_manglik: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Any Preference" /></SelectTrigger>
                        <SelectContent>
                          {MANGLIK_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred Rashis ({form.partner_rashi.length} selected)</Label>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-lg border border-border/60 bg-background/50">
                        {RASHI_LIST.map((r) => {
                          const isSelected = form.partner_rashi.includes(r.value);
                          return (
                            <button
                              key={r.value}
                              type="button"
                              onClick={() => {
                                const next = isSelected
                                  ? form.partner_rashi.filter((v) => v !== r.value)
                                  : [...form.partner_rashi, r.value];
                                setForm({ ...form, partner_rashi: next });
                              }}
                              className={cn(
                                "text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background/80 text-muted-foreground border-border hover:border-primary/50"
                              )}
                            >
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Label>Preferred Nakshatras ({form.partner_nakshatra.length} selected)</Label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 rounded-lg border border-border/60 bg-background/50">
                      {NAKSHATRA_LIST.map((n) => {
                        const isSelected = form.partner_nakshatra.includes(n);
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              const next = isSelected
                                ? form.partner_nakshatra.filter((id) => id !== n)
                                : [...form.partner_nakshatra, n];
                              setForm({ ...form, partner_nakshatra: next });
                            }}
                            className={cn(
                              "text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background/80 text-muted-foreground border-border hover:border-primary/50"
                            )}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* MUST HAVES */}
                <div className="space-y-2 rounded-2xl border border-border/70 bg-background/55 p-4">
                  <Label className="font-bold text-foreground">What matters most to you? (Must-Haves)</Label>
                  <p className="text-xs text-muted-foreground">Add qualities that contribute positively to your compatibility score.</p>
                  <div className="flex gap-2">
                    <Input
                      value={mustHaveInput}
                      onChange={(e) => setMustHaveInput(e.target.value)}
                      placeholder="e.g. Emotionally mature, Family oriented, Kind"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddMustHave();
                        }
                      }}
                    />
                    <Button type="button" variant="secondary" onClick={handleAddMustHave}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {form.partner_must_have.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {tag}
                        <button type="button" onClick={() => handleRemoveMustHave(tag)} className="hover:text-primary/70">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* DEAL BREAKERS */}
                <div className="space-y-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <Label className="font-bold text-destructive">Deal Breakers</Label>
                  <p className="text-xs text-muted-foreground">Candidates matching these criteria will be heavily penalized or excluded from recommendations.</p>
                  <div className="flex gap-2">
                    <Input
                      value={dealBreakerInput}
                      onChange={(e) => setDealBreakerInput(e.target.value)}
                      placeholder="e.g. Smoking, Unwilling to relocate, No children"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddDealBreaker();
                        }
                      }}
                    />
                    <Button type="button" variant="destructive" onClick={handleAddDealBreaker}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {form.partner_deal_breakers.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive">
                        {tag}
                        <button type="button" onClick={() => handleRemoveDealBreaker(tag)} className="hover:text-destructive/70">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* SECTION 7: STORY & MEDIA */}
          <section id="media" className={cn("scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7", currentStepIndex !== 6 && "hidden")}>
            <div className="grid gap-7 xl:grid-cols-[220px_1fr]">
              <div>
                <h2 className="text-base font-bold text-foreground">Story & Media</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Bio, intro links, and prompt answers others will see.</p>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Bio / About You</Label>
                  <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A great bio helps you stand out..." className="min-h-[120px]" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Voice Intro URL</Label>
                    <Input value={form.voice_url} onChange={(e) => setForm({ ...form, voice_url: e.target.value })} placeholder="Link to voice recording" />
                  </div>
                  <div className="space-y-2">
                    <Label>Short Video URL</Label>
                    <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="Link to video intro" />
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Personality Prompts</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      "My perfect weekend would be...",
                      "I am most passionate about...",
                      "The most important quality in a partner is..."
                    ].map((q) => (
                      <div key={q} className="space-y-2">
                        <Label className="font-medium text-primary">{q}</Label>
                        <Textarea value={(form.prompts as Record<string, string>)[q] || ""} onChange={(e) => setForm({ ...form, prompts: { ...(form.prompts as Record<string, string>), [q]: e.target.value } })} placeholder="Your answer..." className="min-h-[100px] resize-none" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 8: PRIVACY */}
          {mode === "edit" && (
            <section id="privacy" className={cn("scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7", currentStepIndex !== 7 && "hidden")}>
              <div className="grid gap-7 xl:grid-cols-[220px_1fr]">
                <div>
                  <h2 className="text-base font-bold text-foreground">Privacy</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Manage accounts you have blocked.</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                  <BlockedUsersList />
                </div>
              </div>
            </section>
          )}

          {/* STEP NAVIGATION FOOTER BAR */}
          <div className="flex flex-col gap-3 border-t border-border/70 bg-card/95 px-5 py-4 shadow-md sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Step
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
              <span>Step {currentStepIndex + 1} of {steps.length}:</span>
              <span className="font-bold text-foreground">{currentStep.label}</span>
            </div>

            {currentStepIndex < steps.length - 1 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                size="lg"
                className="flex items-center gap-1.5 min-w-[140px]"
              >
                Next Step
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading || uploadingPhoto}
                size="lg"
                className="min-w-[180px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : mode === "create" ? (
                  "Create My Profile"
                ) : (
                  "Save Profile & Finish"
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  if (isCreateMode) {
    return (
      <AuthSplitLayout
        title="Create your profile"
        subtitle="Add the details that help the right people understand who you are."
        eyebrow="Profile onboarding"
        visualKicker="Profile Setup"
        visualMeta="Tell your story"
        visualTitle="A thoughtful profile makes the first hello easier."
        visualSubtitle="Start with the essentials, then add the details that make your match feel human."
        wide
        contentClassName="justify-start py-2"
      >
        {content}
      </AuthSplitLayout>
    );
  }

  return <Layout>{content}</Layout>;
}
