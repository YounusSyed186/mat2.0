import { useEffect, useMemo, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ChevronDown, Clock3, MessageCircle, MoreVertical, Search, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useBlockStore } from "@/stores/useBlockStore";
import type { Interest, Message, Profile } from "@/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";

interface ConversationSummary {
  person: Profile;
  interest: Interest;
  lastMessage: Message | null;
}

interface ChatConversationPanelProps {
  activeUserId?: string | null;
  className?: string;
  onSelect: (userId: string) => void;
}

function formatConversationTime(date?: string | null) {
  if (!date) return "Accepted match";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Accepted match";

  if (isToday(parsed)) return `Today | ${format(parsed, "hh:mm a")}`;
  if (isYesterday(parsed)) return `Yesterday | ${format(parsed, "hh:mm a")}`;
  return format(parsed, "d MMM | hh:mm a");
}

function getConversationPreview(conversation: ConversationSummary) {
  if (conversation.lastMessage?.content) return conversation.lastMessage.content;
  if (conversation.person.profession) return `${conversation.person.city} · ${conversation.person.profession}`;
  return conversation.person.city || "Ready to chat";
}

export function ChatConversationPanel({
  activeUserId,
  className,
  onSelect,
}: ChatConversationPanelProps) {
  const { currentUser } = useAuth();
  const { blocks, fetchBlocks, isBlockRelation } = useBlockStore();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (currentUser) fetchBlocks(currentUser.id);
  }, [currentUser, fetchBlocks]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      setLoading(true);

      const [{ data: sent }, { data: received }] = await Promise.all([
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

      const accepted: { person: Profile; interest: Interest }[] = [];
      ((sent as Interest[]) || []).forEach((interest) => {
        if (interest.receiver) accepted.push({ person: interest.receiver as Profile, interest });
      });
      ((received as Interest[]) || []).forEach((interest) => {
        if (interest.sender) accepted.push({ person: interest.sender as Profile, interest });
      });

      const visibleConversations = accepted.filter(({ person }) => !isBlockRelation(person.id));

      const withLastMessages = await Promise.all(
        visibleConversations.map(async (conversation) => {
          const { data } = await supabase
            .from("messages")
            .select("*")
            .or(
              `and(sender_id.eq.${currentUser.id},receiver_id.eq.${conversation.person.id}),and(sender_id.eq.${conversation.person.id},receiver_id.eq.${currentUser.id})`
            )
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conversation,
            lastMessage: (data as Message | null) || null,
          };
        })
      );

      withLastMessages.sort((a, b) => {
        const aDate = a.lastMessage?.created_at || a.interest.created_at;
        const bDate = b.lastMessage?.created_at || b.interest.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      setConversations(withLastMessages);
      setLoading(false);
    };

    fetchConversations();
  }, [blocks, currentUser, isBlockRelation]);

  const filteredConversations = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return conversations;

    return conversations.filter((conversation) => {
      const preview = getConversationPreview(conversation).toLowerCase();
      return [
        conversation.person.name,
        conversation.person.city,
        conversation.person.profession,
        preview,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search));
    });
  }, [conversations, query]);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden bg-card md:w-[348px] md:shrink-0",
        className
      )}
    >
      <div className="shrink-0 border-b border-border/60 bg-[linear-gradient(135deg,hsl(var(--primary)/0.16),hsl(var(--accent)/0.82))] px-5 py-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-bold text-foreground"
            aria-label="All messages"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <MessageCircle className="h-4 w-4" />
            </span>
            All Messages
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card/70 text-muted-foreground shadow-sm hover:bg-card hover:text-foreground"
            aria-label="Messages menu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search or start a new chat"
            className="h-10 rounded-full border-primary/10 bg-card/80 pl-9 shadow-sm placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
            type="search"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--secondary)/0.42))] px-3 py-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-3 rounded-2xl bg-background/55 px-4 py-4">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock3 className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">No conversations found</p>
            <p className="mt-1 text-xs text-muted-foreground">Accepted interests will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => {
              const isActive = conversation.person.id === activeUserId;
              const preview = getConversationPreview(conversation);
              const previewDate = conversation.lastMessage?.created_at || conversation.interest.created_at;

              return (
                <button
                  key={conversation.person.id}
                  type="button"
                  onClick={() => onSelect(conversation.person.id)}
                  className={cn(
                    "group flex w-full gap-3 rounded-2xl border border-transparent px-4 py-3 text-left transition-all hover:border-border/80 hover:bg-card hover:shadow-sm",
                    isActive && "border-primary/25 bg-primary/10 shadow-sm hover:border-primary/30 hover:bg-primary/10"
                  )}
                  data-testid={`card-conversation-${conversation.person.id}`}
                >
                  <UserAvatar
                    name={conversation.person.name}
                    avatarUrl={conversation.person.avatar_url}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="truncate text-sm font-bold text-foreground group-hover:text-primary">
                        {conversation.person.name}
                      </h3>
                      <Star
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          isActive ? "fill-primary text-primary" : "text-[hsl(var(--chart-2))]"
                        )}
                      />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground/80">{preview}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate rounded-full bg-secondary/75 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {formatConversationTime(previewDate)}
                      </p>
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          isActive ? "bg-primary" : "bg-[hsl(var(--chart-2))]"
                        )}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
