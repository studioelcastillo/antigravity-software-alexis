import { supabase } from "../../supabaseClient";
import { applyQueryFilters, normalizeQueryString } from "./queryUtils";

const CategorySupabaseService = {
  async getCategories(params: { searchterm?: string; query?: string | URLSearchParams }) {
    let query = supabase.from("categories").select("*");

    if (params.searchterm) {
      query = query.ilike("cate_name", `%${params.searchterm}%`);
    }

    if (params.query) {
      const queryParams = normalizeQueryString(params.query);
      query = applyQueryFilters(query, queryParams);
    }

    const { data, error } = await query;
    return { data: { data: data || [] }, error };
  },

  async getCategory(params: { id: number }) {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("cate_id", params.id)
      .single();

    return { data: { data: data ? [data] : [] }, error };
  },

  async addCategory(params: { cate_name: string }) {
    const { data, error } = await supabase
      .from("categories")
      .insert([params])
      .select()
      .single();

    return { data: { data, status: error ? "Error" : "Success" }, error };
  },

  async editCategory(params: { id: number; cate_name: string }) {
    const { id, ...updateData } = params;
    const { data, error } = await supabase
      .from("categories")
      .update(updateData)
      .eq("cate_id", id)
      .select()
      .single();

    return { data: { data, status: error ? "Error" : "Success" }, error };
  },

  async delCategory(params: { id: number }) {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("cate_id", params.id);

    return { data: { status: error ? "Error" : "Success" }, error };
  },
};

export default CategorySupabaseService;
