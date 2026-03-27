import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adService } from '../services/adService';
import { chatService } from '../services/chatService';
import { transactionService } from '../services/transactionService';
import { reviewService } from '../services/reviewService';
import { useAuthStore } from '../store/useAuthStore';
import { AdListing, UserProfile } from '../types';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  MapPin, 
  Tag, 
  Clock, 
  User, 
  MessageCircle, 
  Share2, 
  Heart,
  ChevronLeft,
  ShieldCheck,
  ShoppingCart,
  Star,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const AdDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [ad, setAd] = useState<AdListing | null>(null);
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '' });
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'moov' | 'cash' | 'card'>('mtn');
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (id) {
      adService.getAd(id).then(async (data) => {
        setAd(data);
        if (data) {
          if (user) {
            try {
              const favs = await adService.getUserFavorites(user.id);
              setIsFavorite(favs.some(f => f.id === data.id));
            } catch (err) {
              console.error('Error fetching favorites:', err);
            }
          }
          try {
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('uid', data.authorId)
              .single();
            
            if (error && error.code !== 'PGRST116') {
              console.error('Error fetching seller profile:', error);
            }

            if (profile) {
              setSeller({
                uid: profile.uid,
                displayName: profile.display_name,
                email: profile.email,
                photoURL: profile.photo_url,
                bio: profile.bio,
                location: profile.location,
                role: profile.role,
                createdAt: profile.created_at,
                averageRating: profile.average_rating,
                totalReviews: profile.total_reviews
              });
            }
          } catch (err) {
            console.error('Unexpected error fetching seller profile:', err);
          }
        }
        setLoading(false);
      }).catch(err => {
        console.error('Error fetching ad:', err);
        setLoading(false);
      });
    }
  }, [id, user]);

  const handleToggleFavorite = async () => {
    if (!user || !ad) return;
    const newStatus = !isFavorite;
    setIsFavorite(newStatus);
    await adService.toggleFavorite(user.id, ad.id, !newStatus);
  };

  const handlePurchase = async () => {
    if (!ad) return;

    try {
      await transactionService.createTransaction({
        adId: ad.id,
        sellerId: ad.authorId,
        buyerId: user?.id,
        guestEmail: !user ? guestInfo.email : undefined,
        guestName: !user ? guestInfo.name : undefined,
        amount: ad.price,
        status: 'completed',
        paymentMethod: paymentMethod,
        paymentReference: `REF-${Math.random().toString(36).substring(7).toUpperCase()}`
      });
      setPurchaseSuccess(true);
      setShowCheckout(false);
    } catch (error) {
      console.error('Erreur lors de l\'achat:', error);
      alert('Une erreur est survenue lors de l\'achat.');
    }
  };

  const handleContact = async () => {
    if (!user || !ad) return;
    const chatId = [user.id, ad.authorId].sort().join('_');
    navigate(`/messages?chat=${chatId}&title=${encodeURIComponent(ad.title)}`);
  };

  const handleDelete = async () => {
    if (!ad || !window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;
    try {
      await adService.deleteAd(ad.id);
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'annonce:', error);
    }
  };

  if (loading) return <div className="h-96 animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-900" />;
  if (!ad) return <div className="text-center text-zinc-900 dark:text-white">Annonce non trouvée</div>;

  const isAuthor = user?.id === ad.authorId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 gap-8 lg:grid-cols-3"
    >
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-8 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Finaliser l'achat</h2>
                <button onClick={() => setShowCheckout(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-white/5">
                  <div className="text-sm text-zinc-500">Produit</div>
                  <div className="font-semibold text-zinc-900 dark:text-white">{ad.title}</div>
                  <div className="mt-1 text-lg font-bold text-emerald-500">{ad.price}€</div>
                </div>

                {!user && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nom complet</label>
                      <input
                        type="text"
                        value={guestInfo.name}
                        onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                        placeholder="Votre nom"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
                      <input
                        type="email"
                        value={guestInfo.email}
                        onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                        placeholder="votre@email.com"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Mode de paiement</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'mtn', name: 'MTN Money', color: 'bg-yellow-400' },
                      { id: 'moov', name: 'Moov Money', color: 'bg-blue-600' },
                      { id: 'card', name: 'Carte Bancaire', color: 'bg-zinc-800' },
                      { id: 'cash', name: 'Espèces', color: 'bg-emerald-500' }
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-3 transition-all",
                          paymentMethod === method.id 
                            ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20" 
                            : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-800"
                        )}
                      >
                        <div className={cn("h-3 w-3 rounded-full", method.color)} />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{method.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={!user && (!guestInfo.name || !guestInfo.email)}
                  className="w-full rounded-xl bg-emerald-500 py-4 font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  Confirmer l'achat
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {purchaseSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-3xl bg-white p-8 text-center dark:bg-zinc-900"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-white">Achat réussi !</h2>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Félicitations ! Votre achat a été enregistré. Le vendeur sera informé.
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-8 w-full rounded-xl bg-emerald-500 py-4 font-bold text-black"
              >
                Retour à l'accueil
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="lg:col-span-2 space-y-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux annonces
        </button>

        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-white/5 dark:bg-zinc-900">
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
                Il y a {formatDistanceToNow(new Date(ad.createdAt), { locale: fr })}
              </div>
            </div>
            <h1 className="mt-4 text-4xl font-bold text-zinc-900 dark:text-white">{ad.title}</h1>
            <div className="mt-6 flex items-center gap-6 text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-500" />
                {ad.location}
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-emerald-500" />
                {ad.status}
              </div>
            </div>
            <div className="mt-8 border-t border-zinc-200 pt-8 dark:border-white/5">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Description</h3>
              <p className="mt-4 whitespace-pre-wrap leading-relaxed text-zinc-600 dark:text-zinc-400">
                {ad.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/5 dark:bg-zinc-900">
          <div className="text-3xl font-bold text-emerald-500">{ad.price}€</div>
          <div className="mt-6 space-y-3">
            {ad.status === 'active' && !isAuthor && (
              <button
                onClick={() => setShowCheckout(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <ShoppingCart className="h-5 w-5" />
                Acheter maintenant
              </button>
            )}
            <button
              onClick={handleContact}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 py-4 font-bold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              <MessageCircle className="h-5 w-5" />
              Contacter le vendeur
            </button>
            <button 
              onClick={handleToggleFavorite}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border py-4 font-bold transition-all",
                isFavorite 
                  ? "border-emerald-500 bg-emerald-500 text-black" 
                  : "border-zinc-200 text-zinc-900 hover:bg-zinc-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
              )}
            >
              <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
              {isFavorite ? 'Dans vos favoris' : 'Ajouter aux favoris'}
            </button>
            {isAuthor && (
              <button
                onClick={handleDelete}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-4 font-bold text-red-500 transition-colors hover:bg-red-500/10"
              >
                Supprimer l'annonce
              </button>
            )}
          </div>
          <div className="mt-6 flex items-center justify-center gap-4">
            <button className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
              <Share2 className="h-4 w-4" />
              Partager
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/5 dark:bg-zinc-900">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Informations du vendeur</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              {seller?.photoURL ? (
                <img src={seller.photoURL} alt={seller.displayName || ''} className="h-full w-full rounded-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-zinc-400" />
              )}
            </div>
            <div>
              <Link to={`/profile/${ad.authorId}`} className="font-semibold text-zinc-900 hover:text-emerald-500 dark:text-white dark:hover:text-emerald-400">
                {ad.authorName}
              </Link>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {seller?.averageRating?.toFixed(1) || 'Nouveau'} ({seller?.totalReviews || 0} avis)
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-500/5 p-4 text-xs text-emerald-500">
            <ShieldCheck className="h-4 w-4" />
            Vendeur Vérifié
          </div>
        </div>
      </div>
    </motion.div>
  );
};
