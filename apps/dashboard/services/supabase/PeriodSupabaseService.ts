import { supabase } from "../../supabaseClient";

const attachUsers = async (rows: any[]) => {
  const periods = rows || [];
  const userIds = [...new Set(periods.map((row) => row.user_id).filter(Boolean))];

  if (userIds.length === 0) {
    return periods.map((row) => ({ ...row, user: null }));
  }

  const { data: usersData } = await supabase
    .from("users")
    .select("user_id, user_name, user_surname")
    .in("user_id", userIds);

  const usersById = new Map(
    (usersData || []).map((user) => [user.user_id, user])
  );

  return periods.map((row) => ({
    ...row,
    user: usersById.get(row.user_id) || null,
  }));
};

const PeriodSupabaseService = {
  async getPeriods(params: { searchterm?: string } = {}) {
    let query = supabase
      .from("periods")
      .select("*")
      .order("period_start_date", { ascending: false });

    if (params.searchterm) {
      // add filters if needed
    }

    const { data, error } = await query;
    const mapped = await attachUsers(data || []);
    return { data: { data: mapped }, error };
  },

  async getPeriodsLimited(params: { limit?: number } = {}) {
    const limit = Number(params.limit || 12);
    let query = supabase
      .from("periods")
      .select("*")
      .order("period_start_date", { ascending: false });

    if (!Number.isNaN(limit) && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    const mapped = await attachUsers(data || []);
    return { data: { data: mapped }, error };
  },

  async getPeriodsClosed() {
    const { data, error } = await supabase
      .from("periods")
      .select("*")
      .eq("period_state", "CERRADO")
      .order("period_start_date", { ascending: false });

    const mapped = await attachUsers(data || []);
    return { data: { data: mapped }, error };
  },

  async getPeriod(params: { id: number }) {
    const { data, error } = await supabase
      .from("periods")
      .select("*")
      .eq("period_id", params.id)
      .single();

    return { data: { data: data ? [data] : [] }, error };
  },

  async addPeriod(params: Record<string, any>) {
    const { data, error } = await supabase
      .from("periods")
      .insert([params])
      .select()
      .single();

    return { data: { data: data, status: error ? "Error" : "Success" }, error };
  },

  async editPeriod(params: { id: number } & Record<string, any>) {
    const { id, ...updateData } = params;
    const { data, error } = await supabase
      .from("periods")
      .update(updateData)
      .eq("period_id", id)
      .select()
      .single();

    return { data: { data: data, status: error ? "Error" : "Success" }, error };
  },

  async delPeriod(params: { id: number }) {
    const { error } = await supabase
      .from("periods")
      .delete()
      .eq("period_id", params.id);

    return { data: { status: error ? "Error" : "Success" }, error };
  },

  async getActive() {
    const { data, error } = await supabase
      .from("periods")
      .select("*")
      .eq("period_state", "ABIERTO")
      .order("period_start_date", { ascending: false });

    const mapped = await attachUsers(data || []);
    return { data: { data: mapped }, error };
  },

  async closePeriod(params: { id: number; user_id?: number; period_observation?: string }) {
    const payload: Record<string, any> = {
      period_state: "CERRADO",
      period_observation: params.period_observation || "",
      period_closed_date: new Date().toISOString(),
    };

    if (params.user_id) {
      payload.user_id = params.user_id;
    }

    const { data, error } = await supabase
      .from("periods")
      .update(payload)
      .eq("period_id", params.id)
      .select()
      .single();

    return { data: { data: data, status: error ? "Error" : "Success" }, error };
  },

  async openPeriod(params: { id: number; user_id?: number }) {
    const payload: Record<string, any> = {
      period_state: "ABIERTO",
      period_observation: "",
      period_closed_date: null,
    };

    if (params.user_id) {
      payload.user_id = params.user_id;
    }

    const { data, error } = await supabase
      .from("periods")
      .update(payload)
      .eq("period_id", params.id)
      .select()
      .single();

    return { data: { data: data, status: error ? "Error" : "Success" }, error };
  },
};

export default PeriodSupabaseService;
