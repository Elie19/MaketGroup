import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Messaging } from './pages/Messaging';
import { Groups } from './pages/Groups';
import { Profile } from './pages/Profile';
import { AdDetail } from './pages/AdDetail';
import { CreateAd } from './pages/CreateAd';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const { init, initialized, loading } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    console.log('Applying theme:', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    console.log('Document class list:', document.documentElement.classList.toString());
  }, [theme]);

  if (!initialized && loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-black">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-12 w-12 rounded-xl bg-emerald-500"
        />
      </div>
    );
  }

  return (
    <Router>
      <div className={cn(
        "min-h-screen transition-colors duration-300",
        "bg-zinc-50 text-zinc-900 selection:bg-emerald-500/30",
        "dark:bg-black dark:text-zinc-100"
      )}>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/messages" element={<Messaging />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/ad/:id" element={<AdDetail />} />
              <Route path="/create-ad" element={<CreateAd />} />
            </Routes>
          </AnimatePresence>
        </main>
        
        {/* Footer */}
        <footer className="mt-20 border-t border-zinc-200 dark:border-white/5 py-12">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <div className="flex items-center justify-center gap-2 opacity-50">
              <div className="h-6 w-6 rounded bg-emerald-500" />
              <span className="font-bold">Lumina</span>
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              © 2026 Lumina Platform. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
