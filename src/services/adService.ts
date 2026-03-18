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

  subscribeToAds(callback: (ads: AdListing[]) => void, filters?: { category?: string; minPrice?: number; maxPrice?: number }) {
    // Initial fetch
    let query = supabase.from(ADS_TABLE).select('*').eq('status', 'active').order('created_at', { ascending: false });
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    query.then(({ data }) => {
      if (data) callback(data.map(mapAdToCamel));
    });

    // Subscribe to changes
    const channel = supabase
      .channel('ads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: ADS_TABLE }, async () => {
        let q = supabase.from(ADS_TABLE).select('*').eq('status', 'active').order('created_at', { ascending: false });
        if (filters?.category) {
          q = q.eq('category', filters.category);
        }
        const { data } = await q;
        if (data) callback(data.map(mapAdToCamel));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
