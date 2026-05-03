import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useBlockStore } from "@/stores/useBlockStore";
import { useChatStore } from "@/stores/useChatStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { Message, Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { ChatConversationPanel } from "@/components/ChatConversationPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";
import {
  ArrowLeft,
  Ban,
  Lock,
  Mic,
  MoreVertical,
  Plus,
  Search,
  Send,
  Smile,
  Star,
  ThumbsUp,
  Wifi,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

export default function Chat() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/chat/:userId");
  const otherUserId = params?.userId;
  const { currentUser, profile: myProfile } = useAuth();
  const { toast } = useToast();
  const { isBlockRelation, fetchBlocks } = useBlockStore();
  const { setActiveChatUser } = useChatStore();
  const { createNotification } = useNotificationStore();

  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [canChat, setCanChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Stable channel name
  const channelName = currentUser && otherUserId
    ? `chat:${[currentUser.id, otherUserId].sort().join(":")}`
    : null;
  const isUserBlocked = otherUserId ? isBlockRelation(otherUserId) : false;

  useEffect(() => {
    if (!otherUserId || !currentUser) return;

    fetchBlocks(currentUser.id);
    setActiveChatUser(otherUserId);

    const fetchAll = async () => {
      setLoading(true);
      const [{ data: prof }, { data: interest }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", otherUserId).single(),
        supabase
          .from("interests")
          .select("*")
          .eq("status", "accepted")
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
          )
          .maybeSingle(),
      ]);
      setOtherProfile(prof as Profile | null);
      setCanChat(!!interest);

      if (interest) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
          )
          .order("created_at", { ascending: true });
        const loaded = (msgs as Message[]) || [];
        loaded.forEach((m) => seenIds.current.add(m.id));
        setMessages(loaded);
      }
      setLoading(false);
    };
    fetchAll();

    return () => {
      setActiveChatUser(null);
    };
  }, [otherUserId, currentUser, fetchBlocks, setActiveChatUser]);

  // Real-time WebSocket channel via Supabase Broadcast
  useEffect(() => {
    if (!canChat || !currentUser || !otherUserId || !channelName || isUserBlocked) return;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "new-message" }, ({ payload }) => {
        const msg = payload as Message;
        const isForMe =
          msg.sender_id === otherUserId && msg.receiver_id === currentUser.id;
        if (!isForMe) return;

        if (seenIds.current.has(msg.id)) return;
        seenIds.current.add(msg.id);
        setMessages((prev) => [...prev, msg]);
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [canChat, currentUser, otherUserId, channelName, isUserBlocked]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !otherUserId) return;
    if (myProfile?.is_blocked) {
      toast({ title: "Your account is blocked", variant: "destructive" });
      return;
    }
    if (isUserBlocked) {
      toast({ title: "Cannot send message", description: "There is a block between you and this user.", variant: "destructive" });
      return;
    }

    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    // Insert to DB
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: currentUser.id, receiver_id: otherUserId, content })
      .select()
      .maybeSingle();

    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      setNewMessage(content);
      setSending(false);
      return;
    }

    const sent = data as Message;

    // Add to own UI immediately (with dedup guard)
    if (!seenIds.current.has(sent.id)) {
      seenIds.current.add(sent.id);
      setMessages((prev) => [...prev, sent]);
    }

    // Broadcast to the other user via channel
    const key = `chat:${[currentUser.id, otherUserId].sort().join(":")}`;
    const existingChannel = supabase.channel(key);
    if (existingChannel) {
      await existingChannel.send({
        type: "broadcast",
        event: "new-message",
        payload: sent,
      });
    }

    // Create notification for receiver
    await createNotification(otherUserId, 'message', currentUser.id, myProfile?.name || 'Someone');

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    for (const msg of msgs) {
      const date = format(new Date(msg.created_at), "MMMM d, yyyy");
      const last = groups[groups.length - 1];
      if (last && last.date === date) {
        last.messages.push(msg);
      } else {
        groups.push({ date, messages: [msg] });
      }
    }
    return groups;
  };

  const formatGroupDate = (date: string) => {
    const parsed = new Date(date);
    if (isToday(parsed)) return "Today";
    if (isYesterday(parsed)) return "Yesterday";
    return date;
  };

  return (
    <Layout>
      <div className="flex h-full min-h-0 bg-[linear-gradient(135deg,hsl(var(--secondary)/0.55),hsl(var(--accent)/0.38),hsl(var(--background)))] p-2 sm:p-3">
        <div className="flex min-h-0 w-full overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-[0_18px_45px_rgba(70,15,38,0.10)]">
          <ChatConversationPanel
            activeUserId={otherUserId}
            onSelect={(userId) => setLocation(`/chat/${userId}`)}
            className="hidden border-r border-border/70 md:flex"
          />

          <section className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex h-[70px] shrink-0 items-center gap-3 border-b border-border/70 bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--accent)/0.55))] px-4 shadow-sm sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full md:hidden"
              onClick={() => setLocation("/chat")}
              data-testid="button-back-chat"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {loading ? (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ) : otherProfile ? (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <UserAvatar name={otherProfile.name} avatarUrl={otherProfile.avatar_url} size="sm" />
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-foreground">{otherProfile.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {otherProfile.city}{otherProfile.profession ? ` · ${otherProfile.profession}` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <span className="flex-1 text-sm text-muted-foreground">Chat</span>
            )}

            {canChat && !isUserBlocked && (
              <div
                className={cn(
                  "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs sm:flex",
                  connected ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"
                )}
                data-testid="status-connection"
              >
                <Wifi className="h-3 w-3" />
                {connected ? "Live" : "Connecting..."}
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground sm:inline-flex"
                aria-label="Favorite chat"
              >
                <Star className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground sm:inline-flex"
                aria-label="Search chat"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Chat menu"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!loading && isUserBlocked ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
              <Ban className="h-12 w-12 text-destructive/30" />
              <h3 className="font-medium text-foreground">Chat Unavailable</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Messaging is not available due to a block between you and this user.
              </p>
              <Button variant="outline" onClick={() => setLocation("/chat")}>
                Back to Messages
              </Button>
            </div>
          ) : !loading && !canChat ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
              <Lock className="h-12 w-12 text-muted-foreground/30" />
              <h3 className="font-medium text-foreground">Chat Locked</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                You can only chat after an interest is accepted between you.
              </p>
              <Button variant="outline" onClick={() => setLocation("/interests")}>
                Go to Interests
              </Button>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,hsl(var(--secondary)/0.36),hsl(var(--accent)/0.24),hsl(var(--background)))] px-4 py-5 sm:px-8">
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className={cn("flex", index % 2 === 0 ? "justify-start" : "justify-end")}>
                        <Skeleton className="h-11 w-56 rounded-[20px]" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      {otherProfile && (
                        <UserAvatar name={otherProfile.name} avatarUrl={otherProfile.avatar_url} size="md" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Start a conversation with {otherProfile?.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Messages stay private between both of you.</p>
                  </div>
                ) : (
                  groupMessagesByDate(messages).map(({ date, messages: dayMsgs }) => (
                    <div key={date}>
                      <div className="my-5 flex justify-center">
                        <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
                          {formatGroupDate(date)}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {dayMsgs.map((msg) => {
                          const isMe = msg.sender_id === currentUser?.id;

                          return (
                            <div
                              key={msg.id}
                              className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}
                              data-testid={`message-${msg.id}`}
                            >
                              <div
                                className={cn(
                                  "flex max-w-[min(78%,36rem)] flex-col",
                                  isMe ? "items-end" : "items-start"
                                )}
                              >
                                <div
                                  className={cn(
                                    "rounded-[20px] px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                                    isMe
                                      ? "rounded-br-md bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--chart-5)))] text-primary-foreground"
                                      : "rounded-bl-md border border-border/70 bg-card text-card-foreground"
                                  )}
                                >
                                  {msg.content}
                                </div>
                                <span className="mt-1 px-1 text-[10px] text-muted-foreground">
                                  {format(new Date(msg.created_at), "hh:mm a")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {!loading && (
                <form
                  onSubmit={handleSend}
                  className="shrink-0 border-t border-border/70 bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--secondary)/0.55))] px-3 py-3 sm:px-5"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                      aria-label="Add reaction"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    <div className="relative min-w-0 flex-1">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message here..."
                        className="h-11 rounded-full border-transparent bg-secondary/70 pr-12 shadow-none focus-visible:ring-primary/40"
                        disabled={sending}
                        data-testid="input-message"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="absolute right-1 top-1 h-9 w-9 rounded-full"
                        disabled={sending || !newMessage.trim()}
                        data-testid="button-send-message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <button
                      type="button"
                      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 sm:inline-flex"
                      aria-label="Add attachment"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 sm:inline-flex"
                      aria-label="Record voice message"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10 sm:inline-flex"
                      aria-label="Send quick like"
                    >
                      <ThumbsUp className="h-5 w-5" />
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
