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
  Palette,
  Quote,
  Rocket,
  Search,
  ShieldAlert,
  Smile,
  Sparkles,
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
    <div className="rounded-xl border border-border/70 bg-background/60 p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
          {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, empty }: SectionCardProps) {
  return (
    <Card className="border-card-border bg-card/95 shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
        </div>
        {empty ? (
          <p className="rounded-xl border border-dashed border-border bg-background/50 px-4 py-5 text-sm text-muted-foreground">
            Not shared yet.
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
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [viewLimit, setViewLimit] = useState<ProfileViewLimitResult | null>(null);
  const [, setBlocking] = useState(false);

  useEffect(() => {
    if (!userId || !currentUser) return;

    fetchBlocks(currentUser.id);

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
  const physicalDetails = useMemo(
    () =>
      profile
        ? [
            profile.height ? `Height ${profile.height} cm` : "",
            profile.weight ? `Weight ${profile.weight} kg` : "",
            profile.fitness_level ? `Fitness ${profile.fitness_level}` : "",
            profile.style ? `Style ${profile.style}` : "",
          ].filter(Boolean)
        : [],
    [profile]
  );

  const getInterestButton = () => {
    if (hasBlockRelation) return null;

    if (relationStatus === "accepted") {
      return (
        <Button onClick={() => navigate(`/chat/${userId}`)} className="pressable w-full gap-2">
          <MessageCircle className="h-4 w-4" />
          Open Chat
        </Button>
      );
    }

    if (relationStatus === "received_pending") {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleUpdateReceivedInterest("accepted")}
            disabled={sending}
            className="pressable gap-2 bg-green-600 text-white hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            Accept
          </Button>
          <Button
            onClick={() => handleUpdateReceivedInterest("rejected")}
            disabled={sending}
            variant="outline"
            className="pressable"
          >
            Decline
          </Button>
        </div>
      );
    }

    if (relationStatus === "none") {
      return (
        <Button onClick={handleSendInterest} disabled={sending} className="pressable w-full gap-2">
          <Heart className="h-4 w-4" />
          {sending ? "Sending..." : "Send Interest"}
        </Button>
      );
    }
    if (relationStatus === "sent_pending") {
      return (
        <Button variant="outline" disabled className="w-full gap-2 border-primary/20 text-primary/70">
          <Clock className="h-4 w-4" />
          Interest Sent
        </Button>
      );
    }
    if (relationStatus === "rejected") {
      return (
        <Button variant="outline" disabled className="w-full">
          Interest Closed
        </Button>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-full bg-[linear-gradient(135deg,hsl(var(--secondary)/0.45),hsl(var(--background)))] px-4 py-6 pb-28 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl space-y-5">
            <Skeleton className="h-10 w-44 rounded-full" />
            <Skeleton className="h-[420px] w-full rounded-[24px]" />
            <div className="grid gap-4 lg:grid-cols-3">
              <Skeleton className="h-52 rounded-[18px] lg:col-span-2" />
              <Skeleton className="h-52 rounded-[18px]" />
            </div>
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
            <h2 className="text-2xl font-bold text-foreground">
              {isLimitExceeded ? "Profile view limit reached" : "Profile unavailable"}
            </h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              {isLimitExceeded
                ? `You have used your monthly profile views${viewLimit.limit ? ` (${viewLimit.limit})` : ""}. Upgrade your plan to keep browsing.`
                : "You cannot view this profile right now."}
            </p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => navigate("/browse")}>Back to Browse</Button>
              {isLimitExceeded && <Button onClick={() => navigate("/subscriptions")}>Upgrade Plan</Button>}
            </div>
          </div>
        </Layout>
      );
    }

    return (
      <Layout>
        <div className="flex h-full flex-col items-center justify-center px-4 py-32 text-center">
          <ShieldAlert className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-2xl font-bold text-foreground">Profile not found</h2>
          <p className="mt-2 max-w-sm text-muted-foreground">The member you are looking for does not exist or is unavailable.</p>
          <Button variant="outline" onClick={() => navigate("/browse")} className="mt-8">
            Back to Browse
          </Button>
        </div>
      </Layout>
    );
  }

  const hasLifestyle = hasText(profile.introvert_extrovert) || hasText(profile.habits) || hasText(profile.social_preferences) || profile.hobbies?.length > 0;
  const hasGoals = hasText(profile.career_ambition) || hasText(profile.family_goals) || hasText(profile.search_intent) || hasText(profile.lifestyle_choices);

  return (
    <Layout>
      <div className="min-h-full bg-[radial-gradient(circle_at_18%_0%,hsl(var(--primary)/0.12),transparent_28%),linear-gradient(135deg,hsl(var(--secondary)/0.52),hsl(var(--background))_52%,hsl(var(--accent)/0.22))] px-3 py-4 pb-28 dark:bg-[radial-gradient(circle_at_18%_0%,hsl(var(--primary)/0.20),transparent_28%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card))_58%,hsl(var(--accent)/0.12))] sm:px-5 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/browse")}
              className="pressable gap-2 rounded-full text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Browse
            </Button>

            {currentUser && userId !== currentUser.id && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setReportDialogOpen(true)}
                  className="pressable rounded-full text-muted-foreground hover:text-primary"
                  aria-label="Report profile"
                >
                  <Flag className="h-4 w-4" />
                </Button>
                {blocked ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setUnblockDialogOpen(true)}
                    className="pressable rounded-full text-amber-600"
                    aria-label="Unblock profile"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setBlockDialogOpen(true)}
                    className="pressable rounded-full text-muted-foreground hover:text-destructive"
                    aria-label="Block profile"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {blockedByThem && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <p className="text-sm font-medium text-destructive">This member has restricted interactions with you.</p>
            </div>
          )}
          {blocked && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-500/10 p-4">
              <Ban className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">You have blocked this member.</p>
            </div>
          )}

          <section className="overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-sm">
            <div className="grid lg:grid-cols-[minmax(300px,380px)_1fr]">
              <div className="relative min-h-[340px] overflow-hidden bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),hsl(var(--accent)/0.30))] lg:min-h-[500px]">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className={`h-full min-h-[340px] w-full object-cover lg:min-h-[500px] transition-all ${
                      !canViewProfilePhoto() ? "filter blur-lg scale-110 pointer-events-none select-none brightness-90" : ""
                    }`}
                  />
                ) : (
                  <div className="flex h-full min-h-[340px] items-center justify-center lg:min-h-[500px]">
                    <UserAvatar name={profile.name} avatarUrl={profile.avatar_url} blurred={!canViewProfilePhoto()} className="h-44 w-44 border-8 border-background shadow-xl" />
                  </div>
                )}
                {!canViewProfilePhoto() && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
                    <Badge className="mb-3 border-amber-500/40 bg-amber-500/90 text-white shadow-md gap-1.5 px-3 py-1.5 text-xs">
                      <Lock className="h-3.5 w-3.5" /> Photo Blurred • Free Plan
                    </Badge>
                    <p className="text-xs text-white/90 max-w-xs mb-3">
                      Upgrade to Premium to view full profile photos and social links
                    </p>
                    <Button size="sm" className="premium-cta rounded-full text-xs font-bold gap-1.5 shadow-md" onClick={() => navigate('/subscriptions')}>
                      <Crown className="h-3.5 w-3.5" /> Upgrade to View
                    </Button>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/12 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <Badge className="mb-3 border-white/20 bg-white/18 text-white backdrop-blur">
                    {relationCopy[relationStatus]}
                  </Badge>
                  <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                    {profile.name}, {profile.age}
                  </h1>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/86">
                    {profile.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {profile.city}
                      </span>
                    )}
                    {profile.profession && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        {profile.profession}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-6 p-5 sm:p-7 lg:p-8">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Profile summary</p>
                    <h2 className="mt-2 text-2xl font-bold text-foreground">A closer look at {profile.name}</h2>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                      {profile.bio || "Not shared yet."}
                    </p>
                  </div>

                  {matchReasons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {matchReasons.map((reason) => (
                        <Badge key={reason} variant="secondary" className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                          <Sparkles className="mr-1 h-3 w-3" />
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailTile icon={BookOpen} label="Faith" value={profile.religion} note={profile.ethnicity} />
                    <DetailTile icon={GraduationCap} label="Education" value={profile.education} />
                    <DetailTile icon={Globe} label="Languages" value={profile.languages?.join(", ")} />
                    <DetailTile
                      icon={Home}
                      label="Relocation"
                      value={profile.willing_to_relocate ? "Open to relocate" : profile.city ? "Prefers current city" : ""}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">Next step</p>
                      <p className="text-xs text-muted-foreground">Actions update based on your connection status.</p>
                    </div>
                    {relationStatus === "accepted" && (
                      <Badge className="bg-green-500/12 text-green-700 dark:text-green-300">
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

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <main className="space-y-4">
              <PartnerPreferencesMatch profile={profile} myProfile={myProfile} />

              <SectionCard title="Lifestyle & Personality" icon={Smile} empty={!hasLifestyle}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailTile
                    icon={Users}
                    label="Social energy"
                    value={profile.introvert_extrovert ? `${profile.introvert_extrovert}/10 extrovert scale` : ""}
                    note={profile.social_preferences}
                  />
                  <DetailTile icon={Clock} label="Daily habits" value={profile.habits} />
                </div>
                {profile.hobbies?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.hobbies.map((hobby) => (
                      <Badge key={hobby} variant="outline" className="rounded-full bg-primary/5 px-3 py-1">
                        {hobby}
                      </Badge>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Intent & Future" icon={Rocket} empty={!hasGoals}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailTile icon={Search} label="Looking for" value={profile.search_intent} />
                  <DetailTile icon={Briefcase} label="Career ambition" value={profile.career_ambition} />
                  <DetailTile icon={Home} label="Family goals" value={profile.family_goals} />
                  <DetailTile icon={Wine} label="Lifestyle choices" value={profile.lifestyle_choices} />
                </div>
              </SectionCard>

              <SectionCard title="Deeper Insights" icon={Quote} empty={promptEntries.length === 0}>
                <div className="space-y-3">
                  {promptEntries.map(([question, answer]) => (
                    <div key={question} className="rounded-xl border border-border/70 bg-background/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{question}</p>
                      <p className="mt-2 text-sm leading-6 text-foreground">{answer}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </main>

            <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              <Card className="border-card-border bg-card/95 shadow-sm">
                <CardContent className="p-5">
                  <h2 className="text-sm font-bold text-foreground">Quick facts</h2>
                  <div className="mt-4 space-y-3">
                    <DetailTile icon={MapPin} label="Location" value={profile.city} />
                    <DetailTile icon={Briefcase} label="Profession" value={profile.profession} />
                    <DetailTile icon={BookOpen} label="Religion" value={profile.religion} />
                  </div>
                </CardContent>
              </Card>

              {(profile.instagram_url || profile.facebook_url || profile.linkedin_url || profile.twitter_url || profile.other_social_url) && (
                <Card className="border-card-border bg-card/95 shadow-sm relative overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-bold text-foreground">Social Presence</h2>
                      {!canViewSocialLinks && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1 text-[10px]">
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
                        {profile.twitter_url && (
                          <a
                            href={canViewSocialLinks ? profile.twitter_url : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/60 p-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <Globe className="h-4 w-4 text-sky-500" />
                            <span className="truncate">X / Twitter</span>
                          </a>
                        )}
                        {profile.other_social_url && (
                          <a
                            href={canViewSocialLinks ? profile.other_social_url : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/60 p-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <Globe className="h-4 w-4 text-primary" />
                            <span className="truncate">Website / Profile</span>
                          </a>
                        )}
                      </div>

                      {!canViewSocialLinks && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-background/80 p-3 text-center backdrop-blur-xs z-10">
                          <Lock className="h-5 w-5 text-amber-500 mb-1" />
                          <p className="text-xs font-semibold text-foreground">Social links are locked</p>
                          <p className="text-[11px] text-muted-foreground mb-2">Upgrade to Gold or Diamond to view social links</p>
                          <Button size="sm" className="premium-cta h-7 rounded-full text-[11px] font-bold px-3 shadow-none gap-1" onClick={() => navigate('/subscriptions')}>
                            <Crown className="h-3 w-3" /> Upgrade Now
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(physicalDetails.length > 0 || profile.voice_url || profile.video_url) && (
                <Card className="border-card-border bg-card/95 shadow-sm">
                  <CardContent className="p-5">
                    <h2 className="text-sm font-bold text-foreground">Additional details</h2>
                    {physicalDetails.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {physicalDetails.map((detail) => (
                          <span key={detail} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                            {detail.includes("Height") ? (
                              <Calendar className="h-3 w-3" />
                            ) : detail.includes("Weight") || detail.includes("Fitness") ? (
                              <Dumbbell className="h-3 w-3" />
                            ) : (
                              <Palette className="h-3 w-3" />
                            )}
                            {detail}
                          </span>
                        ))}
                      </div>
                    )}
                    {(profile.voice_url || profile.video_url) && (
                      <div className="mt-4 space-y-2">
                        {profile.voice_url && <p className="text-sm text-muted-foreground">Voice intro shared</p>}
                        {profile.video_url && <p className="text-sm text-muted-foreground">Video intro shared</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </div>

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {profile.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to see your profile, send interests, or message you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unblockDialogOpen} onOpenChange={setUnblockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {profile.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be able to interact with you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await handleUnblock(); setUnblockDialogOpen(false); }}>
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
