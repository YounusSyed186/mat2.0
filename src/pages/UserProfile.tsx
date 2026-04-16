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
import { MapPin, GraduationCap, Briefcase, BookOpen, Heart, MessageCircle, ArrowLeft, CheckCircle, Clock, Ban, Flag, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserProfile() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/user/:id");
  const userId = params?.id;
  const { currentUser, profile: myProfile } = useAuth();
  const { toast } = useToast();
  const { isBlocked, isBlockedBy, isBlockRelation, blockUser, unblockUser, fetchBlocks } = useBlockStore();
  const { createNotification } = useNotificationStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [reverseInterest, setReverseInterest] = useState<Interest | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (!userId || !currentUser) return;

    fetchBlocks(currentUser.id);

    const fetchAll = async () => {
      setLoading(true);
      const [{ data: prof }, { data: sent }, { data: recv }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("interests").select("*").eq("sender_id", currentUser.id).eq("receiver_id", userId).maybeSingle(),
        supabase.from("interests").select("*").eq("sender_id", userId).eq("receiver_id", currentUser.id).maybeSingle(),
      ]);
      setProfile(prof as Profile | null);
      setInterest(sent as Interest | null);
      setReverseInterest(recv as Interest | null);
      setLoading(false);
    };
    fetchAll();
  }, [userId, currentUser]);

  const handleSendInterest = async () => {
    if (!currentUser || !userId) return;
    if (myProfile?.is_blocked) {
      toast({ title: "Your account is blocked", description: "You cannot send interests.", variant: "destructive" });
      return;
    }
    if (isBlockRelation(userId)) {
      toast({ title: "Cannot send interest", description: "There is a block between you and this user.", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase
      .from("interests")
      .insert({ sender_id: currentUser.id, receiver_id: userId, status: "pending" })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setInterest(data as Interest);
      toast({ title: "Interest sent!", description: `Your interest has been sent to ${profile?.name}.` });
      // Create notification for receiver
      await createNotification(userId, 'interest_received', currentUser.id);
    }
    setSending(false);
  };

  const handleBlock = async () => {
    if (!currentUser || !userId) return;
    setBlocking(true);
    const success = await blockUser(currentUser.id, userId);
    if (success) {
      toast({ title: "User blocked", description: `${profile?.name} has been blocked.` });
    } else {
      toast({ title: "Failed to block user", variant: "destructive" });
    }
    setBlocking(false);
    setBlockDialogOpen(false);
  };

  const handleUnblock = async () => {
    if (!currentUser || !userId) return;
    setBlocking(true);
    const success = await unblockUser(currentUser.id, userId);
    if (success) {
      toast({ title: "User unblocked", description: `${profile?.name} has been unblocked.` });
    } else {
      toast({ title: "Failed to unblock user", variant: "destructive" });
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
        <Button onClick={() => setLocation(`/chat/${userId}`)} data-testid="button-open-chat">
          <MessageCircle className="h-4 w-4 mr-2" />
          Open Chat
        </Button>
      );
    }

    if (!interest && !reverseInterest) {
      return (
        <Button onClick={handleSendInterest} disabled={sending} data-testid="button-send-interest">
          <Heart className="h-4 w-4 mr-2" />
          {sending ? "Sending..." : "Send Interest"}
        </Button>
      );
    }
    if (interest?.status === "pending") {
      return (
        <Button variant="outline" disabled data-testid="button-interest-pending">
          <Clock className="h-4 w-4 mr-2" />
          Interest Sent
        </Button>
      );
    }
    if (interest?.status === "rejected") {
      return (
        <Button variant="outline" disabled data-testid="button-interest-rejected">
          Interest Not Accepted
        </Button>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-40 mb-6" />
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full py-20">
          <p className="text-muted-foreground">Profile not found</p>
          <Button variant="ghost" onClick={() => setLocation("/browse")} className="mt-4">Back to Browse</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/browse")}
          className="mb-6 text-muted-foreground"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Browse
        </Button>

        {/* Block banner */}
        {blockedByThem && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">This user has restricted interactions with you.</p>
          </div>
        )}

        {blocked && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
            <Ban className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">You have blocked this user.</p>
          </div>
        )}

        <Card className="border-card-border shadow-sm mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <UserAvatar name={profile.name} avatarUrl={profile.avatar_url} size="xl" className="self-center sm:self-start" />
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="font-serif text-2xl font-bold text-foreground" data-testid="text-profile-name">
                      {profile.name}
                    </h1>
                    <p className="text-muted-foreground mt-0.5">
                      {profile.age} years · {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {acceptedInterest && !hasBlockRelation && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                    {getInterestButton()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
                  {profile.city && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />{profile.city}
                    </p>
                  )}
                  {profile.religion && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4 flex-shrink-0" />{profile.religion}
                    </p>
                  )}
                  {profile.education && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GraduationCap className="h-4 w-4 flex-shrink-0" />{profile.education}
                    </p>
                  )}
                  {profile.profession && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4 flex-shrink-0" />{profile.profession}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {profile.bio && (
          <Card className="border-card-border shadow-sm mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed" data-testid="text-bio">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions card: Block & Report */}
        {currentUser && userId !== currentUser.id && (
          <Card className="border-card-border shadow-sm">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {blocked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnblock}
                    disabled={blocking}
                    data-testid="button-unblock-user"
                  >
                    <Ban className="h-3.5 w-3.5 mr-1.5" />
                    {blocking ? "Unblocking..." : "Unblock User"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBlockDialogOpen(true)}
                    disabled={blocking}
                    data-testid="button-block-user"
                  >
                    <Ban className="h-3.5 w-3.5 mr-1.5" />
                    Block User
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportDialogOpen(true)}
                  data-testid="button-report-user"
                >
                  <Flag className="h-3.5 w-3.5 mr-1.5" />
                  Report User
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent data-testid="block-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Block {profile.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              When you block someone, they won't be able to see your profile, send you interests, or message you. You also won't see them in your browse results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="block-cancel-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} data-testid="block-confirm-btn">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
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
