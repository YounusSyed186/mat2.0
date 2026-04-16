# Test Credentials

## Supabase Configuration
- **Supabase URL**: https://kmhndjscjiswplhtngef.supabase.co
- **Supabase Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaG5kanNjamlzd3BsaHRuZ2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTk2MDMsImV4cCI6MjA5MTUzNTYwM30.LQGlhW3391QBqeAZuAelrkGteqjkenusznanXLHK8yM

## Authentication
- Authentication is handled by Supabase Auth (email/password + Google OAuth)
- Users must create accounts via signup page or Google OAuth
- No pre-seeded test accounts exist - users need to sign up through the app

## Notes
- Google OAuth requires enabling Google provider in Supabase Dashboard (Authentication > Providers > Google)
- New database tables (user_blocks, reports, notifications) require running migration SQL at `/app/supabase-migration-v2.sql`
