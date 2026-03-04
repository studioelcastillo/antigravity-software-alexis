import { supabase } from "../../supabaseClient";
import { applyQueryFilters, normalizeQueryString } from "./queryUtils";

const mapProfile = (row: any) => ({
  ...row,
  profile: row.profiles || null,
});

const User2SupabaseService = {
  async getUsers2(params: { query?: string; search?: string } = {}) {
    let query = supabase.from("users").select("*, profiles(prof_id, prof_name)");

    if (params.query) {
      const queryParams = normalizeQueryString(params.query);
      query = applyQueryFilters(query, queryParams);
    }

    if (params.search) {
      const term = params.search.trim();
      if (term) {
        query = query.or(
          [
            `user_name.ilike.%${term}%`,
            `user_surname.ilike.%${term}%`,
            `user_email.ilike.%${term}%`,
            `user_identification.ilike.%${term}%`,
          ].join(",")
        );
      }
    }

    const { data, error } = await query;
    return { data: { data: (data || []).map(mapProfile) }, error };
  },

  async addUser2(params: Record<string, any>) {
    const { data, error } = await supabase
      .from("users")
      .insert([params])
      .select()
      .single();
    return { data: { data: data, status: error ? "error" : "success" }, error };
  },

  async getUser2(params: { id: number }) {
    const { data, error } = await supabase
      .from("users")
      .select("*, profiles(prof_id, prof_name)")
      .eq("user_id", params.id)
      .single();
    return { data: { data: data ? [mapProfile(data)] : [] }, error };
  },

  async editUser2(params: { id: number } & Record<string, any>) {
    const { id, ...updateData } = params;
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("user_id", id)
      .select()
      .single();
    return { data: { data: data, status: error ? "error" : "success" }, error };
  },

  async delUser2(params: { id: number }) {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", params.id);
    return { data: { status: error ? "error" : "success" }, error };
  },

  async activateUser2(params: { id: number }) {
    const { data, error } = await supabase
      .from("users")
      .update({ user_active: true })
      .eq("user_id", params.id)
      .select()
      .single();
    return { data: { data: data, status: error ? "error" : "success" }, error };
  },

  async inactivateUser2(params: { id: number }) {
    const { data, error } = await supabase
      .from("users")
      .update({ user_active: false })
      .eq("user_id", params.id)
      .select()
      .single();
    return { data: { data: data, status: error ? "error" : "success" }, error };
  },
};

export default User2SupabaseService;
