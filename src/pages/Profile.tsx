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
  Camera,
  CheckCircle2,
  BookOpen,
  Briefcase,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { generateEmbedding } from "@/lib/ai";
import { getProfileCompletion } from "@/lib/profileJourney";
import { cn } from "@/lib/utils";

interface ProfilePageProps {
  mode: "create" | "edit";
}

const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"];
const GENDERS = ["male", "female", "other"];

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
};

export default function ProfilePage({ mode }: ProfilePageProps) {
  const navigate = useNavigate();
  const { currentUser, profile, refetchProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("profile-basics");
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    // New fields
    languages: [] as string[],
    ethnicity: "",
    willing_to_relocate: false,
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

    // Show local preview immediately
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

    // Store the clean URL in the DB (no cache-buster) so others can load it reliably.
    // Use a cache-busted version only for the local preview so the browser shows the new image.
    const cleanUrl = urlData.publicUrl;
    const previewUrl = `${cleanUrl}?t=${Date.now()}`;
    setAvatarPreview(previewUrl);
    setForm((prev) => ({ ...prev, avatar_url: cleanUrl }));
    toast({ title: "Photo uploaded!" });
    setUploadingPhoto(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!form.name || !form.age || !form.gender || !form.religion || !form.city) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Step 1: Save core profile fields
    const coreData: Record<string, unknown> = {
      id: currentUser.id,
      name: form.name,
      age: parseInt(form.age),
      gender: form.gender as "male" | "female" | "other",
      religion: form.religion,
      city: form.city,
      education: form.education,
      profession: form.profession,
      bio: form.bio,
      avatar_url: form.avatar_url,
      languages: form.languages,
      ethnicity: form.ethnicity,
      willing_to_relocate: form.willing_to_relocate,
      introvert_extrovert: form.introvert_extrovert,
      hobbies: form.hobbies,
      habits: form.habits,
      social_preferences: form.social_preferences,
      career_ambition: form.career_ambition,
      family_goals: form.family_goals,
      lifestyle_choices: form.lifestyle_choices,
      height: form.height ? parseInt(form.height) : null,
      fitness_level: form.fitness_level,
      style: form.style,
      skin_tone: form.skin_tone,
      search_intent: form.search_intent,
      weight: form.weight ? parseInt(form.weight) : null,
      prompts: form.prompts,
      voice_url: form.voice_url,
      video_url: form.video_url,
      role: profile?.role || "user",
      is_blocked: profile?.is_blocked || false,
    };

    try {
      // Create a rich text representation for embedding
      const profileText = [
        form.name,
        form.age,
        form.gender,
        form.religion,
        form.city,
        form.profession,
        form.bio,
        form.languages.join(', '),
        form.ethnicity,
        form.willing_to_relocate ? 'willing to relocate' : '',
        form.hobbies.join(', '),
        form.career_ambition,
        form.search_intent,
      ].filter(Boolean).join(' ');

      const embedding = await generateEmbedding(profileText);
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
  const requiredFieldsComplete = [form.name, form.age, form.gender, form.religion, form.city].filter(Boolean).length;

  const settingsSections = [
    { id: "profile-basics", label: "Essentials", icon: UserCircle },
    { id: "background", label: "Background", icon: ShieldCheck },
    { id: "lifestyle", label: "Lifestyle", icon: Sparkles },
    { id: "preferences", label: "Goals", icon: HeartHandshake },
    { id: "media", label: "Story & Media", icon: SlidersHorizontal },
    ...(mode === "edit" ? [{ id: "privacy", label: "Privacy", icon: LockKeyhole }] : []),
  ];

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            {settingsSections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSectionChange(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors",
                  activeSection === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className={isCreateMode ? "block" : "lg:hidden"}>
          <div className="mb-3 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Profile strength</p>
                <p className="mt-1 text-lg font-bold text-foreground">{profileCompletion}% complete</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {requiredFieldsComplete}/5
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-card/95 p-2 shadow-sm">
            {settingsSections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSectionChange(id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                  activeSection === id ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

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
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Vivah profile</p>
                <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
                  Shape your best first impression
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Keep the essentials accurate, then add the story and values that make a match feel real.
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
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          )}

          <section id="profile-basics" onFocusCapture={() => setActiveSection("profile-basics")} className="scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7">
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
                    <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Bangalore" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profession</Label>
                    <Input id="profession" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} placeholder="e.g. Software Engineer" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="background" onFocusCapture={() => setActiveSection("background")} className="scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7">
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
                  <Input value={form.languages.join(", ")} onChange={(e) => setForm({ ...form, languages: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="English, Hindi, Kannada" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Ethnicity / Cultural Background</Label>
                  <Input value={form.ethnicity} onChange={(e) => setForm({ ...form, ethnicity: e.target.value })} placeholder="Optional" />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/55 px-4 py-3 sm:col-span-2">
                  <input type="checkbox" checked={form.willing_to_relocate} onChange={(e) => setForm({ ...form, willing_to_relocate: e.target.checked })} className="h-4 w-4 rounded border-border text-primary accent-primary" />
                  <span className="text-sm font-medium text-foreground">Willing to relocate for the right match</span>
                </label>
              </div>
            </div>
          </section>

          <section id="lifestyle" onFocusCapture={() => setActiveSection("lifestyle")} className="scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7">
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
                  <Input value={form.hobbies.join(", ")} onChange={(e) => setForm({ ...form, hobbies: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="Cooking, Hiking, Photography" />
                </div>
                <div className="space-y-2">
                  <Label>Daily Habits</Label>
                  <Input value={form.habits} onChange={(e) => setForm({ ...form, habits: e.target.value })} placeholder="e.g. Early riser" />
                </div>
                <div className="space-y-2">
                  <Label>Social Preferences</Label>
                  <Input value={form.social_preferences} onChange={(e) => setForm({ ...form, social_preferences: e.target.value })} placeholder="e.g. Calm evenings" />
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
                  <Input value={form.fitness_level} onChange={(e) => setForm({ ...form, fitness_level: e.target.value })} placeholder="e.g. Athletic, Average" />
                </div>
                <div className="space-y-2">
                  <Label>Personal Style</Label>
                  <Input value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} placeholder="e.g. Casual, Formal" />
                </div>
              </div>
            </div>
          </section>

          <section id="preferences" onFocusCapture={() => setActiveSection("preferences")} className="scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7">
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
                  <Input value={form.family_goals} onChange={(e) => setForm({ ...form, family_goals: e.target.value })} placeholder="e.g. Want children" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Lifestyle Choices</Label>
                  <Input value={form.lifestyle_choices} onChange={(e) => setForm({ ...form, lifestyle_choices: e.target.value })} placeholder="e.g. Non-smoker, Social drinker" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>What are you looking for in a partner?</Label>
                  <Textarea value={form.search_intent || ""} onChange={(e) => setForm({ ...form, search_intent: e.target.value })} placeholder="I am looking for someone who..." className="min-h-[120px]" />
                </div>
              </div>
            </div>
          </section>

          <section id="media" onFocusCapture={() => setActiveSection("media")} className="scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7">
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

          {mode === "edit" && (
            <section id="privacy" onFocusCapture={() => setActiveSection("privacy")} className="scroll-mt-6 border-b border-border/70 px-5 py-6 sm:px-7">
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

          <div
            className={cn(
              "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
              isCreateMode
                ? "bg-transparent px-0 py-5 sm:px-0"
                : "sticky bottom-0 z-20 border-t border-border/70 bg-card/95 px-5 py-4 shadow-[0_-16px_36px_hsl(var(--foreground)/0.08)] backdrop-blur-md sm:hidden"
            )}
          >
            {!isCreateMode && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-background/60 px-3 py-2 sm:min-w-[220px]">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Profile strength</p>
                  <p className="text-sm font-bold text-foreground">{profileCompletion}% complete</p>
                </div>
                <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${profileCompletion}%` }} />
                </div>
              </div>
            )}
            {mode === "edit" && (
              <div className="flex gap-2 sm:ml-auto">
                <Button type="button" variant="outline" onClick={() => navigate("/browse")} className="flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || uploadingPhoto} size="lg" className="min-w-[160px] flex-1 sm:flex-none">
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            )}
            {mode === "create" && (
              <Button type="submit" disabled={loading || uploadingPhoto} size="lg" className="min-w-[180px]">
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create My Profile"
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
