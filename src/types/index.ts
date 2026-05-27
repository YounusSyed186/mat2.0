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

  created_at: string;
  updated_at?: string;
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
