import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to generate a normalized 1536-dimensional vector embedding deterministically from 2D profile text
function createDeterministicEmbedding(text) {
  const dims = 1536;
  const vector = new Array(dims).fill(0);
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const pos = (charCode * 31 + i * 17) % dims;
    vector[pos] += Math.sin(i + charCode) * 0.5 + 0.5;
  }

  let norm = 0;
  for (let i = 0; i < dims; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dims; i++) {
    vector[i] = Number((vector[i] / norm).toFixed(6));
  }
  return vector;
}

// 50 Rich User Definitions with 2D profile attributes, social links, and partner preferences
const USERS_50 = [
  // 1
  {
    email: 'ananya.sharma@vivah.ai',
    name: 'Ananya Sharma',
    age: 27,
    gender: 'female',
    religion: 'Hindu',
    city: 'Bangalore',
    education: 'B.Tech in Computer Science, IIT Bombay',
    profession: 'Senior AI Engineer & Tech Lead',
    bio: 'Building intelligent systems by day and reading historical non-fiction by night. Passionate about hiking, specialty pour-over coffee, and classical piano.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    languages: ['English', 'Hindi', 'Kannada'],
    ethnicity: 'North Indian (Brahmin)',
    willing_to_relocate: true,
    introvert_extrovert: 7,
    hobbies: ['Trekking & Outdoors', 'Specialty Coffee', 'Classical Piano', 'Historical Fiction'],
    habits: 'Early riser, vegetarian, non-smoker, daily 20-minute meditation',
    social_preferences: 'Intimate dinner parties, book club meetups, and serene weekend getaways in nature',
    career_ambition: 'Aiming to lead AI research teams solving sustainable climate and education challenges',
    family_goals: 'Looking forward to building a warm, emotionally supportive home with shared laughter and modern mutual respect',
    lifestyle_choices: 'Balanced living, regular outdoor runs, conscious minimalism, and exploring heritage art',
    height: 168,
    weight: 56,
    fitness_level: 'Regularly Active (Pilates & 10k Running)',
    style: 'Contemporary Minimalist & Handloom Silks',
    skin_tone: 'Fair',
    search_intent: 'Looking for a meaningful life partnership and marriage within 6-12 months',
    prompts: {
      'My perfect Sunday looks like...': 'Waking up early, brewing a fresh Ethiopian roast, morning trail walk, and spending the afternoon with a great book.',
      'The most important quality in a partner is...': 'Emotional depth, intellectual curiosity, and a grounded sense of humor during life’s chaotic moments.',
      'A life philosophy I live by...': 'Leave every place and person a little better and kinder than you found them.'
    },
    // Social Presence
    instagram_url: 'https://instagram.com/ananya.ai_art',
    linkedin_url: 'https://linkedin.com/in/ananyasharma-tech',
    twitter_url: 'https://twitter.com/ananyasharma_ai',
    facebook_url: '',
    other_social_url: 'https://github.com/ananya-sharma',
    // Partner Preferences
    partner_age_min: 26,
    partner_age_max: 33,
    partner_religion: 'Hindu',
    partner_strict_religion: false,
    partner_city: 'Bangalore / Remote',
    partner_relocate: 'Open to Relocation',
    partner_education: 'Bachelor degree or higher from top institute',
    partner_profession: 'Tech, Product, Entrepreneurship or Research',
    partner_height_min: 172,
    partner_height_max: 190,
    partner_fitness: 'Active & Fitness Minded',
    partner_lifestyle: 'Vegetarian or Eggetarian',
    partner_languages: ['English', 'Hindi'],
    partner_family_goals: 'Wants supportive modern nuclear or semi-joint family',
    partner_must_haves: ['Intellectual Curiosity', 'Non-smoker', 'Emotional Maturity', 'Fitness Mindset'],
    partner_deal_breakers: ['Smoking', 'Dishonesty', 'Disrespect for Career']
  },
  // 2
  {
    email: 'rohan.mehta@vivah.ai',
    name: 'Rohan Mehta',
    age: 29,
    gender: 'male',
    religion: 'Hindu',
    city: 'Mumbai',
    education: 'MBA, IIM Ahmedabad · B.Com, St. Xavier’s College',
    profession: 'Fintech Product Director & Angel Investor',
    bio: 'Passionate about financial inclusion and product craft. Marathon enthusiast, amateur jazz saxophonist, and avid traveler across 25 countries.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    languages: ['English', 'Hindi', 'Gujarati', 'Marathi'],
    ethnicity: 'Gujarati',
    willing_to_relocate: false,
    introvert_extrovert: 8,
    hobbies: ['Marathon Training', 'Jazz Music', 'Scuba Diving', 'Global Travel'],
    habits: 'Morning fitness regimen, non-smoker, socially conscious teetotaler',
    social_preferences: 'Hosting lively game nights, art gallery walkthroughs, and rooftop dinners with close friends',
    career_ambition: 'Scaling high-impact fintech platforms across emerging markets while mentoring young founders',
    family_goals: 'Creating a progressive, loving household that cherishes traditions while embracing modern independence',
    lifestyle_choices: 'Active fitness, mindful travel, healthy nutrition, and weekend sailing in Mumbai harbor',
    height: 182,
    weight: 76,
    fitness_level: 'High Intensity & Marathon Runner',
    style: 'Smart Casuals, Tailored Linen & Festive Kurtas',
    skin_tone: 'Wheatish',
    search_intent: 'Ready for marriage with an ambitious, kind-hearted partner who values growth and family',
    prompts: {
      'My idea of a great date...': 'An evening stroll around South Mumbai, discovering an obscure vinyl record store, followed by great conversation over artisan gelato.',
      'I am most passionate about...': 'Empowering communities through technology and running sunrise half-marathons.',
      'Together, we could...': 'Travel to Japan for the cherry blossom season and build our dream home library.'
    },
    instagram_url: 'https://instagram.com/rohan_mehta_mumbai',
    linkedin_url: 'https://linkedin.com/in/rohanmehta-fintech',
    twitter_url: 'https://twitter.com/rohanmehta_prod',
    facebook_url: '',
    other_social_url: '',
    partner_age_min: 24,
    partner_age_max: 30,
    partner_religion: 'Hindu',
    partner_strict_religion: false,
    partner_city: 'Mumbai',
    partner_relocate: 'Open to Relocation to Mumbai',
    partner_education: 'Graduate / Post-Graduate',
    partner_profession: 'Tech, Finance, Design or Medicine',
    partner_height_min: 160,
    partner_height_max: 175,
    partner_fitness: 'Active Lifestyle',
    partner_lifestyle: 'Vegetarian / Teetotaler preferred',
    partner_languages: ['English', 'Hindi', 'Gujarati'],
    partner_family_goals: 'Family oriented with modern values',
    partner_must_haves: ['Ambition', 'Sense of Humor', 'Non-smoker', 'Family Values'],
    partner_deal_breakers: ['Smoking', 'Heavy Drinking', 'Negativity']
  },
  // 3
  {
    email: 'dr.zoya.khan@vivah.ai',
    name: 'Dr. Zoya Khan',
    age: 28,
    gender: 'female',
    religion: 'Muslim',
    city: 'Hyderabad',
    education: 'MBBS, MD Pediatrics, Osmania Medical College',
    profession: 'Pediatric Specialist & Healthcare Advocate',
    bio: 'Dedicated to children’s healthcare and community wellness. Fond of Urdu poetry, culinary arts, botanical gardening, and weekend watercolor sketching.',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
    languages: ['English', 'Urdu', 'Hindi', 'Telugu'],
    ethnicity: 'Hyderabadi',
    willing_to_relocate: true,
    introvert_extrovert: 6,
    hobbies: ['Botanical Gardening', 'Urdu Poetry & Shayaris', 'Baking Artisanal Pastries', 'Watercolor Painting'],
    habits: 'Practicing Muslim, prayer routine, non-smoker, halal lifestyle, mindful healthy cooking',
    social_preferences: 'Family gatherings, poetry mushairas, charity galas, and quiet tea sessions',
    career_ambition: 'Establishing specialized pediatric care centers for underprivileged children',
    family_goals: 'Nurturing an affectionate, faith-grounded, and respectful home filled with learning and love',
    lifestyle_choices: 'Healthy balanced living, evening walks, soulful music, and floral arrangements',
    height: 164,
    weight: 54,
    fitness_level: 'Moderate (Yoga & Daily Walks)',
    style: 'Graceful Modest Elegance & Chikankari',
    skin_tone: 'Fair',
    search_intent: 'Seeking an educated, compassionate, and family-oriented Muslim gentleman for marriage',
    prompts: {
      'The most rewarding part of my life...': 'Seeing a child smile and recover in the clinic. Healing brings immense gratitude.',
      'Non-negotiable values in my partner...': 'Integrity, genuine empathy for others, respect for family, and good conversational skills.',
      'My favorite way to spend an evening...': 'Brewing Kashmiri Kahwa and discussing literature with someone I cherish.'
    },
    instagram_url: 'https://instagram.com/dr_zoyakhan',
    linkedin_url: 'https://linkedin.com/in/drzoyakhan-peds',
    twitter_url: '',
    facebook_url: '',
    other_social_url: '',
    partner_age_min: 28,
    partner_age_max: 34,
    partner_religion: 'Muslim',
    partner_strict_religion: true,
    partner_city: 'Hyderabad / Major Metro',
    partner_relocate: 'Flexible',
    partner_education: 'Doctor, Engineer, CA, MBA or Lawyer',
    partner_profession: 'Medicine, Tech, Corporate or Business',
    partner_height_min: 173,
    partner_height_max: 188,
    partner_fitness: 'Healthy & Active',
    partner_lifestyle: 'Halal, Non-smoker, Teetotaler',
    partner_languages: ['Urdu', 'English', 'Hindi'],
    partner_family_goals: 'Faith-oriented, warm, close-knit family',
    partner_must_haves: ['Faith Alignment', 'Empathy', 'Respect for Profession', 'Family Values'],
    partner_deal_breakers: ['Alcohol', 'Smoking', 'Lack of Faith']
  },
  // 4
  {
    email: 'kabir.singh@vivah.ai',
    name: 'Kabir Singh Gill',
    age: 30,
    gender: 'male',
    religion: 'Sikh',
    city: 'Chandigarh',
    education: 'M.S. in Sustainable Agriculture, University of British Columbia',
    profession: 'Agri-Tech Founder & Organic Farmer',
    bio: 'Passionate about organic farming and farm-to-table innovations. Horseback rider, Punjabi folk music lover, and avid outdoor camper.',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
    languages: ['English', 'Punjabi', 'Hindi'],
    ethnicity: 'Punjabi (Jat Sikh)',
    willing_to_relocate: false,
    introvert_extrovert: 7,
    hobbies: ['Horseback Riding', 'Organic Farming', 'Camping & Trekking', 'Playing Harmonium'],
    habits: 'Gursikh values, teetotaler, non-smoker, early morning farm walks',
    social_preferences: 'Open-air barbecues, Gurudwara Seva, and community sports',
    career_ambition: 'Revolutionizing sustainable agriculture practices across North India through modern tech',
    family_goals: 'Building a joyous, large-hearted Punjabi home deeply connected to roots, culture, and service',
    lifestyle_choices: 'Farm-fresh wholesome food, outdoor physical fitness, and community involvement',
    height: 186,
    weight: 82,
    fitness_level: 'High (Crossfit, Farm Work & Running)',
    style: 'Traditional Turban & Crisp Tailored Kurtas / Modern Rugged Casuals',
    skin_tone: 'Wheatish',
    search_intent: 'Seeking marriage with an educated, warm, and value-driven partner',
    prompts: {
      'The key to my heart is...': 'A warm smile, honesty, and a mutual love for good food and open skies.',
      'My biggest pride...': 'Helping over 200 local farmers transition to chemical-free organic farming.',
      'Together, we could...': 'Build a sustainable countryside retreat and explore mountain trails across Himachal.'
    },
    instagram_url: 'https://instagram.com/kabir_singh_gill',
    linkedin_url: 'https://linkedin.com/in/kabir-singh-agritech',
    twitter_url: '',
    facebook_url: '',
    other_social_url: '',
    partner_age_min: 24,
    partner_age_max: 30,
    partner_religion: 'Sikh',
    partner_strict_religion: false,
    partner_city: 'Chandigarh / North India',
    partner_relocate: 'Willing to reside in Chandigarh / Punjab',
    partner_education: 'Bachelor or Master degree',
    partner_profession: 'Open / Teaching, Tech, Business, Agriculture',
    partner_height_min: 162,
    partner_height_max: 178,
    partner_fitness: 'Active & Nature Lover',
    partner_lifestyle: 'Non-smoker, Vegetarian or Non-veg',
    partner_languages: ['Punjabi', 'English', 'Hindi'],
    partner_family_goals: 'Large-hearted family oriented',
    partner_must_haves: ['Honesty', 'Love for Nature', 'Family Respect', 'Warmth'],
    partner_deal_breakers: ['Smoking', 'Arrogance', 'Disrespect for Elders']
  },
  // 5
  {
    email: 'meera.iyer@vivah.ai',
    name: 'Meera Iyer',
    age: 26,
    gender: 'female',
    religion: 'Hindu',
    city: 'Chennai',
    education: 'B.Des in Product Design, NID Ahmedabad',
    profession: 'Principal UX Designer & Design Systems Lead',
    bio: 'Designing intuitive digital products that bring joy. Bharatanatyam dancer, filter coffee connoisseur, ceramic pottery creator, and indie film enthusiast.',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9',
    languages: ['English', 'Tamil', 'Hindi', 'French'],
    ethnicity: 'South Indian (Tamil Brahmin)',
    willing_to_relocate: true,
    introvert_extrovert: 6,
    hobbies: ['Bharatanatyam Dance', 'Ceramic Pottery', 'Indie World Cinema', 'Museum Hopping'],
    habits: 'Vegetarian, daily yoga and dance practice, non-smoker, design journal keeper',
    social_preferences: 'Carnatic music concerts (Margazhi season), intimate film screenings, and heritage walks',
    career_ambition: 'Leading global design studios crafting human-centric digital experiences',
    family_goals: 'Cultivating an intellectually stimulating, artistic, and deeply affectionate marriage',
    lifestyle_choices: 'Mindful aesthetics, holistic wellness, artisanal crafts, and sustainable living',
    height: 165,
    weight: 52,
    fitness_level: 'Yoga & Classical Dance Practice',
    style: 'Artistic Chic, Kanjeevarams & Contemporary Cottons',
    skin_tone: 'Warm Olive',
    search_intent: 'Looking for a thoughtful, creative, and culturally grounded partner for marriage',
    prompts: {
      'A quirk about me...': 'I judge a café by the typography on its menu and the aroma of its chicory coffee blend.',
      'What I appreciate most in a partner...': 'Emotional resonance, mutual respect for creative pursuits, and curiosity about the world.',
      'My favorite memory...': 'Performing my Arangetram surrounded by three generations of family.'
    },
    instagram_url: 'https://instagram.com/meera.iyer.design',
    linkedin_url: 'https://linkedin.com/in/meera-iyer-ux',
    twitter_url: 'https://twitter.com/meera_design',
    facebook_url: '',
    other_social_url: 'https://dribbble.com/meera_iyer',
    partner_age_min: 26,
    partner_age_max: 32,
    partner_religion: 'Hindu',
    partner_strict_religion: false,
    partner_city: 'Chennai / Bangalore / Global',
    partner_relocate: 'Open to Relocation',
    partner_education: 'Engineering, Design, MBA, Research',
    partner_profession: 'Tech, Design, Architecture, Product',
    partner_height_min: 170,
    partner_height_max: 185,
    partner_fitness: 'Yoga / Active Fitness',
    partner_lifestyle: 'Vegetarian preferred',
    partner_languages: ['Tamil', 'English'],
    partner_family_goals: 'Culturally grounded & supportive',
    partner_must_haves: ['Creative Respect', 'Intellectual Depth', 'Vegetarian', 'Non-smoker'],
    partner_deal_breakers: ['Smoking', 'Non-vegetarian in home', 'Rigidity']
  },
  // 6
  {
    email: 'arjun.kapoor@vivah.ai',
    name: 'Arjun Kapoor',
    age: 31,
    gender: 'male',
    religion: 'Hindu',
    city: 'Delhi NCR',
    education: 'LL.M., Columbia University · B.A. LL.B., NLSIU Bangalore',
    profession: 'Partner in Corporate Law & M&A',
    bio: 'Navigating complex global cross-border deals. Squash player, amateur gourmet chef, history enthusiast, and collector of vintage fountain pens.',
    avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
    languages: ['English', 'Hindi', 'Punjabi'],
    ethnicity: 'North Indian (Punjabi)',
    willing_to_relocate: false,
    introvert_extrovert: 7,
    hobbies: ['Squash', 'Gourmet Cooking', 'Geopolitical Reading', 'Fountain Pen Collecting'],
    habits: 'Disciplined early routines, non-smoker, occasional social wine, fitness-focused',
    social_preferences: 'Engaging dinners with intellectual conversations, golf weekends, and theatre plays',
    career_ambition: 'Building India’s premier corporate advisory and arbitration practice',
    family_goals: 'Establishing a rock-solid, loving partnership where both partners champion each other’s aspirations',
    lifestyle_choices: 'High-performance lifestyle, refined tastes, regular fitness, and cultural appreciation',
    height: 180,
    weight: 78,
    fitness_level: 'Daily Squash & Functional Strength Training',
    style: 'Bespoke Suits, Smart Italian Casuals & Classic Kurtas',
    skin_tone: 'Fair',
    search_intent: 'Seeking an accomplished, warm, and articulate life partner for marriage in 2026',
    prompts: {
      'The best recipe I can cook for you...': 'Slow-cooked truffle mushroom risotto with fresh parmesan and sourdough.',
      'Qualities I cherish in my partner...': 'Intellect, authentic kindness, sense of humor, and grace under pressure.',
      'Together, we could...': 'Explore Italian vineyards and build a warm haven for family and friends.'
    },
    instagram_url: 'https://instagram.com/arjun.kapoor.law',
    linkedin_url: 'https://linkedin.com/in/arjunkapoor-legal',
    twitter_url: 'https://twitter.com/arjunkapoor_law',
    facebook_url: '',
    other_social_url: '',
    partner_age_min: 25,
    partner_age_max: 31,
    partner_religion: 'Hindu',
    partner_strict_religion: false,
    partner_city: 'Delhi NCR',
    partner_relocate: 'Open to Delhi NCR',
    partner_education: 'Master / Professional Degree',
    partner_profession: 'Law, Finance, Medicine, Tech or Consulting',
    partner_height_min: 162,
    partner_height_max: 176,
    partner_fitness: 'Fitness Conscious',
    partner_lifestyle: 'Moderate / Social drinker fine, Non-smoker',
    partner_languages: ['English', 'Hindi'],
    partner_family_goals: 'Warm family values, supportive partner',
    partner_must_haves: ['Articulate', 'Empathy', 'Ambition', 'Non-smoker'],
    partner_deal_breakers: ['Smoking', 'Dishonesty', 'Lack of ambition']
  },
  // 7
  {
    email: 'priya.nair@vivah.ai',
    name: 'Priya Nair',
    age: 28,
    gender: 'female',
    religion: 'Hindu',
    city: 'Bangalore',
    education: 'M.S. in Data Science, Carnegie Mellon University',
    profession: 'Lead Data Scientist in Healthcare AI',
    bio: 'Uncovering patterns in biomedical genomics. Trekker in the Western Ghats, Carnatic vocal singer, passionate reader of science fiction, and amateur astrophotographer.',
    avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04',
    languages: ['English', 'Malayalam', 'Hindi', 'German'],
    ethnicity: 'South Indian (Malayali)',
    willing_to_relocate: true,
    introvert_extrovert: 5,
    hobbies: ['Astrophotography', 'Trekking', 'Carnatic Music', 'Sci-Fi Books'],
    habits: 'Early riser, non-smoker, tea drinker, night sky gazing',
    social_preferences: 'Astronomy club nights, outdoor camping trips, and quiet home music sessions',
    career_ambition: 'Pioneering generative AI methods for early disease detection',
    family_goals: 'Building a home grounded in curiosity, kindness, and mutual growth',
    lifestyle_choices: 'Nature trips, science podcasts, mindful eating, and acoustic music',
    height: 162,
    weight: 53,
    fitness_level: 'Active Trekker & Cyclist',
    style: 'Minimalist Modern & Kerala Handloom Kasavu',
    skin_tone: 'Dusky',
    search_intent: 'Seeking an empathetic, intellectually curious life partner for marriage',
    prompts: {
      'My favorite weekend activity...': 'Setting up my telescope on a clear night away from city lights.',
      'What makes me laugh...': 'Witty dry humor and clever puns.',
      'I value most...': 'Authenticity, scientific curiosity, and emotional openness.'
    },
    instagram_url: 'https://instagram.com/priya_astro_ds',
    linkedin_url: 'https://linkedin.com/in/priyanair-ai',
    twitter_url: 'https://twitter.com/priyanair_ds',
    facebook_url: '',
    other_social_url: '',
    partner_age_min: 27,
    partner_age_max: 33,
    partner_religion: 'Hindu',
    partner_strict_religion: false,
    partner_city: 'Bangalore / USA / Remote',
    partner_relocate: 'Open to Relocation',
    partner_education: 'MS / B.Tech / PhD / MBA',
    partner_profession: 'Tech, Research, Engineering, Medicine',
    partner_height_min: 170,
    partner_height_max: 185,
    partner_fitness: 'Active & Outdoorsy',
    partner_lifestyle: 'Eggetarian / Non-veg fine, Non-smoker',
    partner_languages: ['English', 'Malayalam', 'Hindi'],
    partner_family_goals: 'Progressive & supportive family',
    partner_must_haves: ['Curiosity', 'Respect for Science', 'Non-smoker', 'Emotional Openness'],
    partner_deal_breakers: ['Smoking', 'Superstition', 'Control Mindset']
  },
  // 8
  {
    email: 'aditya.verma@vivah.ai',
    name: 'Aditya Verma',
    age: 28,
    gender: 'male',
    religion: 'Hindu',
    city: 'Pune',
    education: 'B.Tech in Mechanical, COEP · M.S. Automotive, TU Munich',
    profession: 'EV Powertrain Principal Architect',
    bio: 'Designing next-generation electric vehicles. Formula 1 fanatic, acoustic guitar player, weekend mountain biker in Sahyadris, and espresso enthusiast.',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
    languages: ['English', 'Hindi', 'Marathi', 'German'],
    ethnicity: 'North Indian (Kayastha)',
    willing_to_relocate: true,
    introvert_extrovert: 7,
    hobbies: ['Formula 1 Racing', 'Mountain Biking', 'Acoustic Guitar', 'Specialty Coffee'],
    habits: 'Non-smoker, daily workout, early riser, tech tinkerer',
    social_preferences: 'F1 watch parties, road trips to Konkan coast, and acoustic jam sessions',
    career_ambition: 'Leading zero-emission mobility innovation across India and Europe',
    family_goals: 'Building an active, joyful household filled with music, travel, and mutual respect',
    lifestyle_choices: 'Eco-conscious living, high physical activity, continuous learning',
    height: 178,
    weight: 72,
    fitness_level: 'High (Cycling & Gym Strength Training)',
    style: 'Casual Tech Chic & Tailored Suits',
    skin_tone: 'Wheatish',
    search_intent: 'Looking for a compatible, passionate, and modern partner for marriage',
    prompts: {
      'If I could travel anywhere tomorrow...': 'Nürburgring circuit in Germany followed by a scenic drive through the Swiss Alps.',
      'My secret talent...': 'Tuning acoustic guitars by ear and making café-quality latte art at home.',
      'What I look for in a partner...': 'Enthusiasm for life, independent thinking, and a shared love for adventure.'
    },
    instagram_url: 'https://instagram.com/aditya_ev_tech',
    linkedin_url: 'https://linkedin.com/in/adityaverma-ev',
    twitter_url: 'https://twitter.com/aditya_verma_f1',
    facebook_url: '',
    other_social_url: '',
    partner_age_min: 24,
    partner_age_max: 29,
    partner_religion: 'Hindu',
    partner_strict_religion: false,
    partner_city: 'Pune / Bangalore / Germany',
    partner_relocate: 'Open to Relocation',
    partner_education: 'Bachelor or Master degree',
    partner_profession: 'Tech, Engineering, Architecture, Product or Design',
    partner_height_min: 158,
    partner_height_max: 173,
    partner_fitness: 'Active / Sports Enthusiast',
    partner_lifestyle: 'Non-smoker, Moderate drinker OK',
    partner_languages: ['English', 'Hindi', 'Marathi'],
    partner_family_goals: 'Modern nuclear family mindset',
    partner_must_haves: ['Passion for Career', 'Non-smoker', 'Adventurous Spirit', 'Open Communication'],
    partner_deal_breakers: ['Smoking', 'Drama', 'Rigid Mindset']
  },
  // 9
  {
    email: 'tanya.reddy@vivah.ai',
    name: 'Tanya Reddy',
    age: 26,
    gender: 'female',
    religion: 'Hindu',
    city: 'Hyderabad',
    education: 'B.Arch, SPA Vijayawada · M.Arch, Pratt Institute NY',
    profession: 'Principal Sustainable Architect',
    bio: 'Designing net-zero eco homes and heritage restorations. Pottery artist, jazz listener, rooftop gardener, and passionate traveler.',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
    languages: ['English', 'Telugu', 'Hindi'],
    ethnicity: 'South Indian (Telugu Reddy)',
    willing_to_relocate: true,
    introvert_extrovert: 7,
    hobbies: ['Pottery', 'Heritage Restoration', 'Jazz Vinyls', 'Rooftop Gardening'],
    habits: 'Vegetarian, non-smoker, green tea enthusiast, sketcher',
    social_preferences: 'Design expos, architectural walks, rooftop jazz evenings, and pottery workshops',
    career_ambition: 'Pioneering affordable eco-sustainable housing solutions across urban India',
    family_goals: 'Creating a beautiful, sunlit, eco-conscious home where both partners inspire each other',
    lifestyle_choices: 'Sustainable living, zero-waste practices, art appreciation, and organic food',
    height: 167,
    weight: 55,
    fitness_level: 'Pilates & Swimming',
    style: 'Boho Elegant, Khadi & Modern Linen',
    skin_tone: 'Warm Olive',
    search_intent: 'Looking for a thoughtful, progressive, and creative partner for marriage',
    prompts: {
      'My favorite space in a house...': 'A cozy courtyard filled with tropical greenery and natural sunlight.',
      'A lesson I learned recently...': 'Sustainability is not just a building style, it is a way of living with kindness.',
      'Together we could...': 'Design our custom passive-solar sanctuary in the hills.'
    },
    instagram_url: 'https://instagram.com/tanyareddy.arch',
    linkedin_url: 'https://linkedin.com/in/tanyareddy-architect',
    twitter_url: '',
    facebook_url: '',
    other_social_url: 'https://behance.net/tanyareddy',
    partner_age_min: 26,
    partner_age_max: 32,
    partner_religion: 'Hindu',
    partner_strict_religion: false,
    partner_city: 'Hyderabad / Bangalore / Global',
    partner_relocate: 'Open to Relocation',
    partner_education: 'Master or Bachelor from top college',
    partner_profession: 'Architecture, Tech, Design, Business, Civil',
    partner_height_min: 172,
    partner_height_max: 188,
    partner_fitness: 'Healthy Lifestyle',
    partner_lifestyle: 'Vegetarian / Eggetarian, Non-smoker',
    partner_languages: ['Telugu', 'English', 'Hindi'],
    partner_family_goals: 'Eco-conscious & progressive family',
    partner_must_haves: ['Environmental Awareness', 'Respect for Design', 'Non-smoker', 'Kindness'],
    partner_deal_breakers: ['Smoking', 'Wastefulness', 'Narrow-mindedness']
  },
  // 10
  {
    email: 'vikram.chatterjee@vivah.ai',
    name: 'Vikram Chatterjee',
    age: 32,
    gender: 'male',
    religion: 'Hindu',
    city: 'Kolkata',
    education: 'Ph.D. in Astrophysics, IUCAA Pune · B.Sc., Presidency Kolkata',
    profession: 'Senior Scientist & Space Mission Researcher',
    bio: 'Exploring exoplanets and cosmic magnetic fields. Classical Rabindra Sangeet vocalist, chess enthusiast, documentary filmmaker, and tea lover.',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
    languages: ['English', 'Bengali', 'Hindi'],
    ethnicity: 'Bengali (Brahmin)',
    willing_to_relocate: true,
    introvert_extrovert: 5,
    hobbies: ['Stargazing', 'Chess', 'Rabindra Sangeet Vocal', 'Documentary Cinema'],
    habits: 'Non-smoker, Darjeeling tea drinker, avid reader, late night stargazer',
    social_preferences: 'Adda sessions over tea, literary festivals, chess tournaments, and observatory nights',
    career_ambition: 'Contributing to national deep space exploration missions and public science literacy',
    family_goals: 'Building an intellectually vibrant, culturally rich, and deeply warm household',
    lifestyle_choices: 'Simple living, high intellectual pursuit, classical music, and heritage literature',
    height: 176,
    weight: 70,
    fitness_level: 'Moderate (Yoga & Evening Walks)',
    style: 'Classic Kurta Pyjama & Smart Corduroy Blazers',
    skin_tone: 'Wheatish',
    search_intent: 'Seeking an educated, cultured, and warm life partner for marriage',
    prompts: {
      'What fascinates me most...': 'The sheer scale of the universe and the beauty of human curiosity looking up at the stars.',
      'My ideal evening...': 'A steaming cup of first-flush Darjeeling tea, rain outside the window, and deep conversation.',
      'The foundation of a strong relationship...': 'Mutual respect, intellectual companionship, and unconditional kindness.'
    },
    instagram_url: 'https://instagram.com/vikram_astro_kol',
    linkedin_url: 'https://linkedin.com/in/dr-vikram-chatterjee',
    twitter_url: 'https://twitter.com/vikram_space',
    facebook_url: '',
    other_social_url: '',
    partner_age_min: 25,
    partner_age_max: 31,
    partner_religion: 'Hindu',
    partner_strict_religion: false,
    partner_city: 'Kolkata / Pune / Global',
    partner_relocate: 'Open to Relocation',
    partner_education: 'Master or Ph.D. / High academic background',
    partner_profession: 'Academia, Research, Teaching, Tech, Medicine or Arts',
    partner_height_min: 158,
    partner_height_max: 172,
    partner_fitness: 'Healthy lifestyle',
    partner_lifestyle: 'Fish/Non-veg or Veg fine, Non-smoker',
    partner_languages: ['Bengali', 'English'],
    partner_family_goals: 'Cultured & family oriented',
    partner_must_haves: ['Intellectual Curiosity', 'Culture Appreciation', 'Non-smoker', 'Warmth'],
    partner_deal_breakers: ['Smoking', 'Superficiality', 'Disrespect for Academia']
  },

  // Generate 40 more realistic, highly detailed Indian profiles (11 to 50)
  ...Array.from({ length: 40 }).map((_, idx) => {
    const num = idx + 11;
    const isFemale = num % 2 === 1;
    const gender = isFemale ? 'female' : 'male';
    
    const cities = ['Mumbai', 'Bangalore', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur', 'Chandigarh', 'Ahmedabad', 'Kochi', 'Goa', 'Lucknow', 'Indore'];
    const city = cities[num % cities.length];
    
    const religions = ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Jain'];
    const religion = religions[num % religions.length];
    
    const femaleNames = [
      'Pooja Deshmukh', 'Sneha Kulkarni', 'Ria Sen', 'Aisha Malik', 'Divya Gupta',
      'Anvika Raghunath', 'Dr. Shreya Mukherji', 'Kavya Pillai', 'Simran Kaur Ahluwalia', 'Rhea Fernandis',
      'Ishita Saxena', 'Niharika Bhat', 'Pavitra Sundaram', 'Radhika Aggarwal', 'Zainab Merchant',
      'Avani Joshi', 'Trisha Trivedi', 'Sanajana Rao', 'Meghna Roy', 'Bhavna Parekh'
    ];
    const maleNames = [
      'Karan Singhania', 'Rahul Desai', 'Dr. Neel Joshi', 'Tarun Nambiar', 'Siddharth Dutta',
      'Dhruv Singhal', 'Dr. Amanpreet Gill', 'Neil D’Souza', 'Pranav Kulkarni', 'Zayan Hashmi',
      'Yashwardhan Rana', 'Gautam Nambiar', 'Rishabh Bhalla', 'Manav Dave', 'Varun Somani',
      'Harshvardhan Rathore', 'Devansh Murthy', 'Chirag Merchant', 'Abhimanyu Bose', 'Siddhant Jain'
    ];
    
    const name = isFemale ? femaleNames[idx % femaleNames.length] : maleNames[idx % maleNames.length];
    const firstname = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const lastname = name.split(' ')[1].toLowerCase().replace(/[^a-z]/g, '');
    const email = `${firstname}.${lastname}${num}@vivah.ai`;

    const professionsFemale = [
      'Child & Adolescent Psychologist', 'VP Private Equity Investment', 'Senior Literary Editor', 'Investigative Journalist',
      'CA & Financial Educator', 'Senior Software Architect', 'Pediatric Cardiologist', 'Brand Strategy Director',
      'Commercial Airline Pilot', 'Biotech Research Scientist'
    ];
    const professionsMale = [
      'Managing Director Heritage Hotels', 'CEO Clean-Energy Battery Tech', 'Orthopedic Surgeon', 'Autonomous Vessel Engineer',
      'Founding Robotics Engineer', 'Venture Capital Partner', 'Cloud Solutions Director', 'Corporate Litigator',
      'Automotive Design Lead', 'Merchant Navy Captain'
    ];
    const profession = isFemale ? professionsFemale[idx % professionsFemale.length] : professionsMale[idx % professionsMale.length];

    const femaleAvatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2'
    ];
    const maleAvatars = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6',
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d'
    ];
    const avatar_url = isFemale ? femaleAvatars[idx % femaleAvatars.length] : maleAvatars[idx % maleAvatars.length];

    const age = 24 + (num % 10);
    const height = isFemale ? 160 + (num % 10) : 173 + (num % 12);
    const weight = isFemale ? 50 + (num % 12) : 68 + (num % 18);

    return {
      email,
      name,
      age,
      gender,
      religion,
      city,
      education: 'Master / Bachelor degree from top institution',
      profession,
      bio: `Passionate about ${profession.toLowerCase()} and meaningful living. Enjoys travel, fitness, music, and spending time with family and close friends.`,
      avatar_url,
      languages: ['English', 'Hindi', city === 'Chennai' ? 'Tamil' : (city === 'Kolkata' ? 'Bengali' : 'Marathi')],
      ethnicity: 'Indian',
      willing_to_relocate: num % 3 !== 0,
      introvert_extrovert: 5 + (num % 5),
      hobbies: ['Fitness', 'Travel', 'Reading', 'Music', 'Cooking'],
      habits: religion === 'Jain' ? 'Strict Jain vegetarian, non-smoker, teetotaler' : 'Non-smoker, active lifestyle, balanced habits',
      social_preferences: 'Intimate dinner catchups, outdoor weekend trips, and family celebrations',
      career_ambition: `Excelling in ${profession} while maintaining a healthy work-life balance`,
      family_goals: 'Building a warm, emotionally secure, and joyful home filled with love and respect',
      lifestyle_choices: 'Active physical health, continuous learning, and mindful living',
      height,
      weight,
      fitness_level: 'Active & Fitness Minded',
      style: 'Contemporary Smart Casuals & Indian Ethnics',
      skin_tone: num % 2 === 0 ? 'Wheatish' : 'Fair',
      search_intent: 'Seeking a compatible, educated, and warm life partner for marriage',
      prompts: {
        'My ideal weekend...': 'A morning workout followed by good food and great conversation.',
        'What I value most...': 'Authenticity, kindness, and mutual growth.',
        'Together we could...': 'Travel the world and build a loving home.'
      },
      instagram_url: `https://instagram.com/${firstname}_${lastname}_${num}`,
      linkedin_url: `https://linkedin.com/in/${firstname}-${lastname}-${num}`,
      twitter_url: `https://twitter.com/${firstname}_${lastname}_${num}`,
      facebook_url: '',
      other_social_url: '',
      partner_age_min: isFemale ? age - 1 : Math.max(18, age - 5),
      partner_age_max: isFemale ? age + 6 : age + 2,
      partner_religion: religion,
      partner_strict_religion: religion === 'Jain' || religion === 'Muslim',
      partner_city: `${city} / Open`,
      partner_relocate: 'Open to Relocation',
      partner_education: 'Bachelor degree or higher',
      partner_profession: 'Tech, Healthcare, Finance, Business or Engineering',
      partner_height_min: isFemale ? 170 : 158,
      partner_height_max: isFemale ? 188 : 175,
      partner_fitness: 'Active Lifestyle',
      partner_lifestyle: religion === 'Jain' ? 'Strict Jain Vegetarian' : 'Non-smoker',
      partner_languages: ['English', 'Hindi'],
      partner_family_goals: 'Family oriented with modern values',
      partner_must_haves: ['Education', 'Emotional Maturity', 'Non-smoker', 'Family Values'],
      partner_deal_breakers: ['Smoking', 'Dishonesty', 'Lack of respect']
    };
  })
];

