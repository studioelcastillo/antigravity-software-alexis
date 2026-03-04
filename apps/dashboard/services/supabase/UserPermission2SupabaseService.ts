import { supabase } from "../../supabaseClient";
import { applyQueryFilters, normalizeQueryString } from "./queryUtils";

const mapUserPermission = (row: any) => ({
  ...row,
  user2: row.users || null,
});

const UserPermission2SupabaseService = {
  async getUsersPermissions2(params: { query?: string; search?: string } = {}) {
    let query = supabase
      .from("users_permissions2")
      .select("*, users(user_id, user_name, user_surname)");

    if (params.query) {
      const queryParams = normalizeQueryString(params.query);
      query = applyQueryFilters(query, queryParams);
    }

    if (params.search) {
      const term = params.search.trim();
      if (term) {
        query = query.or(
          [
            `userperm_feature.ilike.%${term}%`,
            `userperm_state.ilike.%${term}%`,
          ].join(",")
        );
      }
    }

    const { data, error } = await query;
    return { data: { data: (data || []).map(mapUserPermission) }, error };
  },

  async addUserPermission2(params: Record<string, any>) {
    const { data, error } = await supabase
      .from("users_permissions2")
      .insert([params])
      .select()
      .single();
    return { data: { data: data, status: error ? "error" : "success" }, error };
  },

  async getUserPermission2(params: { id: number }) {
    const { data, error } = await supabase
      .from("users_permissions2")
      .select("*, users(user_id, user_name, user_surname)")
      .eq("userperm_id", params.id)
      .single();
    return { data: { data: data ? [mapUserPermission(data)] : [] }, error };
  },

  async editUserPermission2(params: { id: number } & Record<string, any>) {
    const { id, ...updateData } = params;
    const { data, error } = await supabase
      .from("users_permissions2")
      .update(updateData)
      .eq("userperm_id", id)
      .select()
      .single();
    return { data: { data: data, status: error ? "error" : "success" }, error };
  },

  async delUserPermission2(params: { id: number }) {
    const { error } = await supabase
      .from("users_permissions2")
      .delete()
      .eq("userperm_id", params.id);
    return { data: { status: error ? "error" : "success" }, error };
  },
};

export default UserPermission2SupabaseService;
