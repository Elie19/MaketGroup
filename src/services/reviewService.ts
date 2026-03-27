import { supabase } from '../supabase';
import { Review } from '../types';
import { handleSupabaseError, OperationType } from '../lib/utils';

export const reviewService = {
  async createReview(review: Omit<Review, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        transaction_id: review.transactionId,
        seller_id: review.sellerId,
        reviewer_id: review.reviewerId || null,
        reviewer_name: review.reviewerName || null,
        rating: review.rating,
        comment: review.comment
      })
      .select()
      .single();

    if (error) await handleSupabaseError(error, OperationType.WRITE, 'reviews');
    
    // Update seller's average rating
    await this.updateSellerRating(review.sellerId);
    
    return data;
  },

  async getSellerReviews(sellerId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) await handleSupabaseError(error, OperationType.GET, 'reviews');
    
    return data.map((r: any) => ({
      id: r.id,
      transactionId: r.transaction_id,
      sellerId: r.seller_id,
      reviewerId: r.reviewer_id,
      reviewerName: r.reviewer_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at
    }));
  },

  async updateSellerRating(sellerId: string) {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('seller_id', sellerId);

    if (error) return;

    if (reviews.length > 0) {
      const total = reviews.reduce((acc, r) => acc + r.rating, 0);
      const average = total / reviews.length;

      await supabase
        .from('users')
        .update({ 
          average_rating: average,
          total_reviews: reviews.length
        })
        .eq('uid', sellerId);
    }
  }
};
