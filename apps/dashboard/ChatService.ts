
import { supabase } from './supabaseClient';
import {
  ChatMessage,
  Conversation,
  RoleChatPolicy,
  MessageTemplate,
  BroadcastList,
  BroadcastJob,
  AutomationRule,
  AutomationJob,
  ChatSettings,
  PresenceStatus,
  ChatProfile,
  RoleDefaults,
} from './types';
import { getStoredUser } from './session';

const SETTINGS_PREFIX = 'chat_settings:';
const ROLE_DEFAULTS_PREFIX = 'chat_role_defaults:';
const BLOCKS_PREFIX = 'chat_blocked:';

const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  sound_incoming: true,
  sound_outgoing: true,
  sound_mentions: true,
  glow_on_new: true,
  toast_on_new: true,
  show_online_status: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
};

const buildFullName = (row: any) =>
  [row.user_name, row.user_name2, row.user_surname, row.user_surname2].filter(Boolean).join(' ').trim();

const mapProfile = (row: any): ChatProfile => ({
  id: String(row.chat_profile_id || row.user_id),
  user_id: row.user_id,
  display_name: row.display_name || buildFullName(row) || 'Usuario',
  role_name: row.role_name || row.profiles?.prof_name || undefined,
  role_id: row.role_id ?? row.prof_id ?? row.profiles?.prof_id ?? 0,
  presence_status: row.presence_status || 'offline',
  avatar_url: row.avatar_url || row.user_photo_url || undefined,
  avatar_version: row.avatar_version || undefined,
  is_online: row.is_online ?? false,
});

const mapMessage = (row: any): ChatMessage => ({
  id: String(row.message_id),
  conversation_id: String(row.conversation_id),
  sender_id: row.sender_id,
  sender_name: row.sender_name || 'Usuario',
  sender_avatar_url: row.sender_avatar_url || undefined,
  type: row.message_type || 'text',
  content_text: row.content_text || '',
  status: row.status || 'sent',
  created_at: row.created_at || new Date().toISOString(),
});

const mapTemplate = (row: any): MessageTemplate => ({
  id: String(row.template_id),
  name: row.name,
  category: row.category || 'General',
  body_text: row.body_text || '',
  variables_json: row.variables_json || [],
  attachments_json: row.attachments_json || [],
  scope: row.scope || 'global',
  role_id: row.role_id || undefined,
  is_active: row.is_active !== false,
  created_by: row.created_by || 0,
  created_at: row.created_at || new Date().toISOString(),
  updated_at: row.updated_at || row.created_at || new Date().toISOString(),
});

const mapBroadcastJob = (row: any): BroadcastJob => ({
  id: String(row.broadcast_job_id),
  created_by: row.created_by || 0,
  mode: row.mode || 'DM_MASS',
  audience_snapshot_json: row.audience_snapshot_json || {},
  message_payload_json: row.message_payload_json || {},
  reason: row.reason || '',
  status: row.status || 'running',
  total_targets: row.total_targets || 0,
  sent_count: row.sent_count || 0,
  delivered_count: row.delivered_count || 0,
  read_count: row.read_count || 0,
  failed_count: row.failed_count || 0,
  skipped_count: row.skipped_count || 0,
  created_at: row.created_at || new Date().toISOString(),
  finished_at: row.finished_at || undefined,
});

const mapAutomation = (row: any): AutomationRule => ({
  id: String(row.automation_id),
  trigger_type: row.trigger_type,
  trigger_event: row.trigger_event || undefined,
  schedule_cron: row.schedule_cron || undefined,
  conditions_json: row.conditions_json || {},
  target_json: row.target_json || {},
  template_id: row.template_id ? String(row.template_id) : '',
  is_enabled: row.is_enabled !== false,
  created_by: row.created_by || 0,
  created_at: row.created_at || new Date().toISOString(),
  updated_at: row.updated_at || row.created_at || new Date().toISOString(),
});

const mapAutomationJob = (row: any): AutomationJob => ({
  id: String(row.automation_job_id),
  rule_id: String(row.automation_id),
  status: row.status || 'running',
});

const ensureStoredUser = () => {
  const user = getStoredUser();
  if (!user?.user_id) {
    throw new Error('Usuario no autenticado');
  }
  return user;
};

