import { supabase } from "../../supabaseClient";
import { applyQueryFilters } from "./queryUtils";

const TransactionTypeSupabaseService = {
  async getTransactionsTypes(params: { query?: string | URLSearchParams }) {
    let query = supabase.from("transactions_types").select("*");
    if (params.query) {
      query = applyQueryFilters(query, params.query);
    }
    const { data, error } = await query;
    return { data: { data: data || [] }, error };
  },

  async addTransactionType(params: {
    transtype_group: string;
    transtype_name: string;
    transtype_behavior: string;
    transtype_rtefte: boolean;
    transtype_value: number | string;
  }) {
    const { data, error } = await supabase
      .from("transactions_types")
      .insert([params])
      .select()
      .single();
    return { data: { data, status: error ? "Error" : "Success" }, error };
  },

  async getTransactionType(params: { id: number }) {
    const { data, error } = await supabase
      .from("transactions_types")
      .select("*")
      .eq("transtype_id", params.id)
      .single();
    return { data: { data: data ? [data] : [] }, error };
  },

  async editTransactionType(params: {
    id: number;
    transtype_group: string;
    transtype_name: string;
    transtype_behavior: string;
    transtype_rtefte: boolean;
    transtype_value: number | string;
  }) {
    const { id, ...updateData } = params;
    const { data, error } = await supabase
      .from("transactions_types")
      .update(updateData)
      .eq("transtype_id", id)
      .select()
      .single();
    return { data: { data, status: error ? "Error" : "Success" }, error };
  },

  async delTransactionType(params: { id: number }) {
    const { error } = await supabase
      .from("transactions_types")
      .delete()
      .eq("transtype_id", params.id);
    return { data: { status: error ? "Error" : "Success" }, error };
  },
};

export default TransactionTypeSupabaseService;
