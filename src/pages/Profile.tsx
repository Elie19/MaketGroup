import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../App';
import { Annonce } from '../types';
import { CATEGORIES } from '../constants';
import { Plus, Trash2, Edit2, Package, MapPin, Tag, Image as ImageIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Profile() {
  const { user, profile } = useAuth();
  const [myAnnonces, setMyAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchMyAnnonces = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'annonces'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        setMyAnnonces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching my annonces:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyAnnonces();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const newAnnonce = {
        title,
        description,
        category,
        price: parseFloat(price),
        location,
        photos: [photoUrl || "https://picsum.photos/seed/" + Math.random() + "/800/600"],
        userId: user.uid,
        userName: profile?.displayName || 'Utilisateur',
        createdAt: serverTimestamp(),
        status: 'active'
      };

      const docRef = await addDoc(collection(db, 'annonces'), newAnnonce);
      setMyAnnonces([{ id: docRef.id, ...newAnnonce, createdAt: { toDate: () => new Date() } }, ...myAnnonces]);
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      setPrice('');
      setLocation('');
      setPhotoUrl('');
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding annonce:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
    try {
      await deleteDoc(doc(db, 'annonces', id));
      setMyAnnonces(myAnnonces.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error deleting annonce:", error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Profile Header */}
      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="relative">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-32 h-32 rounded-3xl object-cover shadow-lg" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-32 h-32 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-lg">
              <Package size={48} />
            </div>
          )}
          <button className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl border border-stone-100 shadow-md text-emerald-600 hover:scale-110 transition-transform">
            <Edit2 size={16} />
          </button>
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="text-3xl font-bold text-stone-900">{profile?.displayName}</h1>
          <p className="text-stone-500 mb-4">{profile?.email}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <div className="bg-stone-50 px-4 py-2 rounded-xl text-sm font-medium text-stone-600 border border-stone-100">
              <span className="font-bold text-emerald-600">{myAnnonces.length}</span> Annonces
            </div>
            <div className="bg-stone-50 px-4 py-2 rounded-xl text-sm font-medium text-stone-600 border border-stone-100">
              Membre depuis {profile ? format(profile.createdAt.toDate(), 'MMMM yyyy', { locale: fr }) : '...'}
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
        >
          <Plus size={20} /> Nouvelle Annonce
        </button>
      </div>

      {/* My Annonces */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Mes Annonces</h2>
        
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {[1, 2].map(i => <div key={i} className="h-48 bg-stone-100 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : myAnnonces.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {myAnnonces.map(annonce => (
              <div key={annonce.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex gap-4 group">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                  <img 
                    src={annonce.photos[0]} 
                    alt={annonce.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-bold text-lg line-clamp-1">{annonce.title}</h3>
                    <p className="text-emerald-600 font-bold">{annonce.price}€</p>
                    <p className="text-stone-400 text-xs mt-1 flex items-center gap-1">
                      <MapPin size={12} /> {annonce.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-stone-400 hover:text-emerald-600 transition-colors p-1"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(annonce.id)} className="text-stone-400 hover:text-red-600 transition-colors p-1"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-stone-200">
            <Package size={48} className="text-stone-200 mx-auto mb-4" />
            <p className="text-stone-500">Vous n'avez pas encore publié d'annonce.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="text-xl font-bold">Publier une annonce</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Titre</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    placeholder="Ex: iPhone 13 Pro Max"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Catégorie</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Description</label>
                <textarea 
                  className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none min-h-[100px]"
                  placeholder="Décrivez votre bien ou service..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Prix (€)</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Localisation</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    placeholder="Ex: Paris, France"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">URL de l'image (optionnel)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                  <input 
                    type="url" 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    placeholder="https://images.unsplash.com/..."
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {submitting ? 'Publication...' : 'Publier l\'annonce'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
