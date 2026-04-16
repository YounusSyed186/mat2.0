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

    // Step 1: Save core profile fields (always works)
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
      role: profile?.role || "user",
      is_blocked: profile?.is_blocked || false,
    };
    const { error: coreError } = await supabase.from("profiles").upsert(coreData);
    if (coreError) {
      toast({ title: "Error saving profile", description: coreError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Step 2: Save avatar_url separately so a missing column gives a clear message
    if (form.avatar_url) {
      const { error: avatarError } = await supabase
        .from("profiles")
        .update({ avatar_url: form.avatar_url })
        .eq("id", currentUser.id);
      if (avatarError) {
        toast({
          title: "Profile saved — but photo URL could not be stored",
          description: 'Run this in Supabase SQL Editor: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;',
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    toast({ title: mode === "create" ? "Profile created!" : "Profile updated!" });
    window.location.href = "/browse";
    setLoading(false);
  };

  const displayName = form.name || "You";

  const content = (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-foreground">
          {mode === "create" ? "Create Your Profile" : "Edit Profile"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {mode === "create"
            ? "Complete your profile to start browsing matches"
            : "Update your personal details"}
        </p>
      </div>

      {/* Photo Upload */}
      <Card className="border-card-border shadow-sm mb-4">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              data-testid="input-avatar"
            />

            {/* Clickable avatar */}
            <button
              type="button"
              onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              title={avatarPreview ? "Click to change photo" : "Click to upload photo"}
              data-testid="button-upload-photo"
            >
              {/* Avatar image or initials */}
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={displayName}
                  className="h-28 w-28 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center text-primary font-serif font-bold text-4xl select-none">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Hover / uploading overlay */}
              <div
                className={`absolute inset-0 rounded-full flex flex-col items-center justify-center transition-opacity ${
                  uploadingPhoto
                    ? "bg-black/50 opacity-100"
                    : "bg-black/0 group-hover:bg-black/45 opacity-0 group-hover:opacity-100"
                }`}
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-7 w-7 text-white animate-spin" />
                ) : (
                  <>
                    <Camera className="h-6 w-6 text-white mb-1" />
                    <span className="text-white text-[11px] font-medium">
                      {avatarPreview ? "Change" : "Upload"}
                    </span>
                  </>
                )}
              </div>
            </button>

            {/* Label */}
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {uploadingPhoto ? "Uploading…" : avatarPreview ? "Click photo to change" : "Click to add a photo"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG or WebP · Max 5 MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Personal Details</CardTitle>
          <CardDescription>Fields marked with * are required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  required
                  data-testid="input-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  min={18}
                  max={80}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="Your age"
                  required
                  data-testid="input-age"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger data-testid="select-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Religion *</Label>
                <Select value={form.religion} onValueChange={(v) => setForm({ ...form, religion: v })}>
                  <SelectTrigger data-testid="select-religion">
                    <SelectValue placeholder="Select religion" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELIGIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Your city"
                  required
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={form.education}
                  onChange={(e) => setForm({ ...form, education: e.target.value })}
                  placeholder="Highest qualification"
                  data-testid="input-education"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="profession">Profession</Label>
                <Input
                  id="profession"
                  value={form.profession}
                  onChange={(e) => setForm({ ...form, profession: e.target.value })}
                  placeholder="Your occupation"
                  data-testid="input-profession"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="bio">About You</Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Tell potential matches about yourself..."
                  rows={4}
                  data-testid="textarea-bio"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading || uploadingPhoto} data-testid="button-save-profile">
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{mode === "create" ? "Creating..." : "Saving..."}</>
                ) : (
                  mode === "create" ? "Create Profile" : "Save Changes"
                )}
              </Button>
              {mode === "edit" && (
                <Button type="button" variant="outline" onClick={() => setLocation("/browse")}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {mode === "edit" && (
        <div className="mt-4">
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
