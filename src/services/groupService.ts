import { supabase } from '../supabase';
import { ChatGroup, Message } from '../types';
import { handleSupabaseError, OperationType } from '../lib/utils';

const GROUPS_TABLE = 'groups';

export const groupService = {
  async createGroup(group: Omit<ChatGroup, 'id' | 'createdAt' | 'members'>) {
    const newGroup = {
      ...group,
      members: [group.adminId],
      createdAt: new Date().toISOString(),
    };
    const { data, error } = await supabase.from(GROUPS_TABLE).insert(newGroup).select().single();
    if (error) await handleSupabaseError(error, OperationType.WRITE, GROUPS_TABLE);
    return data as ChatGroup;
  },

  async joinGroup(groupId: string, userId: string) {
    const { data: group } = await supabase.from(GROUPS_TABLE).select('members').eq('id', groupId).single();
    if (group) {
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

  subscribeToGroups(callback: (groups: ChatGroup[]) => void) {
    // Initial fetch
    supabase.from(GROUPS_TABLE).select('*').order('createdAt', { ascending: false }).then(({ data }) => {
      if (data) callback(data as ChatGroup[]);
    });

    // Subscribe to changes
    const channel = supabase
      .channel('groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: GROUPS_TABLE }, async () => {
        const { data } = await supabase.from(GROUPS_TABLE).select('*').order('createdAt', { ascending: false });
        if (data) callback(data as ChatGroup[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async sendGroupMessage(groupId: string, message: Omit<Message, 'id' | 'createdAt'>) {
    const newMessage = {
      ...message,
      createdAt: new Date().toISOString(),
      groupId: groupId // Assuming messages table has groupId for group messages
    };
    const { error } = await supabase.from('messages').insert(newMessage);
    if (error) throw error;
  },

  subscribeToGroupMessages(groupId: string, callback: (messages: Message[]) => void) {
    // Initial fetch
    supabase.from('messages').select('*').eq('groupId', groupId).order('createdAt', { ascending: true }).then(({ data }) => {
      if (data) callback(data as Message[]);
    });

    // Subscribe to changes
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `groupId=eq.${groupId}` }, async () => {
        const { data } = await supabase.from('messages').select('*').eq('groupId', groupId).order('createdAt', { ascending: true });
        if (data) callback(data as Message[]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
