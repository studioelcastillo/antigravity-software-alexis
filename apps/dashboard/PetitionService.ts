import { supabase } from './supabaseClient';
import { normalizeQueryString } from './supabase/queryUtils';

export type PetitionStateValue = 'EN PROCESO' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
export type PetitionTypeValue = 'CREACION DE CUENTA' | 'REPORTE' | 'ACCOUNT_CREATION';

export interface PetitionDatatableParams {
  start: number;
  length: number;
  sortBy?: string;
  dir?: 'ASC' | 'DESC';
  filter?: string;
  states?: PetitionStateValue[];
  studios?: Array<number | string>;
  userId?: number | string;
  columns?: string[];
}

export interface CreatePetitionPayload {
  ptn_type: PetitionTypeValue;
  ptn_nick: string;
  ptn_password: string;
  ptn_page: string[];
  user_id: number | string;
  stdmod_id?: number | string;
  ptnstate_observation?: string;
}

export interface CreatePetitionStatePayload {
  ptn_id: number | string;
  ptnstate_state: PetitionStateValue;
  ptnstate_observation?: string;
  ptn_nick_final?: string;
  ptn_mail?: string;
  ptn_password_final?: string;
  ptn_payment_pseudonym?: string;
  ptn_linkacc?: string;
}

const DEFAULT_COLUMNS = [
  'petitions.ptn_consecutive',
  'petitions.ptn_type',
  'petitions.ptn_nick_final',
  'petitions.ptn_page',
  'petitions.created_at',
  'petitions.updated_at',
];

const PetitionService = {
  async getPetitions(params: PetitionDatatableParams | string) {
    let queryParams: URLSearchParams;

    if (typeof params === 'string') {
      queryParams = normalizeQueryString(params);
    } else {
      queryParams = new URLSearchParams();
      queryParams.append('start', String(params.start));
      queryParams.append('length', String(params.length));
      queryParams.append('sortby', params.sortBy || 'petitions.updated_at');
      queryParams.append('dir', params.dir || 'DESC');
      queryParams.append('filter', params.filter || '');
      queryParams.append(
        'columns',
        (params.columns && params.columns.length > 0 ? params.columns : DEFAULT_COLUMNS).join(',')
      );

      if (params.studios && params.studios.length > 0) {
        queryParams.append('studios', params.studios.join(','));
      }
      if (params.userId !== undefined && params.userId !== null) {
        queryParams.append('user_id', String(params.userId));
      }
      if (params.states && params.states.length > 0) {
        queryParams.append('states', params.states.join(','));
      }
    }

    let query = supabase
      .from('petitions')
      .select('*, users!user_id(user_name, user_surname), studios_models(stdmod_id, studios(std_name))', {
        count: 'exact',
      });

    const filter = (queryParams.get('filter') || '').trim();
    const states = (queryParams.get('states') || '').split(',').filter(Boolean);
    const studios = (queryParams.get('studios') || '').split(',').filter(Boolean);
    const userId = queryParams.get('user_id');
    const sortByRaw = queryParams.get('sortby') || 'petitions.updated_at';
    const dir = (queryParams.get('dir') || 'DESC').toUpperCase();
    const start = Number(queryParams.get('start') || 0);
    const length = Number(queryParams.get('length') || 0);

    if (states.length > 0) {
      query = query.in('ptn_state', states);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (studios.length > 0) {
      const ids = studios.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
      if (ids.length > 0) {
        const { data: stdmods } = await supabase
          .from('studios_models')
          .select('stdmod_id')
          .in('std_id', ids);
        const stdmodIds = (stdmods || []).map((row) => row.stdmod_id).filter(Boolean);
        if (stdmodIds.length > 0) {
          query = query.in('stdmod_id', stdmodIds);
        }
      }
    }

    if (filter) {
      query = query.or(
        `ptn_type.ilike.%${filter}%,ptn_nick.ilike.%${filter}%,ptn_nick_final.ilike.%${filter}%,ptn_page.ilike.%${filter}%,ptn_consecutive.ilike.%${filter}%`
      );
    }

    const sortBy = sortByRaw.includes('.') ? sortByRaw.split('.').pop() : sortByRaw;
    query = query.order(sortBy || 'updated_at', { ascending: dir !== 'DESC' });

    if (length > 0) {
      query = query.range(start, start + length - 1);
    }

    const { data, error, count } = await query;
    return {
      data: {
        data: data || [],
        recordsTotal: count || 0,
        recordsFiltered: count || 0,
      },
      error,
    };
  },

  async getPetition(id: number | string) {
    const { data, error } = await supabase
      .from('petitions')
      .select('*, users!user_id(user_name, user_surname), studios_models(stdmod_id, studios(std_name))')
      .eq('ptn_id', id)
      .single();

    return { data: { data: data ? [data] : [] }, error };
  },

  async addPetition(payload: CreatePetitionPayload) {
    const { data, error } = await supabase
      .from('petitions')
      .insert([
        {
          ...payload,
          ptn_page: Array.isArray(payload.ptn_page) ? payload.ptn_page.join(',') : payload.ptn_page,
        },
      ])
      .select()
      .single();

    return { data: { data, status: error ? 'Error' : 'Success' }, error };
  },

  async addPetitionState(payload: CreatePetitionStatePayload) {
    const { ptn_id, ptnstate_state, ...rest } = payload;
    const { data, error } = await supabase
      .from('petitions')
      .update({
        ptn_state: ptnstate_state,
        ptn_observation: rest.ptnstate_observation,
        ptn_nick_final: rest.ptn_nick_final,
        ptn_mail: rest.ptn_mail,
        ptn_password_final: rest.ptn_password_final,
        ptn_payment_pseudonym: rest.ptn_payment_pseudonym,
        ptn_linkacc: rest.ptn_linkacc,
      })
      .eq('ptn_id', ptn_id)
      .select()
      .single();

    return { data: { data, status: error ? 'Error' : 'Success' }, error };
  },

  async deletePetition(id: number | string) {
    const { error } = await supabase.from('petitions').delete().eq('ptn_id', id);
    return { data: { status: error ? 'Error' : 'Success' }, error };
  },

  async getAccountCreations(userId: number | string) {
    const { data, error } = await supabase
      .from('petitions')
      .select('*, users!user_id(user_name, user_surname)')
      .eq('user_id', userId)
      .eq('ptn_type', 'ACCOUNT_CREATION');

    return { data: { data: data || [] }, error };
  },

  async checkModelStudio(userId: number | string) {
    const { data, error } = await supabase
      .from('studios_models')
      .select('stdmod_id')
      .eq('user_id_model', userId);

    if (error) {
      return { data: { status: 'fail', data: [] }, error };
    }

    return { data: { status: (data || []).length > 0 ? 'success' : 'fail', data: data || [] } };
  },

  async getStudiosModelsByModel(userId: number | string) {
    const { data, error } = await supabase
      .from('studios_models')
      .select('*, studios(std_name)')
      .eq('user_id_model', userId);

    return { data: { data: data || [] }, error };
  },

  async getPreviousObservations(search: string) {
    const { data, error } = await supabase
      .from('petitions')
      .select('ptn_observation')
      .ilike('ptn_observation', `%${search}%`)
      .limit(10);

    return { data: { data: data || [] }, error };
  },
};

export default PetitionService;
