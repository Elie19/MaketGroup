import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { User, Mail, MapPin, Calendar, Settings, Shield, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Profile = () => {
  const { user, profile } = useAuthStore();

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
        <h2 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-white">Profile Not Found</h2>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Please sign in to view your profile and manage your ads.</p>
        <Link
          to="/"
          className="mt-8 flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 font-bold text-black transition-transform hover:scale-105 active:scale-95"
        >
          <LogIn className="h-4 w-4" />
          Sign In Now
        </Link>
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
            <div className="absolute -bottom-2 -right-2 rounded-lg bg-emerald-500 p-2 text-black shadow-lg">
              <Settings className="h-4 w-4" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
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
          </div>
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-500">
              <Shield className="h-3 w-3" />
              {(profile.role || 'user').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { label: 'Active Ads', value: '12' },
          { label: 'Total Sales', value: '48' },
          { label: 'Rating', value: '4.9/5' },
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
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          {profile.bio || "No bio yet. Tell the community about yourself!"}
        </p>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Recent Activity</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white p-4 text-sm dark:border-white/5 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-700 dark:text-zinc-300">You posted a new ad: "Vintage Camera"</span>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-600">2 days ago</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
