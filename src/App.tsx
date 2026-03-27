import React, { useEffect, Suspense, lazy, useState, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { Navbar } from './components/Navbar';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { supabase, isConfigured } from './supabase';
import { AlertCircle, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 text-center dark:bg-black">
          <div className="rounded-full bg-red-100 p-6 dark:bg-red-900/20">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-white">Oups ! Quelque chose s'est mal passé.</h1>
          <p className="mt-2 max-w-md text-zinc-500">
            Une erreur inattendue est survenue. Veuillez rafraîchir la page ou contacter le support si le problème persiste.
          </p>
          <pre className="mt-6 max-w-full overflow-auto rounded-xl bg-zinc-100 p-4 text-left text-xs text-red-500 dark:bg-zinc-900">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 rounded-xl bg-emerald-500 px-8 py-3 font-bold text-black transition-transform hover:scale-105"
          >
            Rafraîchir la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load pages
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Messaging = lazy(() => import('./pages/Messaging').then(m => ({ default: m.Messaging })));
const Groups = lazy(() => import('./pages/Groups').then(m => ({ default: m.Groups })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const AdDetail = lazy(() => import('./pages/AdDetail').then(m => ({ default: m.AdDetail })));
const CreateAd = lazy(() => import('./pages/CreateAd').then(m => ({ default: m.CreateAd })));
const AdminReports = lazy(() => import('./pages/AdminReports').then(m => ({ default: m.AdminReports })));

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
  const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [dbError, setDbError] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  const sqlSchema = `-- Schema for MaketGroup Marketplace

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    photo_url TEXT,
    bio TEXT,
    location TEXT,
    role TEXT DEFAULT 'user',
    average_rating NUMERIC DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = uid);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = uid);

-- 2. Ads Table
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    category TEXT,
    location TEXT,
    images TEXT[] DEFAULT '{}',
    author_id UUID REFERENCES public.users(uid) ON DELETE CASCADE,
    author_name TEXT,
    status TEXT DEFAULT 'active',
    favorites_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for ads
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active ads" ON public.ads;
CREATE POLICY "Anyone can view active ads" ON public.ads FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Users can create ads" ON public.ads;
CREATE POLICY "Users can create ads" ON public.ads FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own ads" ON public.ads;
CREATE POLICY "Users can update own ads" ON public.ads FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own ads" ON public.ads;
CREATE POLICY "Users can delete own ads" ON public.ads FOR DELETE USING (auth.uid() = author_id);

-- 3. Chats Table (Sessions)
CREATE TABLE IF NOT EXISTS public.chats (
    id TEXT PRIMARY KEY,
    participants UUID[] NOT NULL,
    last_message JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT
);

-- Enable RLS for chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
CREATE POLICY "Users can view their own chats" ON public.chats FOR SELECT USING (auth.uid() = ANY(participants));

DROP POLICY IF EXISTS "Users can create/update their own chats" ON public.chats;
CREATE POLICY "Users can create/update their own chats" ON public.chats FOR ALL USING (auth.uid() = ANY(participants));

-- 4. Groups Table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    admin_id UUID REFERENCES public.users(uid),
    members UUID[] DEFAULT '{}',
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;
CREATE POLICY "Anyone can view groups" ON public.groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = admin_id);

DROP POLICY IF EXISTS "Users can join/update groups" ON public.groups;
CREATE POLICY "Users can join/update groups" ON public.groups FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id TEXT REFERENCES public.chats(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(uid),
    sender_name TEXT,
    sender_photo TEXT,
    text TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
CREATE POLICY "Users can view messages" ON public.messages FOR SELECT 
USING (
    (chat_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.chats WHERE id = messages.chat_id AND auth.uid() = ANY(participants)))
    OR
    (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.groups WHERE id = messages.group_id AND auth.uid() = ANY(members)))
);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id AND (
        (chat_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.chats WHERE id = messages.chat_id AND auth.uid() = ANY(participants)))
        OR
        (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.groups WHERE id = messages.group_id AND auth.uid() = ANY(members)))
    )
);

-- 6. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.ads(id),
    seller_id UUID REFERENCES public.users(uid),
    buyer_id UUID REFERENCES public.users(uid),
    guest_email TEXT,
    guest_name TEXT,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'completed',
    payment_method TEXT,
    payment_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create a transaction" ON public.transactions;
CREATE POLICY "Anyone can create a transaction" ON public.transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR (SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin');

-- 7. Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(uid) ON DELETE CASCADE,
    ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, ad_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorites;
CREATE POLICY "Users can manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(uid) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 9. Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (uid, display_name, email, photo_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        CASE WHEN NEW.email = 'fallfly240@gmail.com' THEN 'admin' ELSE 'user' END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. RPC for purchase
CREATE OR REPLACE FUNCTION public.process_purchase(
    p_ad_id UUID,
    p_seller_id UUID,
    p_buyer_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_reference TEXT,
    p_guest_email TEXT DEFAULT NULL,
    p_guest_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    INSERT INTO public.transactions (
        ad_id, seller_id, buyer_id, amount, payment_method, payment_reference, guest_email, guest_name
    ) VALUES (
        p_ad_id, p_seller_id, p_buyer_id, p_amount, p_payment_method, p_payment_reference, p_guest_email, p_guest_name
    ) RETURNING id INTO v_transaction_id;

    UPDATE public.ads SET status = 'sold' WHERE id = p_ad_id;

    INSERT INTO public.notifications (user_id, type, title, content, link)
    VALUES (
        p_seller_id,
        'sale',
        'Nouvelle vente !',
        'Votre article a été vendu pour ' || p_amount || '€.',
        '/profile'
    );

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
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
                <pre className="max-h-[50vh] overflow-auto rounded-xl bg-black p-6 text-[10px] text-emerald-500 font-mono leading-relaxed">
                  {sqlSchema}
                </pre>
                <button 
                  onClick={handleCopySql}
                  className="absolute top-4 right-4 flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-black transition-transform hover:scale-105 active:scale-95"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copié !' : 'Copier le SQL'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <ErrorBoundary>
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
                  <Route path="/admin/reports" element={<AdminReports />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
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
