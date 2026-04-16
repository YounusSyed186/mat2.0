import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { Profile, Interest } from "@/types";
import { Layout } from "@/components/Layout";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, GraduationCap, Briefcase, BookOpen, Heart, MessageCircle, ArrowLeft, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserProfile() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/user/:id");
  const userId = params?.id;
  const { currentUser, profile: myProfile } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: prof }, { data: sent }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("interests").select("*").eq("sender_id", currentUser?.id).eq("receiver_id", userId).maybeSingle(),
      ]);
      setProfile(prof as Profile | null);
      setInterest(sent as Interest | null);
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
    }
    setSending(false);
  };

  const getInterestButton = () => {
    if (!interest) {
      return (
        <Button onClick={handleSendInterest} disabled={sending} data-testid="button-send-interest">
          <Heart className="h-4 w-4 mr-2" />
          {sending ? "Sending..." : "Send Interest"}
        </Button>
      );
    }
    if (interest.status === "pending") {
      return (
        <Button variant="outline" disabled data-testid="button-interest-pending">
          <Clock className="h-4 w-4 mr-2" />
          Interest Sent
        </Button>
      );
    }
    if (interest.status === "accepted") {
      return (
        <Button onClick={() => setLocation(`/chat/${userId}`)} data-testid="button-open-chat">
          <MessageCircle className="h-4 w-4 mr-2" />
          Open Chat
        </Button>
      );
    }
    return (
      <Button variant="outline" disabled data-testid="button-interest-rejected">
        Interest Not Accepted
      </Button>
    );
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
                  <div className="flex gap-2">
                    {interest?.status === "accepted" && (
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
          <Card className="border-card-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed" data-testid="text-bio">{profile.bio}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