const buildVariables = (bodyText?: string) => {
  if (!bodyText) return [];
  const matches = bodyText.match(/{{(.*?)}}/g) || [];
  return matches.map((v) => v.replace(/{{|}}/g, '').trim()).filter(Boolean);
};

const ChatService = {
  async getConversations(): Promise<Conversation[]> {
    const user = ensureStoredUser();
    const userId = user.user_id;

    const { data: memberships, error } = await supabase
      .from('chat_conversation_members')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);

    if (error || !memberships || memberships.length === 0) {
      return [];
    }

    const conversationIds = memberships.map((m: any) => m.conversation_id);

    const { data: convRows } = await supabase
      .from('chat_conversations')
      .select('*')
      .in('conversation_id', conversationIds);

    const { data: memberRows } = await supabase
      .from('chat_conversation_members')
      .select('conversation_id, user_id')
      .in('conversation_id', conversationIds);

    const memberIds = [...new Set((memberRows || []).map((m: any) => m.user_id).filter(Boolean))];
    const { data: profileRows } = memberIds.length
      ? await supabase.from('chat_profiles').select('*').in('user_id', memberIds)
      : { data: [] };

    const profileMap = new Map<number, ChatProfile>();
    (profileRows || []).forEach((row: any) => {
      profileMap.set(row.user_id, mapProfile(row));
    });

    const missingIds = memberIds.filter((id) => !profileMap.has(id));
    if (missingIds.length) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, user_name, user_name2, user_surname, user_surname2, user_photo_url, prof_id, profiles(prof_name)')
        .in('user_id', missingIds);
      (users || []).forEach((row: any) => {
        profileMap.set(row.user_id, mapProfile(row));
      });
    }

    const { data: messageRows } = await supabase
      .from('chat_messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    const lastMessageMap = new Map<number, ChatMessage>();
    (messageRows || []).forEach((row: any) => {
      if (!lastMessageMap.has(row.conversation_id)) {
        lastMessageMap.set(row.conversation_id, mapMessage(row));
      }
    });

    const membershipMap = new Map<number, any>();
    memberships.forEach((m: any) => membershipMap.set(m.conversation_id, m));

    const conversations = (convRows || []).map((row: any) => {
      const convId = row.conversation_id;
      const members = (memberRows || [])
        .filter((m: any) => m.conversation_id === convId)
        .map((m: any) => profileMap.get(m.user_id))
        .filter(Boolean) as ChatProfile[];

      const lastMessage = lastMessageMap.get(convId);
      const lastReadAt = membershipMap.get(convId)?.last_read_at;
      let unread = 0;
      if (lastMessage && lastMessage.sender_id !== userId) {
        if (!lastReadAt || new Date(lastReadAt) < new Date(lastMessage.created_at)) {
          unread = 1;
        }
      }

      return {
        id: String(convId),
        type: row.conversation_type === 'group' ? 'group' : 'direct',
        name: row.conversation_name || undefined,
        unread_count: unread,
        created_at: row.created_at || new Date().toISOString(),
        members,
        last_message: lastMessage,
        avatar_url: row.avatar_url || undefined,
      } as Conversation;
    });

    return conversations.sort((a, b) =>
      new Date(b.last_message?.created_at || b.created_at).getTime() -
      new Date(a.last_message?.created_at || a.created_at).getTime()
    );
  },

  async createDirectConversation(targetUserId: number): Promise<string> {
    const user = ensureStoredUser();

    const { data: myMemberships } = await supabase
      .from('chat_conversation_members')
      .select('conversation_id')
      .eq('user_id', user.user_id);

    const myConvIds = (myMemberships || []).map((m: any) => m.conversation_id);
    if (myConvIds.length) {
      const { data: shared } = await supabase
        .from('chat_conversation_members')
        .select('conversation_id')
        .eq('user_id', targetUserId)
        .in('conversation_id', myConvIds);

      const sharedIds = (shared || []).map((m: any) => m.conversation_id);
      if (sharedIds.length) {
        const { data: convRow } = await supabase
          .from('chat_conversations')
          .select('conversation_id, conversation_type')
          .in('conversation_id', sharedIds);

        const direct = (convRow || []).find((row: any) => row.conversation_type === 'direct');
        if (direct) {
          return String(direct.conversation_id);
        }
      }
    }

    const { data: conv, error } = await supabase
      .from('chat_conversations')
      .insert([{ conversation_type: 'direct' }])
      .select('*')
      .single();

    if (!conv) {
      throw new Error(error?.message || 'No se pudo crear la conversacion');
    }

    await supabase.from('chat_conversation_members').insert([
      { conversation_id: conv.conversation_id, user_id: user.user_id, is_admin: true },
      { conversation_id: conv.conversation_id, user_id: targetUserId, is_admin: false },
    ]);

    return String(conv.conversation_id);
  },

  async createGroupConversation(params: { name: string; memberIds: number[]; description?: string }): Promise<Conversation> {
    const user = ensureStoredUser();
    const payload = {
      conversation_type: 'group',
      conversation_name: params.name,
    } as any;

    const { data: conv, error } = await supabase
      .from('chat_conversations')
      .insert([payload])
      .select('*')
      .single();

    if (!conv) {
      throw new Error(error?.message || 'No se pudo crear el grupo');
    }

    const members = Array.from(new Set([user.user_id, ...(params.memberIds || [])]));
    if (members.length) {
      await supabase.from('chat_conversation_members').insert(
        members.map((id) => ({
          conversation_id: conv.conversation_id,
          user_id: id,
          is_admin: id === user.user_id,
        }))
      );
    }

    return {
      id: String(conv.conversation_id),
      type: 'group',
      name: conv.conversation_name || params.name,
      unread_count: 0,
      created_at: conv.created_at || new Date().toISOString(),
      members: [],
      avatar_url: conv.avatar_url || undefined,
    } as Conversation;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', Number(conversationId))
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Chat getMessages error', error);
      return [];
    }

    return (data || []).map(mapMessage);
  },

  async sendMessage(
    conversationId: string,
    params: { type: string; content_text?: string; media_id?: string; reply_to_id?: string }
  ): Promise<ChatMessage> {
    const user = ensureStoredUser();
    const payload = {
      conversation_id: Number(conversationId),
      sender_id: user.user_id,
      sender_name: user.user_name ? `${user.user_name} ${user.user_surname || ''}`.trim() : 'Usuario',
      sender_avatar_url: user.user_photo_url || null,
      message_type: params.type || 'text',
      content_text: params.content_text || '',
      status: 'sent',
    };

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([payload])
      .select('*')
      .single();

    if (!data) {
      throw new Error(error?.message || 'No se pudo enviar el mensaje');
    }

    return mapMessage(data);
  },

  async editMessage(messageId: string, content_text: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_messages')
      .update({ content_text })
      .eq('message_id', Number(messageId));
    if (error) {
      throw new Error('No se pudo editar el mensaje');
    }
    return true;
  },

  async deleteMessage(messageId: string, scope: 'me' | 'all' = 'me'): Promise<boolean> {
    if (scope === 'me') {
      const user = ensureStoredUser();
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('message_id', Number(messageId))
        .eq('sender_id', user.user_id);
      if (error) {
        throw new Error('No se pudo eliminar el mensaje');
      }
      return true;
    }

    const { error } = await supabase.from('chat_messages').delete().eq('message_id', Number(messageId));
    if (error) {
      throw new Error('No se pudo eliminar el mensaje');
    }
    return true;
  },

  async markConversationRead(conversationId: string): Promise<boolean> {
    const user = ensureStoredUser();
    const { error } = await supabase
      .from('chat_conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', Number(conversationId))
      .eq('user_id', user.user_id);
    if (error) {
      console.error('Chat markConversationRead error', error);
      return false;
    }
    return true;
  },

  async getMyProfile(): Promise<ChatProfile | null> {
    const user = ensureStoredUser();
    const { data: profile } = await supabase
      .from('chat_profiles')
      .select('*')
      .eq('user_id', user.user_id)
      .maybeSingle();

    if (profile) {
      return mapProfile(profile);
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('user_id, user_name, user_name2, user_surname, user_surname2, user_photo_url, prof_id, profiles(prof_name)')
      .eq('user_id', user.user_id)
      .maybeSingle();

    if (!userRow) return null;

    const payload = {
      user_id: userRow.user_id,
      display_name: buildFullName(userRow) || user.user_name || 'Usuario',
      role_id: userRow.prof_id || 0,
      role_name: (userRow.profiles as any)?.prof_name || (Array.isArray(userRow.profiles) ? userRow.profiles[0]?.prof_name : null) || null,
      presence_status: 'available',
      avatar_url: userRow.user_photo_url || null,
      is_online: true,
      updated_at: new Date().toISOString(),
    };

    const { data: created } = await supabase
      .from('chat_profiles')
      .insert([payload])
      .select('*')
      .single();

    return created ? mapProfile(created) : mapProfile(userRow);
  },

  async updateMyProfile(data: Partial<ChatProfile>): Promise<ChatProfile | null> {
    const user = ensureStoredUser();
    const payload = {
      display_name: data.display_name,
      role_id: data.role_id,
      role_name: data.role_name || null,
      presence_status: data.presence_status,
      avatar_url: data.avatar_url || null,
      avatar_version: data.avatar_version,
      is_online: data.is_online,
      updated_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabase
      .from('chat_profiles')
      .update(payload)
      .eq('user_id', user.user_id)
      .select('*')
      .single();

    if (error) {
      console.error('Chat updateMyProfile error', error);
      return null;
    }

    return row ? mapProfile(row) : null;
  },

  async updatePresence(status: PresenceStatus): Promise<boolean> {
    const user = ensureStoredUser();
    const { error } = await supabase
      .from('chat_profiles')
      .update({
        presence_status: status,
        is_online: status !== 'offline',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.user_id);

    if (error) {
      console.error('Chat updatePresence error', error);
      return false;
    }
    return true;
  },

  async getSettings(): Promise<ChatSettings> {
    const user = ensureStoredUser();
    const key = `${SETTINGS_PREFIX}${user.user_id}`;
    const { data, error } = await supabase
      .from('settings')
      .select('set_value')
      .eq('set_key', key)
      .maybeSingle();

    if (error) {
      console.error('Chat getSettings error', error);
      return { ...DEFAULT_CHAT_SETTINGS };
    }

    if (data?.set_value) {
      try {
        const parsed = JSON.parse(data.set_value);
        return { ...DEFAULT_CHAT_SETTINGS, ...parsed };
      } catch (parseError) {
        console.error('Chat settings parse error', parseError);
      }
    }

    return { ...DEFAULT_CHAT_SETTINGS };
  },

  async updateSettings(settings: Partial<ChatSettings>): Promise<ChatSettings> {
    const user = ensureStoredUser();
    const key = `${SETTINGS_PREFIX}${user.user_id}`;
    const payload = { ...DEFAULT_CHAT_SETTINGS, ...settings };
    const { error } = await supabase
      .from('settings')
      .upsert(
        [
          {
            set_key: key,
            set_value: JSON.stringify(payload),
            set_description: 'Chat user settings',
          },
        ],
        { onConflict: 'set_key' }
      );

    if (error) {
      console.error('Chat updateSettings error', error);
      return { ...DEFAULT_CHAT_SETTINGS, ...settings } as ChatSettings;
    }

    return payload as ChatSettings;
  },

  async getOnlineUsers(): Promise<ChatProfile[]> {
    const { data, error } = await supabase
      .from('chat_profiles')
      .select('*')
      .eq('is_online', true)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Chat getOnlineUsers error', error);
      return [];
    }

    return (data || []).map(mapProfile);
  },

  async getPolicies(): Promise<RoleChatPolicy[]> {
    const { data, error } = await supabase
      .from('chat_policies')
      .select('from_role_id, to_role_id, can_initiate, can_receive')
      .order('from_role_id', { ascending: true })
      .order('to_role_id', { ascending: true });

    if (error) {
      console.error('Chat getPolicies error', error);
      return [];
    }

    return (data || []) as RoleChatPolicy[];
  },

  async updatePolicies(policies: Partial<RoleChatPolicy>[]): Promise<boolean> {
    const { error: deleteError } = await supabase
      .from('chat_policies')
      .delete()
      .gte('from_role_id', 0);

    if (deleteError) {
      throw new Error('No se pudieron actualizar las politicas');
    }

    if (!policies || policies.length === 0) {
      return true;
    }

    const payload = policies.map((policy) => ({
      from_role_id: policy.from_role_id,
      to_role_id: policy.to_role_id,
      can_initiate: policy.can_initiate ?? false,
      can_receive: policy.can_receive ?? false,
    }));

    const { error } = await supabase.from('chat_policies').insert(payload);
    if (error) {
      throw new Error('No se pudieron actualizar las politicas');
    }
    return true;
  },

  async blockUser(targetUserId: number): Promise<boolean> {
    const user = ensureStoredUser();
    const key = `${BLOCKS_PREFIX}${user.user_id}`;
    const { data } = await supabase.from('settings').select('set_value').eq('set_key', key).maybeSingle();
    let current: number[] = [];
    if (data?.set_value) {
      try {
        current = JSON.parse(data.set_value);
      } catch (error) {
        current = [];
      }
    }
    const updated = Array.from(new Set([...(current || []), targetUserId]));
    await supabase.from('settings').upsert(
      [
        {
          set_key: key,
          set_value: JSON.stringify(updated),
          set_description: 'Chat blocked users',
        },
      ],
      { onConflict: 'set_key' }
    );
    return true;
  },

  async unblockUser(targetUserId: number): Promise<boolean> {
    const user = ensureStoredUser();
    const key = `${BLOCKS_PREFIX}${user.user_id}`;
    const { data } = await supabase.from('settings').select('set_value').eq('set_key', key).maybeSingle();
    let current: number[] = [];
    if (data?.set_value) {
      try {
        current = JSON.parse(data.set_value);
      } catch (error) {
        current = [];
      }
    }
    const updated = (current || []).filter((id: number) => id !== targetUserId);
    await supabase.from('settings').upsert(
      [
        {
          set_key: key,
          set_value: JSON.stringify(updated),
          set_description: 'Chat blocked users',
        },
      ],
      { onConflict: 'set_key' }
    );
    return true;
  },

  async getRoleDefaults(roleId: number): Promise<RoleDefaults> {
    const key = `${ROLE_DEFAULTS_PREFIX}${roleId}`;
    const { data } = await supabase.from('settings').select('set_value').eq('set_key', key).maybeSingle();
    if (data?.set_value) {
      try {
        return { settings: JSON.parse(data.set_value) } as RoleDefaults;
      } catch (parseError) {
        console.error('Chat getRoleDefaults parse error', parseError);
      }
    }
    return { settings: {} } as RoleDefaults;
  },

  async updateRoleDefaults(roleId: number, defaults: Partial<RoleDefaults>): Promise<RoleDefaults> {
    const key = `${ROLE_DEFAULTS_PREFIX}${roleId}`;
    const settings = defaults.settings || {};
    await supabase.from('settings').upsert(
      [
        {
          set_key: key,
          set_value: JSON.stringify(settings),
          set_description: 'Chat role defaults',
        },
      ],
      { onConflict: 'set_key' }
    );
    return { settings } as RoleDefaults;
  },

  async getBroadcastLists(): Promise<BroadcastList[]> {
    const { data, error } = await supabase
      .from('chat_broadcast_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Chat getBroadcastLists error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.broadcast_list_id),
      name: row.name,
      audience_rules_json: row.audience_rules_json || {},
    }));
  },

  async saveBroadcastList(data: Partial<BroadcastList>): Promise<BroadcastList | null> {
    const payload = {
      name: data.name,
      audience_rules_json: data.audience_rules_json || {},
    };

    if (data.id) {
      const { data: row, error } = await supabase
        .from('chat_broadcast_lists')
        .update(payload)
        .eq('broadcast_list_id', Number(data.id))
        .select('*')
        .single();
      if (error || !row) return null;
      return { id: String(row.broadcast_list_id), name: row.name, audience_rules_json: row.audience_rules_json || {} };
    }

    const { data: row, error } = await supabase
      .from('chat_broadcast_lists')
      .insert([payload])
      .select('*')
      .single();
    if (error || !row) return null;
    return { id: String(row.broadcast_list_id), name: row.name, audience_rules_json: row.audience_rules_json || {} };
  },

  async sendBroadcast(params: {
    mode: string;
    audience_rules_json: any;
    message_payload: any;
    reason: string;
    list_id?: string;
  }): Promise<BroadcastJob | null> {
    const user = ensureStoredUser();
    const payload = {
      created_by: user.user_id,
      mode: params.mode || 'DM_MASS',
      audience_snapshot_json: params.audience_rules_json || {},
      message_payload_json: params.message_payload || {},
      reason: params.reason || 'Broadcast',
      status: 'running',
      total_targets: 0,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      failed_count: 0,
      skipped_count: 0,
    };

    const { data: row, error } = await supabase
      .from('chat_broadcast_jobs')
      .insert([payload])
      .select('*')
      .single();

    if (error || !row) {
      throw new Error('No se pudo crear el broadcast');
    }

    return mapBroadcastJob(row);
  },

  async getBroadcastJobs(): Promise<BroadcastJob[]> {
    const { data, error } = await supabase
      .from('chat_broadcast_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Chat getBroadcastJobs error', error);
      return [];
    }

    return (data || []).map(mapBroadcastJob);
  },

  async cancelBroadcastJob(jobId: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_broadcast_jobs')
      .update({ status: 'cancelled', finished_at: new Date().toISOString() })
      .eq('broadcast_job_id', Number(jobId));
    if (error) {
      console.error('Chat cancelBroadcastJob error', error);
      return false;
    }
    return true;
  },

  async getTemplates(): Promise<MessageTemplate[]> {
    const { data, error } = await supabase
      .from('chat_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Chat getTemplates error', error);
      return [];
    }

    return (data || []).map(mapTemplate);
  },

  async saveTemplate(data: Partial<MessageTemplate>): Promise<MessageTemplate | null> {
    const payload = {
      name: data.name,
      category: data.category,
      body_text: data.body_text,
      variables_json: data.variables_json || buildVariables(data.body_text),
      attachments_json: data.attachments_json || [],
      scope: data.scope || 'global',
      role_id: data.role_id || null,
      is_active: data.is_active !== false,
      created_by: data.created_by || ensureStoredUser().user_id,
    } as any;

    if (data.id) {
      const { data: row, error } = await supabase
        .from('chat_templates')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('template_id', Number(data.id))
        .select('*')
        .single();
      if (error || !row) return null;
      return mapTemplate(row);
    }

    const { data: row, error } = await supabase
      .from('chat_templates')
      .insert([payload])
      .select('*')
      .single();
    if (error || !row) return null;
    return mapTemplate(row);
  },

  async deleteTemplate(id: string): Promise<boolean> {
    const { error } = await supabase.from('chat_templates').delete().eq('template_id', Number(id));
    if (error) {
      throw new Error('No se pudo eliminar la plantilla');
    }
    return true;
  },

  async getAutomations(): Promise<AutomationRule[]> {
    const { data, error } = await supabase
      .from('chat_automations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Chat getAutomations error', error);
      return [];
    }

    return (data || []).map(mapAutomation);
  },

  async saveAutomation(data: Partial<AutomationRule>): Promise<AutomationRule | null> {
    const payload = {
      trigger_type: data.trigger_type,
      trigger_event: data.trigger_event || null,
      schedule_cron: data.schedule_cron || null,
      conditions_json: data.conditions_json || {},
      target_json: data.target_json || {},
      template_id: data.template_id ? Number(data.template_id) : null,
      is_enabled: data.is_enabled !== false,
      created_by: data.created_by || ensureStoredUser().user_id,
    } as any;

    if (data.id) {
      const { data: row, error } = await supabase
        .from('chat_automations')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('automation_id', Number(data.id))
        .select('*')
        .single();
      if (error || !row) return null;
      return mapAutomation(row);
    }

    const { data: row, error } = await supabase
      .from('chat_automations')
      .insert([payload])
      .select('*')
      .single();
    if (error || !row) return null;
    return mapAutomation(row);
  },

  async deleteAutomation(id: string): Promise<boolean> {
    const { error } = await supabase.from('chat_automations').delete().eq('automation_id', Number(id));
    if (error) {
      throw new Error('No se pudo eliminar la automatizacion');
    }
    return true;
  },

  async getAutomationJobs(): Promise<AutomationJob[]> {
    const { data, error } = await supabase
      .from('chat_automation_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Chat getAutomationJobs error', error);
      return [];
    }

    return (data || []).map(mapAutomationJob);
  },
};

export default ChatService;
