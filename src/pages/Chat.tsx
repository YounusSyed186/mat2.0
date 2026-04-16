import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useBlockStore } from "@/stores/useBlockStore";
import { useChatStore } from "@/stores/useChatStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { Message, Profile } from "@/types";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/UserAvatar";
import { ArrowLeft, Send, Lock, Wifi, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Chat() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/chat/:userId");
  const otherUserId = params?.userId;
  const { currentUser, profile: myProfile } = useAuth();
  const { toast } = useToast();
  const { isBlockRelation, fetchBlocks } = useBlockStore();
  const { joinChat, leaveChat, sendMessage, setActiveChatUser } = useChatStore();
  const { createNotification } = useNotificationStore();

  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [canChat, setCanChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Stable channel name
  const channelName = currentUser && otherUserId
    ? `chat:${[currentUser.id, otherUserId].sort().join(":")}`
    : null;

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
  }, [otherUserId, currentUser]);

  // Check block status reactively
  useEffect(() => {
    if (otherUserId) {
      setIsUserBlocked(isBlockRelation(otherUserId));
    }
  }, [otherUserId, isBlockRelation]);

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
      .single();

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

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh)] md:h-screen">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/chat")}
            data-testid="button-back-chat"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {loading ? (
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : otherProfile ? (
            <div className="flex items-center gap-3 flex-1">
              <UserAvatar name={otherProfile.name} avatarUrl={otherProfile.avatar_url} size="sm" />
              <div>
                <h2 className="font-medium text-foreground text-sm">{otherProfile.name}</h2>
                <p className="text-xs text-muted-foreground">{otherProfile.city}</p>
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground flex-1">Chat</span>
          )}
          {canChat && !isUserBlocked && (
            <div
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                connected
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
              data-testid="status-connection"
            >
              <Wifi className="h-3 w-3" />
              {connected ? "Live" : "Connecting..."}
            </div>
          )}
        </div>

        {/* Blocked banner */}
        {!loading && isUserBlocked && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
            <Ban className="h-12 w-12 text-destructive/30" />
            <h3 className="font-medium text-foreground">Chat Unavailable</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Messaging is not available due to a block between you and this user.
            </p>
            <Button variant="outline" onClick={() => setLocation("/chat")}>
              Back to Messages
            </Button>
          </div>
        )}

        {/* Content */}
        {!loading && !canChat && !isUserBlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
            <Lock className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="font-medium text-foreground">Chat Locked</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              You can only chat after an interest is accepted between you.
            </p>
            <Button variant="outline" onClick={() => setLocation("/interests")}>
              Go to Interests
            </Button>
          </div>
        ) : !isUserBlocked && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                      <Skeleton className="h-10 w-48 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    {otherProfile && (
                      <UserAvatar name={otherProfile.name} avatarUrl={otherProfile.avatar_url} size="md" />
                    )}
                  </div>
                  <p className="font-medium text-foreground text-sm">
                    Start a conversation with {otherProfile?.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Messages are end-to-end secured</p>
                </div>
              ) : (
                groupMessagesByDate(messages).map(({ date, messages: dayMsgs }) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{date}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-2">
                      {dayMsgs.map((msg) => {
                        const isMe = msg.sender_id === currentUser?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                            data-testid={`message-${msg.id}`}
                          >
                            {!isMe && otherProfile && (
                              <UserAvatar
                                name={otherProfile.name}
                                avatarUrl={otherProfile.avatar_url}
                                size="xs"
                              />
                            )}
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-card border border-border rounded-bl-sm shadow-sm"
                              }`}
                            >
                              <p className="leading-relaxed">{msg.content}</p>
                              <p
                                className={`text-[10px] mt-1 ${
                                  isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                                }`}
                              >
                                {format(new Date(msg.created_at), "h:mm a")}
                              </p>
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

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="flex gap-2 px-4 py-3 border-t border-border bg-card flex-shrink-0"
            >
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sending}
                data-testid="input-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !newMessage.trim()}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </Layout>
  );
}
