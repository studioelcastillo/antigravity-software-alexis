import { supabase } from './supabaseClient';
import { getStoredUser } from './session';
import {
  PhotoRequest,
  PhotoRequestStatus,
  PhotoAsset,
  PhotoRating,
  PhotoCalendarEvent,
  PhotoDashboardKPI,
  PhotoRestrictionConfig,
  PhotoRestrictionStatus,
} from './types';

const DEFAULT_STUDIO_ID = 1;
const getStudioId = () => Number(getStoredUser()?.std_id || DEFAULT_STUDIO_ID);

const RESTRICTION_KEY = 'photo_restrictions';
const AVAILABILITY_KEY = 'photo_availability';

const buildHistory = (history: any[] | null | undefined) =>
  Array.isArray(history) ? history : [];

const mapAsset = (row: any): PhotoAsset => ({
  id: String(row.photo_asset_id),
  request_id: String(row.photo_req_id),
  drive_file_id: row.drive_file_id || '',
  drive_url: row.file_url || '',
  preview_url: row.preview_url || row.file_url || '',
  type: row.asset_type === 'VIDEO' ? 'VIDEO' : 'PHOTO',
  created_at: row.created_at || new Date().toISOString(),
});

const PhotoService = {
  async getRequests(filters: { studioId: string; role?: string; userId?: number }) {
    const stdId = Number(filters?.studioId || getStudioId());
    let query = supabase.from('photo_requests').select('*').eq('std_id', stdId);
    if (filters?.role === 'MODELO' && filters?.userId) {
      query = query.eq('requester_id', filters.userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Photo requests error', error);
      return [] as PhotoRequest[];
    }

    const ids = (data || []).map((row: any) => row.photo_req_id).filter(Boolean);
    const { data: assetsRows } = ids.length
      ? await supabase.from('photo_assets').select('*').in('photo_req_id', ids)
      : { data: [] };

    const assetsByReq = new Map<number, PhotoAsset[]>();
    (assetsRows || []).forEach((row: any) => {
      const list = assetsByReq.get(row.photo_req_id) || [];
      list.push(mapAsset(row));
      assetsByReq.set(row.photo_req_id, list);
    });

    return (data || []).map((row: any) => ({
      id: String(row.photo_req_id),
      studio_id: String(row.std_id || stdId),
      requester_id: row.requester_id,
      requester_name: row.requester_name || 'Solicitante',
      type: row.photo_type,
      objective: row.objective || '',
      location: row.location || '',
      proposed_date: row.proposed_date,
      proposed_time: row.proposed_time,
      duration_minutes: row.duration_minutes || 60,
      confirmed_date: row.confirmed_date || undefined,
      style_references: row.style_references || undefined,
      requires_makeup: row.requires_makeup === true,
      makeup_artist_id: row.makeup_artist_id || undefined,
      makeup_artist_name: row.makeup_artist_name || undefined,
      photographer_id: row.photographer_id || undefined,
      status: row.status || 'SENT',
      priority: row.priority || 'NORMAL',
      assets: assetsByReq.get(row.photo_req_id) || [],
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || row.created_at || new Date().toISOString(),
      history_log: buildHistory(row.history_log),
    }));
  },

  async createRequest(request: Partial<PhotoRequest>) {
    const payload: any = {
      std_id: Number(request.studio_id || getStudioId()),
      requester_id: request.requester_id,
      requester_name: request.requester_name,
      photo_type: request.type || 'FOTO',
      objective: request.objective || 'CONTENIDO',
      location: request.location || '',
      proposed_date: request.proposed_date,
      proposed_time: request.proposed_time,
      duration_minutes: request.duration_minutes || 60,
      style_references: request.style_references || null,
      requires_makeup: request.requires_makeup === true,
      makeup_artist_id: request.makeup_artist_id || null,
      status: 'SENT',
      priority: request.priority || 'NORMAL',
      history_log: [
        {
          user: request.requester_name || 'Solicitante',
          action: 'Solicitud Creada',
          date: new Date().toISOString(),
        },
      ],
    };

    const { data } = await supabase
      .from('photo_requests')
      .insert([payload])
      .select('*')
      .single();

    return data
      ? {
          id: String(data.photo_req_id),
          studio_id: String(data.std_id || getStudioId()),
          requester_id: data.requester_id,
          requester_name: data.requester_name || 'Solicitante',
          type: data.photo_type,
          objective: data.objective || '',
          location: data.location || '',
          proposed_date: data.proposed_date,
          proposed_time: data.proposed_time,
          duration_minutes: data.duration_minutes || 60,
          confirmed_date: data.confirmed_date || undefined,
          style_references: data.style_references || undefined,
          requires_makeup: data.requires_makeup === true,
          makeup_artist_id: data.makeup_artist_id || undefined,
          makeup_artist_name: data.makeup_artist_name || undefined,
          photographer_id: data.photographer_id || undefined,
          status: data.status || 'SENT',
          priority: data.priority || 'NORMAL',
          assets: [],
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || data.created_at || new Date().toISOString(),
          history_log: buildHistory(data.history_log),
        }
      : (request as PhotoRequest);
  },

  async updateStatus(id: string, status: PhotoRequestStatus, user: string, notes?: string, rescheduleData?: { date: string; time: string }) {
    const { data: existing } = await supabase
      .from('photo_requests')
      .select('history_log, proposed_date, proposed_time, confirmed_date')
      .eq('photo_req_id', id)
      .maybeSingle();

    const history = buildHistory(existing?.history_log);
    history.push({
      user: user || 'Sistema',
      action: `Cambio estado a ${status}${notes ? ` (${notes})` : ''}`,
      date: new Date().toISOString(),
    });

    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
      history_log: history,
    };

    if (status === 'CONFIRMED' || status === 'ACCEPTED') {
      if (!existing?.confirmed_date) {
        const date = existing?.proposed_date;
        const time = existing?.proposed_time;
        if (date && time) updates.confirmed_date = `${date}T${time}:00`;
      }
    }

    if (status === 'RESCHEDULE_PROPOSED' && rescheduleData) {
      updates.proposed_date = rescheduleData.date;
      updates.proposed_time = rescheduleData.time;
    }

    await supabase.from('photo_requests').update(updates).eq('photo_req_id', id);
    return { success: true };
  },

  async uploadAsset(requestId: string, file: File) {
    const ext = file.name.split('.').pop();
    const path = `photo_assets/${requestId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('el-castillo').upload(path, file);

    if (error) {
      console.error('Photo upload error', error);
      throw error;
    }

    const { data: publicUrl } = supabase.storage.from('el-castillo').getPublicUrl(path);
    const fileUrl = publicUrl?.publicUrl || '';

    const payload: any = {
      photo_req_id: Number(requestId),
      asset_type: file.type.startsWith('video') ? 'VIDEO' : 'PHOTO',
      file_url: fileUrl,
      preview_url: fileUrl,
      drive_file_id: null,
    };

    const { data } = await supabase
      .from('photo_assets')
      .insert([payload])
      .select('*')
      .single();

    return data ? mapAsset(data) : null;
  },

  async getCalendarEvents(): Promise<PhotoCalendarEvent[]> {
    const { data, error } = await supabase
      .from('photo_calendar_events')
      .select('*')
      .order('start_at', { ascending: true });

    if (error) {
      console.error('Photo calendar error', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.photo_event_id),
      title: row.title,
      start: row.start_at,
      end: row.end_at,
      type: row.event_type === 'BLOCK' ? 'BLOCK' : 'SHOOT',
      status: row.event_status || undefined,
      resourceId: row.resource_id || undefined,
    }));
  },

  async blockSlot(block: Omit<PhotoCalendarEvent, 'id'>) {
    const payload: any = {
      std_id: getStudioId(),
      title: block.title,
      event_type: 'BLOCK',
      event_status: block.status || null,
      start_at: block.start,
      end_at: block.end,
      resource_id: block.resourceId || null,
    };

    const { data } = await supabase
      .from('photo_calendar_events')
      .insert([payload])
      .select('*')
      .single();

    return data
      ? {
          id: String(data.photo_event_id),
          title: data.title,
          start: data.start_at,
          end: data.end_at,
          type: 'BLOCK',
          status: data.event_status || undefined,
          resourceId: data.resource_id || undefined,
        }
      : null;
  },

  async removeBlock(id: string) {
    await supabase.from('photo_calendar_events').delete().eq('photo_event_id', id);
  },

  async submitRating(rating: Omit<PhotoRating, 'id' | 'created_at'>) {
    const payload: any = {
      photo_req_id: Number(rating.request_id),
      from_user_id: rating.from_user_id,
      to_user_id: rating.to_user_id,
      role_target: rating.role_target,
      score: rating.score,
      aspects: rating.aspects || {},
      comment: rating.comment || null,
    };

    const { data } = await supabase
      .from('photo_ratings')
      .insert([payload])
      .select('*')
      .single();

    return data
      ? {
          id: String(data.photo_rating_id),
          request_id: String(data.photo_req_id),
          from_user_id: data.from_user_id,
          to_user_id: data.to_user_id,
          role_target: data.role_target,
          score: data.score,
          aspects: data.aspects || {},
          comment: data.comment || undefined,
          created_at: data.created_at || new Date().toISOString(),
        }
      : null;
  },

  async getDashboardStats(): Promise<PhotoDashboardKPI> {
    const { data: requests } = await supabase
      .from('photo_requests')
      .select('photo_req_id, status, created_at, confirmed_date, updated_at');

    const { data: ratings } = await supabase
      .from('photo_ratings')
      .select('score, role_target');

    const total_requests = (requests || []).length;
    const delivered = (requests || []).filter((r: any) => r.status === 'DELIVERED').length;

    const confirmationTimes = (requests || [])
      .filter((r: any) => r.confirmed_date && r.created_at)
      .map((r: any) => (new Date(r.confirmed_date).getTime() - new Date(r.created_at).getTime()) / 3600000);

    const deliveryTimes = (requests || [])
      .filter((r: any) => r.updated_at && r.created_at && r.status === 'DELIVERED')
      .map((r: any) => (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 3600000);

    const avg_confirmation_time_hours =
      confirmationTimes.length ? confirmationTimes.reduce((a, b) => a + b, 0) / confirmationTimes.length : 0;
    const avg_delivery_time_hours =
      deliveryTimes.length ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length : 0;

    const ratingPhotographer = (ratings || []).filter((r: any) => r.role_target === 'PHOTOGRAPHER');
    const ratingMakeup = (ratings || []).filter((r: any) => r.role_target === 'MAKEUP');

    const rating_photographer_avg = ratingPhotographer.length
      ? ratingPhotographer.reduce((acc: number, r: any) => acc + Number(r.score), 0) / ratingPhotographer.length
      : 0;
    const rating_makeup_avg = ratingMakeup.length
      ? ratingMakeup.reduce((acc: number, r: any) => acc + Number(r.score), 0) / ratingMakeup.length
      : 0;

    const status_distribution = (requests || []).reduce((acc: any, r: any) => {
      const key = r.status || 'PENDIENTE';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      total_requests,
      avg_confirmation_time_hours,
      avg_delivery_time_hours,
      rating_photographer_avg,
      rating_makeup_avg,
      reschedule_rate: 0,
      status_distribution: Object.entries(status_distribution).map(([name, value]) => ({ name, value: Number(value) })),
      top_photographers: [],
    };
  },

  async getAvailability() {
    const { data } = await supabase
      .from('settings')
      .select('set_value')
      .eq('set_key', AVAILABILITY_KEY)
      .maybeSingle();

    if (data?.set_value) {
      try {
        return JSON.parse(data.set_value);
      } catch {
        return { workingDays: [], startTime: '', endTime: '', blockedDates: [] };
      }
    }

    return { workingDays: [], startTime: '', endTime: '', blockedDates: [] };
  },

  async updateAvailability(data: any) {
    await supabase
      .from('settings')
      .upsert(
        [
          {
            set_key: AVAILABILITY_KEY,
            set_value: JSON.stringify(data),
            set_description: 'Photo availability',
          },
        ],
        { onConflict: 'set_key' }
      );

    return data;
  },

  async getRestrictionConfig(): Promise<PhotoRestrictionConfig> {
    const { data } = await supabase
      .from('settings')
      .select('set_value')
      .eq('set_key', RESTRICTION_KEY)
      .maybeSingle();

    if (data?.set_value) {
      try {
        return JSON.parse(data.set_value) as PhotoRestrictionConfig;
      } catch {
        return { restrictionDays: 45, unlockedUsers: [] };
      }
    }

    return { restrictionDays: 45, unlockedUsers: [] };
  },

  async updateRestrictionConfig(config: Partial<PhotoRestrictionConfig>) {
    const current = await PhotoService.getRestrictionConfig();
    const updated = { ...current, ...config };

    await supabase
      .from('settings')
      .upsert(
        [
          {
            set_key: RESTRICTION_KEY,
            set_value: JSON.stringify(updated),
            set_description: 'Photo restriction config',
          },
        ],
        { onConflict: 'set_key' }
      );

    return updated;
  },

  async checkUserRestriction(userId: number): Promise<PhotoRestrictionStatus> {
    const config = await PhotoService.getRestrictionConfig();
    if (config.unlockedUsers.includes(userId)) {
      return { isRestricted: false };
    }

    const { data } = await supabase
      .from('photo_requests')
      .select('created_at, status')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return { isRestricted: false };
    }

    const lastDate = new Date(data.created_at);
    const now = new Date();
    const diffDays = Math.floor(Math.abs(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < config.restrictionDays) {
      const unlockDate = new Date(lastDate);
      unlockDate.setDate(lastDate.getDate() + config.restrictionDays);
      return {
        isRestricted: true,
        lastRequestDate: lastDate.toISOString(),
        unlockDate: unlockDate.toISOString(),
        daysRemaining: config.restrictionDays - diffDays,
      };
    }

    return { isRestricted: false };
  },

  async toggleUserUnlock(userId: number) {
    const config = await PhotoService.getRestrictionConfig();
    if (config.unlockedUsers.includes(userId)) {
      config.unlockedUsers = config.unlockedUsers.filter((id) => id !== userId);
    } else {
      config.unlockedUsers.push(userId);
    }

    await PhotoService.updateRestrictionConfig(config);
    return config;
  },
};

export default PhotoService;
