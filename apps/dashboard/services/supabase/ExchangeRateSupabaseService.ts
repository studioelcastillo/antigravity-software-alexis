import { supabase } from "../../supabaseClient";
import { applyQueryFilters } from "./queryUtils";

const ExchangeRateSupabaseService = {
  async getExchangesRates(params: { query?: string | URLSearchParams }) {
    let query = supabase.from("exchange_rates").select("*");

    if (params.query) {
      query = applyQueryFilters(query, params.query);
    }

    const { data, error } = await query;
    return { data: { data: data || [] }, error };
  },

  async getExchangeRate(params: { id: number }) {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("exrate_id", params.id)
      .single();

    return { data: { data: data ? [data] : [] }, error };
  },

  async addExchangeRate(params: {
    exrate_date: string;
    exrate_from: string;
    exrate_to: string;
    exrate_rate: number | string;
    exrate_type: string;
  }) {
    const { data, error } = await supabase
      .from("exchange_rates")
      .insert([params])
      .select()
      .single();

    return { data: { data, status: error ? "Error" : "Success" }, error };
  },

  async editExchangeRate(params: {
    id: number;
    exrate_date: string;
    exrate_from: string;
    exrate_to: string;
    exrate_rate: number | string;
    exrate_type: string;
  }) {
    const { id, ...updateData } = params;
    const { data, error } = await supabase
      .from("exchange_rates")
      .update(updateData)
      .eq("exrate_id", id)
      .select()
      .single();

    return { data: { data, status: error ? "Error" : "Success" }, error };
  },

  async delExchangeRate(params: { id: number }) {
    const { error } = await supabase
      .from("exchange_rates")
      .delete()
      .eq("exrate_id", params.id);

    return { data: { status: error ? "Error" : "Success" }, error };
  },

  async getLatest() {
    const { data, error } = await supabase
      .from("exchange_rates")
      .select("*")
      .order("exrate_date", { ascending: false })
      .limit(1)
      .single();
    return { data: { data: data ? [data] : [] }, error };
  },
};

export default ExchangeRateSupabaseService;
