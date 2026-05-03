import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useBlockStore } from '@/stores/useBlockStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Ban, ShieldOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/types';

interface BlockedUser {
  blockId: string;
  profile: Profile;
  blockedAt: string;
}

export function BlockedUsersList() {
  const { currentUser } = useAuth();
  const { blocks, fetchBlocks, unblockUser } = useBlockStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockTarget, setUnblockTarget] = useState<BlockedUser | null>(null);
  const [unblocking, setUnblocking] = useState(false);
  // inside your component file (only showing modified parts)

  useEffect(() => {
    if (!currentUser) return;
    fetchBlocks(currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const myBlocks = blocks.filter(b => b.blocker_id === currentUser.id);

    if (myBlocks.length === 0) {
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    const fetchProfiles = async () => {
      setLoading(true);

      try {
        const blockedIds = myBlocks.map(b => b.blocked_id);

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .in("id", blockedIds);

        if (error) {
          console.error("Failed to fetch blocked profiles:", error);
          setBlockedUsers([]);
          return;
        }

        if (data) {
          const users: BlockedUser[] = myBlocks
            .map(b => {
              const profile = (data as Profile[]).find(p => p.id === b.blocked_id);
              if (!profile) return null;

              return {
                blockId: b.id,
                profile,
                blockedAt: b.created_at,
              };
            })
            .filter(Boolean) as BlockedUser[];

          setBlockedUsers(users);
        }
      } catch (err) {
        console.error("Unexpected error fetching blocked users:", err);
        setBlockedUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [blocks, currentUser]);

  // ✅ Improved unblock handler
  const handleUnblock = async () => {
    if (!unblockTarget || !currentUser) return;

    setUnblocking(true);

    try {
      const success = await unblockUser(currentUser.id, unblockTarget.profile.id);

      if (success) {
        toast({
          title: "User unblocked",
          description: `${unblockTarget.profile.name} has been unblocked.`,
        });
      } else {
        throw new Error("Unblock failed");
      }
    } catch (err) {
      console.error("Unblock error:", err);
      toast({
        title: "Failed to unblock user",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUnblocking(false);
      setUnblockTarget(null);
    }
  };

  return (
    <>
      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Ban className="h-4 w-4 text-muted-foreground" />
            Blocked Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : blockedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              You haven't blocked anyone
            </p>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map(({ blockId, profile: p, blockedAt }) => (
                <div
                  key={blockId}
                  className="flex items-center gap-3 py-2 px-1 rounded-md hover:bg-muted/50 transition-colors"
                  data-testid={`blocked-user-${p.id}`}
                >
                  <div className="cursor-pointer" onClick={() => navigate(`/user/${p.id}`)}>
                    <UserAvatar name={p.name} avatarUrl={p.avatar_url} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium text-foreground hover:text-primary cursor-pointer transition-colors truncate"
                      onClick={() => navigate(`/user/${p.id}`)}
                    >
                      {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.city}{p.age ? `, ${p.age} yrs` : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-shrink-0"
                    onClick={() => setUnblockTarget({ blockId, profile: p, blockedAt })}
                    data-testid={`unblock-btn-${p.id}`}
                  >
                    <ShieldOff className="h-3 w-3 mr-1" />
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unblock confirmation */}
      <AlertDialog open={!!unblockTarget} onOpenChange={(open) => !open && setUnblockTarget(null)}>
        <AlertDialogContent data-testid="unblock-list-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {unblockTarget?.profile.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              After unblocking, {unblockTarget?.profile.name} will be able to see your profile, send you interests, and message you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unblocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock} disabled={unblocking} data-testid="unblock-list-confirm-btn">
              {unblocking ? 'Unblocking...' : 'Unblock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
