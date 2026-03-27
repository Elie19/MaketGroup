import { supabase } from '../supabase';
import { AdListing } from '../types';
import { handleSupabaseError, OperationType } from '../lib/utils';

const ADS_TABLE = 'ads';

const mapAdToCamel = (ad: any): AdListing => ({
  id: ad.id,
  title: ad.title,
  description: ad.description,
  price: ad.price,
  category: ad.category,
  location: ad.location,
  images: ad.images || [],
  authorId: ad.author_id,
  authorName: ad.author_name,
  createdAt: ad.created_at,
  status: ad.status,
  favoritesCount: ad.favorites_count || 0
});

const mapAdToSnake = (ad: Partial<AdListing>) => {
  const snake: any = {};
  if (ad.title !== undefined) snake.title = ad.title;
  if (ad.description !== undefined) snake.description = ad.description;
  if (ad.price !== undefined) snake.price = ad.price;
  if (ad.category !== undefined) snake.category = ad.category;
  if (ad.location !== undefined) snake.location = ad.location;
  if (ad.images !== undefined) snake.images = ad.images;
  if (ad.authorId !== undefined) snake.author_id = ad.authorId;
  if (ad.authorName !== undefined) snake.author_name = ad.authorName;
  if (ad.createdAt !== undefined) snake.created_at = ad.createdAt;
  if (ad.status !== undefined) snake.status = ad.status;
  if (ad.favoritesCount !== undefined) snake.favorites_count = ad.favoritesCount;
  return snake;
};

export const adService = {
  async createAd(ad: Omit<AdListing, 'id' | 'createdAt' | 'status' | 'favoritesCount'>) {
    const newAd = {
      title: ad.title,
      description: ad.description,
      price: ad.price,
      category: ad.category,
      location: ad.location,
      images: ad.images,
      author_id: ad.authorId,
      author_name: ad.authorName,
      status: 'active',
      favorites_count: 0,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from(ADS_TABLE).insert(newAd).select().single();
    if (error) await handleSupabaseError(error, OperationType.WRITE, ADS_TABLE);
    return mapAdToCamel(data);
  },

  async updateAd(id: string, updates: Partial<AdListing>) {
    const snakeUpdates = mapAdToSnake(updates);
    const { error } = await supabase.from(ADS_TABLE).update(snakeUpdates).eq('id', id);
    if (error) await handleSupabaseError(error, OperationType.UPDATE, `${ADS_TABLE}/${id}`);
  },

  async deleteAd(id: string) {
    const { error } = await supabase.from(ADS_TABLE).update({ status: 'deleted' }).eq('id', id);
    if (error) await handleSupabaseError(error, OperationType.DELETE, `${ADS_TABLE}/${id}`);
  },

  async getAd(id: string) {
    const { data, error } = await supabase.from(ADS_TABLE).select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') await handleSupabaseError(error, OperationType.GET, `${ADS_TABLE}/${id}`);
    return data ? mapAdToCamel(data) : null;
  },

  async getAds(filters?: { category?: string; search?: string; minPrice?: number; maxPrice?: number; location?: string }) {
    try {
      let query = supabase.from(ADS_TABLE).select('*').eq('status', 'active').order('created_at', { ascending: false });
      
      if (filters?.category && filters.category !== 'Tous') {
        query = query.eq('category', filters.category);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      if (filters?.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters?.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      const { data, error } = await query;
      if (error) {
        await handleSupabaseError(error, OperationType.GET, ADS_TABLE);
      }
      return data ? data.map(mapAdToCamel) : [];
    } catch (error) {
      if (error instanceof Error && error.message.includes('Supabase Error')) {
        throw error;
      }
      await handleSupabaseError(error, OperationType.GET, ADS_TABLE);
      throw error; // Should be unreachable as handleSupabaseError throws
    }
  },

  subscribeToAds(callback: (ads: AdListing[]) => void, filters?: { category?: string; search?: string }, onError?: (error: string) => void) {
    // Initial fetch
    this.getAds(filters)
      .then(callback)
      .catch(err => {
        console.error('Error in initial fetch:', err);
        if (onError) onError(err.message || String(err));
      });

    // Subscribe to changes
    const channel = supabase
      .channel('ads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: ADS_TABLE }, async (payload) => {
        this.getAds(filters)
          .then(callback)
          .catch(err => {
            console.error('Error in subscription update:', err);
            if (onError) onError(err.message || String(err));
          });
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Supabase Realtime channel error');
          if (onError) onError('Erreur de connexion en temps réel. Vérifiez votre configuration Supabase.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async toggleFavorite(userId: string, adId: string, isFavorite: boolean) {
    if (isFavorite) {
      const { error } = await supabase.from('favorites').delete().match({ user_id: userId, ad_id: adId });
      if (error) await handleSupabaseError(error, OperationType.DELETE, 'favorites');
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: userId, ad_id: adId });
      if (error) await handleSupabaseError(error, OperationType.WRITE, 'favorites');
    }
  },

  async getUserFavorites(userId: string) {
    const { data, error } = await supabase
      .from('favorites')
      .select('*, ads(*)')
      .eq('user_id', userId);
    
    if (error) await handleSupabaseError(error, OperationType.GET, 'favorites');
    return data ? data.map((f: any) => mapAdToCamel(f.ads)) : [];
  }
};
