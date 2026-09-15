import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useBlockStore } from "@/stores/useBlockStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { Interest, Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  MessageCircle,
  Clock,
  Check,
  X,
  Filter,
  Search,
  ArrowLeft,
  UserPlus,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types for enhanced features
type InterestFilter = "all" | "pending" | "accepted" | "rejected";

interface InterestWithProfile extends Interest {
  sender?: Profile;
  receiver?: Profile;
}

export default function Interests() {
  const navigate = useNavigate();
  const { currentUser, profile: myProfile } = useAuth();
  const { toast } = useToast();
  const { isBlockRelation, fetchBlocks } = useBlockStore();
  const { createNotification } = useNotificationStore();

  const [received, setReceived] = useState<InterestWithProfile[]>([]);
  const [sent, setSent] = useState<InterestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InterestFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"received" | "sent">("received");

  // Fetch blocked users on mount
  useEffect(() => {
    if (currentUser) fetchBlocks(currentUser.id);
  }, [currentUser, fetchBlocks]);

  // Fetch interests with realtime subscription
  const fetchInterests = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      const [recvResult, sntResult] = await Promise.all([
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

      if (recvResult.error) throw recvResult.error;
      if (sntResult.error) throw sntResult.error;

      setReceived((recvResult.data as InterestWithProfile[]) || []);
      setSent((sntResult.data as InterestWithProfile[]) || []);
    } catch (error) {
      console.error("Error fetching interests:", error);
      toast({
        title: "Error",
        description: "Failed to load interests. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!currentUser) return;

    let refreshTimer: ReturnType<typeof window.setTimeout> | undefined;
    const queueRefresh = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        fetchInterests();
      }, 250);
    };

    const channel = supabase
      .channel('interests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interests',
          filter: `receiver_id=eq.${currentUser.id}`,
        },
        queueRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interests',
          filter: `sender_id=eq.${currentUser.id}`,
        },
        queueRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchInterests]);

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  const handleUpdateStatus = useCallback(async (
    interestId: string,
    status: "accepted" | "rejected",
    senderId: string,
    senderName?: string
  ) => {
    const { error } = await supabase
      .from("interests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", interestId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    toast({
      title: status === "accepted" ? "Interest accepted!" : "Interest rejected",
      description: status === "accepted"
        ? `You can now chat with ${senderName || "this user"}`
        : "You've declined this interest",
    });

    if (status === "accepted" && currentUser) {
      await createNotification(
        senderId,
        'interest_accepted',
        currentUser.id,
        myProfile?.name || 'Someone'
      );
    }

    await fetchInterests();
    return true;
  }, [currentUser, myProfile, toast, createNotification, fetchInterests]);

  // Filter and search logic
  const filterInterests = useCallback((interests: InterestWithProfile[]) => {
    let filtered = [...interests];

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter(i => i.status === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i => {
        const person = i.sender || i.receiver;
        return person?.name?.toLowerCase().includes(query) ||
               person?.city?.toLowerCase().includes(query);
      });
    }

    // Filter out blocked users
    filtered = filtered.filter(i => {
      const person = i.sender || i.receiver;
      return person && !isBlockRelation(person.id);
    });

    const statusPriority: Record<InterestFilter, number> = {
      pending: 0,
      accepted: 1,
      rejected: 2,
      all: 3,
    };

    filtered.sort((a, b) => {
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  }, [filter, searchQuery, isBlockRelation]);

  const filteredReceived = useMemo(() =>
    filterInterests(received),
    [received, filterInterests]
  );

  const filteredSent = useMemo(() =>
    filterInterests(sent),
    [sent, filterInterests]
  );

  const pendingCount = useMemo(() =>
    received.filter(i => i.status === "pending" && !isBlockRelation(i.sender_id)).length,
    [received, isBlockRelation]
  );

  const acceptedCount = useMemo(() =>
    received.filter(i => i.status === "accepted").length,
    [received]
  );

  const statusBadge = (status: Interest["status"]) => {
    const config: Record<Interest["status"], {
      variant: BadgeProps["variant"];
      className: string;
      icon: typeof Clock;
      text: string;
    }> = {
      pending: { variant: "secondary", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, text: "Pending" },
      accepted: { variant: "default", className: "bg-green-100 text-green-700 border-green-200", icon: Check, text: "Accepted" },
      rejected: { variant: "outline", className: "text-muted-foreground", icon: X, text: "Rejected" }
    };

    const { variant, className, icon: Icon, text } = config[status];

    return (
      <Badge variant={variant} className={`${className} text-xs`}>
        <Icon className="h-3 w-3 mr-1" />
        {text}
      </Badge>
    );
  };

  const InterestCard = ({ interest, type }: { interest: InterestWithProfile; type: "received" | "sent" }) => {
    const person = type === "received" ? interest.sender : interest.receiver;
    if (!person) return null;

    return (
      <div className="animate-soft-enter">
        <Card
          className="interactive-surface border-card-border shadow-sm"
          data-testid={`card-interest-${interest.id}`}
        >
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              <div
                className="cursor-pointer flex-shrink-0"
                onClick={() => navigate(`/user/${person.id}`)}
              >
                <UserAvatar
                  name={person.name}
                  avatarUrl={person.avatar_url}
                  size="md"
                  className="ring-2 ring-primary/20"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3
                      className="font-medium text-foreground hover:text-primary cursor-pointer transition-colors"
                      onClick={() => navigate(`/user/${person.id}`)}
                    >
                      {person.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {person.age} yrs · {person.city}
                      {person.profession && ` · ${person.profession}`}
                    </p>
                  </div>
                  <div className="flex-shrink-0">{statusBadge(interest.status)}</div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true })}
                </p>

                <div className="flex gap-2 mt-3 flex-wrap">
                  {type === "received" && interest.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(interest.id, "accepted", interest.sender_id, person.name)}
                        data-testid={`button-accept-${interest.id}`}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(interest.id, "rejected", interest.sender_id)}
                        data-testid={`button-reject-${interest.id}`}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}

                  {interest.status === "accepted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/chat/${person.id}`)}
                      data-testid={`button-chat-${interest.id}`}
                      className="border-primary/30 hover:bg-primary/10"
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      Open Chat
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/user/${person.id}`)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    View Profile
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const EmptyState = ({
    label,
    description,
    action
  }: {
    label: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full p-6 mb-4">
        <Heart className="h-12 w-12 text-primary/40" />
      </div>
      <p className="text-muted-foreground font-medium">{label}</p>
      {description && (
        <p className="text-sm text-muted-foreground/60 mt-1">{description}</p>
      )}
      {action && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );

  const StatsBar = () => (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 rounded-lg p-3 text-center">
        <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
        <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</p>
        <p className="text-xs text-amber-600 dark:text-amber-400">Pending</p>
      </div>
      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-lg p-3 text-center">
        <Check className="h-5 w-5 text-green-600 mx-auto mb-1" />
        <p className="text-2xl font-bold text-green-700 dark:text-green-400">{acceptedCount}</p>
        <p className="text-xs text-green-600 dark:text-green-400">Connected</p>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg p-3 text-center">
        <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{received.length + sent.length}</p>
        <p className="text-xs text-blue-600 dark:text-blue-400">Total</p>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/browse")}
            className="lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-bold text-foreground">
              Interests
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your connections and chat requests
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        {!loading && received.length > 0 && <StatsBar />}

        <Tabs
          defaultValue="received"
          value={selectedTab}
          onValueChange={(v) => {
            setSelectedTab(v as "received" | "sent");
            setFilter("all");
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="received" data-testid="tab-received" className="flex-1">
                Received
                {pendingCount > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px]">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" data-testid="tab-sent" className="flex-1">
                Sent
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 h-9 text-sm"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    {filter === "all" ? "All" : filter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilter("all")}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("pending")}>
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("accepted")}>
                    Accepted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter("rejected")}>
                    Rejected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <TabsContent value="received">
            {loading ? (
              <div className="animate-soft-enter space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredReceived.length === 0 ? (
              <EmptyState
                label={
                  searchQuery || filter !== "all"
                    ? "No matching interests found"
                    : "No interests received yet"
                }
                description={
                  searchQuery || filter !== "all"
                    ? "Try adjusting your filters"
                    : "When someone shows interest in you, it will appear here"
                }
                action={
                  !searchQuery && filter === "all" && received.length === 0
                    ? { label: "Browse Profiles", onClick: () => navigate("/browse") }
                    : undefined
                }
              />
            ) : (
              <div className="animate-soft-enter space-y-3">
                {filteredReceived.map((interest) => (
                  <InterestCard
                    key={interest.id}
                    interest={interest}
                    type="received"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent">
            {loading ? (
              <div className="animate-soft-enter space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredSent.length === 0 ? (
              <EmptyState
                label={
                  searchQuery || filter !== "all"
                    ? "No matching interests found"
                    : "You haven't sent any interests yet"
                }
                description={
                  searchQuery || filter !== "all"
                    ? "Try adjusting your filters"
                    : "Show interest in someone to start a conversation"
                }
                action={
                  !searchQuery && filter === "all" && sent.length === 0
                    ? { label: "Find Matches", onClick: () => navigate("/browse") }
                    : undefined
                }
              />
            ) : (
              <div className="animate-soft-enter space-y-3">
                {filteredSent.map((interest) => (
                  <InterestCard
                    key={interest.id}
                    interest={interest}
                    type="sent"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
