# Vivah Matrimonial App - PRD

## Original Problem Statement
Extend existing React (Vite) + Supabase matrimonial app with:
- WebSocket/Realtime chat system enhancement
- Block User feature
- Report User feature
- Notifications system
- Smart Filtering
- Supabase Google OAuth
- Access Control enforcement
- Zustand state management

## Architecture
- **Frontend**: React 19 + Vite 8 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Routing**: wouter
- **State**: React Context (auth) + Zustand (blocks, notifications, chat)
- **UI**: Radix UI + shadcn/ui components

## User Personas
1. **Regular User**: Browse profiles, send interests, chat with matches, block/report users
2. **Admin User**: Manage users, view reports, view blocks between users, moderate content

## What's Been Implemented

### Session 1 (April 16, 2026) - Core Feature Extensions
1. Block User Feature, Report User Feature, Notifications System, Enhanced Realtime Chat
2. Smart Filtering, Google OAuth, Access Control, Zustand State Management

### Session 2 (April 16, 2026) - Improvements
1. **Enhanced Unblock Feature**: Unblock confirmation dialog on UserProfile, BlockedUsersList component on profile edit page
2. **Admin Blocks Tab**: New "Blocks" tab showing who blocked who with blocker/blocked names, avatars, dates, and admin "Remove Block" action
3. **Rich Message Notifications**: Notifications now include sender name metadata (e.g. "New message from John", "Sarah sent you an interest")

### Files Created/Modified
- `/app/src/stores/useBlockStore.ts` - Zustand block store
- `/app/src/stores/useNotificationStore.ts` - Updated with metadata param
- `/app/src/stores/useChatStore.ts` - Zustand chat store
- `/app/src/components/NotificationBell.tsx` - Updated with sender name display
- `/app/src/components/ReportDialog.tsx` - Report submission dialog
- `/app/src/components/BlockedUsersList.tsx` - NEW: Blocked users management list
- `/app/src/types/index.ts` - Updated types (UserBlock with joins, Notification with metadata)
- `/app/src/pages/Browse.tsx` - Smart filtering, block filtering
- `/app/src/pages/Chat.tsx` - Block checks, notification with sender name
- `/app/src/pages/ChatList.tsx` - Block filtering
- `/app/src/pages/Interests.tsx` - Block filtering, notification with sender name on accept
- `/app/src/pages/UserProfile.tsx` - Block/unblock with confirmation, report buttons
- `/app/src/pages/Login.tsx` - Google OAuth button
- `/app/src/pages/Signup.tsx` - Google OAuth button
- `/app/src/pages/Admin.tsx` - Updated with Blocks tab + Reports tab
- `/app/src/pages/Profile.tsx` - Added BlockedUsersList in edit mode
- `/app/src/components/Layout.tsx` - Notification bell
- `/app/supabase-migration-v2.sql` - SQL migration with admin block policies

## ACTION REQUIRED
1. Run SQL migration: `/app/supabase-migration-v2.sql` in Supabase SQL Editor
2. Enable Google OAuth in Supabase Dashboard: Authentication > Providers > Google

## Backlog
- P0: Run database migration SQL
- P0: Enable Google OAuth in Supabase dashboard
- P1: Read receipts for messages
- P1: Typing indicators
- P2: Profile verification system
- P2: Chat media sharing (images)
