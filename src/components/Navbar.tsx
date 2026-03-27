import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { NotificationCenter } from './NotificationCenter';

export const Navbar = () => {
  const { user, profile, signOut } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleLogin = async () => {
    const redirectUrl = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl }
    });
    if (error) console.error('Login error:', error.message);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const navItems = [
    { label: 'Accueil', icon: Home, path: '/' },
    { label: 'Messages', icon: MessageSquare, path: '/messages' },
    { label: 'Groupes', icon: Users, path: '/groups' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-black/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 font-bold text-black">
            M
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">MaketGroup</span>
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
          <form onSubmit={handleSearch} className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher des annonces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 rounded-full border border-zinc-200 bg-zinc-100 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </form>

          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
            title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
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
                Publier
              </Link>
              
              <NotificationCenter />

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
                    Profil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-400/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
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
              Se connecter
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
