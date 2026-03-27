import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Transaction } from '../types';
import { motion } from 'motion/react';
import { BarChart3, Download, Filter, Search, TrendingUp, Users, Package, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const AdminReports = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    avgAmount: 0,
    growth: 12.5 // Mock growth for UI
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, ads(title)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped: Transaction[] = data.map((t: any) => ({
          id: t.id,
          adId: t.ad_id,
          sellerId: t.seller_id,
          buyerId: t.buyer_id,
          amount: t.amount,
          status: t.status,
          paymentMethod: t.payment_method,
          paymentReference: t.payment_reference,
          createdAt: t.created_at,
          adTitle: t.ads?.title
        }));
        setTransactions(mapped);

        const total = mapped.reduce((sum, t) => sum + t.amount, 0);
        setStats({
          totalAmount: total,
          totalCount: mapped.length,
          avgAmount: mapped.length > 0 ? total / mapped.length : 0,
          growth: 12.5
        });
      }
    } catch (error) {
      console.error('Error fetching admin reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-500">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Panel d'Administration</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">Rapports de Transactions</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">Vue d'ensemble de l'activité commerciale de la plateforme.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-black transition-transform hover:scale-105 active:scale-95">
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Volume Total', value: `${stats.totalAmount.toLocaleString()}€`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Transactions', value: stats.totalCount.toString(), icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Panier Moyen', value: `${stats.avgAmount.toFixed(2)}€`, icon: Package, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Croissance', value: `+${stats.growth}%`, icon: Users, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/5 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className={cn("rounded-xl p-3", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-white/5 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 p-6 dark:border-white/5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Dernières Transactions</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black"
                />
              </div>
              <button className="rounded-xl border border-zinc-200 p-2 dark:border-white/10">
                <Filter className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-black/20">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Article</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Méthode</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {transactions.map((t) => (
                <tr key={t.id} className="text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-white/5">
                  <td className="px-6 py-4 font-mono text-[10px] text-zinc-400">#{t.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{t.adTitle || 'Article inconnu'}</td>
                  <td className="px-6 py-4 font-bold text-emerald-500">{t.amount}€</td>
                  <td className="px-6 py-4">
                    <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase dark:bg-zinc-800">
                      {t.paymentMethod || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-500">
                    {format(new Date(t.createdAt), 'dd MMM yyyy', { locale: fr })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-bold uppercase",
                      t.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {t.status === 'completed' ? 'Succès' : 'Échec'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="py-20 text-center text-zinc-500">
              Aucune transaction trouvée.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
