import { create } from 'zustand';
import { supabase } from '../supabase';
import { UserProfile } from '../types';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  init: () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      set({ user, loading: !!user });
      if (user) {
        fetchProfile(user.id);
      } else {
        set({ loading: false, initialized: true });
      }
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      set({ user, loading: !!user });
      if (user) {
        fetchProfile(user.id);
      } else {
        set({ profile: null, loading: false, initialized: true });
      }
    });

    async function fetchProfile(userId: string) {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .single();

      if (profile) {
        set({ profile: profile as UserProfile, loading: false, initialized: true });
      } else if (!error) {
        // Create profile if it doesn't exist
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const newProfile: UserProfile = {
            uid: user.id,
            displayName: user.user_metadata.full_name || user.email?.split('@')[0] || 'Anonymous',
            email: user.email || null,
            photoURL: user.user_metadata.avatar_url || null,
            role: 'user',
            createdAt: new Date().toISOString(),
          };
          await supabase.from('users').insert(newProfile);
          set({ profile: newProfile, loading: false, initialized: true });
        }
      } else {
        set({ loading: false, initialized: true });
      }
    }
  },
}));
