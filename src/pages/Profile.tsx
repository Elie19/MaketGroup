import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { adService } from '../services/adService';
import { AdListing } from '../types';
import { motion } from 'motion/react';
import { User, Mail, MapPin, Calendar, Settings, Shield, LogIn, Package, Star, LogOut, Camera, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

export const Profile = () => {
  const { user, profile, loading, signOut } = useAuthStore();
  const [ads, setAds] = useState<AdListing[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    location: '',
    bio: ''
  });

  useEffect(() => {
    if (user) {
      const unsubscribe = adService.subscribeToAds((newAds) => {
        setAds(newAds.filter(ad => ad.authorId === user.id));
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || '',
        location: profile.location || '',
        bio: profile.bio || ''
      });
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          display_name: editData.displayName,
          location: editData.location,
          bio: editData.bio
        })
        .eq('id', user.id);
      
      if (error) throw error;
      setIsEditing(false);
      window.location.reload(); 
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent"
        />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[60vh] flex-col items-center justify-center text-center"
      >
        <div className="rounded-full bg-zinc-100 p-6 dark:bg-zinc-900">
          <User className="h-12 w-12 text-zinc-400" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-white">
          {!user ? 'Profile Not Found' : 'Profile Still Loading...'}
        </h2>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {!user 
            ? 'Please sign in to view your profile and manage your ads.' 
            : 'We are setting up your profile. Please wait a moment or try refreshing.'}
        </p>
        {!user && (
          <Link
            to="/"
            className="mt-8 flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 font-bold text-black transition-transform hover:scale-105 active:scale-95"
          >
            <LogIn className="h-4 w-4" />
            Sign In Now
          </Link>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-8"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/5 dark:bg-zinc-900">
        <div className="absolute right-0 top-0 h-32 w-32 bg-emerald-500/10 blur-3xl" />
        <div className="flex flex-col items-center gap-6 md:flex-row">
          <div className="relative">
            <div className="h-32 w-32 overflow-hidden rounded-2xl border-4 border-zinc-100 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.displayName || ''} className="h-full w-full object-cover" />
              ) : (
                <User className="h-full w-full p-6 text-zinc-400 dark:text-zinc-600" />
              )}
            </div>
            <button className="absolute -bottom-2 -right-2 rounded-lg bg-emerald-500 p-2 text-black shadow-lg">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 text-center md:text-left">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editData.displayName}
                  onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-2xl font-bold dark:border-white/10 dark:bg-black dark:text-white"
                  placeholder="Display Name"
                />
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm dark:border-white/10 dark:bg-black dark:text-white"
                  placeholder="Location"
                />
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{profile.displayName || 'Anonymous User'}</h1>
                <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 md:justify-start">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.location || 'Location not set'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently'}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateProfile}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-black"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 dark:border-white/10 dark:text-zinc-400"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 dark:border-white/10 dark:text-zinc-400"
                >
                  <Settings className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-bold text-red-500"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { label: 'Active Ads', value: ads.length.toString() },
          { label: 'Total Sales', value: '0' },
          { label: 'Rating', value: 'New' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-white/5 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Bio */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/5 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">About Me</h3>
        {isEditing ? (
          <textarea
            value={editData.bio}
            onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
            className="mt-4 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black dark:text-white"
            rows={4}
            placeholder="Tell the community about yourself..."
          />
        ) : (
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            {profile.bio || "No bio yet. Tell the community about yourself!"}
          </p>
        )}
      </div>

      {/* Your Ads */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Your Listings</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <Link
              key={ad.id}
              to={`/ad/${ad.id}`}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:border-emerald-500/30 dark:border-white/5 dark:bg-zinc-900"
            >
              <div className="aspect-video overflow-hidden">
                <img src={ad.images[0]} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-zinc-900 dark:text-white">{ad.title}</h4>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>${ad.price}</span>
                  <span>{ad.status}</span>
                </div>
              </div>
            </Link>
          ))}
          {ads.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500">
              You haven't posted any ads yet.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
