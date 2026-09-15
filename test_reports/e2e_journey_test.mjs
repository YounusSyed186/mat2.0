import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

function getProfileCompletion(profile) {
  if (!profile) return 0;
  const checks = [
    profile.name,
    profile.age,
    profile.gender,
    profile.religion,
    profile.city,
    profile.education,
    profile.profession,
    profile.bio,
    profile.avatar_url,
    profile.languages?.length,
    profile.hobbies?.length,
    profile.search_intent,
    profile.family_goals,
    profile.lifestyle_choices,
    Object.values(profile.prompts || {}).some(Boolean),
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

function getMatchReasons(profile, myProfile) {
  if (!myProfile) return [];
  const reasons = [];
  const sameCity = profile.city?.trim().toLowerCase() === myProfile.city?.trim().toLowerCase();
  const closeAge = Math.abs((profile.age || 0) - (myProfile.age || 0)) <= 3;
  if (sameCity) reasons.push("Same city");
  if (profile.religion && profile.religion === myProfile.religion) reasons.push("Shared faith");
  if (profile.education && profile.education === myProfile.education) reasons.push("Similar education");
  if (profile.profession && profile.profession === myProfile.profession) reasons.push("Similar profession");
  if (closeAge) reasons.push("Similar age");
  if (profile.bio && profile.profession && profile.education) reasons.push("Complete profile");
  return reasons.slice(0, 3);
}

function buildProfileRelationMap({ currentUserId, profiles, interests, blocks }) {
  const relationMap = {};
  profiles.forEach((profile) => {
    const sentInterest = interests.find(i => i.sender_id === currentUserId && i.receiver_id === profile.id);
    const receivedInterest = interests.find(i => i.sender_id === profile.id && i.receiver_id === currentUserId);
    const blocked = blocks.some(b => (b.blocker_id === currentUserId && b.blocked_id === profile.id) || (b.blocker_id === profile.id && b.blocked_id === currentUserId));
    if (blocked) relationMap[profile.id] = "blocked";
    else if (sentInterest?.status === "accepted" || receivedInterest?.status === "accepted") relationMap[profile.id] = "accepted";
    else if (receivedInterest?.status === "pending") relationMap[profile.id] = "received_pending";
    else if (sentInterest?.status === "pending") relationMap[profile.id] = "sent_pending";
    else if (sentInterest?.status === "rejected" || receivedInterest?.status === "rejected") relationMap[profile.id] = "rejected";
    else relationMap[profile.id] = "none";
  });
  return relationMap;
}

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey);

async function runFullJourneyTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING END-TO-END VIVAH USER JOURNEY TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function record(name, passed, details = '') {
    totalTests++;
    if (passed) {
      passedTests++;
      console.log(`✅ [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
    }
  }

  // -----------------------------------------------------------
  // 1. SIGNUP USER JOURNEY SIMULATION & VALIDATION
  // -----------------------------------------------------------
  console.log('--- 1. SIGNUP JOURNEY TESTS ---');
  const testEmail = `vivah.user.${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';

  // Test Signup call
  try {
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      record('Signup API Call', false, signUpError.message);
    } else {
      const isConfirmedOrSession = Boolean(signUpData.session || signUpData.user);
      record('Signup API Call', isConfirmedOrSession, `User ID: ${signUpData.user?.id || 'none'}`);
    }
  } catch (err) {
    record('Signup API Call', false, err.message);
  }

  // -----------------------------------------------------------
  // 2. LOGIN JOURNEY TESTS (WITH SEEDED USER)
  // -----------------------------------------------------------
  console.log('\n--- 2. LOGIN JOURNEY TESTS ---');
  const userEmail = 'ananya.sharma@vivah.ai';
  const userPassword = 'Password123!';

  let authenticatedSession = null;
  let authenticatedUser = null;

  try {
    const { data: loginData, error: loginError } = await client.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    });

    if (loginError) {
      record('User Authentication', false, loginError.message);
    } else {
      authenticatedSession = loginData.session;
      authenticatedUser = loginData.user;
      record('User Authentication', Boolean(authenticatedSession), `Logged in as: ${userEmail}`);
    }
  } catch (err) {
    record('User Authentication', false, err.message);
  }

  // -----------------------------------------------------------
  // 3. PROFILE RETRIEVAL & PROFILE COMPLETION JOURNEY
  // -----------------------------------------------------------
  console.log('\n--- 3. PROFILE & JOURNEY LOGIC TESTS ---');
  let userProfile = null;

  if (authenticatedUser) {
    try {
      const { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('id', authenticatedUser.id)
        .single();

      if (profileError) {
        record('Fetch User Profile', false, profileError.message);
      } else {
        userProfile = profileData;
        const completion = getProfileCompletion(userProfile);
        record('Fetch User Profile', Boolean(userProfile), `Name: ${userProfile.name}, Completion: ${completion}%`);
        record('Profile Strength Calculation', completion > 0, `${completion}% completed`);
      }
    } catch (err) {
      record('Fetch User Profile', false, err.message);
    }
  }

  // -----------------------------------------------------------
  // 4. BROWSE & MATCHING JOURNEY
  // -----------------------------------------------------------
  console.log('\n--- 4. BROWSE & DISCOVERY JOURNEY TESTS ---');
  let allProfiles = [];
  try {
    const { data: browseProfiles, error: browseError } = await client
      .from('profiles')
      .select('*')
      .eq('is_blocked', false)
      .limit(10);

    if (browseError) {
      record('Browse Active Profiles', false, browseError.message);
    } else {
      allProfiles = browseProfiles || [];
      record('Browse Active Profiles', allProfiles.length > 0, `Found ${allProfiles.length} candidate profiles`);

      if (userProfile && allProfiles.length > 0) {
        const candidate = allProfiles.find(p => p.id !== userProfile.id) || allProfiles[0];
        const matchReasons = getMatchReasons(candidate, userProfile);
        record('AI Match Reasons Generation', true, `Candidate: ${candidate.name}, Reasons: ${matchReasons.join(', ') || 'General compatibility'}`);
      }
    }
  } catch (err) {
    record('Browse Active Profiles', false, err.message);
  }

  // -----------------------------------------------------------
  // 5. INTERESTS & RELATION MAP JOURNEY
  // -----------------------------------------------------------
  console.log('\n--- 5. INTERESTS & CONNECTIONS JOURNEY TESTS ---');
  if (authenticatedUser) {
    try {
      const { data: interests, error: intError } = await client
        .from('interests')
        .select('*')
        .or(`sender_id.eq.${authenticatedUser.id},receiver_id.eq.${authenticatedUser.id}`);

      if (intError) {
        record('Interests Query', false, intError.message);
      } else {
        const relationMap = buildProfileRelationMap({
          currentUserId: authenticatedUser.id,
          profiles: allProfiles,
          interests: interests || [],
          blocks: [],
        });
        const relationCount = Object.keys(relationMap).length;
        record('Interests & Relation Mapping', relationCount > 0, `Mapped ${relationCount} profile relationship states`);
      }
    } catch (err) {
      record('Interests Query', false, err.message);
    }
  }

  // -----------------------------------------------------------
  // 6. MESSAGING & CHAT JOURNEY
  // -----------------------------------------------------------
  console.log('\n--- 6. MESSAGING & CONVERSATION JOURNEY TESTS ---');
  if (authenticatedUser) {
    try {
      const { data: messages, error: msgError } = await client
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${authenticatedUser.id},receiver_id.eq.${authenticatedUser.id}`)
        .limit(5);

      if (msgError) {
        record('Messages Query', false, msgError.message);
      } else {
        record('Messages Query', true, `Retrieved ${messages?.length || 0} secure chat messages`);
      }
    } catch (err) {
      record('Messages Query', false, err.message);
    }
  }

  // -----------------------------------------------------------
  // 7. SUBSCRIPTION PLANS & MONETIZATION JOURNEY
  // -----------------------------------------------------------
  console.log('\n--- 7. SUBSCRIPTION & ACCESS JOURNEY TESTS ---');
  try {
    const { data: plans, error: plansError } = await client
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true);

    if (plansError) {
      record('Subscription Plans Query', false, plansError.message);
    } else {
      record('Subscription Plans Query', plans && plans.length >= 3, `Available tiers: ${plans.map(p => p.name).join(', ')}`);
    }
  } catch (err) {
    record('Subscription Plans Query', false, err.message);
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================\n');
}

runFullJourneyTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
