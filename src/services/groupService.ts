import { supabase } from '../supabase';
import { ChatGroup, Message } from '../types';
import { handleSupabaseError, OperationType } from '../lib/utils';

const GROUPS_TABLE = 'groups';

const mapGroupToCamel = (group: any): ChatGroup => ({
  id: group.id,
  name: group.name,
  description: group.description,
  category: group.category,
  adminId: group.admin_id,
  members: group.members || [],
  createdAt: group.created_at,
  photoURL: group.photo_url
});

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

export const groupService = {
  async createGroup(group: Omit<ChatGroup, 'id' | 'createdAt' | 'members'>) {
    const newGroup = {
      name: group.name,
      description: group.description,
      category: group.category,
      admin_id: group.adminId,
      members: [group.adminId],
      photo_url: group.photoURL,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from(GROUPS_TABLE).insert(newGroup).select().single();
    if (error) await handleSupabaseError(error, OperationType.WRITE, GROUPS_TABLE);
    return mapGroupToCamel(data);
  },

  async joinGroup(groupId: string, userId: string) {
    const { data: group } = await supabase.from(GROUPS_TABLE).select('members').eq('id', groupId).single();
    if (group) {
      if (group.members.includes(userId)) return;
      const members = [...group.members, userId];
      const { error } = await supabase.from(GROUPS_TABLE).update({ members }).eq('id', groupId);
      if (error) await handleSupabaseError(error, OperationType.UPDATE, `${GROUPS_TABLE}/${groupId}`);
    }
  },

  async leaveGroup(groupId: string, userId: string) {
    const { data: group } = await supabase.from(GROUPS_TABLE).select('members').eq('id', groupId).single();
    if (group) {
      const members = group.members.filter((id: string) => id !== userId);
      const { error } = await supabase.from(GROUPS_TABLE).update({ members }).eq('id', groupId);
      if (error) await handleSupabaseError(error, OperationType.UPDATE, `${GROUPS_TABLE}/${groupId}`);
    }
  },

  async addMember(groupId: string, userId: string, adminId: string) {
    const { data: group } = await supabase.from(GROUPS_TABLE).select('members, admin_id').eq('id', groupId).single();
    if (group) {
      if (group.admin_id !== adminId) throw new Error('Seul l\'administrateur peut ajouter des membres.');
      if (group.members.includes(userId)) return;
      const members = [...group.members, userId];
      const { error } = await supabase.from(GROUPS_TABLE).update({ members }).eq('id', groupId);
      if (error) await handleSupabaseError(error, OperationType.UPDATE, `${GROUPS_TABLE}/${groupId}`);
    }
  },

  async removeMember(groupId: string, userId: string, adminId: string) {
    const { data: group } = await supabase.from(GROUPS_TABLE).select('members, admin_id').eq('id', groupId).single();
    if (group) {
      if (group.admin_id !== adminId) throw new Error('Seul l\'administrateur peut retirer des membres.');
      const members = group.members.filter((id: string) => id !== userId);
      const { error } = await supabase.from(GROUPS_TABLE).update({ members }).eq('id', groupId);
      if (error) await handleSupabaseError(error, OperationType.UPDATE, `${GROUPS_TABLE}/${groupId}`);
    }
  },

  async deleteGroup(groupId: string, adminId: string) {
    const { data: group } = await supabase.from(GROUPS_TABLE).select('admin_id').eq('id', groupId).single();
    if (group) {
      if (group.admin_id !== adminId) throw new Error('Seul l\'administrateur peut supprimer le groupe.');
      const { error } = await supabase.from(GROUPS_TABLE).delete().eq('id', groupId);
      if (error) await handleSupabaseError(error, OperationType.DELETE, `${GROUPS_TABLE}/${groupId}`);
    }
  },

  subscribeToGroups(callback: (groups: ChatGroup[]) => void) {
    // Initial fetch
    supabase.from(GROUPS_TABLE).select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) callback(data.map(mapGroupToCamel));
    });

    // Subscribe to changes
    const channel = supabase
      .channel('groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: GROUPS_TABLE }, async () => {
        const { data } = await supabase.from(GROUPS_TABLE).select('*').order('created_at', { ascending: false });
        if (data) callback(data.map(mapGroupToCamel));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async sendGroupMessage(groupId: string, message: Omit<Message, 'id' | 'createdAt'>) {
    const newMessage = {
      group_id: groupId,
      sender_id: message.senderId,
      sender_name: message.senderName,
      sender_photo: message.senderPhoto,
      text: message.text,
      attachments: message.attachments || [],
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('messages').insert(newMessage);
    if (error) await handleSupabaseError(error, OperationType.WRITE, 'messages');
  },

  subscribeToGroupMessages(groupId: string, callback: (messages: Message[]) => void) {
    // Initial fetch
    supabase.from('messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true }).then(({ data }) => {
      if (data) callback(data.map(mapMessageToCamel));
    });

    // Subscribe to changes
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` }, async () => {
        const { data } = await supabase.from('messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
        if (data) callback(data.map(mapMessageToCamel));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
