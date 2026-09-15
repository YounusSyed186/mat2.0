import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Search } from "lucide-react";
import { ChatConversationPanel } from "@/components/ChatConversationPanel";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";

export default function ChatList() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex h-full min-h-full flex-1 flex-col bg-background p-0 md:bg-[linear-gradient(135deg,hsl(var(--secondary)/0.55),hsl(var(--accent)/0.38),hsl(var(--background)))] md:p-3">
        <div className="flex h-full min-h-0 flex-1 w-full overflow-hidden rounded-none border-0 bg-card shadow-none md:rounded-[24px] md:border md:border-border/70 md:shadow-[0_18px_45px_rgba(70,15,38,0.10)]">
          <ChatConversationPanel onSelect={(userId) => navigate(`/chat/${userId}`)} />

          <section className="hidden min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,hsl(var(--secondary)/0.36),hsl(var(--accent)/0.24),hsl(var(--background)))] md:flex">
          <div className="flex h-[70px] shrink-0 items-center justify-between border-b border-border/70 bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--accent)/0.55))] px-6">
            <div>
              <h2 className="text-sm font-bold text-foreground">Messages</h2>
              <p className="text-xs text-muted-foreground">Choose a conversation from All Messages</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Search messages"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center">
            <div className="max-w-sm rounded-[24px] border border-border/70 bg-card/80 px-8 py-9 shadow-sm backdrop-blur">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--chart-2)))] text-primary-foreground shadow-sm">
                <MessageCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Keep the conversation going</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Open an accepted match to continue messaging in this workspace.
              </p>
              <Button className="mt-5 rounded-full" onClick={() => navigate("/browse")}>
                <Heart className="h-4 w-4" />
                Browse Matches
              </Button>
            </div>
          </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
