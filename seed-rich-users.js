import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to generate a normalized 1536-dimensional vector embedding deterministically from text
function createDeterministicEmbedding(text) {
  const dims = 1536;
  const vector = new Array(dims).fill(0);
  
  // Hash text chunks into vector dimensions
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const pos = (charCode * 31 + i * 17) % dims;
    vector[pos] += Math.sin(i + charCode) * 0.5 + 0.5;
  }

  // Normalize vector to unit sphere (L2 norm)
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

const RICH_SEED_USERS = [
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
    }
  },
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
    }
  },
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
    }
  },
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
    }
  },
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
    }
  },
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
    }
  },
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
    ethnicity: 'Malayali',
    willing_to_relocate: true,
    introvert_extrovert: 5,
    hobbies: ['Astrophotography', 'Western Ghats Trekking', 'Carnatic Vocals', 'Sci-Fi Literature'],
    habits: 'Non-smoker, plant-forward diet, morning meditation, night sky watcher',
    social_preferences: 'Intimate campfires, stargazing road trips, and coffee conversations',
    career_ambition: 'Pioneering early disease detection using large-scale genomic AI models',
    family_goals: 'Building a home founded on deep mutual respect, empathy, and intellectual companionship',
    lifestyle_choices: 'Eco-conscious living, hiking, scientific curiosity, and wholesome homemade meals',
    height: 167,
    weight: 58,
    fitness_level: 'Trekker & Daily Hatha Yoga',
    style: 'Graceful Kerala Handlooms & Modern Minimalist',
    skin_tone: 'Dusk',
    search_intent: 'Looking for a kind, forward-thinking, and intellectually curious partner for marriage',
    prompts: {
      'The most spontaneous thing I have done...': 'Drove 4 hours at midnight to catch the Perseid meteor shower from a hill summit.',
      'What makes a relationship thrive...': 'Transparent communication, shared laughter, and giving each other space to grow.',
      'A fact I find fascinating...': 'The atoms that make up our bodies were forged in ancient supernovas billions of years ago.'
    }
  },
  {
    email: 'tanya.dias@vivah.ai',
    name: 'Tanya Dias',
    age: 27,
    gender: 'female',
    religion: 'Christian',
    city: 'Goa',
    education: 'B.Arch, Sir J.J. College of Architecture',
    profession: 'Sustainable Architect & Interior Heritage Restorer',
    bio: 'Restoring Portuguese-Goan heritage homes with sustainable materials. Surfer, acoustic guitarist, jazz listener, and animal shelter volunteer.',
    avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1',
    languages: ['English', 'Konkani', 'Hindi', 'Portuguese'],
    ethnicity: 'Goan Catholic',
    willing_to_relocate: true,
    introvert_extrovert: 7,
    hobbies: ['Surfing', 'Acoustic Guitar', 'Heritage Restoration', 'Rescuing Stray Animals'],
    habits: 'Non-smoker, social drinker, morning ocean swims, nature advocate',
    social_preferences: 'Beachside acoustic jams, sunset barbecues, and cultural festivals',
    career_ambition: 'Pioneering carbon-neutral residential architecture across coastal India',
    family_goals: 'Creating an open, warm, and music-filled home where everyone feels welcome',
    lifestyle_choices: 'Coastal wellness, farm-fresh seafood, active outdoor sports, and sustainable architecture',
    height: 170,
    weight: 57,
    fitness_level: 'Surfer, Swimmer & Functional Training',
    style: 'Bohemian Coastal Chic & Linen Formals',
    skin_tone: 'Sun-kissed Golden',
    search_intent: 'Looking for a warm-hearted, grounded Christian partner who loves nature and life',
    prompts: {
      'My ideal Sunday morning...': 'Catching the sunrise surf at Mandrem beach, followed by fresh poi bread and chorizo stew.',
      'The quality I value most in a partner...': 'A kind soul, genuine warmth, and a passion for something meaningful in life.',
      'Together, we could...': 'Design our own sustainable dream home with a big garden and lots of dogs.'
    }
  },
  {
    email: 'aditya.verma@vivah.ai',
    name: 'Aditya Verma',
    age: 32,
    gender: 'male',
    religion: 'Hindu',
    city: 'Pune',
    education: 'M.S. in Mechanical Engineering, Purdue University',
    profession: 'Automotive R&D Director (EV Systems)',
    bio: 'Pioneering electric mobility platforms. Track cycling enthusiast, aerospace buff, landscape painter, and passionate home barista.',
    avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce',
    languages: ['English', 'Hindi', 'Marathi'],
    ethnicity: 'North Indian',
    willing_to_relocate: true,
    introvert_extrovert: 6,
    hobbies: ['Track Cycling', 'Landscape Painting', 'Espresso Brewing', 'Restoring Vintage Watches'],
    habits: 'Teetotaler, non-smoker, structured morning routine, regular cyclist',
    social_preferences: 'Weekend cycling group rides, art gallery visits, and meaningful one-on-one conversations',
    career_ambition: 'Leading cutting-edge zero-emission vehicle engineering platforms globally',
    family_goals: 'Nurturing a warm, supportive, and progressive partnership with deep mutual trust',
    lifestyle_choices: 'Clean nutrition, endurance sports, continuous learning, and craftsmanship',
    height: 179,
    weight: 74,
    fitness_level: 'High (Road Cycling 150km/week & Gym)',
    style: 'Classic Smart Casuals & Crisp Formal Wear',
    skin_tone: 'Wheatish',
    search_intent: 'Seeking an educated, value-centered, and inspiring partner for lifelong marriage',
    prompts: {
      'Something I could talk about for hours...': 'The physics of electric drivetrains, vintage mechanical watches, and Formula 1 strategies.',
      'My definition of happiness...': 'A quiet evening with someone you love, listening to good music with nothing left unsaid.',
      'I am looking for...': 'A companion who is emotionally mature, passionate about her life, and values genuine connection.'
    }
  },
  {
    email: 'riya.sen@vivah.ai',
    name: 'Riya Sen',
    age: 27,
    gender: 'female',
    religion: 'Hindu',
    city: 'Kolkata',
    education: 'M.A. in English Literature, Presidency College · Diploma in Journalism',
    profession: 'Senior Editorial Director & Published Author',
    bio: 'Curating compelling narratives and essays. Rabindra Sangeet lover, theatre artist, collector of vintage books, and passionate explorer of old Kolkata lanes.',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
    languages: ['English', 'Bengali', 'Hindi'],
    ethnicity: 'Bengali',
    willing_to_relocate: true,
    introvert_extrovert: 6,
    hobbies: ['Creative Writing', 'Rabindra Sangeet', 'Theatre & Dramatics', 'Vintage Book Hunting'],
    habits: 'Avid reader (50+ books/year), non-smoker, daily evening Darjeeling tea, vegetarian-friendly',
    social_preferences: 'Adda sessions at coffee houses, literary festivals, art exhibitions, and theatre evenings',
    career_ambition: 'Publishing acclaimed contemporary fiction and nurturing literary voices from South Asia',
    family_goals: 'Building a home rich in cultural heritage, literature, mutual respect, and deep emotional security',
    lifestyle_choices: 'Artistic sensibilities, mindful slowing down, heritage preservation, and intellectual depth',
    height: 163,
    weight: 53,
    fitness_level: 'Moderate (Classical Yoga & Walking)',
    style: 'Taant & Tussar Sarees, Silver Jewelry & Bohemian Formals',
    skin_tone: 'Fair',
    search_intent: 'Seeking an empathetic, cultured, and intellectually vibrant partner for marriage',
    prompts: {
      'The book that changed my perspective...': 'Rabindranath Tagore’s Gitanjali and Virginia Woolf’s To the Lighthouse.',
      'The best way to spend a rainy afternoon...': 'Sitting by the window with hot Darjeeling tea, rain tapping on the glass, reading poetry aloud.',
      'What I look for in my partner...': 'Emotional depth, kindness towards everyone, and the ability to appreciate silence together.'
    }
  },
  {
    email: 'samir.doshi@vivah.ai',
    name: 'Samir Doshi',
    age: 29,
    gender: 'male',
    religion: 'Jain',
    city: 'Ahmedabad',
    education: 'Chartered Accountant (CA) · B.Com, H.L. College of Commerce',
    profession: 'Private Equity Investment Associate',
    bio: 'Analyzing high-growth Indian enterprises. Badminton player, heritage cuisine enthusiast, volunteer for animal welfare, and avid traveler.',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
    languages: ['English', 'Gujarati', 'Hindi'],
    ethnicity: 'Gujarati (Jain)',
    willing_to_relocate: true,
    introvert_extrovert: 7,
    hobbies: ['Badminton', 'Financial Modelling', 'Heritage Architecture', 'Animal Welfare Volunteering'],
    habits: 'Strict Jain vegetarian, non-smoker, teetotaler, morning temple visit and meditation',
    social_preferences: 'Community events, family weekend gatherings, and quiet strategy board games',
    career_ambition: 'Leading venture and impact funds backing green and ethical innovations in India',
    family_goals: 'Creating a peaceful, harmonious, and ethics-rooted family life with strong traditional values',
    lifestyle_choices: 'Jain ethical living (Ahimsa), conscious spending, active sports, and family priority',
    height: 177,
    weight: 71,
    fitness_level: 'Badminton & Gym 4x/week',
    style: 'Modern Business Formal & Traditional Bandhgalas',
    skin_tone: 'Fair',
    search_intent: 'Seeking an educated, warm, and value-oriented Jain partner for marriage',
    prompts: {
      'A core value that defines me...': 'Ahimsa (compassion) and integrity in everything I do, both in business and personal relationships.',
      'My favorite weekend ritual...': 'Playing a fast-paced badminton match followed by a peaceful breakfast with my grandparents.',
      'Together, we could...': 'Travel across spiritual and scenic destinations and build a loving, respected household.'
    }
  },
  {
    email: 'dr.neil.fernandes@vivah.ai',
    name: 'Dr. Neil Fernandes',
    age: 33,
    gender: 'male',
    religion: 'Christian',
    city: 'Bangalore',
    education: 'M.S. Orthopedics, St. John’s Medical College · Fellowship in Sports Medicine',
    profession: 'Consultant Orthopedic Surgeon & Sports Medic',
    bio: 'Restoring athletes and patients back to their peak lives. Triathlete, amateur jazz pianist, scuba diver, and outdoor trail runner.',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7',
    languages: ['English', 'Konkani', 'Hindi', 'Kannada'],
    ethnicity: 'Mangalorean Catholic',
    willing_to_relocate: false,
    introvert_extrovert: 8,
    hobbies: ['Triathlon Training', 'Jazz Piano', 'Trail Running', 'Scuba Diving'],
    habits: 'Early surgical schedule, fitness-focused, non-smoker, social occasions teetotaler',
    social_preferences: 'Sports events, church community gatherings, and musical jam sessions with friends',
    career_ambition: 'Leading a sports medicine institute empowering young athletes across India',
    family_goals: 'Building a loving, faith-guided, and active family filled with music, sports, and empathy',
    lifestyle_choices: 'Endurance fitness, nutritious wholesome living, community service, and classical music',
    height: 183,
    weight: 79,
    fitness_level: 'Triathlete & Marathon Runner',
    style: 'Athletic Casuals, Clean Tailored Suits & Linen Shirts',
    skin_tone: 'Wheatish',
    search_intent: 'Seeking a kind-hearted, educated, and cheerful Christian woman for marriage',
    prompts: {
      'The most rewarding challenge...': 'Completing my first Ironman 70.3 and helping young athletes recover from ACL injuries.',
      'What I look for in my soulmate...': 'A warm, compassionate heart, a vibrant sense of joy, and deep integrity.',
      'My favorite way to relax...': 'Playing jazz chords on the piano after a long surgical day.'
    }
  },
  {
    email: 'avantika.rathore@vivah.ai',
    name: 'Avantika Rathore',
    age: 26,
    gender: 'female',
    religion: 'Hindu',
    city: 'Jaipur',
    education: 'M.A. in Conservation & Heritage Studies, Oxford University',
    profession: 'Heritage Palace Curator & Royal Textile Historian',
    bio: 'Preserving Rajasthan’s living royal crafts and architecture. Equestrian rider, polo enthusiast, polo photography, and Rajasthani folk singer.',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956',
    languages: ['English', 'Hindi', 'Rajasthani', 'French'],
    ethnicity: 'Rajput',
    willing_to_relocate: true,
    introvert_extrovert: 7,
    hobbies: ['Horseback Polo', 'Textile Restoration', 'Vintage Photography', 'Classical Folk Vocals'],
    habits: 'Vegetarian, non-smoker, morning stable visits, heritage archival reading',
    social_preferences: 'Cultural soirees, polo matches, literature festivals, and royal family gatherings',
    career_ambition: 'Documenting and elevating India’s heritage handlooms to international fashion museums',
    family_goals: 'Creating an honorable, warm, and culturally rich marriage steeped in grace and progressive values',
    lifestyle_choices: 'Equine sports, heritage living, fine aesthetic sensibilities, and artisanal textiles',
    height: 169,
    weight: 55,
    fitness_level: 'Equestrian Rider & Core Strength Training',
    style: 'Regal Poshaks, Chiffon Sarees & Elegant Tailored Formals',
    skin_tone: 'Fair',
    search_intent: 'Seeking an educated, respectful, and culturally grounded gentleman for marriage',
    prompts: {
      'My greatest passion...': 'Reviving 300-year-old royal handloom techniques and riding at sunrise across Aravali hills.',
      'A quality I admire most...': 'Chivalry, deep loyalty, mutual respect, and quiet confidence.',
      'Together, we could...': 'Travel to historic cultural capitals across Europe and Asia and host joyful family celebrations.'
    }
  },
  {
    email: 'ishaan.malhotra@vivah.ai',
    name: 'Ishaan Malhotra',
    age: 30,
    gender: 'male',
    religion: 'Hindu',
    city: 'Delhi NCR',
    education: 'B.Tech in Artificial Intelligence, NSUT Delhi',
    profession: 'Co-Founder & CTO in Robotics Tech',
    bio: 'Designing autonomous robotics for aerospace and defence. Calisthenics athlete, drone builder, mountain trekker, and indie pop guitarist.',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6',
    languages: ['English', 'Hindi', 'Punjabi'],
    ethnicity: 'Punjabi Khatri',
    willing_to_relocate: true,
    introvert_extrovert: 7,
    hobbies: ['Calisthenics', 'Drone Racing', 'Guitar & Songwriting', 'Himalayan High Passes Trekking'],
    habits: 'Non-smoker, tech enthusiast, fitness morning routine, clean nutrition',
    social_preferences: 'Tech meetups, rooftop guitar jam sessions, and adventure road trips',
    career_ambition: 'Taking our Indian robotics startup public and building world-class hardware solutions',
    family_goals: 'Building a dynamic, loving, and adventure-filled partnership with genuine equality',
    lifestyle_choices: 'High energy, physical strength, technological curiosity, and weekend mountain escapes',
    height: 181,
    weight: 77,
    fitness_level: 'Advanced Calisthenics & Gymnastic Rings',
    style: 'Modern Urban Streetwear & Crisp Bandhgala Jackets',
    skin_tone: 'Fair',
    search_intent: 'Ready for marriage with an inspiring, cheerful, and adventurous partner',
    prompts: {
      'The most adventurous thing I have done...': 'Solo motorcycled through the Khardung La pass in Ladakh during early autumn.',
      'What I bring to a relationship...': 'Unwavering loyalty, spontaneous adventures, deep empathy, and endless laughter.',
      'My perfect date...': 'Cooking a meal together from scratch, playing acoustic songs, and star-gazing.'
    }
  },
  {
    email: 'kavya.reddy@vivah.ai',
    name: 'Kavya Reddy',
    age: 27,
    gender: 'female',
    religion: 'Hindu',
    city: 'Hyderabad',
    education: 'B.Tech + M.Tech, IIIT Hyderabad',
    profession: 'Staff Security Engineer & Cloud Architect',
    bio: 'Securing mission-critical infrastructure. Badminton champion, culinary explorer, Kuchipudi dancer, and passionate animal foster parent.',
    avatar_url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604',
    languages: ['English', 'Telugu', 'Hindi'],
    ethnicity: 'Telugu',
    willing_to_relocate: true,
    introvert_extrovert: 6,
    hobbies: ['Badminton', 'Kuchipudi Dance', 'Authentic Andhra Cooking', 'Dog Fostering'],
    habits: 'Non-smoker, daily functional fitness, morning filter coffee lover, organized planner',
    social_preferences: 'Family festive gatherings, badminton tournaments, and weekend cooking masterclasses',
    career_ambition: 'Leading cybersecurity strategy for global cloud platforms and mentoring women in STEM',
    family_goals: 'Building an affectionate, resilient, and cheerful household rooted in Telugu warmth and values',
    lifestyle_choices: 'Active sports, healthy regional cuisines, animal rescue, and work-life harmony',
    height: 166,
    weight: 56,
    fitness_level: 'Badminton Player & Daily Core Workouts',
    style: 'Vibrant Pochampally Ikats & Modern Smart Formals',
    skin_tone: 'Warm Wheatish',
    search_intent: 'Looking for an ambitious, kind, and family-oriented partner for marriage',
    prompts: {
      'A personal achievement I’m proud of...': 'Represented my university in national badminton and published 2 security patents.',
      'What makes me laugh...': 'Witty banter, self-deprecating humor, and goofy puppy moments.',
      'Together, we could...': 'Cook elaborate weekend feasts and explore scenic national parks around the world.'
    }
  },
  {
    email: 'vikram.singh@vivah.ai',
    name: 'Vikramaditya Singh',
    age: 31,
    gender: 'male',
    religion: 'Hindu',
    city: 'Jaipur',
    education: 'B.A. in History, St. Stephen’s College · MBA, London Business School',
    profession: 'Boutique Heritage Hotelier & Wildlife Conservationist',
    bio: 'Managing eco-luxury wilderness lodges in Ranthambore. Wildlife photographer, polo enthusiast, classical jazz listener, and conservation campaigner.',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61',
    languages: ['English', 'Hindi', 'Rajasthani'],
    ethnicity: 'Rajput',
    willing_to_relocate: false,
    introvert_extrovert: 7,
    hobbies: ['Wildlife Safari Photography', 'Polo & Equestrian', 'Wilderness Camping', 'Jazz Saxophone'],
    habits: 'Early sunrise safari riser, non-smoker, active outdoorsman, disciplined lifestyle',
    social_preferences: 'Fireside jungle stories, conservation galas, and quiet evenings under the desert stars',
    career_ambition: 'Expanding community-owned wildlife corridors and eco-tourism across central India',
    family_goals: 'Building a joyful, loving marriage grounded in mutual respect, nature, and cultural pride',
    lifestyle_choices: 'Wilderness living, organic local food, equine sports, and sustainable hospitality',
    height: 184,
    weight: 80,
    fitness_level: 'High (Equestrian Sports, Trail Running & Gym)',
    style: 'Safari Linens, Classic Bandhgalas & Heritage Tweed',
    skin_tone: 'Wheatish',
    search_intent: 'Seeking an educated, warm, and nature-loving partner for marriage in 2026/2027',
    prompts: {
      'The most awe-inspiring moment of my life...': 'Tracking a tigress and her cubs through the mist at Ranthambore dawn.',
      'What I value most in a partner...': 'An open heart, authenticity, a sense of adventure, and kindness towards all living beings.',
      'Together, we could...': 'Spend winters by the jungle campfire and travel the wild places of the Earth.'
    }
  },
  {
    email: 'dr.aisha.siddiqui@vivah.ai',
    name: 'Dr. Aisha Siddiqui',
    age: 29,
    gender: 'female',
    religion: 'Muslim',
    city: 'Delhi NCR',
    education: 'MBBS, MD Dermatology, Maulana Azad Medical College (MAMC)',
    profession: 'Consultant Dermatologist & Clinical Researcher',
    bio: 'Passionate about dermatological wellness and clinical aesthetics. Avid calligrapher, Urdu literature enthusiast, baker, and museum explorer.',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    languages: ['English', 'Urdu', 'Hindi'],
    ethnicity: 'North Indian Muslim',
    willing_to_relocate: true,
    introvert_extrovert: 6,
    hobbies: ['Arabic & Urdu Calligraphy', 'Artisanal Baking', 'Art History', 'Pilates'],
    habits: 'Practicing Muslim, non-smoker, daily skincare research, tea enthusiast',
    social_preferences: 'Intimate dinner parties, literary discussion circles, and art exhibitions',
    career_ambition: 'Establishing cutting-edge clinical dermatology clinics with accessible care for all',
    family_goals: 'Nurturing a warm, respectful, and faith-centered home where mutual support comes naturally',
    lifestyle_choices: 'Mindful aesthetics, holistic wellness, cultural depth, and wholesome living',
    height: 165,
    weight: 54,
    fitness_level: 'Pilates & Functional Core Training',
    style: 'Refined Contemporary Modest Wear & Pastels',
    skin_tone: 'Fair',
    search_intent: 'Looking for a well-educated, respectful, and practicing Muslim gentleman for marriage',
    prompts: {
      'My secret talent...': 'Creating intricate Nastaliq calligraphy pieces and baking sourdough brioche.',
      'The foundation of a great marriage is...': 'Deep mutual empathy, shared spiritual values, and being each other’s biggest cheerleader.',
      'My favorite weekend ritual...': 'Morning Pilates session followed by brewing mint tea and reading classic Urdu ghazals.'
    }
  },
  {
    email: 'dev.sharma@vivah.ai',
    name: 'Dev Sharma',
    age: 28,
    gender: 'male',
    religion: 'Hindu',
    city: 'Bangalore',
    education: 'B.Tech in CS, BITS Pilani · Ex-Amazon',
    profession: 'Founding Engineer at GenAI Startup',
    bio: 'Coding large-scale distributed systems and open-source models. Rock climber, filter coffee obsessive, synthwave composer, and board gamer.',
    avatar_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea',
    languages: ['English', 'Hindi'],
    ethnicity: 'North Indian',
    willing_to_relocate: true,
    introvert_extrovert: 7,
    hobbies: ['Bouldering & Rock Climbing', 'Electronic Synthwave Music', 'Specialty Coffee Brewing', 'Strategic Board Games'],
    habits: 'Non-smoker, morning bouldering gym sessions, vegetarian, tech enthusiast',
    social_preferences: 'Board game evenings (Catan / Terraforming Mars), hackathons, and climbing trips',
    career_ambition: 'Building foundational AI developer tooling that transforms how software is created',
    family_goals: 'Creating an egalitarian, fun-filled, and progressive home where curiosity is celebrated',
    lifestyle_choices: 'Active fitness, clean vegetarian diet, mental health awareness, and creative music production',
    height: 178,
    weight: 72,
    fitness_level: 'High (Bouldering V6 Grade & Calisthenics)',
    style: 'Modern Minimalist Streetwear & Smart Casuals',
    skin_tone: 'Fair',
    search_intent: 'Seeking an intelligent, curious, and cheerful life partner for marriage',
    prompts: {
      'A quirk about me...': 'I own 4 different coffee brewing gadgets and can tell coffee origins by scent alone.',
      'The quality I value most in a partner...': 'Intellectual playfulness, emotional authenticity, and a shared love for learning.',
      'Together, we could...': 'Go bouldering in Hampi and build a smart, warm, cozy home together.'
    }
  },
  {
    email: 'sneha.mukherjee@vivah.ai',
    name: 'Sneha Mukherjee',
    age: 28,
    gender: 'female',
    religion: 'Hindu',
    city: 'Mumbai',
    education: 'M.A. in Clinical Psychology, TISS Mumbai',
    profession: 'Child & Adolescent Psychologist',
    bio: 'Helping young minds flourish with emotional resilience. Classical sitar player, pottery lover, avid traveler, and passionate baker of sourdough.',
    avatar_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91',
    languages: ['English', 'Bengali', 'Hindi', 'Marathi'],
    ethnicity: 'Bengali',
    willing_to_relocate: true,
    introvert_extrovert: 6,
    hobbies: ['Playing Sitar', 'Wheel Pottery', 'Sourdough Baking', 'Himalayan Trekking'],
    habits: 'Non-smoker, compassionate listener, mindfulness meditation practitioner, vegetarian',
    social_preferences: 'Intimate musical evenings, psychology book clubs, and serene weekend hikes',
    career_ambition: 'Publishing clinical research on adolescent mental health and expanding school counseling programs',
    family_goals: 'Building an emotionally rich, communicative, and warm home filled with music and empathy',
    lifestyle_choices: 'Mindful living, holistic wellness, artistic expression, and meaningful conversations',
    height: 164,
    weight: 55,
    fitness_level: 'Yoga & Pilates',
    style: 'Handloom Cottons, Terracotta Accents & Contemporary Formals',
    skin_tone: 'Wheatish',
    search_intent: 'Seeking an emotionally mature, kind-hearted, and cultured partner for marriage',
    prompts: {
      'The most important lesson life taught me...': 'True strength lies in vulnerability, listening deeply, and choosing kindness.',
      'My favorite way to spend an evening...': 'Playing evening ragas on my sitar with the sea breeze coming in.',
      'What I look for in my partner...': 'Emotional depth, genuine kindness towards elders and children, and a loving heart.'
    }
  },
  {
    email: 'zain.merchant@vivah.ai',
    name: 'Zain Merchant',
    age: 30,
    gender: 'male',
    religion: 'Muslim',
    city: 'Mumbai',
    education: 'B.Sc. in Finance, Warwick Business School · CFA Charterholder',
    profession: 'Hedge Fund Portfolio Manager & Angel Investor',
    bio: 'Managing global macro equity portfolios. Tennis player, vintage car enthusiast, marine conservation advocate, and espresso connoisseur.',
    avatar_url: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f',
    languages: ['English', 'Hindi', 'Gujarati', 'Urdu'],
    ethnicity: 'Gujarati Muslim (Merchant)',
    willing_to_relocate: false,
    introvert_extrovert: 8,
    hobbies: ['Tennis', 'Vintage Cars', 'Marine Conservation', 'Espresso Tasting'],
    habits: 'Non-smoker, morning tennis drills, disciplined routine, halal lifestyle',
    social_preferences: 'Tennis club matches, philanthropic dinners, and weekend coastal drives',
    career_ambition: 'Building a premier value-driven investment management firm in South Asia',
    family_goals: 'Creating a modern, gracious, and value-anchored family life rooted in generous hospitality',
    lifestyle_choices: 'High-performance athletic discipline, ethical finance, cultural travels, and family priority',
    height: 182,
    weight: 78,
    fitness_level: 'Competitive Tennis & Functional Fitness',
    style: 'Sharp Italian Tailoring & Crisp Linen Bandhgalas',
    skin_tone: 'Fair',
    search_intent: 'Seeking an educated, warm, and graceful Muslim lady for marriage in 2026',
    prompts: {
      'The achievement I’m most grateful for...': 'Earning my CFA charter while funding scholarships for 50 underprivileged students.',
      'Qualities I admire in a partner...': 'Elegance, deep empathy, quick wit, and a shared appreciation for family bonds.',
      'Together, we could...': 'Watch Wimbledon live in London and build a home filled with warmth and laughter.'
    }
  },
  {
    email: 'harleen.kaur@vivah.ai',
    name: 'Harleen Kaur',
    age: 26,
    gender: 'female',
    religion: 'Sikh',
    city: 'Chandigarh',
    education: 'B.Tech in Biotech, Thapar University · M.S., McGill University',
    profession: 'Biotech Product Manager & Genetic Health Specialist',
    bio: 'Working on cutting-edge personalized healthcare therapies. Gidha folk dancer, national level badminton player, baker, and wildlife lover.',
    avatar_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e',
    languages: ['English', 'Punjabi', 'Hindi', 'French'],
    ethnicity: 'Punjabi Sikh',
    willing_to_relocate: true,
    introvert_extrovert: 8,
    hobbies: ['Badminton', 'Gidha & Folk Dance', 'Baking Cinnamon Rolls', 'Nature Photography'],
    habits: 'Gursikh values, vegetarian, non-smoker, teetotaler, morning Japji Sahib prayer',
    social_preferences: 'Festive family celebrations, sports tournaments, and Langar Seva on weekends',
    career_ambition: 'Bringing affordable gene-based diagnostics to patients across Asia and North America',
    family_goals: 'Building a vibrant, laughter-filled, and spiritually grounded home with strong Punjabi warmth',
    lifestyle_choices: 'Wholesome active living, community volunteerism, fitness, and family togetherness',
    height: 171,
    weight: 59,
    fitness_level: 'Badminton & High Energy Dance',
    style: 'Bright Phulkari Dupattas, Elegant Patiala Suits & Modern Chic Formals',
    skin_tone: 'Fair',
    search_intent: 'Seeking an educated, cheerful, and value-driven Sikh gentleman for marriage',
    prompts: {
      'The best feeling in the world...': 'Serving at the Golden Temple at dawn and feeling overwhelming peace and gratitude.',
      'What I look for in my partner...': 'A kind heart, great sense of humor, respect for elders, and a positive outlook on life.',
      'My secret superpower...': 'Making anyone feel like family within 10 minutes of conversation!'
    }
  },
  {
    email: 'karan.singhania@vivah.ai',
    name: 'Karan Singhania',
    age: 32,
    gender: 'male',
    religion: 'Hindu',
    city: 'Kolkata',
    education: 'B.Com (Hons), St. Xavier’s Kolkata · MBA, INSEAD',
    profession: 'Managing Director, Sustainable Packaging Group',
    bio: 'Transforming industrial manufacturing into circular green packaging. Squash player, amateur historian, collector of vintage maps, and tea estate aficionado.',
    avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61',
    languages: ['English', 'Hindi', 'Bengali', 'Marwari'],
    ethnicity: 'Marwari',
    willing_to_relocate: false,
    introvert_extrovert: 7,
    hobbies: ['Squash', 'Vintage Map Collecting', 'Darjeeling Tea Tasting', 'Historical Biographies'],
    habits: 'Vegetarian, non-smoker, early morning fitness, disciplined executive routine',
    social_preferences: 'Club dinners, business forums, family gatherings, and heritage city tours',
    career_ambition: 'Building India’s largest biodegradable alternative packaging manufacturer',
    family_goals: 'Creating a principled, loving, and supportive partnership where traditions and progress blend',
    lifestyle_choices: 'Refined living, health and fitness, sustainable commerce, and strong family ties',
    height: 180,
    weight: 76,
    fitness_level: 'Daily Squash & Functional Weights',
    style: 'Bespoke Tailored Suits & Classic Silk Jodhpuris',
    skin_tone: 'Fair',
    search_intent: 'Seeking an educated, family-oriented, and cultured partner for marriage in 2026',
    prompts: {
      'My greatest professional milestone...': 'Eliminating 50,000 tons of single-use plastic through our eco-packaging innovations.',
      'The most important trait in a relationship...': 'Mutual loyalty, open honesty, and standing together through all seasons of life.',
      'Together, we could...': 'Visit tea plantations in the Himalayas and build a beautiful, harmonious home.'
    }
  },
  {
    email: 'pooja.hegde.test@vivah.ai',
    name: 'Pooja Hegde',
    age: 27,
    gender: 'female',
    religion: 'Hindu',
    city: 'Bangalore',
    education: 'M.S. in Biotechnology, Manipal Academy · Ex-Novartis',
    profession: 'Senior Clinical Research Associate',
    bio: 'Conducting advanced oncology clinical trials. Classical violinist, botanical sketcher, avid trekker, and wildlife sanctuary volunteer.',
    avatar_url: 'https://images.unsplash.com/photo-1548142813-c348350df52b',
    languages: ['English', 'Kannada', 'Tulu', 'Hindi'],
    ethnicity: 'South Indian (Tuluva / Bunt)',
    willing_to_relocate: true,
    introvert_extrovert: 6,
    hobbies: ['Carnatic Violin', 'Botanical Sketching', 'Western Ghats Treks', 'Bird Watching'],
    habits: 'Vegetarian, daily yoga and violin practice, non-smoker, nature lover',
    social_preferences: 'Classical music concerts, peaceful nature hikes, and cozy family lunches',
    career_ambition: 'Leading clinical trials for breakthrough cancer therapies in South Asia',
    family_goals: 'Fostering a nurturing, respectful, and joyful home where every day is lived with gratitude',
    lifestyle_choices: 'Wholesome coastal vegetarian diet, environmental mindfulness, music, and fitness',
    height: 167,
    weight: 55,
    fitness_level: 'Yoga Practitioner & Avid Trekker',
    style: 'Graceful Traditional Handlooms & Chic Modern Cottons',
    skin_tone: 'Warm Wheatish',
    search_intent: 'Seeking an educated, kind, and supportive life partner for marriage',
    prompts: {
      'A song that moves me...': 'M.S. Subbulakshmi’s rendition of Bhavayami Gopalabalam.',
      'What I look for in my companion...': 'A gentle demeanor, strong ethical compass, good sense of humor, and empathy.',
      'My favorite weekend getaway...': 'Camping in the lush hills of Coorg with mist and fresh coffee blossoms all around.'
    }
  },
  {
    email: 'aravind.nambiar@vivah.ai',
    name: 'Aravind Nambiar',
    age: 31,
    gender: 'male',
    religion: 'Hindu',
    city: 'Kochi',
    education: 'B.Tech in Marine Engineering · M.S. Naval Architecture, TU Delft',
    profession: 'Principal Naval Architect & Green Shipping Consultant',
    bio: 'Designing zero-emission hydrogen-powered marine vessels. Kayaker, amateur landscape photographer, Kalaripayattu martial artist, and home chef.',
    avatar_url: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6',
    languages: ['English', 'Malayalam', 'Hindi', 'Dutch'],
    ethnicity: 'Malayali',
    willing_to_relocate: true,
    introvert_extrovert: 7,
    hobbies: ['Sea Kayaking', 'Kalaripayattu Martial Arts', 'Landscape Photography', 'Coastal Cooking'],
    habits: 'Non-smoker, early morning beach runs, martial arts discipline, seafood gourmet cook',
    social_preferences: 'Backwater boat trips, photography expeditions, and beachside gatherings with friends',
    career_ambition: 'Leading the transition of global maritime transport towards clean renewable fuels',
    family_goals: 'Building a warm, open-minded, and culturally vibrant partnership filled with sea breeze and laughter',
    lifestyle_choices: 'Ocean-centric fitness, martial arts discipline, fresh coastal cooking, and sustainable design',
    height: 181,
    weight: 77,
    fitness_level: 'High (Kalaripayattu & Sea Kayaking)',
    style: 'Casual Linen Shirts, Mundu & Tailored Smart Blazers',
    skin_tone: 'Warm Amber',
    search_intent: 'Looking for a warm-hearted, intelligent, and progressive woman for marriage in 2026/2027',
    prompts: {
      'The most rewarding thing about my career...': 'Watching a 100-meter ship I designed glide silently across the water on clean electric power.',
      'My idea of a great companion...': 'Someone who brings warmth, curiosity, independent thoughts, and an adventurous spirit.',
      'Together, we could...': 'Sail around the Norwegian fjords and create a beautiful coastal home.'
    }
  }
];

