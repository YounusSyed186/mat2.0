import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { Profile, Interest, Message } from "@/types";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, Heart, MessageCircle, Ban, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function Admin() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: u }, { data: i }, { data: m }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("interests").select("*, sender:profiles!sender_id(name), receiver:profiles!receiver_id(name)").order("created_at", { ascending: false }),
      supabase.from("messages").select("*, sender:profiles!sender_id(name)").order("created_at", { ascending: false }).limit(100),
    ]);
    setUsers((u as Profile[]) || []);
    setInterests((i as Interest[]) || []);
    setMessages((m as Message[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (profile?.role !== "admin") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-1">You don't have permission to access this page.</p>
        </div>
      </Layout>
    );
  }

  const handleBlockUser = async (userId: string, blocked: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: !blocked }).eq("id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !blocked ? "User blocked" : "User unblocked" });
      fetchAll();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User deleted" });
      fetchAll();
    }
  };

  const handleDeleteInterest = async (id: string) => {
    const { error } = await supabase.from("interests").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Interest deleted" });
      fetchAll();
    }
  };

  const handleDeleteMessage = async (id: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Message deleted" });
      fetchAll();
    }
  };

  const stats = [
    { label: "Total Users", value: users.length, icon: Users },
    { label: "Interests", value: interests.length, icon: Heart },
    { label: "Messages", value: messages.length, icon: MessageCircle },
    { label: "Blocked Users", value: users.filter((u) => u.is_blocked).length, icon: Ban },
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage users and moderate the platform</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-card-border">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{loading ? "—" : value}</p>
                  </div>
                  <Icon className="h-6 w-6 text-primary/50" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
            <TabsTrigger value="interests" data-testid="admin-tab-interests">Interests</TabsTrigger>
            <TabsTrigger value="messages" data-testid="admin-tab-messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">All Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 font-medium text-muted-foreground">Name</th>
                          <th className="pb-2 font-medium text-muted-foreground">Age</th>
                          <th className="pb-2 font-medium text-muted-foreground">City</th>
                          <th className="pb-2 font-medium text-muted-foreground">Role</th>
                          <th className="pb-2 font-medium text-muted-foreground">Status</th>
                          <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {users.map((u) => (
                          <tr key={u.id} className="py-2" data-testid={`row-user-${u.id}`}>
                            <td className="py-2.5 font-medium">{u.name}</td>
                            <td className="py-2.5 text-muted-foreground">{u.age}</td>
                            <td className="py-2.5 text-muted-foreground">{u.city}</td>
                            <td className="py-2.5">
                              <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">{u.role}</Badge>
                            </td>
                            <td className="py-2.5">
                              {u.is_blocked ? (
                                <Badge variant="destructive" className="text-xs">Blocked</Badge>
                              ) : (
                                <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Active</Badge>
                              )}
                            </td>
                            <td className="py-2.5">
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => handleBlockUser(u.id, u.is_blocked)}
                                  data-testid={`button-block-${u.id}`}
                                >
                                  {u.is_blocked ? <><CheckCircle className="h-3 w-3 mr-1" />Unblock</> : <><Ban className="h-3 w-3 mr-1" />Block</>}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteUser(u.id)}
                                  data-testid={`button-delete-user-${u.id}`}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interests">
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">All Interests ({interests.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 font-medium text-muted-foreground">From</th>
                          <th className="pb-2 font-medium text-muted-foreground">To</th>
                          <th className="pb-2 font-medium text-muted-foreground">Status</th>
                          <th className="pb-2 font-medium text-muted-foreground">Date</th>
                          <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {interests.map((i) => (
                          <tr key={i.id} data-testid={`row-interest-${i.id}`}>
                            <td className="py-2.5">{(i.sender as Profile | undefined)?.name || "—"}</td>
                            <td className="py-2.5">{(i.receiver as Profile | undefined)?.name || "—"}</td>
                            <td className="py-2.5">
                              <Badge variant={i.status === "accepted" ? "default" : i.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                                {i.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}
                            </td>
                            <td className="py-2.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteInterest(i.id)}
                                data-testid={`button-delete-interest-${i.id}`}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Messages ({messages.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 font-medium text-muted-foreground">Sender</th>
                          <th className="pb-2 font-medium text-muted-foreground">Message</th>
                          <th className="pb-2 font-medium text-muted-foreground">Date</th>
                          <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {messages.map((m) => (
                          <tr key={m.id} data-testid={`row-message-${m.id}`}>
                            <td className="py-2.5 font-medium whitespace-nowrap">{(m.sender as Profile | undefined)?.name || "—"}</td>
                            <td className="py-2.5 text-muted-foreground max-w-xs truncate">{m.content}</td>
                            <td className="py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                              {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                            </td>
                            <td className="py-2.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteMessage(m.id)}
                                data-testid={`button-delete-message-${m.id}`}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
