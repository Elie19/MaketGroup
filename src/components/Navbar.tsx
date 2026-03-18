import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { supabase } from '../supabase';
import { 
  Home, 
  MessageSquare, 
  Users, 
  PlusCircle, 
  User, 
  LogOut, 
  LogIn,
  Search,
  Bell,
  Sun,
  Moon,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Navbar = () => {
  const { user, profile, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogin = async () => {
    // Ensure we use the current origin for redirect
    const redirectUrl = window.location.origin;
    console.log('Initiating login with redirect to:', redirectUrl);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
    if (error) console.error('Login error:', error.message);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Messages', icon: MessageSquare, path: '/messages' },
    { label: 'Groups', icon: Users, path: '/groups' },
  ];

  const notifications = [
    { id: 1, title: 'New Message', description: 'Alex sent you a message about the iPhone 15.', time: '2m ago', read: false },
    { id: 2, title: 'Ad Approved', description: 'Your listing for "Vintage Camera" is now live.', time: '1h ago', read: true },
    { id: 3, title: 'Price Drop', description: 'An item in your favorites has a new price.', time: '5h ago', read: true },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-black/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 font-bold text-black">
            L
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Lumina</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-white/10 dark:text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search ads..."
              className="h-9 w-64 rounded-full border border-zinc-200 bg-zinc-100 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <button
            onClick={() => {
              console.log('Toggle button clicked, current theme:', theme);
              toggleTheme();
            }}
            className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {user ? (
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                to="/create-ad"
                className="hidden items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-105 active:scale-95 md:flex"
              >
                <PlusCircle className="h-4 w-4" />
                Post Ad
              </Link>
              
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn(
                    "relative rounded-full p-2 transition-colors",
                    showNotifications 
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-white/10 dark:text-white" 
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
                  )}
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowNotifications(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-900 z-50"
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-white/5">
                          <span className="text-sm font-bold text-zinc-900 dark:text-white">Notifications</span>
                          <button className="text-xs text-emerald-500 hover:underline">Mark all as read</button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.map((n) => (
                            <div 
                              key={n.id} 
                              className={cn(
                                "flex gap-3 rounded-xl p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5",
                                !n.read && "bg-emerald-500/5"
                              )}
                            >
                              <div className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                n.read ? "bg-zinc-100 dark:bg-white/5" : "bg-emerald-500/20"
                              )}>
                                {n.read ? <Check className="h-4 w-4 text-zinc-400" /> : <Bell className="h-4 w-4 text-emerald-500" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-zinc-900 dark:text-white">{n.title}</span>
                                  <span className="text-[10px] text-zinc-500">{n.time}</span>
                                </div>
                                <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{n.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button className="mt-2 w-full rounded-xl py-2 text-center text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5">
                          View all notifications
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="group relative">
                <button className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-white/20 dark:bg-zinc-800">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt={profile.displayName || ''} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-zinc-400" />
                  )}
                </button>
                
                <div className="invisible absolute right-0 mt-2 w-48 origin-top-right scale-95 rounded-xl border border-zinc-200 bg-white p-1 opacity-0 shadow-xl transition-all group-hover:visible group-hover:scale-100 group-hover:opacity-100 dark:border-white/10 dark:bg-zinc-900">
                  <Link to="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-400/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
