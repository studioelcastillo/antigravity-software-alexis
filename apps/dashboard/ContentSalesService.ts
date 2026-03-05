import { supabase } from './supabaseClient';
import { getStoredUser } from './session';
import {
  ContentAsset,
  ContentPlatform,
  ContentTask,
  ContentAssetStatus,
} from './types';

const DEFAULT_STUDIO_ID = 1;
const getStudioId = () => Number(getStoredUser()?.std_id || DEFAULT_STUDIO_ID);
const TODAY = new Date().toISOString().split('T')[0];

const ContentSalesService = {
  async getEligibleModels(studioId: string): Promise<ContentTask[]> {
    const stdId = Number(studioId || getStudioId());
    const { data, error } = await supabase
      .from('content_tasks')
      .select('*')
      .eq('std_id', stdId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Content tasks error', error);
      return [];
    }

    return (data || []).filter((row: any) => row.completed_date !== TODAY).map((row: any) => ({
      id: String(row.content_task_id),
      studio_id: String(row.std_id || stdId),
      model_user_id: row.model_user_id,
      model_name: row.model_name || 'Modelo',
      model_avatar: row.model_avatar || undefined,
      status: row.status || 'PENDING',
      streamate_hours: Number(row.streamate_hours || 0),
      platforms: row.platforms || [],
      scheduled_at: row.scheduled_at || undefined,
      created_at: row.created_at || new Date().toISOString(),
      assigned_to_user_id: row.assigned_to_user_id || undefined,
      assigned_name: row.assigned_name || undefined,
      completed_at: row.completed_at || undefined,
      completed_date: row.completed_date || undefined,
    }));
  },

  async getAssets(status?: ContentAssetStatus): Promise<ContentAsset[]> {
    const stdId = getStudioId();
    let query = supabase.from('content_assets').select('*').eq('std_id', stdId);
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Content assets error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.content_asset_id),
      studio_id: String(row.std_id || getStudioId()),
      model_user_id: row.model_user_id,
      model_name: row.model_name || 'Modelo',
      type: row.asset_type,
      preview_url: row.preview_url || '',
      file_url: row.file_url || '',
      status: row.status || 'PENDING_REVIEW',
      tags_json: row.tags_json || [],
      created_at: row.created_at || new Date().toISOString(),
    }));
  },

  async updateAssetStatus(id: string, status: ContentAssetStatus) {
    await supabase
      .from('content_assets')
      .update({ status })
      .eq('content_asset_id', id);
    return { success: true };
  },

  async createTask(data: Partial<ContentTask>) {
    const payload: any = {
      std_id: data.studio_id ? Number(data.studio_id) : getStudioId(),
      model_user_id: data.model_user_id,
      model_name: data.model_name,
      model_avatar: data.model_avatar || null,
      status: data.status || 'SCHEDULED',
      streamate_hours: data.streamate_hours || 0,
      platforms: data.platforms || [],
      scheduled_at: data.scheduled_at || null,
      created_at: new Date().toISOString(),
      assigned_to_user_id: data.assigned_to_user_id || null,
      assigned_name: data.assigned_name || null,
    };

    const { data: row } = await supabase
      .from('content_tasks')
      .insert([payload])
      .select('*')
      .single();

    return row
      ? {
          id: String(row.content_task_id),
          studio_id: String(row.std_id || getStudioId()),
          model_user_id: row.model_user_id,
          model_name: row.model_name || 'Modelo',
          model_avatar: row.model_avatar || undefined,
          status: row.status || 'SCHEDULED',
          streamate_hours: Number(row.streamate_hours || 0),
          platforms: row.platforms || [],
          scheduled_at: row.scheduled_at || undefined,
          created_at: row.created_at || new Date().toISOString(),
          assigned_to_user_id: row.assigned_to_user_id || undefined,
          assigned_name: row.assigned_name || undefined,
          completed_at: row.completed_at || undefined,
          completed_date: row.completed_date || undefined,
        }
      : (data as ContentTask);
  },

  async assignTask(taskId: string, userId: number, userName: string) {
    await supabase
      .from('content_tasks')
      .update({ assigned_to_user_id: userId, assigned_name: userName })
      .eq('content_task_id', taskId);
    return { success: true };
  },

  async markAsDone(taskId: string) {
    const now = new Date();
    await supabase
      .from('content_tasks')
      .update({
        status: 'DONE',
        completed_at: now.toISOString(),
        completed_date: TODAY,
      })
      .eq('content_task_id', taskId);
    return { success: true };
  },

  async getPlatforms(): Promise<ContentPlatform[]> {
    const stdId = getStudioId();
    const { data, error } = await supabase
      .from('content_platforms')
      .select('*')
      .eq('std_id', stdId)
      .order('platform_name', { ascending: true });

    if (error) {
      console.error('Content platforms error', error);
      return [];
    }

    return (data || [])
      .filter((row: any) => row.is_active !== false)
      .map((row: any) => ({
        id: String(row.content_platform_id),
        studio_id: String(row.std_id || stdId),
        name: row.platform_name,
        icon: row.icon || undefined,
        is_active: row.is_active !== false,
        color: row.color || undefined,
      }));
  },
};

export default ContentSalesService;
