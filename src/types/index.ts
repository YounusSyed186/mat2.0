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
  created_at: string;
  reporter?: Profile;
  reported_user?: Profile;
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