async function seedRichUsers() {
  console.log(`\n======================================================`);
  console.log(`🌸 SEEDING RICH MATRIMONIAL PROFILES WITH REAL PHOTOS 🌸`);
  console.log(`======================================================\n`);
  console.log(`Target users to seed: ${RICH_SEED_USERS.length}\n`);

  // Fetch subscription plans to link tiers
  const { data: plans } = await supabase.from('subscription_plans').select('id, name');
  const planMap = {};
  if (plans) {
    plans.forEach(p => {
      planMap[p.name.toLowerCase()] = p.id;
    });
  }

  const createdUserIds = [];

  for (let i = 0; i < RICH_SEED_USERS.length; i++) {
    const user = RICH_SEED_USERS[i];
    const indexStr = `[${i + 1}/${RICH_SEED_USERS.length}]`;
    console.log(`${indexStr} Processing: ${user.name} (${user.email})...`);

    let userId = null;

    // Check if auth user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === user.email);

    if (existing) {
      userId = existing.id;
      console.log(`   ℹ️  Auth user already exists: ID = ${userId}`);
    } else {
      // Create auth user
      const { data: createdAuth, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: 'user'
        }
      });

      if (authError) {
        console.error(`   ❌ Auth creation error: ${authError.message}`);
        continue;
      }
      userId = createdAuth.user.id;
      console.log(`   ✨ Created Auth user: ID = ${userId}`);
    }

    createdUserIds.push({ id: userId, name: user.name, gender: user.gender });

    // Compute embedding text
    const embeddingText = [
      user.name,
      user.age,
      user.gender,
      user.religion,
      user.city,
      user.profession,
      user.education,
      user.bio,
      user.languages?.join(', '),
      user.ethnicity,
      user.willing_to_relocate ? 'willing to relocate' : 'not willing to relocate',
      user.hobbies?.join(', '),
      user.habits,
      user.social_preferences,
      user.career_ambition,
      user.family_goals,
      user.lifestyle_choices,
      user.fitness_level,
      user.style,
      user.skin_tone,
      user.search_intent,
      Object.entries(user.prompts || {}).map(([k, v]) => `${k} ${v}`).join(' ')
    ].filter(Boolean).join(' ');

    const embedding = createDeterministicEmbedding(embeddingText);

    // Upsert rich profile
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
      role: 'user',
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
      console.log(`   ✅ Profile saved with photo & vector embedding`);
    }

    // Seed realistic subscription plan (Diamond for top users, Gold for others)
    const tier = i % 3 === 0 ? 'diamond' : (i % 2 === 0 ? 'gold' : 'silver');
    const planId = planMap[tier] || planMap['diamond'] || planMap['gold'];
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

  // Seed sample initial interactions (Interests & Messages) between complementary profiles
  console.log(`\n💬 Seeding sample interest exchanges and chats...`);
  if (createdUserIds.length >= 4) {
    const u1 = createdUserIds[0]; // Ananya Sharma (female)
    const u2 = createdUserIds[1]; // Rohan Mehta (male)
    const u3 = createdUserIds[2]; // Dr. Zoya Khan (female)
    const u4 = createdUserIds[3]; // Kabir Singh Gill (male)
    const u5 = createdUserIds[4]; // Meera Iyer (female)
    const u6 = createdUserIds[5]; // Arjun Kapoor (male)

    // Interest 1: Rohan -> Ananya (Accepted)
    const { data: int1 } = await supabase.from('interests').upsert({
      sender_id: u2.id,
      receiver_id: u1.id,
      status: 'accepted',
      updated_at: new Date().toISOString()
    }, { onConflict: 'sender_id,receiver_id' }).select().single();

    // Messages between Rohan and Ananya
    await supabase.from('messages').insert([
      {
        sender_id: u2.id,
        receiver_id: u1.id,
        content: 'Hi Ananya! I loved your perspective on AI for sustainability and your trekking adventures. How has your week been?'
      },
      {
        sender_id: u1.id,
        receiver_id: u2.id,
        content: 'Hi Rohan! Thank you so much. It’s been busy with a major model release, but looking forward to a weekend trek. How is your marathon training going?'
      }
    ]);

    // Interest 2: Arjun -> Meera (Pending)
    await supabase.from('interests').upsert({
      sender_id: u6.id,
      receiver_id: u5.id,
      status: 'pending',
      updated_at: new Date().toISOString()
    }, { onConflict: 'sender_id,receiver_id' });

    // Notification for Meera
    await supabase.from('notifications').insert([
      {
        user_id: u5.id,
        type: 'interest_received',
        reference_id: u6.id,
        is_read: false,
        metadata: JSON.stringify({ sender_name: u6.name })
      }
    ]);

    console.log(`   ✅ Created realistic interest links, chat messages, and notifications.`);
  }

  console.log(`\n🎉 SEEDING COMPLETE!`);
  console.log(`   Total Rich Profiles: ${createdUserIds.length}`);
  console.log(`   Default Password for all test accounts: Password123!`);
}

seedRichUsers().catch((err) => {
  console.error('Unexpected seeding error:', err);
  process.exit(1);
});
