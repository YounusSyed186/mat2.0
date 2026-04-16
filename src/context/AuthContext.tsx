import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types';

interface AuthContextType {
  session: Session | null;
  currentUser: User | null;
  profile: Profile | null;
  loading: boolean;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  currentUser: null,
  profile: null,
  loading: true,
  refetchProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        // Don't clear profile on fetch error — keep previous value
        return;
      }
      setProfile(data as Profile | null);
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    } finally {
      setLoading(false);
    }
  };

  const refetchProfile = async () => {
    if (!currentUser) return;
    await fetchProfile(currentUser.id);
  };

  useEffect(() => {
    // Listen to auth state changes (fires on initial session load too)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCurrentUser(session?.user ?? null);

      if (session?.user) {
        // Always mark loading=true before fetching profile so ProtectedRoute
        // waits for the fetch to complete before making redirect decisions.
        if (!initializedRef.current) {
          // First call: loading is already true, just fetch
          initializedRef.current = true;
        } else {
          // Subsequent calls (e.g., after signIn): re-set loading
          setLoading(true);
        }
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
        initializedRef.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, currentUser, profile, loading, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
