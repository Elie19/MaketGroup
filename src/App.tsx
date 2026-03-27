import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { Navbar } from './components/Navbar';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { supabase, isConfigured } from './supabase';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

// Lazy load pages
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Messaging = lazy(() => import('./pages/Messaging').then(m => ({ default: m.Messaging })));
const Groups = lazy(() => import('./pages/Groups').then(m => ({ default: m.Groups })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const AdDetail = lazy(() => import('./pages/AdDetail').then(m => ({ default: m.AdDetail })));
const CreateAd = lazy(() => import('./pages/CreateAd').then(m => ({ default: m.CreateAd })));

const PageLoader = () => (
  <div className="flex h-[60vh] w-full items-center justify-center">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent"
    />
  </div>
);

export default function App() {
  const { init, initialized, loading } = useAuthStore();
  const { theme } = useThemeStore();
  const [dbStatus, setDbStatus] = React.useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [dbError, setDbError] = React.useState<string | null>(null);
  const [showSql, setShowSql] = React.useState(false);

  const testConnection = async () => {
    setDbStatus('testing');
    setDbError(null);
    try {
      // Test if table exists and is accessible
      const { error } = await supabase.from('ads').select('id').limit(1);
      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          throw new Error("La table 'ads' n'existe pas. Avez-vous appliqué le schéma SQL ?");
        }
        throw error;
      }
      setDbStatus('success');
    } catch (err: any) {
      setDbStatus('error');
      setDbError(err.message || String(err));
    }
  };

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
        {!isConfigured ? (
          <div className="bg-red-500/10 border-b border-red-500/20 py-2 px-4">
            <div className="mx-auto max-w-7xl flex items-center justify-center gap-2 text-red-500 text-xs font-medium">
              <AlertCircle className="h-3 w-3" />
              <span>Supabase n'est pas configuré. Veuillez ajouter vos clés dans les paramètres.</span>
            </div>
          </div>
        ) : (
          <div className={cn(
            "border-b py-1 px-4 transition-colors",
            dbStatus === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
            dbStatus === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500" :
            "bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:border-white/5 dark:text-zinc-400"
          )}>
            <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                {dbStatus === 'success' ? <CheckCircle2 className="h-3 w-3" /> :
                 dbStatus === 'error' ? <XCircle className="h-3 w-3" /> :
                 <div className="h-2 w-2 rounded-full bg-current animate-pulse" />}
                <span>
                  Statut Base de données: {
                    dbStatus === 'testing' ? 'Vérification...' :
                    dbStatus === 'success' ? 'Connecté' :
                    dbStatus === 'error' ? 'Erreur de connexion' :
                    'Prêt'
                  }
                </span>
                {dbError && <span className="normal-case font-medium opacity-70 ml-2">({dbError})</span>}
              </div>
              <div className="flex items-center gap-4">
                {dbStatus === 'error' && dbError?.includes('schéma SQL') && (
                  <button 
                    onClick={() => setShowSql(true)}
                    className="hover:underline text-emerald-500"
                  >
                    Voir le SQL
                  </button>
                )}
                <button 
                  onClick={testConnection}
                  disabled={dbStatus === 'testing'}
                  className="hover:underline disabled:opacity-50"
                >
                  Tester la connexion
                </button>
              </div>
            </div>
          </div>
        )}

        {showSql && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-4xl rounded-3xl bg-zinc-900 p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Schéma SQL Supabase</h2>
                <button onClick={() => setShowSql(false)} className="text-zinc-400 hover:text-white">Fermer</button>
              </div>
              <p className="text-zinc-400 mb-4 text-sm">
                Copiez ce code et collez-le dans le "SQL Editor" de votre tableau de bord Supabase pour créer les tables nécessaires.
              </p>
              <div className="relative">
                <pre className="max-h-[60vh] overflow-auto rounded-xl bg-black p-6 text-xs text-emerald-500 font-mono">
                  {`-- Copiez le contenu de supabase-schema.sql ici --`}
                </pre>
                <button 
                  onClick={() => {
                    // In a real app we'd fetch the file, but here we can just tell them to look at the file
                    alert("Veuillez copier le contenu du fichier 'supabase-schema.sql' dans votre éditeur SQL Supabase.");
                  }}
                  className="absolute top-4 right-4 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-black"
                >
                  Comment faire ?
                </button>
              </div>
            </motion.div>
          </div>
        )}
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/messages" element={<Messaging />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/ad/:id" element={<AdDetail />} />
                <Route path="/create-ad" element={<CreateAd />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
        
        {/* Footer */}
        <footer className="mt-20 border-t border-zinc-200 dark:border-white/5 py-12">
          <div className="mx-auto max-w-7xl px-4 text-center">
            <div className="flex items-center justify-center gap-2 opacity-50">
              <div className="h-6 w-6 rounded bg-emerald-500" />
              <span className="font-bold">MaketGroup</span>
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              © 2026 MaketGroup Platform. Tous droits réservés.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
