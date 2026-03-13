import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Annonce, UserProfile } from '../types';
import { useAuth } from '../App';
import { MapPin, Calendar, User, MessageCircle, ArrowLeft, Tag, Share2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AnnonceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [annonce, setAnnonce] = useState<Annonce | null>(null);
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const fetchAnnonce = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'annonces', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Annonce;
          setAnnonce(data);
          
          // Fetch seller info
          const sellerSnap = await getDoc(doc(db, 'users', data.userId));
          if (sellerSnap.exists()) {
            setSeller(sellerSnap.data() as UserProfile);
          }
        } else {
          navigate('/annonces');
        }
      } catch (error) {
        console.error("Error fetching annonce:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnonce();
  }, [id, navigate]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !annonce || !message.trim()) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId: annonce.userId,
        content: message,
        timestamp: serverTimestamp(),
        annonceId: annonce.id
      });
      setSent(true);
      setMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto animate-pulse space-y-8">
        <div className="h-96 bg-stone-200 rounded-3xl"></div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="h-10 bg-stone-200 w-3/4 rounded"></div>
            <div className="h-4 bg-stone-200 w-1/2 rounded"></div>
            <div className="h-32 bg-stone-200 rounded"></div>
          </div>
          <div className="h-64 bg-stone-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (!annonce) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 transition-colors font-medium">
        <ArrowLeft size={20} /> Retour aux annonces
      </button>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: Photos & Description */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm">
            <img 
              src={annonce.photos[0] || "https://picsum.photos/seed/market/800/600"} 
              alt={annonce.title} 
              className="w-full aspect-video object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                {annonce.category}
              </span>
              <div className="flex gap-2">
                <button className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"><Share2 size={20} /></button>
                <button className="p-2 text-stone-400 hover:text-red-600 transition-colors"><AlertCircle size={20} /></button>
              </div>
            </div>

            <h1 className="text-4xl font-bold text-stone-900">{annonce.title}</h1>
            
            <div className="flex flex-wrap gap-6 text-stone-500">
              <div className="flex items-center gap-2"><MapPin size={18} /> {annonce.location}</div>
              <div className="flex items-center gap-2"><Calendar size={18} /> Publié le {format(annonce.createdAt.toDate(), 'PPP', { locale: fr })}</div>
              <div className="flex items-center gap-2"><Tag size={18} /> {annonce.status === 'active' ? 'Disponible' : 'Vendu'}</div>
            </div>

            <div className="border-t border-stone-100 pt-6">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{annonce.description}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Price & Contact */}
        <div className="space-y-6">
          <div className="bg-emerald-600 text-white p-8 rounded-3xl shadow-lg shadow-emerald-600/20">
            <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest mb-1">Prix</p>
            <p className="text-5xl font-bold">{annonce.price}€</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-6">
            <h3 className="font-bold text-lg">Le vendeur</h3>
            <div className="flex items-center gap-4">
              {seller?.photoURL ? (
                <img src={seller.photoURL} alt={seller.displayName} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <User size={24} />
                </div>
              )}
              <div>
                <p className="font-bold">{seller?.displayName || annonce.userName}</p>
                <p className="text-stone-500 text-sm">Membre depuis {seller ? format(seller.createdAt.toDate(), 'MMMM yyyy', { locale: fr }) : 'récemment'}</p>
              </div>
            </div>

            {user ? (
              user.uid === annonce.userId ? (
                <Link to="/profile" className="block w-full text-center bg-stone-100 text-stone-600 py-3 rounded-xl font-bold hover:bg-stone-200 transition-colors">
                  Gérer mon annonce
                </Link>
              ) : sent ? (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-center font-medium flex items-center justify-center gap-2">
                  <MessageCircle size={20} /> Message envoyé !
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <textarea 
                    placeholder="Posez une question au vendeur..." 
                    className="w-full p-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[120px]"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  ></textarea>
                  <button 
                    type="submit" 
                    disabled={sending}
                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sending ? 'Envoi...' : <><MessageCircle size={20} /> Envoyer un message</>}
                  </button>
                </form>
              )
            ) : (
              <div className="bg-stone-50 p-4 rounded-xl text-center">
                <p className="text-stone-500 text-sm mb-3">Connectez-vous pour contacter le vendeur.</p>
                <button className="text-emerald-600 font-bold hover:underline">Se connecter</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
