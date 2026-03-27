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
  signOut: () => Promise<void>;
}

const mapProfileToCamel = (profile: any): UserProfile => ({
  uid: profile.uid || profile.id,
  displayName: profile.display_name || profile.displayName,
  email: profile.email,
  photoURL: profile.photo_url || profile.photoURL || profile.avatar_url,
  bio: profile.bio,
  location: profile.location,
  role: profile.role || 'user',
  createdAt: profile.created_at || profile.createdAt
});

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
      try {
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('uid', userId)
          .single();

        if (profile) {
          set({ profile: mapProfileToCamel(profile), loading: false, initialized: true });
          return;
        }

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        // Profile might not be created yet by the trigger if it's a very fast login
        // We could retry once or just wait for the next state change
        set({ loading: false, initialized: true });
      } catch (err) {
        console.error('Unexpected error in fetchProfile:', err);
        set({ loading: false, initialized: true });
      }
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));
