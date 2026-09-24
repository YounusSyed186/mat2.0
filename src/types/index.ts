export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  religion: string;
  city: string;
  education: string;
  profession: string;
  bio: string;
  role: 'user' | 'admin' | 'primary_admin';
  is_blocked: boolean;
  avatar_url?: string | null;
  
  // Identity & Background
  languages: string[];
  ethnicity?: string;
  willing_to_relocate: boolean;
  marital_status?: 'Never Married' | 'Divorced' | 'Widowed' | 'Separated' | string | null;
  photos?: string[];

  // Horoscope & Kundli
  rashi?: string | null; // Zodiac Moon Sign
  nakshatra?: string | null; // Birth Star
  manglik_status?: 'non_manglik' | 'manglik' | 'anshik_manglik' | 'dont_know' | string | null;
  birth_place?: string | null;
  birth_time?: string | null;
  gotra?: string | null;
  horoscope_available?: boolean | null;
  horoscope_url?: string | null;
  
  // Personality & Lifestyle
  introvert_extrovert?: number;
  hobbies: string[];
  habits?: string;
  social_preferences?: string;
  
  // Values & Preferences
  career_ambition?: string;
  family_goals?: string;
  lifestyle_choices?: string;
  
  // Physical Attributes
  height?: number;
  fitness_level?: string;
  style?: string;
  skin_tone?: string;
  
  // Intent & Goals
  search_intent?: string;
  
  // Media & Expression
  prompts: Record<string, string>;
  voice_url?: string;
  video_url?: string;
  
  weight?: number;

  // Social Presence (Public URLs)
  instagram_url?: string | null;
  facebook_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  other_social_url?: string | null;

  // Partner Preferences
  partner_age_min?: number | null;
  partner_age_max?: number | null;
  partner_religion?: string | null;
  partner_religion_strict?: boolean;
  partner_city?: string | null;
  partner_willing_to_relocate?: boolean | null;
  partner_education?: string | null;
  partner_profession?: string | null;
  partner_height_min?: number | null;
  partner_height_max?: number | null;
  partner_fitness_level?: string | null;
  partner_languages?: string[];
  partner_lifestyle?: string | null;
  partner_family_goals?: string | null;
  partner_career_ambition?: string | null;
  partner_hobbies?: string[];
  partner_smoking?: string | null;
  partner_drinking?: string | null;
  partner_children_preference?: string | null;
  partner_marital_status?: string | null;
  partner_must_have?: string[];
  partner_deal_breakers?: string[];

  // Partner Horoscope Preferences
  partner_horoscope_required?: boolean | null;
  partner_manglik?: 'any' | 'non_manglik' | 'manglik' | 'anshik_manglik' | 'dont_know' | string | null;
  partner_rashi?: string[];
  partner_nakshatra?: string[];

  // Embedding metadata
  needs_embedding?: boolean;
  embedding?: string | number[] | null;

  created_at: string;
  updated_at?: string;
}

export interface MatchScoreBreakdown {
  hardCompatibilityScore: number;
  preferenceScore: number;
  forwardPreferenceScore: number;
  reversePreferenceScore: number;
  lifestyleScore: number;
  semanticSimilarity: number;
  dealBreakerStatus: boolean;
  finalMatchScore: number;
  matchedPreferences: string[];
}

export interface MatchResultV2 extends Profile {
  similarity: number;
  preference_score?: number;
  lifestyle_score?: number;
  hard_compatibility_score?: number;
  deal_breaker_status?: boolean;
  final_match_score: number;
  matched_preferences?: string[];
}

export interface Interest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  ciphertext?: string | null;
  iv?: string | null;
  key_version?: number | null;
  encryption_scheme?: string | null;
  created_at: string;
  sender?: Profile;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocker?: Profile | { name: string };
  blocked?: Profile | { name: string };
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details?: string | null;
  status?: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  admin_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  reporter?: Profile;
  reported_user?: Profile;
  report_evidence?: ReportEvidence[];
}

export interface ReportEvidence {
  id: string;
  report_id: string;
  message_id?: string | null;
  sender_id?: string | null;
  message_created_at?: string | null;
  content_snapshot?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'interest_received' | 'interest_accepted' | 'message';
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  metadata?: string | null;
  sender_name?: string | null;
  sender_avatar?: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_quarterly: number;
  price_yearly: number;
  interest_limit: number;
  profile_view_limit_monthly: number;
  ai_token_limit_monthly: number;
  message_limit_monthly?: number | null;
  allow_unlimited_photos?: boolean;
  allow_social_links?: boolean;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string;
  created_at: string;
  plan?: SubscriptionPlan;
}

export interface RazorpayPayment {
  id: string;
  user_id: string;
  plan_id?: string | null;
  subscription_id?: string | null;
  razorpay_payment_id: string;
  razorpay_order_id?: string | null;
  razorpay_signature?: string | null;
  amount: number;
  currency: string;
  status: string;
  billing_cycle?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

