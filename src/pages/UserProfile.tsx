import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useBlockStore } from "@/stores/useBlockStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { Profile, Interest } from "@/types";
import { Layout } from "@/components/Layout";
import { UserAvatar } from "@/components/UserAvatar";
import { ReportDialog } from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  MapPin, GraduationCap, Briefcase, BookOpen, Heart, MessageCircle, 
  ArrowLeft, CheckCircle, Clock, Ban, Flag, ShieldAlert, Sparkles,
  Globe, Users, Calendar, Coffee, Dumbbell, Palette, Rocket, Home,
  Wine, Search, Smile, Quote
} from "lucide-react";
import { toast } from "sonner";

export default function UserProfile() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/user/:id");
  const userId = params?.id;
  const { currentUser, profile: myProfile } = useAuth();
  const { isBlocked, isBlockedBy, isBlockRelation, blockUser, unblockUser, fetchBlocks } = useBlockStore();
  const { createNotification } = useNotificationStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [reverseInterest, setReverseInterest] = useState<Interest | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (!userId || !currentUser) return;

    fetchBlocks(currentUser.id);

    const fetchAll = async () => {
      setLoading(true);
      try {
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
  }, [userId, currentUser]);

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
      await createNotification(userId, 'interest_received', currentUser.id, myProfile?.name || 'Someone');
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

  const blocked = userId ? isBlocked(userId) : false;
  const blockedByThem = userId ? isBlockedBy(userId) : false;
  const hasBlockRelation = userId ? isBlockRelation(userId) : false;

  const acceptedInterest = interest?.status === 'accepted' || reverseInterest?.status === 'accepted';

  const getInterestButton = () => {
    if (hasBlockRelation) return null;

    if (acceptedInterest) {
      return (
        <Button onClick={() => setLocation(`/chat/${userId}`)} className="bg-primary hover:bg-primary/90">
          <MessageCircle className="h-4 w-4 mr-2" />
          Open Chat
        </Button>
      );
    }

    if (!interest && !reverseInterest) {
      return (
        <Button onClick={handleSendInterest} disabled={sending} className="bg-primary hover:bg-primary/90">
          <Heart className="h-4 w-4 mr-2" />
          {sending ? "Sending..." : "Send Interest"}
        </Button>
      );
    }
    if (interest?.status === "pending") {
      return (
        <Button variant="outline" disabled className="border-primary/20 text-primary/70">
          <Clock className="h-4 w-4 mr-2" />
          Interest Sent
        </Button>
      );
    }
    if (interest?.status === "rejected") {
      return (
        <Button variant="outline" disabled>
          Interest Not Accepted
        </Button>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full py-32 text-center">
          <ShieldAlert className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-2xl font-serif font-bold">Profile not found</h2>
          <p className="text-muted-foreground mt-2">The user you are looking for doesn't exist or is unavailable.</p>
          <Button variant="outline" onClick={() => setLocation("/browse")} className="mt-8">Back to Browse</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation("/browse")}
            className="group text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Browse
          </Button>
          
          <div className="flex gap-2">
            {currentUser && userId !== currentUser.id && (
              <>
                <Button variant="ghost" size="icon" onClick={() => setReportDialogOpen(true)} className="text-muted-foreground">
                  <Flag className="h-4 w-4" />
                </Button>
                {blocked ? (
                  <Button variant="ghost" size="icon" onClick={() => setUnblockDialogOpen(true)} className="text-amber-600">
                    <Ban className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setBlockDialogOpen(true)} className="text-muted-foreground">
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Status Banners */}
        {blockedByThem && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">This user has restricted interactions with you.</p>
          </div>
        )}
        {blocked && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
            <Ban className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-700">You have blocked this user.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Avatar & Quick Info */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-card-border overflow-hidden shadow-lg">
              <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
                <UserAvatar name={profile.name} avatarUrl={profile.avatar_url} className="w-48 h-48 border-8 border-background shadow-xl" />
                {profile.is_verified && (
                  <div className="absolute bottom-6 right-6 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                )}
              </div>
              <CardContent className="pt-6 text-center">
                <h1 className="text-3xl font-serif font-bold">{profile.name}, {profile.age}</h1>
                <p className="text-muted-foreground font-medium mt-1">{profile.profession}</p>
                
                <div className="mt-6 flex flex-col gap-3">
                  {getInterestButton()}
                  {acceptedInterest && (
                    <Badge className="py-2 bg-green-100 text-green-700 border-green-200 justify-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Location & Background</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {profile.city && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-lg"><MapPin className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="font-semibold">{profile.city}</p>
                      <p className="text-xs text-muted-foreground">{profile.willing_to_relocate ? 'Willing to relocate' : 'Prefer staying here'}</p>
                    </div>
                  </div>
                )}
                {profile.religion && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-lg"><BookOpen className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="font-semibold">{profile.religion}</p>
                      <p className="text-xs text-muted-foreground">{profile.ethnicity || 'Identity'}</p>
                    </div>
                  </div>
                )}
                {profile.languages && profile.languages.length > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-lg"><Globe className="h-4 w-4 text-primary" /></div>
                    <div className="flex flex-wrap gap-1">
                      {profile.languages.map((lang, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] py-0">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Detailed Info */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Bio */}
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                <Quote className="h-6 w-6 text-primary/50" />
                About Me
              </h2>
              <Card className="border-none shadow-none bg-muted/30 relative">
                <CardContent className="pt-6">
                  <p className="text-lg leading-relaxed text-foreground/90 italic">
                    "{profile.bio || `Hi, I'm ${profile.name}! I'm looking for a meaningful connection and someone to share life's adventures with.`}"
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Lifestyle & Personality */}
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-bold flex items-center gap-2 border-b pb-2">
                <Smile className="h-5 w-5 text-primary" />
                Lifestyle & Personality
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-card-border shadow-sm">
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Social Preference</p>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{profile.introvert_extrovert ? `${profile.introvert_extrovert}/10 on Extrovert Scale` : 'Socially Adaptive'}</span>
                      </div>
                    </div>
                    {profile.habits && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Daily Habits</p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{profile.habits}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-card-border shadow-sm">
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Hobbies & Interests</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {profile.hobbies && profile.hobbies.length > 0 ? (
                          profile.hobbies.map((hobby, i) => (
                            <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20">{hobby}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No hobbies listed</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Values & Goals */}
            <div className="space-y-4">
              <h3 className="text-xl font-serif font-bold flex items-center gap-2 border-b pb-2">
                <Rocket className="h-5 w-5 text-primary" />
                Values & Future Goals
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="border-card-border shadow-sm">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Briefcase className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Career Ambition</p>
                        <p className="text-sm font-medium">{profile.career_ambition || 'Professional Growth'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Home className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Family Goals</p>
                        <p className="text-sm font-medium">{profile.family_goals || 'Building a life together'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-card-border shadow-sm">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Search className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Search Intent</p>
                        <p className="text-sm font-medium">{profile.search_intent || 'Serious Relationship'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Wine className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-xs text-muted-foreground">Lifestyle Choices</p>
                        <p className="text-sm font-medium">{profile.lifestyle_choices || 'Balanced'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Personality Prompts */}
            {profile.prompts && Object.keys(profile.prompts).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-serif font-bold flex items-center gap-2 border-b pb-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Deeper Insights
                </h3>
                <div className="space-y-4">
                  {Object.entries(profile.prompts).map(([question, answer], i) => (
                    answer && (
                      <Card key={i} className="border-l-4 border-l-primary border-card-border shadow-sm">
                        <CardContent className="pt-4">
                          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{question}</p>
                          <p className="text-base text-foreground/90 font-medium">{answer as string}</p>
                        </CardContent>
                      </Card>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Physical Attributes (Subtle) */}
            {(profile.height || profile.fitness_level || profile.style) && (
              <div className="flex flex-wrap gap-4 pt-4 border-t opacity-70">
                {profile.height && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>Height: {profile.height}cm</span>
                  </div>
                )}
                {profile.weight && (
                  <div className="flex items-center gap-2 text-xs">
                    <Dumbbell className="h-3 w-3" />
                    <span>Weight: {profile.weight}kg</span>
                  </div>
                )}
                {profile.fitness_level && (
                  <div className="flex items-center gap-2 text-xs">
                    <Dumbbell className="h-3 w-3" />
                    <span>Fitness: {profile.fitness_level}</span>
                  </div>
                )}
                {profile.style && (
                  <div className="flex items-center gap-2 text-xs">
                    <Palette className="h-3 w-3" />
                    <span>Style: {profile.style}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
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
