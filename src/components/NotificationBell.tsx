import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { Bell, Heart, MessageCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/types';

function notifIcon(type: Notification['type']) {
  switch (type) {
    case 'interest_received':
      return <Heart className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />;
    case 'interest_accepted':
      return <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />;
    case 'message':
      return <MessageCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />;
    default:
      return <Bell className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />;
  }
}

function notifLabel(type: Notification['type'], metadata?: string | null) {
  const name = metadata || 'Someone';
  switch (type) {
    case 'interest_received':
      return `${name} sent you an interest`;
    case 'interest_accepted':
      return `${name} accepted your interest`;
    case 'message':
      return `New message from ${name}`;
    default:
      return 'Notification';
  }
}

export function NotificationBell() {
  const { currentUser } = useAuth();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, subscribeToNotifications, unsubscribe } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (currentUser) {
      fetchNotifications(currentUser.id);
      subscribeToNotifications(currentUser.id);
    }
    return () => unsubscribe();
  }, [currentUser?.id]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleNotifClick = async (n: Notification) => {
    if (!n.is_read) await markAsRead(n.id);
    setOpen(false);
    if (n.type === 'message') {
      setLocation(`/chat/${n.reference_id}`);
    } else if (n.type === 'interest_received' || n.type === 'interest_accepted') {
      setLocation('/interests');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
        data-testid="notification-bell"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1"
            data-testid="notification-unread-count"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          data-testid="notification-dropdown"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-medium text-sm text-foreground">Notifications</h3>
            {unreadCount > 0 && currentUser && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => markAllAsRead(currentUser.id)}
                data-testid="mark-all-read-btn"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${
                    !n.is_read ? 'bg-primary/5' : ''
                  }`}
                  data-testid={`notification-item-${n.id}`}
                >
                  <div className="mt-0.5">{notifIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {notifLabel(n.type, n.metadata)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0 border-0 flex-shrink-0">
                      New
                    </Badge>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
