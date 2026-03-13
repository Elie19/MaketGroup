import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, User, MessageSquare, Users, PlusCircle, Shield } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../App';
import { APP_NAME } from '../constants';

export default function Navbar() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-emerald-700 tracking-tight">
          {APP_NAME}
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link to="/annonces" className="text-stone-600 hover:text-emerald-600 font-medium transition-colors">
            Annonces
          </Link>
          {user && (
            <>
              <Link to="/groups" className="text-stone-600 hover:text-emerald-600 font-medium transition-colors flex items-center gap-2">
                <Users size={18} /> Groupes
              </Link>
              <Link to="/messages" className="text-stone-600 hover:text-emerald-600 font-medium transition-colors flex items-center gap-2">
                <MessageSquare size={18} /> Messages
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              {isAdmin && (
                <Link to="/admin" className="p-2 text-stone-500 hover:text-emerald-600 transition-colors" title="Admin Panel">
                  <Shield size={20} />
                </Link>
              )}
              <Link to="/profile" className="flex items-center space-x-2 p-1 rounded-full hover:bg-stone-100 transition-colors">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <User size={18} />
                  </div>
                )}
                <span className="hidden sm:inline text-sm font-medium text-stone-700">{profile?.displayName}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2 text-stone-500 hover:text-red-600 transition-colors"
                title="Déconnexion"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleLogin}
                className="text-stone-600 hover:text-emerald-600 font-medium px-4 py-2 transition-colors"
              >
                Connexion
              </button>
              <button 
                onClick={handleLogin}
                className="flex items-center space-x-2 bg-emerald-600 text-white px-5 py-2.5 rounded-full hover:bg-emerald-700 transition-all shadow-md font-bold text-sm"
              >
                <span>S'inscrire</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
