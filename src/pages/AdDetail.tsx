import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adService } from '../services/adService';
import { chatService } from '../services/chatService';
import { useAuthStore } from '../store/useAuthStore';
import { AdListing } from '../types';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Tag, 
  Clock, 
  User, 
  MessageCircle, 
  Share2, 
  Heart,
  ChevronLeft,
  ShieldCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const AdDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [ad, setAd] = useState<AdListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      adService.getAd(id).then((data) => {
        setAd(data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleContact = async () => {
    if (!user || !ad) return;
    const chatId = [user.id, ad.authorId].sort().join('_');
    navigate(`/messages?chat=${chatId}`);
  };

  if (loading) return <div className="h-96 animate-pulse rounded-3xl bg-zinc-900" />;
  if (!ad) return <div className="text-center">Ad not found</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 gap-8 lg:grid-cols-3"
    >
      <div className="lg:col-span-2 space-y-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to listings
        </button>

        <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900">
          <div className="aspect-video w-full">
            <img
              src={ad.images[0] || `https://picsum.photos/seed/${ad.id}/800/600`}
              alt={ad.title}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="p-8">
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-500">
                {ad.category}
              </span>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(ad.createdAt))} ago
              </div>
            </div>
            <h1 className="mt-4 text-4xl font-bold text-white">{ad.title}</h1>
            <div className="mt-6 flex items-center gap-6 text-zinc-400">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-500" />
                {ad.location}
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-emerald-500" />
                {ad.status}
              </div>
            </div>
            <div className="mt-8 border-t border-white/5 pt-8">
              <h3 className="text-lg font-semibold text-white">Description</h3>
              <p className="mt-4 whitespace-pre-wrap leading-relaxed text-zinc-400">
                {ad.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-white/5 bg-zinc-900 p-8">
          <div className="text-3xl font-bold text-emerald-500">${ad.price}</div>
          <div className="mt-6 space-y-3">
            <button
              onClick={handleContact}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5" />
              Contact Seller
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-4 font-bold text-white transition-colors hover:bg-white/5">
              <Heart className="h-5 w-5" />
              Add to Favorites
            </button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-4">
            <button className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white">
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-zinc-900 p-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Seller Information</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
              <User className="h-6 w-6 text-zinc-400" />
            </div>
            <div>
              <div className="font-semibold text-white">{ad.authorName}</div>
              <div className="text-xs text-zinc-500">Member since 2024</div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-500/5 p-4 text-xs text-emerald-500">
            <ShieldCheck className="h-4 w-4" />
            Verified Seller
          </div>
        </div>
      </div>
    </motion.div>
  );
};
