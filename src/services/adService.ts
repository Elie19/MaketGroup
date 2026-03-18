import { supabase } from '../supabase';
import { AdListing } from '../types';
import { handleSupabaseError, OperationType } from '../lib/utils';

const ADS_TABLE = 'ads';

export const adService = {
  async createAd(ad: Omit<AdListing, 'id' | 'createdAt' | 'status' | 'favoritesCount'>) {
    const newAd = {
      ...ad,
      status: 'active',
      favoritesCount: 0,
      createdAt: new Date().toISOString(),
    };
    const { data, error } = await supabase.from(ADS_TABLE).insert(newAd).select().single();
    if (error) await handleSupabaseError(error, OperationType.WRITE, ADS_TABLE);
    return data as AdListing;
  },

  async updateAd(id: string, updates: Partial<AdListing>) {
    const { error } = await supabase.from(ADS_TABLE).update(updates).eq('id', id);
    if (error) await handleSupabaseError(error, OperationType.UPDATE, `${ADS_TABLE}/${id}`);
  },

  async deleteAd(id: string) {
    const { error } = await supabase.from(ADS_TABLE).update({ status: 'deleted' }).eq('id', id);
    if (error) await handleSupabaseError(error, OperationType.DELETE, `${ADS_TABLE}/${id}`);
  },

  async getAd(id: string) {
    const { data, error } = await supabase.from(ADS_TABLE).select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') await handleSupabaseError(error, OperationType.GET, `${ADS_TABLE}/${id}`);
    return data as AdListing;
  },

  subscribeToAds(callback: (ads: AdListing[]) => void, filters?: { category?: string; minPrice?: number; maxPrice?: number }) {
    // Initial fetch
    let query = supabase.from(ADS_TABLE).select('*').eq('status', 'active').order('createdAt', { ascending: false });
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    query.then(({ data }) => {
      if (data) callback(data as AdListing[]);
    });

    // Subscribe to changes
    const channel = supabase
      .channel('ads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: ADS_TABLE }, async () => {
        let q = supabase.from(ADS_TABLE).select('*').eq('status', 'active').order('createdAt', { ascending: false });
        if (filters?.category) {
          q = q.eq('category', filters.category);
        }
        const { data } = await q;
        if (data) callback(data as AdListing[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
