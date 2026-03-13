import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, ShieldCheck, MessageSquare, Users, Tag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_NAME } from '../constants';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/";

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden">
        <div className="bg-emerald-600 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-2">{APP_NAME}</h1>
          <p className="text-emerald-100">Rejoignez notre communauté dès aujourd'hui.</p>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                <Tag size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">Publiez des annonces</h3>
                <p className="text-sm text-stone-500">Vendez vos objets ou proposez vos services gratuitement.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">Discutez en direct</h3>
                <p className="text-sm text-stone-500">Communiquez instantanément avec les autres membres.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">Rejoignez des groupes</h3>
                <p className="text-sm text-stone-500">Partagez vos passions avec des groupes thématiques.</p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-stone-100 py-4 rounded-2xl font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-200 transition-all shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              Continuer avec Google
            </button>
            <p className="text-center text-xs text-stone-400 mt-6">
              En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
