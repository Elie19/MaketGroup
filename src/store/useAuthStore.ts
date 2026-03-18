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
    console.log('Initializing Auth Store...');
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      const user = session?.user ?? null;
      set({ user, loading: !!user });
      if (user) {
        fetchProfile(user.id);
      } else {
        set({ loading: false, initialized: true });
      }
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event, session);
      const user = session?.user ?? null;
      set({ user, loading: !!user });
      if (user) {
        fetchProfile(user.id);
      } else {
        set({ profile: null, loading: false, initialized: true });
      }
    });

    async function fetchProfile(userId: string) {
      console.log('Fetching profile for:', userId);
      try {
        // Try 'users' table first
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('uid', userId)
          .single();

        if (profile) {
          console.log('Profile found in users table (uid):', profile);
          set({ profile: mapProfileToCamel(profile), loading: false, initialized: true });
          return;
        }

        // Try 'users' table with 'id' column
        const { data: profileId, error: errorId } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileId) {
          console.log('Profile found in users table (id):', profileId);
          set({ profile: mapProfileToCamel(profileId), loading: false, initialized: true });
          return;
        }

        console.log('Profile not found in users table (uid or id), checking error:', error || errorId);

        // If error is not "no rows found", it might be a table name issue or RLS
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching from users table:', error);
        }

        // Fallback: Try 'profiles' table with 'id' column (common Supabase pattern)
        const { data: profileFallback, error: errorFallback } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileFallback) {
          console.log('Profile found in profiles table:', profileFallback);
          set({ profile: mapProfileToCamel(profileFallback), loading: false, initialized: true });
          return;
        }

        console.log('Profile not found in profiles table either:', errorFallback);

        // If still not found, try to create it in 'users' table
        console.log('Attempting to create new profile in users table...');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: insertError } = await supabase.from('users').insert({
            uid: user.id,
            display_name: user.user_metadata.full_name || user.email?.split('@')[0] || 'Anonymous',
            email: user.email || null,
            photo_url: user.user_metadata.avatar_url || null,
            role: 'user',
            created_at: new Date().toISOString(),
          });
          
          if (insertError) {
            console.error('Error creating profile in users table:', insertError);
            // Try creating in 'profiles' table as fallback
            console.log('Attempting to create new profile in profiles table...');
            const { error: insertErrorFallback } = await supabase.from('profiles').insert({
              id: user.id,
              display_name: user.user_metadata.full_name || user.email?.split('@')[0] || 'Anonymous',
              email: user.email || null,
              avatar_url: user.user_metadata.avatar_url || null,
              role: 'user',
              created_at: new Date().toISOString()
            });
            
            if (insertErrorFallback) {
              console.error('Error creating profile in profiles table:', insertErrorFallback);
            } else {
              console.log('Profile created successfully in profiles table');
              const { data: createdProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
              if (createdProfile) set({ profile: mapProfileToCamel(createdProfile), loading: false, initialized: true });
              return;
            }
          } else {
            console.log('Profile created successfully in users table');
            const { data: createdProfile } = await supabase.from('users').select('*').eq('uid', user.id).single();
            if (createdProfile) set({ profile: mapProfileToCamel(createdProfile), loading: false, initialized: true });
            return;
          }
        }
        
        // If all else fails
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
