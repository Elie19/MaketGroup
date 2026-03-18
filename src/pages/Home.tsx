import React, { useState, useEffect } from 'react';
import { adService } from '../services/adService';
import { AdListing } from '../types';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Tag, Clock, Heart, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const Home = () => {
  const [ads, setAds] = useState<AdListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('All');

  const categories = ['All', 'Electronics', 'Real Estate', 'Vehicles', 'Services', 'Jobs', 'Fashion'];

  useEffect(() => {
    const unsubscribe = adService.subscribeToAds((newAds) => {
      setAds(newAds);
      setLoading(false);
    }, category !== 'All' ? { category } : undefined);

    return () => unsubscribe();
  }, [category]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-900 px-8 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent)]" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight text-white md:text-6xl">
            Find what you need, <br />
            <span className="text-emerald-500">share what you have.</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-400">
            Lumina is the modern marketplace for your community. Buy, sell, and discuss in one place.
          </p>
        </div>
      </section>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
              category === cat
                ? 'bg-emerald-500 text-black'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Ads Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-zinc-900" />
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
                className="group block overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 transition-all hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/5"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={ad.images[0] || `https://picsum.photos/seed/${ad.id}/400/400`}
                    alt={ad.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute right-3 top-3">
                    <button className="rounded-full bg-black/50 p-2 text-white backdrop-blur-md transition-colors hover:bg-emerald-500 hover:text-black">
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-lg bg-emerald-500 px-3 py-1 text-sm font-bold text-black">
                      ${ad.price}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                    <Tag className="h-3 w-3" />
                    {ad.category}
                  </div>
                  <h3 className="mt-1 line-clamp-1 font-semibold text-white group-hover:text-emerald-400">
                    {ad.title}
                  </h3>
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {ad.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(ad.createdAt))} ago
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
          <div className="rounded-full bg-zinc-900 p-6">
            <Search className="h-12 w-12 text-zinc-700" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">No ads found</h3>
          <p className="mt-2 text-zinc-500">Try changing your filters or search query.</p>
        </div>
      )}
    </motion.div>
  );
};
