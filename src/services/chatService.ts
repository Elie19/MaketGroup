import { supabase } from '../supabase';
import { Message, ChatSession } from '../types';
import { handleSupabaseError, OperationType } from '../lib/utils';

export const chatService = {
  async sendMessage(chatId: string, message: Omit<Message, 'id' | 'createdAt'>) {
    const newMessage = {
      ...message,
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from('messages').insert(newMessage);
    if (error) await handleSupabaseError(error, OperationType.WRITE, 'messages');
    
    // Update chat session last message
    const { error: chatError } = await supabase.from('chats').upsert({
      id: chatId,
      lastMessage: newMessage,
      updatedAt: new Date().toISOString(),
      participants: chatId.split('_')
    }, { onConflict: 'id' });
    if (chatError) await handleSupabaseError(chatError, OperationType.WRITE, `chats/${chatId}`);
  },

  subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
    // Initial fetch
    supabase.from('messages').select('*').eq('chatId', chatId).order('createdAt', { ascending: true }).then(({ data }) => {
      if (data) callback(data as Message[]);
    });

    // Subscribe to changes
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chatId=eq.${chatId}` }, async () => {
        const { data } = await supabase.from('messages').select('*').eq('chatId', chatId).order('createdAt', { ascending: true });
        if (data) callback(data as Message[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToUserChats(userId: string, callback: (chats: ChatSession[]) => void) {
    // Initial fetch
    supabase.from('chats').select('*').contains('participants', [userId]).order('updatedAt', { ascending: false }).then(({ data }) => {
      if (data) callback(data as ChatSession[]);
    });

    // Subscribe to changes
    const channel = supabase
      .channel(`user-chats-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, async () => {
        const { data } = await supabase.from('chats').select('*').contains('participants', [userId]).order('updatedAt', { ascending: false });
        if (data) callback(data as ChatSession[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
