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

const getParticipantsFromChatId = (chatId: string) => {
  const participants = chatId.split('_').map((id) => id.trim()).filter(Boolean);
  if (participants.length < 2) {
    throw new Error('Invalid chat id format: expected at least two participants');
  }
  return participants;
};

export const chatService = {
  async sendMessage(chatId: string, message: Omit<Message, 'id' | 'createdAt'>, options?: { title?: string }) {
    if (!chatId || !chatId.includes('_')) {
      throw new Error('Invalid chatId format. Expected "user1Id_user2Id"');
    }

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
    const participants = getParticipantsFromChatId(chatId);

    const upsertData: any = {
      id: chatId,
      last_message: newMessage,
      updated_at: new Date().toISOString(),
      participants
    };

    if (options?.title) {
      upsertData.title = options.title;
    }

    const { error: chatError } = await supabase.from('chats').upsert(upsertData, { onConflict: 'id' });
    
    if (chatError) await handleSupabaseError(chatError, OperationType.WRITE, `chats/${chatId}`);

    const { error } = await supabase.from('messages').insert(newMessage);
    if (error) await handleSupabaseError(error, OperationType.WRITE, 'messages');
  },

  async getMessages(chatId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) await handleSupabaseError(error, OperationType.GET, `messages/${chatId}`);
    return data ? data.map(mapMessageToCamel).reverse() : [];
  },

  subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
    // Initial fetch
    this.getMessages(chatId).then(callback).catch(err => console.error('Error in initial message fetch:', err));

    // Subscribe to changes
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${chatId}` 
      }, (payload) => {
        this.getMessages(chatId).then(callback).catch(err => console.error('Error in message subscription update:', err));
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Supabase Realtime channel error for messages');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async getUserChats(userId: string) {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .contains('participants', [userId])
      .order('updated_at', { ascending: false });

    if (error) await handleSupabaseError(error, OperationType.GET, 'chats');
    return data ? data.map(mapChatToCamel) : [];
  },

  subscribeToUserChats(userId: string, callback: (chats: ChatSession[]) => void) {
    // Initial fetch
    this.getUserChats(userId).then(callback).catch(err => console.error('Error in initial chat fetch:', err));

    // Subscribe to changes
    const channel = supabase
      .channel(`user-chats-${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chats' 
      }, () => {
        this.getUserChats(userId).then(callback).catch(err => console.error('Error in chat subscription update:', err));
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Supabase Realtime channel error for chats');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
