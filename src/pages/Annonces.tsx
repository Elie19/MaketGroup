import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Annonce } from '../types';
import { CATEGORIES } from '../constants';
import { Search, Filter, Plus, MapPin } from 'lucide-react';
import { useAuth } from '../App';

export default function Annonces() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const { user } = useAuth();

  useEffect(() => {
    const fetchAnnonces = async () => {
      setLoading(true);
      try {
        const data = await api.getAnnonces(selectedCategory);
        
        // Ensure data is an array before filtering
        if (Array.isArray(data)) {
          const filtered = data.filter((a: Annonce) => 
            a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            a.description.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setAnnonces(filtered);
        } else {
          console.error("API returned non-array data:", data);
          setAnnonces([]);
        }
      } catch (error) {
        console.error("Error fetching annonces:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnonces();
  }, [selectedCategory, searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Toutes les Annonces</h1>
          <p className="text-stone-500 mt-1">Trouvez ce dont vous avez besoin parmi nos {annonces.length} offres.</p>
        </div>
        {user && (
          <Link to="/profile" className="bg-emerald-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md">
            <Plus size={20} /> Publier une annonce
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher une annonce..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-stone-400" size={20} />
          <select 
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="Toutes">Toutes les catégories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-stone-200 animate-pulse h-80 rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <>
          {annonces.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {annonces.map(annonce => (
                <Link key={annonce.id} to={`/annonces/${annonce.id}`} className="group bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100 relative">
                    <img 
                      src={annonce.photos[0] || "https://picsum.photos/seed/market/400/300"} 
                      alt={annonce.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-sm font-bold shadow-sm">
                      {annonce.price}€
                    </div>
                  </div>
                  <div className="p-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1 block">
                      {annonce.category}
                    </span>
                    <h3 className="font-bold text-lg mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors">{annonce.title}</h3>
                    <p className="text-stone-500 text-sm flex items-center gap-1">
                      <MapPin size={14} /> {annonce.location}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200">
              <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-stone-300" />
              </div>
              <h3 className="text-xl font-bold text-stone-900">Aucune annonce trouvée</h3>
              <p className="text-stone-500">Essayez de modifier vos filtres ou votre recherche.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
