import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useBlockStore } from "@/stores/useBlockStore";
import type { Interest, Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, ChevronRight } from "lucide-react";

export default function ChatList() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const { isBlockRelation, fetchBlocks } = useBlockStore();
  const [conversations, setConversations] = useState<{ person: Profile; interest: Interest }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) fetchBlocks(currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchConversations = async () => {
      setLoading(true);
      const [{ data: sent }, { data: recv }] = await Promise.all([
        supabase
          .from("interests")
          .select("*, receiver:profiles!receiver_id(*)")
          .eq("sender_id", currentUser.id)
          .eq("status", "accepted"),
        supabase
          .from("interests")
          .select("*, sender:profiles!sender_id(*)")
          .eq("receiver_id", currentUser.id)
          .eq("status", "accepted"),
      ]);
      const convos: { person: Profile; interest: Interest }[] = [];
      (sent as Interest[] || []).forEach((i) => {
        if (i.receiver) convos.push({ person: i.receiver as Profile, interest: i });
      });
      (recv as Interest[] || []).forEach((i) => {
        if (i.sender) convos.push({ person: i.sender as Profile, interest: i });
      });

      // Filter out blocked users
      const filtered = convos.filter(c => !isBlockRelation(c.person.id));
      setConversations(filtered);
      setLoading(false);
    };
    fetchConversations();
  }, [currentUser, isBlockRelation]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-serif text-2xl font-bold text-foreground mb-6">Messages</h1>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-medium text-foreground">No conversations yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Accept or have your interests accepted to start chatting</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(({ person }) => (
              <Card
                key={person.id}
                className="border-card-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setLocation(`/chat/${person.id}`)}
                data-testid={`card-conversation-${person.id}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={person.name} avatarUrl={person.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {person.name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {person.city}{person.profession ? ` · ${person.profession}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
