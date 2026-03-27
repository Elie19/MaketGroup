import { supabase } from '../supabase';
import { handleSupabaseError, OperationType } from '../lib/utils';

export interface AppNotification {
  id: string;
  userId: string;
  type: 'message' | 'sale' | 'review' | 'system';
  title: string;
  content: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const mapNotificationToCamel = (n: any): AppNotification => ({
  id: n.id,
  userId: n.user_id,
  type: n.type,
  title: n.title,
  content: n.content,
  link: n.link,
  isRead: n.is_read,
  createdAt: n.created_at
});

export const notificationService = {
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) await handleSupabaseError(error, OperationType.GET, 'notifications');
    return data ? data.map(mapNotificationToCamel) : [];
  },

  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) await handleSupabaseError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  },

  subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
    this.getNotifications(userId).then(callback);

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${userId}` 
      }, () => {
        this.getNotifications(userId).then(callback);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
