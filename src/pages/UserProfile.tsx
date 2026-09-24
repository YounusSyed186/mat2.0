import { useEffect, useMemo, useState, type ElementType } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { recordProfileView, type ProfileViewLimitResult } from "@/lib/usageLimits";
import { useAuth } from "@/context/AuthContext";
import { useBlockStore } from "@/stores/useBlockStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { Interest, Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { UserAvatar } from "@/components/UserAvatar";
import { ReportDialog } from "@/components/ReportDialog";
import { PartnerPreferencesMatch } from "@/components/PartnerPreferencesMatch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePlanEntitlements } from "@/hooks/usePlanEntitlements";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  Crown,
  Dumbbell,
  Flag,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Lock,
  MapPin,
  MessageCircle,
  Moon,
  Palette,
  Quote,
  Rocket,
  Search,
  ShieldAlert,
  Smile,
  Sparkles,
  Star,
  Sun,
  Users,
  Wine,
} from "lucide-react";
import { toast } from "sonner";
import { getMatchReasons, getProfileRelationStatus } from "@/lib/profileJourney";

type DetailTileProps = {
  icon: ElementType;
  label: string;
  value?: string | number | null;
  note?: string | null;
};

type SectionCardProps = {
  title: string;
  icon: ElementType;
  children: React.ReactNode;
  empty?: boolean;
};

const relationCopy: Record<string, string> = {
  none: "Open to connect",
  sent_pending: "Interest sent",
  received_pending: "Waiting for your response",
  accepted: "Connected",
  rejected: "Interest closed",
  blocked: "Unavailable",
};

const hasText = (value?: string | number | null) => String(value ?? "").trim().length > 0;

