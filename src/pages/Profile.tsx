import { useState, useEffect, useRef } from "react";
import { BlockedUsersList } from "@/components/BlockedUsersList";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2 } from "lucide-react";
import { generateEmbedding } from "@/lib/ai";

interface ProfilePageProps {
  mode: "create" | "edit";
}

const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"];
const GENDERS = ["male", "female", "other"];

export default function ProfilePage({ mode }: ProfilePageProps) {
  const [, setLocation] = useLocation();
  const { currentUser, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
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
    intent_duration: "",
    prompts: [] as { question: string; answer: string }[],
    voice_url: "",
    video_url: "",
  });

  useEffect(() => {
    if (mode === "edit" && profile) {
      setForm({
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
        intent_duration: profile.intent_duration || "",
        prompts: profile.prompts || [],
        voice_url: profile.voice_url || "",
        video_url: profile.video_url || "",
      });
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
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
    const coreData = {
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
      intent_duration: form.intent_duration,
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
        (coreData as any).embedding = `[${embedding.join(",")}]`;
        (coreData as any).needs_embedding = false;
      }
    } catch (embErr) {
      console.error("Failed to generate embedding during profile save:", embErr);
      (coreData as any).needs_embedding = true;
    }

    const { error: coreError } = await supabase.from("profiles").upsert(coreData);
    if (coreError) {
      toast({ title: "Error saving profile", description: coreError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: mode === "create" ? "Profile created!" : "Profile updated!" });
    window.location.href = "/browse";
    setLoading(false);
  };

  const displayName = form.name || "You";

  const content = (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            {mode === "create" ? "Create Your Profile" : "Edit Profile"}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            {mode === "create"
              ? "Tell us more about yourself to find your perfect match"
              : "Keep your details up to date for better AI recommendations"}
          </p>
        </div>
        <div className="flex gap-3">
          <Button type="submit" form="profile-form" disabled={loading || uploadingPhoto} size="lg">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              mode === "create" ? "Create Profile" : "Save Changes"
            )}
          </Button>
          {mode === "edit" && (
            <Button type="button" variant="outline" size="lg" onClick={() => setLocation("/browse")}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSubmit} className="space-y-8">
        {/* Row 1: Photo & Basic Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 border-card-border shadow-md h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Profile Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary h-40 w-40"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt={displayName} className="h-full w-full rounded-full object-cover border-4 border-primary/20 shadow-lg" />
                ) : (
                  <div className="h-full w-full rounded-full bg-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center text-primary font-serif font-bold text-5xl">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`absolute inset-0 rounded-full flex flex-col items-center justify-center transition-opacity ${uploadingPhoto ? "bg-black/50 opacity-100" : "bg-black/0 group-hover:bg-black/45 opacity-0 group-hover:opacity-100"}`}>
                  {uploadingPhoto ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <><Camera className="h-7 w-7 text-white mb-1" /><span className="text-white text-xs font-medium">Change Photo</span></>}
                </div>
              </button>
              <p className="text-xs text-muted-foreground mt-4 text-center">JPG, PNG or WebP · Max 5 MB</p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-card-border shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Required fields to get you started</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </CardContent>
          </Card>
        </div>

        {/* Identity & Lifestyle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-card-border shadow-md">
            <CardHeader><CardTitle className="text-lg">Identity & Background</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Languages Spoken (Comma separated)</Label>
                <Input 
                  value={form.languages.join(', ')} 
                  onChange={(e) => setForm({ ...form, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="English, Hindi, Kannada..." 
                />
              </div>
              <div className="space-y-2">
                <Label>Ethnicity / Cultural Background</Label>
                <Input value={form.ethnicity} onChange={(e) => setForm({ ...form, ethnicity: e.target.value })} placeholder="Optional" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="relocate" 
                  checked={form.willing_to_relocate} 
                  onChange={(e) => setForm({ ...form, willing_to_relocate: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="relocate" className="text-sm cursor-pointer">Willing to relocate for the right match</Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border shadow-md">
            <CardHeader><CardTitle className="text-lg">Personality & Lifestyle</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Introvert vs Extrovert</Label>
                  <span className="text-xs text-muted-foreground">{form.introvert_extrovert <= 3 ? 'Introvert' : form.introvert_extrovert >= 8 ? 'Extrovert' : 'Balanced'}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1" 
                  value={form.introvert_extrovert} 
                  onChange={(e) => setForm({ ...form, introvert_extrovert: parseInt(e.target.value) })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" 
                />
              </div>
              <div className="space-y-2">
                <Label>Hobbies & Interests</Label>
                <Input 
                  value={form.hobbies.join(', ')} 
                  onChange={(e) => setForm({ ...form, hobbies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="Cooking, Hiking, Photography..." 
                />
              </div>
              <div className="space-y-2">
                <Label>Daily Habits / Social Preferences</Label>
                <Input value={form.social_preferences} onChange={(e) => setForm({ ...form, social_preferences: e.target.value })} placeholder="e.g. Early riser, party person vs chill" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Values & Intent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-card-border shadow-md">
            <CardHeader><CardTitle className="text-lg">Values & Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
                <Input value={form.family_goals} onChange={(e) => setForm({ ...form, family_goals: e.target.value })} placeholder="e.g. Want children, family-oriented" />
              </div>
              <div className="space-y-2">
                <Label>Lifestyle Choices (Smoking/Drinking)</Label>
                <Input value={form.lifestyle_choices} onChange={(e) => setForm({ ...form, lifestyle_choices: e.target.value })} placeholder="e.g. Non-smoker, Social drinker" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border shadow-md">
            <CardHeader><CardTitle className="text-lg">Intent & Goals</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>What are you looking for in a partner?</Label>
                <Textarea 
                  value={form.search_intent || ""} 
                  onChange={(e) => setForm({ ...form, search_intent: e.target.value })} 
                  placeholder="I am looking for someone who..." 
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Physical Attributes & Media */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 border-card-border shadow-md">
            <CardHeader><CardTitle className="text-lg">Physical Attributes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input type="number" value={form.height || ""} onChange={(e) => setForm({ ...form, height: parseInt(e.target.value) || 0 })} placeholder="e.g. 175" />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input type="number" value={form.weight || ""} onChange={(e) => setForm({ ...form, weight: parseInt(e.target.value) || 0 })} placeholder="e.g. 70" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fitness Level</Label>
                <Input value={form.fitness_level} onChange={(e) => setForm({ ...form, fitness_level: e.target.value })} placeholder="e.g. Athletic, Average" />
              </div>
              <div className="space-y-2">
                <Label>Personal Style</Label>
                <Input value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} placeholder="e.g. Casual, Formal" />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-card-border shadow-md">
            <CardHeader><CardTitle className="text-lg">Media & Expression</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Bio / About You</Label>
                <Textarea 
                  value={form.bio} 
                  onChange={(e) => setForm({ ...form, bio: e.target.value })} 
                  placeholder="A great bio helps you stand out..." 
                  className="min-h-[120px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Voice Intro URL (Optional)</Label>
                  <Input value={form.voice_url} onChange={(e) => setForm({ ...form, voice_url: e.target.value })} placeholder="Link to voice recording" />
                </div>
                <div className="space-y-2">
                  <Label>Short Video URL (Optional)</Label>
                  <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="Link to video intro" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Personality Prompts */}
        <Card className="border-card-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Personality Prompts
            </CardTitle>
            <CardDescription>Answer these questions to help others know you better</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                "My perfect weekend would be...",
                "I am most passionate about...",
                "The most important quality in a partner is..."
              ].map((q) => (
                <div key={q} className="space-y-2">
                  <Label className="text-primary font-medium">{q}</Label>
                  <Textarea 
                    value={form.prompts?.[q] || ""} 
                    onChange={(e) => setForm({ 
                      ...form, 
                      prompts: { ...form.prompts, [q]: e.target.value } 
                    })} 
                    placeholder="Your answer..."
                    className="resize-none min-h-[100px]"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-4">
          <Button type="submit" disabled={loading || uploadingPhoto} size="xl" className="min-w-[240px] text-lg h-14">
            {loading ? (
              <><Loader2 className="h-6 w-6 mr-3 animate-spin" />{mode === "create" ? "Creating Profile..." : "Saving Changes..."}</>
            ) : (
              mode === "create" ? "Create My Profile" : "Update My Profile"
            )}
          </Button>
        </div>
      </form>

      {mode === "edit" && (
        <div className="pt-8 border-t border-border">
          <BlockedUsersList />
        </div>
      )}
    </div>
  );

  if (mode === "create") {
    return <div className="min-h-screen bg-background">{content}</div>;
  }

  return <Layout>{content}</Layout>;
}
