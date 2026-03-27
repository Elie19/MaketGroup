import { supabase } from '../supabase';
import { Transaction } from '../types';
import { handleSupabaseError, OperationType } from '../lib/utils';

export const transactionService = {
  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ad_id: transaction.adId,
        seller_id: transaction.sellerId,
        buyer_id: transaction.buyerId || null,
        guest_email: transaction.guestEmail || null,
        guest_name: transaction.guestName || null,
        amount: transaction.amount,
        status: transaction.status || 'completed',
        payment_method: transaction.paymentMethod || null,
        payment_reference: transaction.paymentReference || null
      })
      .select()
      .single();

    if (error) await handleSupabaseError(error, OperationType.WRITE, 'transactions');
    
    // Mark ad as sold
    await supabase.from('ads').update({ status: 'sold' }).eq('id', transaction.adId);
    
    return data;
  },

  async getSellerTransactions(sellerId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, ads(title)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) await handleSupabaseError(error, OperationType.GET, 'transactions');
    
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