function DetailTile({ icon: Icon, label, value, note }: DetailTileProps) {
  if (!hasText(value)) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-3.5 transition-all hover:border-primary/20">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-0.5 truncate text-sm font-bold text-foreground">{value}</p>
          {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, empty }: SectionCardProps) {
  return (
    <Card className="border-border/70 bg-card shadow-xs rounded-2xl overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/50 pb-3.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="font-serif text-base font-bold text-foreground">{title}</h2>
        </div>
        {empty ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-xs text-muted-foreground text-center">
            Information not provided yet.
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export default function UserProfile() {
  const navigate = useNavigate();
  const { id: userId } = useParams<{ id: string }>();
  const { currentUser, profile: myProfile } = useAuth();
  const { isBlocked, isBlockedBy, isBlockRelation, blockUser, unblockUser, fetchBlocks } = useBlockStore();
  const { createNotification } = useNotificationStore();
  const { canViewProfilePhoto, canViewSocialLinks } = usePlanEntitlements();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [reverseInterest, setReverseInterest] = useState<Interest | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [viewLimit, setViewLimit] = useState<ProfileViewLimitResult | null>(null);
  const [, setBlocking] = useState(false);

  useEffect(() => {
    if (!userId || !currentUser) return;

    fetchBlocks(currentUser.id);

    // Check saved state in localStorage
    try {
      const saved = localStorage.getItem("savedProfiles");
      if (saved) {
        const savedSet = new Set(JSON.parse(saved));
        setIsSaved(savedSet.has(userId));
      }
    } catch {
      // ignore
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const viewResult = await recordProfileView(userId);
        setViewLimit(viewResult);
        if (!viewResult.allowed) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const [{ data: prof }, { data: sent }, { data: recv }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).single(),
          supabase.from("interests").select("*").eq("sender_id", currentUser.id).eq("receiver_id", userId).maybeSingle(),
          supabase.from("interests").select("*").eq("sender_id", userId).eq("receiver_id", currentUser.id).maybeSingle(),
        ]);
        setProfile(prof as Profile | null);
        setInterest(sent as Interest | null);
        setReverseInterest(recv as Interest | null);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userId, currentUser, fetchBlocks]);

  const toggleShortlist = () => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem("savedProfiles");
      const savedSet = new Set(saved ? JSON.parse(saved) : []);
      if (savedSet.has(userId)) {
        savedSet.delete(userId);
        setIsSaved(false);
        toast.success("Profile removed from shortlist");
      } else {
        savedSet.add(userId);
        setIsSaved(true);
        toast.success("Profile added to shortlist");
      }
      localStorage.setItem("savedProfiles", JSON.stringify(Array.from(savedSet)));
    } catch {
      // ignore
    }
  };

  const handleSendInterest = async () => {
    if (!currentUser || !userId) return;
    if (myProfile?.is_blocked) {
      toast.error("Your account is blocked. You cannot send interests.");
      return;
    }
    if (isBlockRelation(userId)) {
      toast.error("Cannot send interest due to a block relation.");
      return;
    }
    setSending(true);
    const { data, error } = await supabase
      .from("interests")
      .insert({ sender_id: currentUser.id, receiver_id: userId, status: "pending" })
      .select()
      .maybeSingle();
    if (error) {
      toast.error(error.message);
    } else {
      setInterest(data as Interest);
      toast.success(`Interest sent to ${profile?.name}!`);
      await createNotification(userId, "interest_received", currentUser.id, myProfile?.name || "Someone");
    }
    setSending(false);
  };

  const handleBlock = async () => {
    if (!currentUser || !userId) return;
    setBlocking(true);
    const success = await blockUser(currentUser.id, userId);
    if (success) {
      toast.success(`${profile?.name} has been blocked.`);
    } else {
      toast.error("Failed to block user.");
    }
    setBlocking(false);
    setBlockDialogOpen(false);
  };

  const handleUnblock = async () => {
    if (!currentUser || !userId) return;
    setBlocking(true);
    const success = await unblockUser(currentUser.id, userId);
    if (success) {
      toast.success(`${profile?.name} has been unblocked.`);
    } else {
      toast.error("Failed to unblock user.");
    }
    setBlocking(false);
  };

  const handleUpdateReceivedInterest = async (status: "accepted" | "rejected") => {
    if (!currentUser || !reverseInterest || !profile) return;
    setSending(true);

    const { data, error } = await supabase
      .from("interests")
      .update({ status })
      .eq("id", reverseInterest.id)
      .select()
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      setSending(false);
      return;
    }

    setReverseInterest(data as Interest);
    if (status === "accepted") {
      toast.success(`You can now chat with ${profile.name}`);
      await createNotification(
        reverseInterest.sender_id,
        "interest_accepted",
        currentUser.id,
        myProfile?.name || "Someone"
      );
    } else {
      toast.success("Interest declined");
    }
    setSending(false);
  };

  const blocked = userId ? isBlocked(userId) : false;
  const blockedByThem = userId ? isBlockedBy(userId) : false;
  const hasBlockRelation = userId ? isBlockRelation(userId) : false;
  const relationStatus = getProfileRelationStatus({
    sentInterest: interest,
    receivedInterest: reverseInterest,
    blocked: hasBlockRelation,
  });
  
  const matchReasons = useMemo(() => (profile ? getMatchReasons(profile, myProfile) : []), [profile, myProfile]);
  
  const promptEntries = useMemo(
    () => (profile ? Object.entries(profile.prompts || {}).filter(([, answer]) => hasText(answer)) : []),
    [profile]
  );

  // Profile Photos list for gallery
  const photoGallery = useMemo(() => {
    if (!profile) return [];
    const list: string[] = [];
    if (profile.avatar_url) list.push(profile.avatar_url);
    if (profile.photos && Array.isArray(profile.photos)) {
      profile.photos.forEach(p => {
        if (p && !list.includes(p)) list.push(p);
      });
    }
    return list;
  }, [profile]);

  const activePhoto = photoGallery[activePhotoIndex] || profile?.avatar_url;

  const physicalDetails = useMemo(
    () =>
      profile
        ? [
            profile.height ? `Height ${profile.height} cm` : "",
            profile.weight ? `Weight ${profile.weight} kg` : "",
            profile.fitness_level ? `Fitness: ${profile.fitness_level}` : "",
            profile.style ? `Style: ${profile.style}` : "",
            profile.skin_tone ? `Skin Tone: ${profile.skin_tone}` : "",
          ].filter(Boolean)
        : [],
    [profile]
  );

  const getInterestButton = () => {
    if (hasBlockRelation) return null;

    if (relationStatus === "accepted") {
      return (
        <Button onClick={() => navigate(`/chat/${userId}`)} className="pressable w-full gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-none font-semibold">
          <MessageCircle className="h-4 w-4" />
          Open Chat & Messages
        </Button>
      );
    }

    if (relationStatus === "received_pending") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleUpdateReceivedInterest("accepted")}
            disabled={sending}
            className="pressable gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-none"
          >
            <CheckCircle className="h-4 w-4" />
            Accept Interest
          </Button>
          <Button
            onClick={() => handleUpdateReceivedInterest("rejected")}
            disabled={sending}
            variant="outline"
            className="pressable rounded-xl font-semibold"
          >
            Decline
          </Button>
        </div>
      );
    }

    if (relationStatus === "none") {
      return (
        <Button onClick={handleSendInterest} disabled={sending} className="premium-cta pressable w-full gap-2 rounded-xl font-semibold shadow-none">
          <Heart className="h-4 w-4" />
          {sending ? "Sending..." : "Express Interest"}
        </Button>
      );
    }
    if (relationStatus === "sent_pending") {
      return (
        <Button variant="outline" disabled className="w-full gap-2 rounded-xl border-primary/30 text-primary font-semibold bg-primary/5">
          <Clock className="h-4 w-4" />
          Interest Sent (Pending)
        </Button>
      );
    }
    if (relationStatus === "rejected") {
      return (
        <Button variant="outline" disabled className="w-full rounded-xl">
          Interest Closed
        </Button>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-full px-4 py-6 pb-28 md:px-8 md:py-8 max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-[480px] w-full rounded-3xl" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    if (viewLimit && !viewLimit.allowed) {
      const isLimitExceeded = viewLimit.reason === "profile_view_limit_exceeded";
      return (
        <Layout>
          <div className="flex h-full flex-col items-center justify-center px-4 py-32 text-center">
            <ShieldAlert className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h2 className="font-serif text-2xl font-bold text-foreground">
              {isLimitExceeded ? "Profile view limit reached" : "Profile unavailable"}
            </h2>
            <p className="mt-2 max-w-sm text-xs text-muted-foreground">
              {isLimitExceeded
                ? `You have reached your monthly profile views limit${viewLimit.limit ? ` (${viewLimit.limit})` : ""}. Upgrade your membership to view unlimited profiles.`
                : "You cannot view this profile right now."}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => navigate("/browse")} className="rounded-full">Back to Discover</Button>
              {isLimitExceeded && <Button onClick={() => navigate("/subscriptions")} className="premium-cta rounded-full">Upgrade Plan</Button>}
            </div>
          </div>
        </Layout>
      );
    }

    return (
      <Layout>
        <div className="flex h-full flex-col items-center justify-center px-4 py-32 text-center">
          <ShieldAlert className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="font-serif text-2xl font-bold text-foreground">Profile not found</h2>
          <p className="mt-2 max-w-sm text-xs text-muted-foreground">The member you are looking for does not exist or has set their profile to private.</p>
          <Button variant="outline" onClick={() => navigate("/browse")} className="mt-6 rounded-full">
            Back to Discover
          </Button>
        </div>
      </Layout>
    );
  }

  const hasLifestyle = hasText(profile.introvert_extrovert) || hasText(profile.habits) || hasText(profile.social_preferences) || (profile.hobbies && profile.hobbies.length > 0);
  const hasGoals = hasText(profile.career_ambition) || hasText(profile.family_goals) || hasText(profile.search_intent) || hasText(profile.lifestyle_choices);

  // Horoscope data derived or fallbacks
  const hasHoroscope = Boolean(
    profile.rashi ||
    profile.nakshatra ||
    profile.manglik_status ||
    profile.birth_place ||
    profile.horoscope_available
  );

  return (
    <Layout>
      <div className="min-h-full px-4 py-4 pb-28 sm:px-6 md:px-8 md:py-6 max-w-6xl mx-auto space-y-6">
        {/* Top Navigation & Action Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/browse")}
            className="pressable gap-2 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Suggested Matches
          </Button>

          <div className="flex items-center gap-2">
            {/* Shortlist Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleShortlist}
              className={`gap-1.5 rounded-full text-xs font-semibold ${
                isSaved ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800" : ""
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
              {isSaved ? "Shortlisted" : "Shortlist"}
            </Button>

            {currentUser && userId !== currentUser.id && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setReportDialogOpen(true)}
                  className="pressable rounded-full text-muted-foreground hover:text-foreground h-9 w-9"
                  aria-label="Report profile"
                >
                  <Flag className="h-4 w-4" />
                </Button>
                {blocked ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setUnblockDialogOpen(true)}
                    className="pressable rounded-full text-amber-600 h-9 w-9"
                    aria-label="Unblock profile"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setBlockDialogOpen(true)}
                    className="pressable rounded-full text-muted-foreground hover:text-destructive h-9 w-9"
                    aria-label="Block profile"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Blocking warnings */}
        {blockedByThem && (
          <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-xs font-medium text-destructive">This member has restricted interactions with you.</p>
          </div>
        )}
        {blocked && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-500/10 p-4">
            <Ban className="h-5 w-5 text-amber-600 shrink-0 dark:text-amber-400" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">You have blocked this member.</p>
          </div>
        )}

        {/* 1. HERO PROFILE CARD & PHOTO GALLERY */}
        <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
          <div className="grid lg:grid-cols-[minmax(340px,420px)_1fr]">
            {/* PHOTO SECTION */}
            <div className="relative min-h-[380px] lg:min-h-[520px] bg-muted/40 overflow-hidden flex flex-col justify-between">
              {activePhoto ? (
                <img
                  src={activePhoto}
                  alt={profile.name}
                  className={`h-full min-h-[380px] lg:min-h-[520px] w-full object-cover object-top transition-all duration-300 ${
                    !canViewProfilePhoto() ? "filter blur-lg scale-110 pointer-events-none brightness-90" : ""
                  }`}
                />
              ) : (
                <div className="flex h-full min-h-[380px] items-center justify-center lg:min-h-[520px] bg-gradient-to-br from-primary/10 via-background to-secondary/30">
                  <UserAvatar name={profile.name} avatarUrl={profile.avatar_url} blurred={!canViewProfilePhoto()} className="h-44 w-44 border-8 border-background shadow-xl" />
                </div>
              )}

              {/* Photo Lock Plan Overlay */}
              {!canViewProfilePhoto() && (
                <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
                  <Badge className="mb-3 border-amber-500/40 bg-amber-500 text-white shadow-md gap-1.5 px-3 py-1.5 text-xs font-bold">
                    <Lock className="h-3.5 w-3.5" /> Photo Blurred • Free Plan
                  </Badge>
                  <p className="text-xs text-white/90 max-w-xs mb-3 font-medium">
                    Upgrade to Premium to view crystal-clear photos, gallery, and contact features
                  </p>
                  <Button size="sm" className="premium-cta rounded-full text-xs font-bold gap-1.5 shadow-md" onClick={() => navigate('/subscriptions')}>
                    <Crown className="h-3.5 w-3.5" /> Upgrade to View
                  </Button>
                </div>
              )}

              {/* Multi-Photo Gallery Thumbnails */}
              {canViewProfilePhoto() && photoGallery.length > 1 && (
                <div className="absolute top-4 left-4 z-20 flex gap-2 overflow-x-auto p-1 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20">
                  {photoGallery.map((photo, index) => (
                    <button
                      key={photo}
                      onClick={() => setActivePhotoIndex(index)}
                      className={`h-12 w-10 rounded-xl overflow-hidden border-2 transition-all ${
                        activePhotoIndex === index ? "border-primary ring-2 ring-primary/40 scale-105" : "border-white/40 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={photo} alt="" className="h-full w-full object-cover object-top" />
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom Photo Overlay Info */}
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white pointer-events-none">
                <Badge className="mb-2.5 border-white/20 bg-white/20 text-white backdrop-blur-md text-[11px]">
                  {relationCopy[relationStatus]}
                </Badge>
                <h1 className="font-serif text-3xl font-bold leading-tight sm:text-4xl text-white">
                  {profile.name}, {profile.age}
                </h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90 font-medium">
                  {profile.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {profile.city}
                    </span>
                  )}
                  {profile.profession && (
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-amber-400" />
                      {profile.profession}
                    </span>
                  )}
                  {profile.religion && (
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-teal-400" />
                      {profile.religion}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* QUICK ACTIONS & SUMMARY PANEL */}
            <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">About {profile.name}</p>
                  <p className="mt-2.5 text-sm leading-7 text-foreground/90 font-normal">
                    {profile.bio || "Looking for a meaningful life partnership built on shared trust, family values, and progressive thinking."}
                  </p>
                </div>

                {/* Match Highlights */}
                {matchReasons.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shared Signals</p>
                    <div className="flex flex-wrap gap-2">
                      {matchReasons.map((reason) => (
                        <Badge key={reason} variant="secondary" className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Snapshot Tiles */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailTile icon={BookOpen} label="Faith & Community" value={profile.religion} note={profile.ethnicity} />
                  <DetailTile icon={GraduationCap} label="Highest Education" value={profile.education} />
                  <DetailTile icon={Globe} label="Languages" value={profile.languages?.join(", ")} />
                  <DetailTile
                    icon={Home}
                    label="Relocation Preference"
                    value={profile.willing_to_relocate ? "Open to relocate" : profile.city ? `Prefers ${profile.city}` : "Not specified"}
                  />
                </div>
              </div>

              {/* Next Step / Interest Action Card */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-4.5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">Connection Status</p>
                    <p className="text-[11px] text-muted-foreground">{relationCopy[relationStatus]}</p>
                  </div>
                  {relationStatus === "accepted" && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold">
                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                      Connected
                    </Badge>
                  )}
                </div>
                {getInterestButton()}
              </div>
            </div>
          </div>
        </section>

        {/* 2. DEEP EVALUATION DETAILS GRID */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* MAIN PROFILE DETAILS COLUMN */}
          <main className="space-y-6">
            {/* PARTNER PREFERENCES COMPARISON TABLE */}
            <PartnerPreferencesMatch profile={profile} myProfile={myProfile} />

            {/* HOROSCOPE & KUNDLI SECTION */}
            <SectionCard title="Horoscope & Kundli Details" icon={Compass} empty={!hasHoroscope}>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailTile
                    icon={Moon}
                    label="Rashi / Moon Sign"
                    value={profile.rashi || "Not shared"}
                  />
                  <DetailTile
                    icon={Star}
                    label="Nakshatra / Star"
                    value={profile.nakshatra || "Not shared"}
                  />
                  <DetailTile
                    icon={Sun}
                    label="Manglik Status"
                    value={
                      profile.manglik_status === "manglik"
                        ? "Manglik"
                        : profile.manglik_status === "anshik_manglik"
                        ? "Anshik Manglik"
                        : profile.manglik_status === "non_manglik"
                        ? "Non-Manglik"
                        : profile.manglik_status || "Not shared"
                    }
                  />
                  <DetailTile
                    icon={MapPin}
                    label="Birth Place"
                    value={profile.birth_place || profile.city || "Not shared"}
                  />
                  <DetailTile
                    icon={Clock}
                    label="Birth Time"
                    value={profile.birth_time ? profile.birth_time : "Available on mutual interest"}
                  />
                  {profile.gotra && (
                    <DetailTile
                      icon={BookOpen}
                      label="Gotra"
                      value={profile.gotra}
                    />
                  )}
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Horoscope match evaluation is available upon mutual interest.
                  </span>
                  {profile.horoscope_url && (
                    <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs font-bold text-primary">
                      <a href={profile.horoscope_url} target="_blank" rel="noopener noreferrer">
                        View Kundli &rarr;
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* LIFESTYLE & PERSONALITY */}
            <SectionCard title="Lifestyle & Personality" icon={Smile} empty={!hasLifestyle}>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailTile
                  icon={Users}
                  label="Social Temperament"
                  value={profile.introvert_extrovert ? `${profile.introvert_extrovert}/10 on extrovert scale` : ""}
                  note={profile.social_preferences}
                />
                <DetailTile icon={Clock} label="Daily Habits & Routine" value={profile.habits} />
              </div>
              {profile.hobbies && profile.hobbies.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interests & Hobbies</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.hobbies.map((hobby) => (
                      <Badge key={hobby} variant="outline" className="rounded-full bg-primary/5 px-3 py-1 text-xs border-primary/20">
                        {hobby}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* CAREER, AMBITION & FAMILY GOALS */}
            <SectionCard title="Family Goals & Future Vision" icon={Rocket} empty={!hasGoals}>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailTile icon={Search} label="Search Intent" value={profile.search_intent} />
                <DetailTile icon={Briefcase} label="Career Ambition" value={profile.career_ambition} />
                <DetailTile icon={Home} label="Family Vision" value={profile.family_goals} />
                <DetailTile icon={Wine} label="Lifestyle & Values" value={profile.lifestyle_choices} />
              </div>
            </SectionCard>

            {/* DEEPER INSIGHTS (PROMPT QUESTIONS) */}
            <SectionCard title="Personal Insights & Values" icon={Quote} empty={promptEntries.length === 0}>
              <div className="space-y-3.5">
                {promptEntries.map(([question, answer]) => (
                  <div key={question} className="rounded-2xl border border-border/70 bg-background/70 p-4 space-y-1.5">
                    <p className="text-xs font-bold text-primary tracking-wide">{question}</p>
                    <p className="text-sm leading-6 text-foreground/90 font-normal">{answer}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </main>

          {/* RIGHT METADATA SIDEBAR */}
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            {/* Quick Profile Summary Card */}
            <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-serif text-sm font-bold text-foreground">Profile Overview</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Age</span>
                    <span className="font-semibold text-foreground">{profile.age} yrs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Marital Status</span>
                    <span className="font-semibold text-foreground">{profile.marital_status || "Never Married"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-semibold text-foreground">{profile.city || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Religion</span>
                    <span className="font-semibold text-foreground">{profile.religion || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Profession</span>
                    <span className="font-semibold text-foreground truncate max-w-[130px]">{profile.profession || "Not set"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Presence Card (Gated) */}
            {(profile.instagram_url || profile.facebook_url || profile.linkedin_url || profile.twitter_url || profile.other_social_url) && (
              <Card className="rounded-2xl border border-border/70 bg-card shadow-xs relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3.5">
                    <h3 className="font-serif text-sm font-bold text-foreground">Verified Socials</h3>
                    {!canViewSocialLinks && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1 text-[10px] font-bold">
                        <Lock className="h-2.5 w-2.5" /> Premium
                      </Badge>
                    )}
                  </div>

                  <div className="relative">
                    <div className={`flex flex-col gap-2 transition-all ${!canViewSocialLinks ? "filter blur-sm opacity-50 pointer-events-none select-none" : ""}`}>
                      {profile.instagram_url && (
                        <a
                          href={canViewSocialLinks ? profile.instagram_url : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/60 p-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <Globe className="h-4 w-4 text-pink-500" />
                          <span className="truncate">Instagram</span>
                        </a>
                      )}
                      {profile.linkedin_url && (
                        <a
                          href={canViewSocialLinks ? profile.linkedin_url : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/60 p-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <Globe className="h-4 w-4 text-blue-700" />
                          <span className="truncate">LinkedIn</span>
                        </a>
                      )}
                      {profile.facebook_url && (
                        <a
                          href={canViewSocialLinks ? profile.facebook_url : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/60 p-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <Globe className="h-4 w-4 text-blue-600" />
                          <span className="truncate">Facebook</span>
                        </a>
                      )}
                    </div>

                    {!canViewSocialLinks && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-background/85 p-3 text-center backdrop-blur-xs z-10">
                        <Lock className="h-4 w-4 text-amber-500 mb-1" />
                        <p className="text-xs font-bold text-foreground">Social links are locked</p>
                        <p className="text-[10px] text-muted-foreground mb-2">Upgrade to view external profiles</p>
                        <Button size="sm" className="premium-cta h-7 rounded-full text-[11px] font-bold px-3 shadow-none gap-1" onClick={() => navigate('/subscriptions')}>
                          <Crown className="h-3 w-3" /> Upgrade Plan
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Physical Attributes & Media */}
            {(physicalDetails.length > 0 || profile.voice_url || profile.video_url) && (
              <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-serif text-sm font-bold text-foreground">Physical & Media</h3>
                  {physicalDetails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      {physicalDetails.map((detail) => (
                        <span key={detail} className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 font-medium text-foreground/80">
                          {detail.includes("Height") ? (
                            <Calendar className="h-3 w-3 text-primary" />
                          ) : detail.includes("Weight") || detail.includes("Fitness") ? (
                            <Dumbbell className="h-3 w-3 text-primary" />
                          ) : (
                            <Palette className="h-3 w-3 text-primary" />
                          )}
                          {detail}
                        </span>
                      ))}
                    </div>
                  )}
                  {(profile.voice_url || profile.video_url) && (
                    <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                      {profile.voice_url && <p className="text-muted-foreground">🎙️ Voice note shared</p>}
                      {profile.video_url && <p className="text-muted-foreground">🎬 Video intro shared</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Block {profile.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to view your profile, send you interests, or message you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              Block Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock Confirmation Dialog */}
      <AlertDialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {profile.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be able to view your profile and interact with you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await handleUnblock(); setUnblockDialogOpen(false); }} className="rounded-xl">
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Profile Dialog */}
      {currentUser && userId && (
        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          reporterId={currentUser.id}
          reportedUserId={userId}
          reportedUserName={profile.name}
        />
      )}
    </Layout>
  );
}