async function seed50Users() {
  console.log(`🚀 Starting Vivah 50-User Comprehensive Seeding Process...`);
  console.log(`   Target Backend: ${supabaseUrl}`);

  const { data: plans, error: planErr } = await supabase.from('subscription_plans').select('id, name');
  if (planErr) {
    console.warn(`⚠️ Subscription plans fetch warning: ${planErr.message}`);
  }
  const planMap = {};
  if (plans) {
    plans.forEach(p => {
      planMap[p.name.toLowerCase()] = p.id;
    });
  }

  const createdUserIds = [];

  // Fetch all existing auth users once
  const { data: existingUsersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const allAuthUsers = existingUsersData?.users || [];

  for (let i = 0; i < USERS_50.length; i++) {
    const user = USERS_50[i];
    console.log(`\n[${i + 1}/50] Processing user: ${user.name} (${user.email})...`);

    let userId = null;

    const existing = allAuthUsers.find(u => u.email.toLowerCase() === user.email.toLowerCase());

    if (existing) {
      userId = existing.id;
      console.log(`   Found existing auth user: ${userId}`);
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { name: user.name }
      });

      if (authError) {
        console.error(`   ❌ Auth creation error: ${authError.message}`);
        continue;
      }
      userId = authData.user.id;
      console.log(`   Created new auth user: ${userId}`);
    }

    createdUserIds.push({ id: userId, name: user.name, email: user.email, gender: user.gender, religion: user.religion });

    const embeddingText = [
      `VIVAH PROFILE`,
      `Name: ${user.name}`,
      `Age: ${user.age}`,
      `Gender: ${user.gender}`,
      `Religion: ${user.religion}`,
      `City: ${user.city}`,
      `Education: ${user.education}`,
      `Profession: ${user.profession}`,
      `Bio: ${user.bio}`,
      `Languages: ${user.languages?.join(', ')}`,
      `Ethnicity: ${user.ethnicity}`,
      `Relocation: ${user.willing_to_relocate ? 'willing to relocate' : 'not willing to relocate'}`,
      `Hobbies: ${user.hobbies?.join(', ')}`,
      `Habits: ${user.habits}`,
      `Social Preferences: ${user.social_preferences}`,
      `Career Ambition: ${user.career_ambition}`,
      `Family Goals: ${user.family_goals}`,
      `Lifestyle Choices: ${user.lifestyle_choices}`,
      `Fitness Level: ${user.fitness_level}`,
      `Style: ${user.style}`,
      `Skin Tone: ${user.skin_tone}`,
      `Search Intent: ${user.search_intent}`,
      `Prompts: ${Object.entries(user.prompts || {}).map(([k, v]) => `${k} ${v}`).join(' ')}`,
      `IDEAL PARTNER PREFERENCES`,
      `Partner Age: ${user.partner_age_min} to ${user.partner_age_max}`,
      `Partner Religion: ${user.partner_religion} (Strict: ${user.partner_strict_religion})`,
      `Partner Location: ${user.partner_city}, ${user.partner_relocate}`,
      `Partner Education: ${user.partner_education}`,
      `Partner Profession: ${user.partner_profession}`,
      `Partner Height: ${user.partner_height_min} to ${user.partner_height_max} cm`,
      `Partner Fitness: ${user.partner_fitness}`,
      `Partner Lifestyle: ${user.partner_lifestyle}`,
      `Partner Languages: ${user.partner_languages?.join(', ')}`,
      `Partner Family Goals: ${user.partner_family_goals}`,
      `Partner Must Haves: ${user.partner_must_haves?.join(', ')}`,
      `Partner Deal Breakers: ${user.partner_deal_breakers?.join(', ')}`
    ].filter(Boolean).join('\n');

    const embedding = createDeterministicEmbedding(embeddingText);

    const profilePayload = {
      id: userId,
      name: user.name,
      age: user.age,
      gender: user.gender,
      religion: user.religion,
      city: user.city,
      education: user.education,
      profession: user.profession,
      bio: user.bio,
      role: i === 0 ? 'primary_admin' : (i === 1 ? 'admin' : 'user'),
      is_blocked: false,
      avatar_url: user.avatar_url,
      languages: user.languages,
      ethnicity: user.ethnicity,
      willing_to_relocate: user.willing_to_relocate,
      introvert_extrovert: user.introvert_extrovert,
      hobbies: user.hobbies,
      habits: user.habits,
      social_preferences: user.social_preferences,
      career_ambition: user.career_ambition,
      family_goals: user.family_goals,
      lifestyle_choices: user.lifestyle_choices,
      height: user.height,
      weight: user.weight,
      fitness_level: user.fitness_level,
      style: user.style,
      skin_tone: user.skin_tone,
      search_intent: user.search_intent,
      prompts: user.prompts,

      instagram_url: user.instagram_url,
      linkedin_url: user.linkedin_url,
      twitter_url: user.twitter_url,
      facebook_url: user.facebook_url,
      other_social_url: user.other_social_url,

      // Partner Preferences
      partner_age_min: user.partner_age_min,
      partner_age_max: user.partner_age_max,
      partner_religion: user.partner_religion,
      partner_religion_strict: user.partner_strict_religion ?? false,
      partner_city: user.partner_city,
      partner_willing_to_relocate: Boolean(user.willing_to_relocate),
      partner_education: user.partner_education,
      partner_profession: user.partner_profession,
      partner_height_min: user.partner_height_min,
      partner_height_max: user.partner_height_max,
      partner_fitness_level: user.partner_fitness,
      partner_lifestyle: user.partner_lifestyle,
      partner_languages: user.partner_languages,
      partner_family_goals: user.partner_family_goals,
      partner_must_have: user.partner_must_haves,
      partner_deal_breakers: user.partner_deal_breakers,

      embedding: `[${embedding.join(',')}]`,
      needs_embedding: false,
      updated_at: new Date().toISOString()
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileError) {
      console.error(`   ❌ Profile upsert error: ${profileError.message}`);
    } else {
      console.log(`   ✅ Profile saved with photo, social links, partner preferences & 2D embedding`);
    }

    const tier = i % 4 === 0 ? 'diamond' : (i % 2 === 0 ? 'gold' : 'silver');
    const planId = planMap[tier] || Object.values(planMap)[0];

    if (planId) {
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(now.getMonth() + 1);

      await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        plan_id: planId,
        billing_cycle: 'monthly',
        status: 'active',
        start_date: now.toISOString(),
        end_date: nextMonth.toISOString(),
        updated_at: now.toISOString()
      }, { onConflict: 'user_id' });
    }
  }

  console.log(`\n💬 Seeding rich sample interest exchanges and live chat messages...`);
  if (createdUserIds.length >= 10) {
    const pairs = [
      { sender: createdUserIds[1], receiver: createdUserIds[0], status: 'accepted', msg1: 'Hi Ananya! Loved your perspective on AI & trekking. How is your week going?', msg2: 'Hi Rohan! Busy with our new model release, but looking forward to the weekend trek!' },
      { sender: createdUserIds[5], receiver: createdUserIds[4], status: 'accepted', msg1: 'Hi Meera! Your design work and Carnatic dance art are truly inspiring.', msg2: 'Thank you Arjun! Really appreciate that. Your corporate legal work sounds fascinating.' },
      { sender: createdUserIds[7], receiver: createdUserIds[6], status: 'accepted', msg1: 'Hi Priya! Your astrophotography photos are incredible!', msg2: 'Thanks Aditya! Your EV powertrain work in Pune is super impressive.' },
      { sender: createdUserIds[3], receiver: createdUserIds[2], status: 'pending' },
      { sender: createdUserIds[9], receiver: createdUserIds[8], status: 'pending' }
    ];

    for (const p of pairs) {
      await supabase.from('interests').upsert({
        sender_id: p.sender.id,
        receiver_id: p.receiver.id,
        status: p.status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'sender_id,receiver_id' });

      if (p.status === 'accepted' && p.msg1) {
        await supabase.from('messages').insert([
          { sender_id: p.sender.id, receiver_id: p.receiver.id, content: p.msg1 },
          { sender_id: p.receiver.id, receiver_id: p.sender.id, content: p.msg2 }
        ]);
      }

      await supabase.from('notifications').insert([
        {
          user_id: p.receiver.id,
          type: 'interest_received',
          reference_id: p.sender.id,
          is_read: false,
          metadata: JSON.stringify({ sender_name: p.sender.name })
        }
      ]);
    }
    console.log(`   ✅ Successfully created realistic interest requests, chat histories, and notifications.`);
  }

  console.log(`\n🎉 50-USER SEEDING COMPLETE!`);
  console.log(`   Total Users Processed: ${createdUserIds.length}`);
  console.log(`   Default Password for all 50 accounts: Password123!`);
}

seed50Users().catch(err => {
  console.error('Unexpected seeding failure:', err);
  process.exit(1);
});
