import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

// Pages
import Home from './pages/Home';
import Annonces from './pages/Annonces';
import AnnonceDetail from './pages/AnnonceDetail';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Groups from './pages/Groups';
import Admin from './pages/Admin';
import Navbar from './components/Navbar';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, isAdmin: false });

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // Create profile if it doesn't exist
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Utilisateur',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || undefined,
            role: 'user',
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      <Router>
        <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/annonces" element={<Annonces />} />
              <Route path="/annonces/:id" element={<AnnonceDetail />} />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
              <Route path="/messages" element={user ? <Messages /> : <Navigate to="/" />} />
              <Route path="/groups" element={user ? <Groups /> : <Navigate to="/" />} />
              <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}
