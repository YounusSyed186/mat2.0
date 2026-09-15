/**
 * backfill-embeddings.js
 * ============================================================
 * Generates Gemini vector embeddings for every profile that:
 *   (a) has needs_embedding = true, OR
 *   (b) has embedding IS NULL
 *
 * After a successful embedding, the script sets needs_embedding = false
 * so subsequent runs skip already-processed profiles.
 *
 * Run: node backfill-embeddings.js
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// ── Configuration ──────────────────────────────────────────
const supabaseUrl     = process.env.VITE_SUPABASE_URL;
const supabaseKey     = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // needs service-role to bypass RLS
const geminiApiKey    = process.env.VITE_GEMINI_API_KEY;

const DELAY_MS        = 600;  // delay between API calls to respect rate limits
const MAX_RETRIES     = 3;    // retry failed embeddings this many times
const BATCH_SIZE      = 50;   // fetch profiles in pages of this size

// ── Validation ─────────────────────────────────────────────
if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
  console.error('❌  Missing required environment variables:');
  if (!supabaseUrl)   console.error('   • VITE_SUPABASE_URL');
  if (!supabaseKey)   console.error('   • VITE_SUPABASE_SERVICE_ROLE_KEY');
  if (!geminiApiKey)  console.error('   • VITE_GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI    = new GoogleGenerativeAI(geminiApiKey);

// ── Helpers ─────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildProfileText(profile) {
  const promptsText = Array.isArray(profile.prompts) 
    ? profile.prompts.map(p => `${p.question}: ${p.answer}`).join(' ') 
    : (typeof profile.prompts === 'object' && profile.prompts !== null)
    ? Object.entries(profile.prompts).map(([k, v]) => `${k}: ${v}`).join(' ')
    : '';

  const selfLines = [
    profile.name ? `Name: ${profile.name}` : '',
    profile.age ? `Age: ${profile.age}` : '',
    profile.gender ? `Gender: ${profile.gender}` : '',
    profile.religion ? `Religion: ${profile.religion}` : '',
    profile.city ? `City: ${profile.city}` : '',
    profile.profession ? `Profession: ${profile.profession}` : '',
    profile.education ? `Education: ${profile.education}` : '',
    profile.bio ? `Bio: ${profile.bio}` : '',
    profile.languages?.length ? `Languages: ${profile.languages.join(', ')}` : '',
    profile.ethnicity ? `Ethnicity: ${profile.ethnicity}` : '',
    profile.willing_to_relocate !== undefined ? `Willing to relocate: ${profile.willing_to_relocate ? 'Yes' : 'No'}` : '',
    profile.introvert_extrovert ? `Personality scale: ${profile.introvert_extrovert}/10` : '',
    profile.hobbies?.length ? `Hobbies: ${profile.hobbies.join(', ')}` : '',
    profile.habits ? `Habits: ${profile.habits}` : '',
    profile.social_preferences ? `Social preferences: ${profile.social_preferences}` : '',
    profile.career_ambition ? `Career ambition: ${profile.career_ambition}` : '',
    profile.family_goals ? `Family goals: ${profile.family_goals}` : '',
    profile.lifestyle_choices ? `Lifestyle: ${profile.lifestyle_choices}` : '',
    profile.height ? `Height: ${profile.height} cm` : '',
    profile.weight ? `Weight: ${profile.weight} kg` : '',
    profile.fitness_level ? `Fitness: ${profile.fitness_level}` : '',
    profile.style ? `Style: ${profile.style}` : '',
    profile.skin_tone ? `Skin tone: ${profile.skin_tone}` : '',
    profile.search_intent ? `Looking for: ${profile.search_intent}` : '',
    promptsText ? `Prompts: ${promptsText}` : '',
  ].filter(Boolean).join('\n');

  const partnerLines = [
    (profile.partner_age_min || profile.partner_age_max) ? `Preferred age: ${profile.partner_age_min || 18} - ${profile.partner_age_max || 100}` : '',
    profile.partner_religion ? `Preferred religion: ${profile.partner_religion}${profile.partner_religion_strict ? ' (Strict)' : ''}` : '',
    profile.partner_city ? `Preferred city: ${profile.partner_city}` : '',
    profile.partner_willing_to_relocate !== undefined ? `Partner willing to relocate: ${profile.partner_willing_to_relocate ? 'Yes' : 'No'}` : '',
    profile.partner_education ? `Preferred education: ${profile.partner_education}` : '',
    profile.partner_profession ? `Preferred profession: ${profile.partner_profession}` : '',
    profile.partner_career_ambition ? `Preferred career ambition: ${profile.partner_career_ambition}` : '',
    (profile.partner_height_min || profile.partner_height_max) ? `Preferred height: ${profile.partner_height_min || 'Any'} - ${profile.partner_height_max || 'Any'} cm` : '',
    profile.partner_fitness_level ? `Preferred fitness: ${profile.partner_fitness_level}` : '',
    profile.partner_languages?.length ? `Preferred languages: ${profile.partner_languages.join(', ')}` : '',
    profile.partner_lifestyle ? `Preferred lifestyle: ${profile.partner_lifestyle}` : '',
    profile.partner_family_goals ? `Preferred family goals: ${profile.partner_family_goals}` : '',
    profile.partner_smoking ? `Smoking: ${profile.partner_smoking}` : '',
    profile.partner_drinking ? `Drinking: ${profile.partner_drinking}` : '',
    profile.partner_children_preference ? `Children: ${profile.partner_children_preference}` : '',
    profile.partner_marital_status ? `Marital status: ${profile.partner_marital_status}` : '',
    profile.partner_hobbies?.length ? `Partner hobbies: ${profile.partner_hobbies.join(', ')}` : '',
    profile.partner_must_have?.length ? `Must have: ${profile.partner_must_have.join(', ')}` : '',
    profile.partner_deal_breakers?.length ? `Deal breakers: ${profile.partner_deal_breakers.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  return [
    'VIVAH PROFILE',
    selfLines,
    partnerLines ? '\nIDEAL PARTNER PREFERENCES\n' + partnerLines : '',
    '\nMATCHING CONTEXT\nThis profile represents both self attributes and partner preferences.'
  ].filter(Boolean).join('\n\n');
}

async function generateEmbedding(text, attempt = 1) {
  try {
    const model  = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);

    // 🔥 KEY FIX: reduce to 1536 dims
    return result.embedding.values.slice(0, 1536);

  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.warn(`   ⚠ Retry ${attempt}/${MAX_RETRIES}...`);
      await sleep(DELAY_MS * attempt * 2);
      return generateEmbedding(text, attempt + 1);
    }
    throw err;
  }
}

// ── Main ────────────────────────────────────────────────────
async function backfillEmbeddings() {
  console.log('🚀  Starting embedding backfill...\n');

  // Fetch total count for progress display
  const { count: totalCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .or('needs_embedding.eq.true,embedding.is.null');

  if (!totalCount || totalCount === 0) {
    console.log('✅  All profiles already have up-to-date embeddings. Nothing to do!');
    return;
  }

  console.log(`📋  Found ${totalCount} profile(s) needing embeddings.\n`);

  let processed  = 0;
  let succeeded  = 0;
  let failed     = 0;
  let offset     = 0;

  while (true) {
    // Fetch a batch of profiles that need embedding
    const { data: profiles, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .or('needs_embedding.eq.true,embedding.is.null')
      .range(offset, offset + BATCH_SIZE - 1);

    if (fetchErr) {
      console.error('❌  Failed to fetch profiles:', fetchErr.message);
      break;
    }
    if (!profiles || profiles.length === 0) break;

    for (const profile of profiles) {
      processed++;
      const label = `[${processed}/${totalCount}] ${profile.name || profile.id}`;
      const text  = buildProfileText(profile);

      if (!text.trim()) {
        console.warn(`   ⚠  ${label}: profile has no text fields — skipping.`);
        continue;
      }

      try {
        process.stdout.write(`   ⏳  ${label} — generating...`);
        const embedding = await generateEmbedding(text);

        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            embedding:      `[${embedding.join(',')}]`,
            needs_embedding: false,
          })
          .eq('id', profile.id);

        if (updateErr) {
          process.stdout.write(` ❌  (save failed: ${updateErr.message})\n`);
          failed++;
        } else {
          process.stdout.write(` ✅\n`);
          succeeded++;
        }
      } catch (err) {
        process.stdout.write(` ❌  (${err.message})\n`);
        failed++;
      }

      await sleep(DELAY_MS);
    }

    // If we got fewer results than BATCH_SIZE, we're done
    if (profiles.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Backfill complete!
   Processed : ${processed}
   Succeeded : ${succeeded}
   Failed    : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (failed > 0) {
    console.log('\n⚠  Some profiles failed. Re-run the script to retry them.\n');
    process.exit(1);
  }
}

backfillEmbeddings().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
