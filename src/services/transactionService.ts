import { supabase } from '../supabase';
import { Transaction } from '../types';
import { handleSupabaseError, OperationType } from '../lib/utils';

export const transactionService = {
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>) {
    const { data, error } = await supabase.rpc('process_purchase', {
      p_ad_id: transaction.adId,
      p_seller_id: transaction.sellerId,
      p_buyer_id: transaction.buyerId || null,
      p_amount: transaction.amount,
      p_payment_method: transaction.paymentMethod || null,
      p_payment_reference: transaction.paymentReference || null,
      p_guest_email: transaction.guestEmail || null,
      p_guest_name: transaction.guestName || null
    });

    if (error) await handleSupabaseError(error, OperationType.WRITE, 'transactions');
    
    return data;
  },

  async getSellerTransactions(sellerId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, ads(title)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) await handleSupabaseError(error, OperationType.GET, 'transactions');
    
    if (!data) return [];

    return data.map((t: any) => ({
      id: t.id,
      adId: t.ad_id,
      sellerId: t.seller_id,
      buyerId: t.buyer_id,
      guestEmail: t.guest_email,
      guestName: t.guest_name,
      amount: t.amount,
      status: t.status,
      paymentMethod: t.payment_method,
      paymentReference: t.payment_reference,
      createdAt: t.created_at,
      adTitle: t.ads?.title
    }));
  }
};
