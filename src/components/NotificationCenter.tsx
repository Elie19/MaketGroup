import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, ShoppingBag, Star, Info, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService, AppNotification } from '../services/notificationService';
import { useAuthStore } from '../store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export const NotificationCenter = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.id, setNotifications);
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'sale': return <ShoppingBag className="h-4 w-4 text-emerald-500" />;
      case 'review': return <Star className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-zinc-500" />;
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-black">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
            >
              <div className="border-b border-zinc-100 p-4 dark:border-white/5">
                <h3 className="font-semibold text-zinc-900 dark:text-white">Notifications</h3>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "relative flex gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5",
                        !n.isRead && "bg-emerald-500/5"
                      )}
                    >
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link 
                            to={n.link || '#'} 
                            onClick={() => {
                              setIsOpen(false);
                              handleMarkAsRead(n.id);
                            }}
                            className="text-sm font-medium text-zinc-900 hover:text-emerald-500 dark:text-white dark:hover:text-emerald-400"
                          >
                            {n.title}
                          </Link>
                          {!n.isRead && (
                            <button 
                              onClick={() => handleMarkAsRead(n.id)}
                              className="rounded-full p-1 text-zinc-400 hover:bg-emerald-500 hover:text-black"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {n.content}
                        </p>
                        <span className="mt-1 block text-[10px] text-zinc-400">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-sm text-zinc-500">
                    Aucune notification pour le moment.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
