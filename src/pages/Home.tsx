import React, { useState, useEffect } from 'react';
import { adService } from '../services/adService';
import { AdListing } from '../types';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Tag, Clock, Heart, Search, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';
import { supabase, isConfigured } from '../supabase';

export const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ads, setAds] = useState<AdListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(searchParams.get('category') || 'Tous');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { profile } = useAuthStore();

  const categories = ['Tous', 'Électronique', 'Immobilier', 'Véhicules', 'Services', 'Emplois', 'Mode'];

  // Sync search state with URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlCategory = searchParams.get('category') || 'Tous';
    setSearch(urlSearch);
    setCategory(urlCategory);
  }, [searchParams]);

  useEffect(() => {
    setError(null);
    const unsubscribe = adService.subscribeToAds((newAds) => {
      setAds(newAds);
      setLoading(false);
    }, { category, search }, (err) => {
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category, search]);

  useEffect(() => {
    if (profile) {
      adService.getUserFavorites(profile.uid).then(favs => {
        setFavorites(new Set(favs.map(f => f.id)));
      });
    }
  }, [profile]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    const newParams = new URLSearchParams(searchParams);
    if (val) newParams.set('search', val);
    else newParams.delete('search');
    setSearchParams(newParams);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    const newParams = new URLSearchParams(searchParams);
    if (cat !== 'Tous') newParams.set('category', cat);
    else newParams.delete('category');
    setSearchParams(newParams);
  };

  useEffect(() => {
    if (profile) {
      adService.getUserFavorites(profile.uid).then(favs => {
        setFavorites(new Set(favs.map(f => f.id)));
      });
    }
  }, [profile]);

  const handleToggleFavorite = async (e: React.MouseEvent, adId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!profile) return;

    const isFavorite = favorites.has(adId);
    const newFavorites = new Set(favorites);
    if (isFavorite) newFavorites.delete(adId);
    else newFavorites.add(adId);
    setFavorites(newFavorites);

    await adService.toggleFavorite(profile.uid, adId, isFavorite);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-100 px-8 py-16 dark:bg-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent)]" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 md:text-6xl dark:text-white">
            Trouvez ce dont vous avez besoin, <br />
            <span className="text-emerald-500">partagez ce que vous avez.</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
            MaketGroup est la place de marché moderne pour votre communauté. Achetez, vendez et discutez en un seul endroit.
          </p>
          
          <div className="mt-10 relative max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Rechercher un article..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-2xl border-none bg-white py-4 pl-12 pr-4 text-zinc-900 shadow-xl shadow-emerald-500/5 focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
              category === cat
                ? 'bg-emerald-500 text-black'
                : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Ads Grid */}
      {!isConfigured ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-6 dark:bg-zinc-900">
            <AlertCircle className="h-12 w-12 text-zinc-400 dark:text-zinc-700" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-white">Configuration requise</h3>
          <p className="mt-2 text-zinc-500 max-w-md mx-auto">
            Veuillez configurer vos clés Supabase dans le menu des paramètres pour commencer à utiliser la plateforme.
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-red-100 p-6 dark:bg-red-900/20">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-white">Erreur de connexion</h3>
          <p className="mt-2 text-zinc-500 max-w-md mx-auto">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-emerald-500 px-6 py-2 text-sm font-bold text-black hover:bg-emerald-400"
          >
            Réessayer
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-900" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ads.map((ad, index) => (
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/ad/${ad.id}`}
                className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/5 dark:border-white/5 dark:bg-zinc-900"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={ad.images[0] || `https://picsum.photos/seed/${ad.id}/400/400`}
                    alt={ad.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute right-3 top-3">
                    <button 
                      onClick={(e) => handleToggleFavorite(e, ad.id)}
                      className={cn(
                        "rounded-full p-2 backdrop-blur-md transition-all",
                        favorites.has(ad.id) 
                          ? "bg-emerald-500 text-black scale-110" 
                          : "bg-black/50 text-white hover:bg-emerald-500 hover:text-black"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", favorites.has(ad.id) && "fill-current")} />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-lg bg-emerald-500 px-3 py-1 text-sm font-bold text-black">
                      {ad.price}€
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                    <Tag className="h-3 w-3" />
                    {ad.category}
                  </div>
                  <h3 className="mt-1 line-clamp-1 font-semibold text-zinc-900 group-hover:text-emerald-500 dark:text-white dark:group-hover:text-emerald-400">
                    {ad.title}
                  </h3>
                  <div className="mt-1 text-[10px] text-zinc-400">
                    Par {ad.authorName}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {ad.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Il y a {formatDistanceToNow(new Date(ad.createdAt), { locale: fr })}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && ads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-zinc-100 p-6 dark:bg-zinc-900">
            <Search className="h-12 w-12 text-zinc-400 dark:text-zinc-700" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-white">Aucune annonce trouvée</h3>
          <p className="mt-2 text-zinc-500">Essayez de modifier vos filtres ou votre recherche.</p>
        </div>
      )}
    </motion.div>
  );
};
