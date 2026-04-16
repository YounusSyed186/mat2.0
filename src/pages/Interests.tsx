import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { Interest, Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, Clock, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function Interests() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [received, setReceived] = useState<Interest[]>([]);
  const [sent, setSent] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInterests = async () => {
    if (!currentUser) return;
    setLoading(true);
    const [{ data: recv }, { data: snt }] = await Promise.all([
      supabase
        .from("interests")
        .select("*, sender:profiles!sender_id(*)")
        .eq("receiver_id", currentUser.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("interests")
        .select("*, receiver:profiles!receiver_id(*)")
        .eq("sender_id", currentUser.id)
        .order("created_at", { ascending: false }),
    ]);
    setReceived((recv as Interest[]) || []);
    setSent((snt as Interest[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInterests();
  }, [currentUser]);

  const handleUpdateStatus = async (interestId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("interests")
      .update({ status })
      .eq("id", interestId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "accepted" ? "Interest accepted!" : "Interest rejected" });
      fetchInterests();
    }
  };

  const statusBadge = (status: string) => {
    if (status === "pending") return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
        <Clock className="h-3 w-3 mr-1" />Pending
      </Badge>
    );
    if (status === "accepted") return (
      <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
        <Check className="h-3 w-3 mr-1" />Accepted
      </Badge>
    );
    return (
      <Badge variant="outline" className="text-muted-foreground text-xs">
        <X className="h-3 w-3 mr-1" />Rejected
      </Badge>
    );
  };

  const InterestCard = ({ interest, type }: { interest: Interest; type: "received" | "sent" }) => {
    const person = type === "received" ? interest.sender : interest.receiver;
    if (!person) return null;
    return (
      <Card className="border-card-border shadow-sm" data-testid={`card-interest-${interest.id}`}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <div
              className="cursor-pointer"
              onClick={() => setLocation(`/user/${person.id}`)}
            >
              <UserAvatar name={person.name} avatarUrl={person.avatar_url} size="md" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    className="font-medium text-foreground hover:text-primary cursor-pointer transition-colors"
                    onClick={() => setLocation(`/user/${person.id}`)}
                  >
                    {person.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {(person as Profile).age} yrs · {(person as Profile).city}
                  </p>
                </div>
                <div className="flex-shrink-0">{statusBadge(interest.status)}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true })}
              </p>
              {type === "received" && interest.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(interest.id, "accepted")}
                    data-testid={`button-accept-${interest.id}`}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(interest.id, "rejected")}
                    data-testid={`button-reject-${interest.id}`}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
              {interest.status === "accepted" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setLocation(`/chat/${person.id}`)}
                  data-testid={`button-chat-${interest.id}`}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                  Open Chat
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Heart className="h-10 w-10 text-muted-foreground/30 mb-3" />
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-serif text-2xl font-bold text-foreground mb-6">Interests</h1>
        <Tabs defaultValue="received">
          <TabsList className="mb-6">
            <TabsTrigger value="received" data-testid="tab-received">
              Received
              {received.filter((i) => i.status === "pending").length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                  {received.filter((i) => i.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent">Sent</TabsTrigger>
          </TabsList>
          <TabsContent value="received">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}><CardContent className="pt-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : received.length === 0 ? (
              <EmptyState label="No interests received yet" />
            ) : (
              <div className="space-y-3">
                {received.map((i) => <InterestCard key={i.id} interest={i} type="received" />)}
              </div>
            )}
          </TabsContent>
          <TabsContent value="sent">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}><CardContent className="pt-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : sent.length === 0 ? (
              <EmptyState label="You haven't sent any interests yet" />
            ) : (
              <div className="space-y-3">
                {sent.map((i) => <InterestCard key={i.id} interest={i} type="sent" />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
