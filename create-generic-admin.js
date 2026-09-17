import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_ACCOUNTS = [
  {
    email: 'adminIW@vivaahvedika.com',
    password: 'Password123!',
    name: 'InspiringWave Admin',
    role: 'primary_admin',
    city: 'Bangalore',
    profession: 'Platform Administrator',
    bio: 'Official Primary Administrator for Vivaah Vedika.',
    gender: 'female',
    age: 30,
    religion: 'Hindu',
  },
  {
    email: 'admin@vivaahvedika.com',
    password: 'Password123!',
    name: 'System Admin',
    role: 'admin',
    city: 'Mumbai',
    profession: 'System Administrator',
    bio: 'Official Administrator account for Vivaah Vedika.',
    gender: 'male',
    age: 32,
    religion: 'Hindu',
  },
];

async function seedAdmins() {
  console.log('🚀 Creating Generic Admin Accounts in Supabase...');

  for (const admin of ADMIN_ACCOUNTS) {
    try {
      let userId;

      // Check if user exists in auth
      const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = existingUsers?.users?.find((u) => u.email.toLowerCase() === admin.email.toLowerCase());

      if (existing) {
        console.log(`ℹ️ User ${admin.email} exists (${existing.id}). Updating password & metadata...`);
        userId = existing.id;
        await supabase.auth.admin.updateUserById(userId, {
          password: admin.password,
          email_confirm: true,
          user_metadata: { name: admin.name },
        });
      } else {
        console.log(`✨ Creating user ${admin.email}...`);
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: admin.email,
          password: admin.password,
          email_confirm: true,
          user_metadata: { name: admin.name },
        });

        if (createError) {
          // If already registered, find user ID
          const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const found = allUsers?.users?.find((u) => u.email === admin.email);
          if (found) {
            userId = found.id;
            await supabase.auth.admin.updateUserById(userId, {
              password: admin.password,
              email_confirm: true,
              user_metadata: { name: admin.name },
            });
          } else {
            console.error(`❌ Failed to create auth user ${admin.email}:`, createError.message);
            continue;
          }
        } else {
          userId = newUser.user.id;
        }
      }

      // Upsert profile in profiles table
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          name: admin.name,
          role: admin.role,
          age: admin.age,
          gender: admin.gender,
          city: admin.city,
          religion: admin.religion,
          profession: admin.profession,
          bio: admin.bio,
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
          languages: ['English', 'Hindi'],
          willing_to_relocate: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        console.error(`❌ Failed to update profile for ${admin.email}:`, profileError.message);
      } else {
        console.log(`✅ Successfully provisioned ${admin.role} account: ${admin.email}`);
      }
    } catch (err) {
      console.error(`❌ Error provisioning ${admin.email}:`, err);
    }
  }

  console.log('🎉 Generic Admin seeding complete!');
}

seedAdmins();
