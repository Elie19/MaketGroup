import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { adService } from '../services/adService';
import { transactionService } from '../services/transactionService';
import { reviewService } from '../services/reviewService';
import { AdListing, UserProfile, Transaction, Review } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, MapPin, Calendar, Settings, Shield, LogIn, Package, Star, LogOut, Camera, Save, X, History } from 'lucide-react';
import { supabase } from '../supabase';
import { cn } from '../lib/utils';
import { storageService } from '../services/storageService';

export const Profile = () => {
  const { userId } = useParams();
  const { user, profile: myProfile, loading: authLoading, signOut, setProfile } = useAuthStore();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [ads, setAds] = useState<AdListing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    location: '',
    bio: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = !userId || userId === user?.id;
  const effectiveUserId = userId || user?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!effectiveUserId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('uid', effectiveUserId)
          .single();

        if (profileError) throw profileError;

        setTargetProfile({
          uid: profileData.uid,
          displayName: profileData.display_name,
          email: profileData.email,
          photoURL: profileData.photo_url,
          bio: profileData.bio,
          location: profileData.location,
          role: profileData.role,
          createdAt: profileData.created_at,
          averageRating: profileData.average_rating,
          totalReviews: profileData.total_reviews
        });

        // Fetch ads
        const userAds = await adService.getAds();
        setAds(userAds.filter(ad => ad.authorId === effectiveUserId));

        // Fetch transactions (sales history)
        const userTransactions = await transactionService.getSellerTransactions(effectiveUserId);
        setTransactions(userTransactions);

        // Fetch reviews
        const sellerReviews = await reviewService.getSellerReviews(effectiveUserId);
        setReviews(sellerReviews);

        // Fetch purchases (if own profile)
        if (isOwnProfile) {
          const { data: purchaseData } = await supabase
            .from('transactions')
            .select('*, ads(title)')
            .eq('buyer_id', effectiveUserId)
            .order('created_at', { ascending: false });
          
          if (purchaseData) {
            setPurchases(purchaseData.map((t: any) => ({
              id: t.id,
              adId: t.ad_id,
              sellerId: t.seller_id,
              buyerId: t.buyer_id,
              amount: t.amount,
              status: t.status,
              createdAt: t.created_at,
              adTitle: t.ads?.title
            })));
          }
        }

      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [effectiveUserId]);

  useEffect(() => {
    if (isOwnProfile && myProfile) {
      setEditData({
        displayName: myProfile.displayName || '',
        location: myProfile.location || '',
        bio: myProfile.bio || ''
      });
    }
  }, [isOwnProfile, myProfile]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          display_name: editData.displayName,
          location: editData.location,
          bio: editData.bio
        })
        .eq('uid', user.id);
      
      if (error) throw error;
      
      // Update local state in store
      if (myProfile) {
        setProfile({
          ...myProfile,
          displayName: editData.displayName,
          location: editData.location,
          bio: editData.bio
        });
      }
      
      setIsEditing(false);
      // Removed reload to avoid flickering
      setTargetProfile(prev => prev ? {
        ...prev,
        displayName: editData.displayName,
        location: editData.location,
        bio: editData.bio
      } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const photoURL = await storageService.uploadProfilePhoto(file, user.id);
      
      const { error } = await supabase
        .from('users')
        .update({ photo_url: photoURL })
        .eq('uid', user.id);
      
      if (error) throw error;

      // Update local state
      if (myProfile) {
        setProfile({ ...myProfile, photoURL });
      }
      setTargetProfile(prev => prev ? { ...prev, photoURL } : null);
      alert('Photo de profil mise à jour !');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erreur lors de l\'upload de la photo. Assurez-vous que le bucket "users" existe.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!showReviewModal || !user) return;
    const transaction = purchases.find(p => p.id === showReviewModal);
    if (!transaction) return;

    try {
      await reviewService.createReview({
        transactionId: transaction.id,
        sellerId: transaction.sellerId,
        reviewerId: user.id,
        rating: reviewData.rating,
        comment: reviewData.comment
      });
      setShowReviewModal(null);
      setReviewData({ rating: 5, comment: '' });
      alert('Merci pour votre avis !');
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent"
        />
      </div>
    );
  }

  if (!effectiveUserId || !targetProfile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[60vh] flex-col items-center justify-center text-center"
      >
        <div className="rounded-full bg-zinc-100 p-6 dark:bg-zinc-900">
          <User className="h-12 w-12 text-zinc-400" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-white">
          {!effectiveUserId ? 'Profil non trouvé' : 'Chargement du profil...'}
        </h2>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {!effectiveUserId 
            ? 'Veuillez vous connecter pour voir votre profil et gérer vos annonces.' 
            : 'Nous préparons le profil. Veuillez patienter un instant ou essayer de rafraîchir la page.'}
        </p>
        {!user && (
          <Link
            to="/"
            className="mt-8 flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 font-bold text-black transition-transform hover:scale-105 active:scale-95"
          >
            <LogIn className="h-4 w-4" />
            Se connecter maintenant
          </Link>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-4xl space-y-8"
    >
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white p-8 dark:bg-zinc-900"
            >
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Laisser un avis</h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Note</label>
                  <div className="mt-2 flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewData({ ...reviewData, rating: star })}
                        className="text-yellow-400 transition-transform hover:scale-110"
                      >
                        <Star className={`h-8 w-8 ${reviewData.rating >= star ? 'fill-yellow-400' : 'text-zinc-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Commentaire</label>
                  <textarea
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 focus:border-emerald-500 focus:ring-emerald-500 dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                    rows={3}
                    placeholder="Votre expérience avec ce vendeur..."
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleSubmitReview}
                    className="flex-1 rounded-xl bg-emerald-500 py-3 font-bold text-black"
                  >
                    Publier
                  </button>
                  <button
                    onClick={() => setShowReviewModal(null)}
                    className="flex-1 rounded-xl border border-zinc-200 py-3 font-bold text-zinc-600 dark:border-white/10 dark:text-zinc-400"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/5 dark:bg-zinc-900">
        <div className="absolute right-0 top-0 h-32 w-32 bg-emerald-500/10 blur-3xl" />
        <div className="flex flex-col items-center gap-6 md:flex-row">
          <div className="relative">
            <div className="h-32 w-32 overflow-hidden rounded-2xl border-4 border-zinc-100 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
              {uploading ? (
                <div className="flex h-full w-full items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent"
                  />
                </div>
              ) : targetProfile.photoURL ? (
                <img src={targetProfile.photoURL} alt={targetProfile.displayName || ''} className="h-full w-full object-cover" />
              ) : (
                <User className="h-full w-full p-6 text-zinc-400 dark:text-zinc-600" />
              )}
            </div>
            {isOwnProfile && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-2 -right-2 rounded-lg bg-emerald-500 p-2 text-black shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            {isEditing && isOwnProfile ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editData.displayName}
                  onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-2xl font-bold dark:border-white/10 dark:bg-black dark:text-white"
                  placeholder="Nom d'affichage"
                />
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm dark:border-white/10 dark:bg-black dark:text-white"
                  placeholder="Localisation"
                />
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{targetProfile.displayName || 'Utilisateur Anonyme'}</h1>
                <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 md:justify-start">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {targetProfile.email}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {targetProfile.location || 'Localisation non définie'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Membre depuis {targetProfile.createdAt ? new Date(targetProfile.createdAt).toLocaleDateString('fr-FR') : 'Récemment'}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {isOwnProfile && (
              isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateProfile}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-black"
                  >
                    <Save className="h-4 w-4" />
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 dark:border-white/10 dark:text-zinc-400"
                  >
                    <X className="h-4 w-4" />
                    Annuler
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600 dark:border-white/10 dark:text-zinc-400"
                  >
                    <Settings className="h-4 w-4" />
                    Modifier
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-bold text-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    Se déconnecter
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { label: 'Annonces Actives', value: ads.length.toString() },
          { label: 'Ventes Totales', value: transactions.length.toString() },
          { label: 'Note', value: targetProfile.averageRating ? `${targetProfile.averageRating.toFixed(1)}/5` : 'Nouveau' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-white/5 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Bio */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/5 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">À propos de moi</h3>
        {isEditing && isOwnProfile ? (
          <textarea
            value={editData.bio}
            onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
            className="mt-4 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black dark:text-white"
            rows={4}
            placeholder="Parlez de vous à la communauté..."
          />
        ) : (
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            {targetProfile.bio || "Pas encore de bio. Parlez de vous à la communauté !"}
          </p>
        )}
      </div>

      {/* Sales History */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/5 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-emerald-500" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Historique des ventes</h3>
        </div>
        <div className="mt-6 space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-white/5">
              <div>
                <div className="font-semibold text-zinc-900 dark:text-white">{transaction.adTitle}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(transaction.createdAt).toLocaleDateString('fr-FR')} • {transaction.guestName || 'Acheteur'}
                </div>
                {transaction.paymentMethod && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
                    <Shield className="h-3 w-3" />
                    Payé via {transaction.paymentMethod}
                  </div>
                )}
              </div>
              <div className="text-lg font-bold text-emerald-500">{transaction.amount}€</div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="py-4 text-center text-zinc-500">
              Aucune vente enregistrée pour le moment.
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/5 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Avis des clients</h3>
        </div>
        <div className="mt-6 space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-zinc-100 pb-6 last:border-0 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <User className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {review.reviewerName || 'Utilisateur'}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      className={cn(
                        "h-3 w-3",
                        review.rating >= s ? "fill-yellow-400 text-yellow-400" : "text-zinc-300"
                      )} 
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 italic">
                "{review.comment}"
              </p>
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="py-4 text-center text-zinc-500">
              Aucun avis pour le moment.
            </div>
          )}
        </div>
      </div>

      {/* My Purchases */}
      {isOwnProfile && (
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 dark:border-white/5 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Mes Achats</h3>
          </div>
          <div className="mt-6 space-y-4">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-white/5">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-white">{purchase.adTitle}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(purchase.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold text-emerald-500">{purchase.amount}€</div>
                  <button
                    onClick={() => setShowReviewModal(purchase.id)}
                    className="flex items-center gap-1 rounded-lg bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-500 hover:bg-yellow-400/20"
                  >
                    <Star className="h-3 w-3 fill-yellow-500" />
                    Noter
                  </button>
                </div>
              </div>
            ))}
            {purchases.length === 0 && (
              <div className="py-4 text-center text-zinc-500">
                Vous n'avez pas encore effectué d'achats.
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Ads */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          {isOwnProfile ? 'Vos Annonces' : `Annonces de ${targetProfile.displayName}`}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <Link
              key={ad.id}
              to={`/ad/${ad.id}`}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:border-emerald-500/30 dark:border-white/5 dark:bg-zinc-900"
            >
              <div className="aspect-video overflow-hidden">
                <img src={ad.images[0]} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-zinc-900 dark:text-white">{ad.title}</h4>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>{ad.price}€</span>
                  <span>{ad.status}</span>
                </div>
              </div>
            </Link>
          ))}
          {ads.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500">
              Vous n'avez pas encore posté d'annonces.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
