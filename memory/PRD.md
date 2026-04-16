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
1. **Regular User**: Browse profiles, send interests, chat with matches
2. **Admin User**: Manage users, view reports, moderate content

## Core Requirements
- Email/password + Google OAuth authentication
- Profile creation and editing with photo upload
- Browse and search user profiles with smart filtering
- Interest system (send, accept, reject)
- Real-time chat via Supabase Broadcast (only with accepted interests)
- Block and report users
- Notification system with real-time updates
- Admin panel for moderation

## What's Been Implemented (April 16, 2026)

### Phase 1: Core Feature Extensions
1. **Block User Feature** - Zustand store, block/unblock from profile page, filter blocked users from browse/chat/interests
2. **Report User Feature** - Report dialog with reason selection, admin reports tab  
3. **Notifications System** - Notification bell in sidebar, dropdown with notifications list, unread count, real-time subscription
4. **Enhanced Realtime Chat** - Block checks before sending, notification on message send, improved connection management
5. **Smart Filtering** - Browse prioritizes same city (+3), same religion (+2), recently active (+1)
6. **Google OAuth** - Google sign-in buttons on Login and Signup pages
7. **Access Control** - Block enforcement in browse, interests, chat, and messages
8. **Zustand State Management** - useBlockStore, useNotificationStore, useChatStore

### Files Created/Modified
- `/app/src/stores/useBlockStore.ts` - NEW
- `/app/src/stores/useNotificationStore.ts` - NEW
- `/app/src/stores/useChatStore.ts` - NEW
- `/app/src/components/NotificationBell.tsx` - NEW
- `/app/src/components/ReportDialog.tsx` - NEW
- `/app/src/types/index.ts` - MODIFIED (added UserBlock, Report, Notification types)
- `/app/src/pages/Browse.tsx` - MODIFIED (smart filtering, block filtering)
- `/app/src/pages/Chat.tsx` - MODIFIED (block checks, notification creation)
- `/app/src/pages/ChatList.tsx` - MODIFIED (block filtering)
- `/app/src/pages/Interests.tsx` - MODIFIED (block filtering, notification on accept)
- `/app/src/pages/UserProfile.tsx` - MODIFIED (block/report buttons)
- `/app/src/pages/Login.tsx` - MODIFIED (Google OAuth button)
- `/app/src/pages/Signup.tsx` - MODIFIED (Google OAuth button)
- `/app/src/pages/Admin.tsx` - MODIFIED (reports tab)
- `/app/src/components/Layout.tsx` - MODIFIED (notification bell)
- `/app/supabase-migration-v2.sql` - NEW (SQL migration for new tables)

## ACTION REQUIRED: Database Migration
The new tables (user_blocks, reports, notifications) need to be created in Supabase.
Run the SQL in `/app/supabase-migration-v2.sql` in the Supabase SQL Editor.

## ACTION REQUIRED: Google OAuth
Google OAuth provider must be enabled in Supabase Dashboard:
1. Go to Authentication > Providers > Google
2. Enable Google provider
3. Add Google OAuth client ID and secret

## Backlog
- P0: Run database migration SQL for new tables
- P0: Enable Google OAuth in Supabase dashboard
- P1: Online/offline presence indicator
- P1: Read receipts for messages
- P1: Push notifications (browser)
- P2: Profile verification system
- P2: Advanced search with more filters
- P2: Chat media sharing (images)

## Next Tasks
1. User runs migration SQL in Supabase SQL Editor
2. User enables Google OAuth in Supabase dashboard
3. Test full flow with real accounts
4. Add message read receipts
5. Add typing indicators
