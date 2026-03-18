import { supabase } from '../supabase';
import { Message, ChatSession } from '../types';
import { handleSupabaseError, OperationType } from '../lib/utils';

const mapMessageToCamel = (msg: any): Message => ({
  id: msg.id,
  text: msg.text,
  senderId: msg.sender_id,
  senderName: msg.sender_name,
  senderPhoto: msg.sender_photo,
  chatId: msg.chat_id,
  createdAt: msg.created_at,
  attachments: msg.attachments || []
});

const mapChatToCamel = (chat: any): ChatSession => ({
  id: chat.id,
  participants: chat.participants,
  lastMessage: chat.last_message ? mapMessageToCamel(chat.last_message) : undefined,
  updatedAt: chat.updated_at
});

export const chatService = {
  async sendMessage(chatId: string, message: Omit<Message, 'id' | 'createdAt'>, options?: { title?: string }) {
    const newMessage = {
      chat_id: chatId,
      sender_id: message.senderId,
      sender_name: message.senderName,
      sender_photo: message.senderPhoto,
      text: message.text,
      attachments: message.attachments || [],
      created_at: new Date().toISOString(),
    };

    // Update chat session first (to ensure it exists for the FK/RLS in messages)
    const upsertData: any = {
      id: chatId,
      last_message: newMessage,
      updated_at: new Date().toISOString(),
      participants: chatId.split('_')
    };

    if (options?.title) {
      upsertData.title = options.title;
    }

    const { error: chatError } = await supabase.from('chats').upsert(upsertData, { onConflict: 'id' });
    
    if (chatError) await handleSupabaseError(chatError, OperationType.WRITE, `chats/${chatId}`);

    const { error } = await supabase.from('messages').insert(newMessage);
    if (error) await handleSupabaseError(error, OperationType.WRITE, 'messages');
  },

  subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
    // Initial fetch
    supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true }).then(({ data }) => {
      if (data) callback(data.map(mapMessageToCamel));
    });

    // Subscribe to changes
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, async () => {
        const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
        if (data) callback(data.map(mapMessageToCamel));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToUserChats(userId: string, callback: (chats: ChatSession[]) => void) {
    // Initial fetch
    supabase.from('chats').select('*').contains('participants', [userId]).order('updated_at', { ascending: false }).then(({ data }) => {
      if (data) callback(data.map(mapChatToCamel));
    });

    // Subscribe to changes
    const channel = supabase
      .channel(`user-chats-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, async () => {
        const { data } = await supabase.from('chats').select('*').contains('participants', [userId]).order('updated_at', { ascending: false });
        if (data) callback(data.map(mapChatToCamel));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
