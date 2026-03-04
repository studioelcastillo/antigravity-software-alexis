import { supabase } from "../../supabaseClient";
import { normalizeQueryString } from "./queryUtils";

const toNumber = (value: any) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const parseArrayParam = (params: URLSearchParams, key: string) => {
  const values = params.getAll(key);
  if (values.length) return values;
  const single = params.get(key);
  return single ? single.split(",") : [];
};

const parseOrderBy = (value?: string | null) => {
  if (!value) return null;
  const [first] = value.split(",");
  if (!first) return null;
  const [field, direction] = first.trim().split(" ");
  return { field, direction: (direction || "ASC").toUpperCase() };
};

const buildOwnerMap = async (ownerIds: number[]) => {
  if (!ownerIds.length) return new Map<number, string>();
  const { data } = await supabase
    .from("users")
    .select("user_id, user_name, user_surname")
    .in("user_id", ownerIds);
  const map = new Map<number, string>();
  (data || []).forEach((row: any) => {
    map.set(
      row.user_id,
      `${row.user_name || ""} ${row.user_surname || ""}`.trim()
    );
  });
  return map;
};

const addSummaryIncome = (
  summaryMap: Map<string, any>,
  sourceKey: string,
  appKey: string,
  totals: { sum_earnings_usd: number; sum_earnings_eur: number; sum_earnings_cop: number }
) => {
  if (!summaryMap.has(sourceKey)) {
    summaryMap.set(sourceKey, {
      modstr_source: sourceKey,
      sum_earnings_usd: 0,
      sum_earnings_eur: 0,
      sum_earnings_cop: 0,
      incomes: new Map<string, any>(),
    });
  }
  const source = summaryMap.get(sourceKey);
  source.sum_earnings_usd += totals.sum_earnings_usd;
  source.sum_earnings_eur += totals.sum_earnings_eur;
  source.sum_earnings_cop += totals.sum_earnings_cop;

  if (!source.incomes.has(appKey)) {
    source.incomes.set(appKey, {
      modacc_app: appKey,
      sum_earnings_usd: 0,
      sum_earnings_eur: 0,
      sum_earnings_cop: 0,
    });
  }
  const income = source.incomes.get(appKey);
  income.sum_earnings_usd += totals.sum_earnings_usd;
  income.sum_earnings_eur += totals.sum_earnings_eur;
  income.sum_earnings_cop += totals.sum_earnings_cop;
};

const finalizeSummary = (summaryMap: Map<string, any>) =>
  Array.from(summaryMap.values()).map((source) => ({
    ...source,
    incomes: Array.from(source.incomes.values()),
  }));

const aggregateStreamsByModel = async (streams: any[]) => {
  const ownerIds = [
    ...new Set((streams || []).map((row) => row.studios?.user_id_owner).filter(Boolean)),
  ];
  const ownerMap = await buildOwnerMap(ownerIds);

  const groups = new Map<string, any>();
  const summaryMap = new Map<string, any>();

  (streams || []).forEach((row: any) => {
    const key = `${row.user_id || 0}-${row.std_id || 0}`;
    if (!groups.has(key)) {
      groups.set(key, {
        user_id: row.user_id,
        user_name: `${row.users?.user_name || ""} ${row.users?.user_surname || ""}`.trim(),
        std_id: row.std_id,
        std_name: row.studios?.std_name || null,
        owner_name: ownerMap.get(row.studios?.user_id_owner) || null,
        modacc_app: new Set<string>(),
        modacc_username: new Set<string>(),
        sum_earnings_usd: 0,
        sum_earnings_eur: 0,
        sum_earnings_cop: 0,
        sum_earnings_tokens: 0,
        sum_earnings_time: 0,
        sum_earnings_rtefte: 0,
        sum_earnings_discounts: 0,
        sum_earnings_others: 0,
        incomes: new Map<string, any>(),
        discounts: [],
        others: [],
      });
    }

    const group = groups.get(key);
    const totals = {
      sum_earnings_usd: toNumber(row.modstr_earnings_usd),
      sum_earnings_eur: toNumber(row.modstr_earnings_eur),
      sum_earnings_cop: toNumber(row.modstr_earnings_cop),
    };
    group.sum_earnings_usd += totals.sum_earnings_usd;
    group.sum_earnings_eur += totals.sum_earnings_eur;
    group.sum_earnings_cop += totals.sum_earnings_cop;
    group.sum_earnings_tokens += toNumber(row.modstr_earnings_tokens);
    group.sum_earnings_time += toNumber(row.modstr_time);
    group.sum_earnings_rtefte += toNumber(row.modstr_rtefte_model);

    if (row.models_accounts?.modacc_app) {
      group.modacc_app.add(row.models_accounts.modacc_app);
    }
    if (row.models_accounts?.modacc_username) {
      group.modacc_username.add(row.models_accounts.modacc_username);
    }

    const incomeKey = `${row.modacc_id || 0}-${row.modstr_period || ""}`;
    if (!group.incomes.has(incomeKey)) {
      group.incomes.set(incomeKey, {
        modacc_period: row.modstr_period || null,
        modacc_app: row.models_accounts?.modacc_app || null,
        modacc_username: row.models_accounts?.modacc_username || null,
        modstr_earnings_trm: 0,
        modstr_earnings_percent: 0,
        sum_earnings_tokens: 0,
        modstr_tokens_rate: 0,
        sum_time: 0,
        sum_earnings_usd: 0,
        sum_earnings_eur: 0,
        sum_earnings_cop: 0,
        _count: 0,
      });
    }
    const income = group.incomes.get(incomeKey);
    income.modstr_earnings_trm += toNumber(row.modstr_earnings_trm);
    income.modstr_earnings_percent += toNumber(row.modstr_earnings_percent);
    income.sum_earnings_tokens += toNumber(row.modstr_earnings_tokens);
    income.modstr_tokens_rate += toNumber(row.modstr_earnings_tokens_rate);
    income.sum_time += toNumber(row.modstr_time);
    income.sum_earnings_usd += totals.sum_earnings_usd;
    income.sum_earnings_eur += totals.sum_earnings_eur;
    income.sum_earnings_cop += totals.sum_earnings_cop;
    income._count += 1;

    const sourceKey = row.modstr_source || "SIN FUENTE";
    const appKey = row.models_accounts?.modacc_app || "SIN APP";
    addSummaryIncome(summaryMap, sourceKey, appKey, totals);
  });

  const dataset = Array.from(groups.values()).map((group) => {
    const incomes = Array.from(group.incomes.values()).map((income: any) => ({
      ...income,
      modstr_earnings_trm: income._count ? income.modstr_earnings_trm / income._count : 0,
      modstr_earnings_percent: income._count ? income.modstr_earnings_percent / income._count : 0,
      modstr_tokens_rate: income._count ? income.modstr_tokens_rate / income._count : 0,
    }));

    const sum_earnings_net =
      group.sum_earnings_cop - group.sum_earnings_discounts + group.sum_earnings_others;
    const sum_earnings_total = sum_earnings_net - group.sum_earnings_rtefte;

    return {
      ...group,
      modacc_app: group.modacc_app.size ? Array.from(group.modacc_app).join(";") : null,
      modacc_username: group.modacc_username.size
        ? Array.from(group.modacc_username).join(";")
        : null,
      sum_earnings_time: group.sum_earnings_time,
      sum_earnings_net,
      sum_earnings_total,
      incomes,
      discounts: group.discounts,
      others: group.others,
    };
  });

  return { dataset, summary: { bySource: finalizeSummary(summaryMap) } };
};

const aggregateStreamsByStudio = async (streams: any[]) => {
  const ownerIds = [
    ...new Set((streams || []).map((row) => row.studios?.user_id_owner).filter(Boolean)),
  ];
  const ownerMap = await buildOwnerMap(ownerIds);

  const groups = new Map<string, any>();
  const summaryMap = new Map<string, any>();

  (streams || []).forEach((row: any) => {
    const key = `${row.std_id || 0}`;
    if (!groups.has(key)) {
      groups.set(key, {
        std_id: row.std_id,
        std_name: row.studios?.std_name || null,
        owner_name: ownerMap.get(row.studios?.user_id_owner) || null,
        sum_earnings_usd: 0,
        sum_earnings_eur: 0,
        sum_earnings_cop: 0,
        sum_earnings_tokens: 0,
        sum_earnings_time: 0,
        sum_earnings_rtefte: 0,
        sum_earnings_discounts: 0,
        sum_earnings_others: 0,
        incomes: new Map<string, any>(),
        discounts: [],
        others: [],
      });
    }

    const group = groups.get(key);
    const totals = {
      sum_earnings_usd: toNumber(row.modstr_earnings_usd),
      sum_earnings_eur: toNumber(row.modstr_earnings_eur),
      sum_earnings_cop: toNumber(row.modstr_earnings_cop),
    };
    group.sum_earnings_usd += totals.sum_earnings_usd;
    group.sum_earnings_eur += totals.sum_earnings_eur;
    group.sum_earnings_cop += totals.sum_earnings_cop;
    group.sum_earnings_tokens += toNumber(row.modstr_earnings_tokens);
    group.sum_earnings_time += toNumber(row.modstr_time);
    group.sum_earnings_rtefte += toNumber(row.modstr_rtefte_studio);

    const incomeKey = `${row.modacc_id || 0}-${row.modstr_period || ""}`;
    if (!group.incomes.has(incomeKey)) {
      group.incomes.set(incomeKey, {
        modacc_period: row.modstr_period || null,
        modacc_app: row.models_accounts?.modacc_app || null,
        modstr_earnings_trm: 0,
        modstr_earnings_percent: 0,
        sum_earnings_tokens: 0,
        modstr_tokens_rate: 0,
        sum_time: 0,
        sum_earnings_usd: 0,
        sum_earnings_eur: 0,
        sum_earnings_cop: 0,
        _count: 0,
      });
    }
    const income = group.incomes.get(incomeKey);
    income.modstr_earnings_trm += toNumber(row.modstr_earnings_trm);
    income.modstr_earnings_percent += toNumber(row.modstr_earnings_percent);
    income.sum_earnings_tokens += toNumber(row.modstr_earnings_tokens);
    income.modstr_tokens_rate += toNumber(row.modstr_earnings_tokens_rate);
    income.sum_time += toNumber(row.modstr_time);
    income.sum_earnings_usd += totals.sum_earnings_usd;
    income.sum_earnings_eur += totals.sum_earnings_eur;
    income.sum_earnings_cop += totals.sum_earnings_cop;
    income._count += 1;

    const sourceKey = row.modstr_source || "SIN FUENTE";
    const appKey = row.models_accounts?.modacc_app || "SIN APP";
    addSummaryIncome(summaryMap, sourceKey, appKey, totals);
  });

  const dataset = Array.from(groups.values()).map((group) => {
    const incomes = Array.from(group.incomes.values()).map((income: any) => ({
      ...income,
      modstr_earnings_trm: income._count ? income.modstr_earnings_trm / income._count : 0,
      modstr_earnings_percent: income._count ? income.modstr_earnings_percent / income._count : 0,
      modstr_tokens_rate: income._count ? income.modstr_tokens_rate / income._count : 0,
    }));

    const sum_earnings_net =
      group.sum_earnings_cop - group.sum_earnings_discounts + group.sum_earnings_others;
    const sum_earnings_total = sum_earnings_net - group.sum_earnings_rtefte;

    return {
      ...group,
      sum_earnings_time: group.sum_earnings_time,
      sum_earnings_net,
      sum_earnings_total,
      incomes,
      discounts: group.discounts,
      others: group.others,
    };
  });

  return { dataset, summary: { bySource: finalizeSummary(summaryMap) } };
};

const LiquidationSupabaseService = {
  async getLiquidations(params: { period_id?: number; user_id?: number } = {}) {
    let query = supabase
      .from("liquidations")
      .select(
        "*, users(user_name, user_surname), periods(period_id, period_start_date, period_end_date)"
      );

    if (params.period_id) query = query.eq("period_id", params.period_id);
    if (params.user_id) query = query.eq("user_id", params.user_id);

    const { data, error } = await query;
    return { data: { data: data || [] }, error };
  },

  async addLiquidation(params: Record<string, any>) {
    const { data, error } = await supabase
      .from("liquidations")
      .insert([params])
      .select()
      .single();
    return { data: { data: data, status: error ? "error" : "success" }, error };
  },

  async getLiquidation(params: { id: number }) {
    const { data, error } = await supabase
      .from("liquidations")
      .select(
        "*, users(user_name, user_surname), periods(period_id, period_start_date, period_end_date)"
      )
      .eq("liq_id", params.id)
      .single();
    return { data: { data: data ? [data] : [] }, error };
  },

  async editLiquidation(params: { id: number } & Record<string, any>) {
    const { id, ...updateData } = params;
    const { data, error } = await supabase
      .from("liquidations")
      .update(updateData)
      .eq("liq_id", id)
      .select()
      .single();
    return { data: { data: data, status: error ? "error" : "success" }, error };
  },

  async delLiquidation(params: { id: number }) {
    const { error } = await supabase
      .from("liquidations")
      .delete()
      .eq("liq_id", params.id);
    return { data: { status: error ? "error" : "success" }, error };
  },

  async getModelsLiquidation(params: { query?: string }) {
    const queryParams = normalizeQueryString(params.query);
    const since = queryParams.get("report_since");
    const until = queryParams.get("report_until");
    const stdIds = parseArrayParam(queryParams, "std_ids[]")
      .map(Number)
      .filter((v) => !Number.isNaN(v));
    const apps = parseArrayParam(queryParams, "report_apps[]");
    const shiftIds = parseArrayParam(queryParams, "report_shifts[]")
      .map(Number)
      .filter((v) => !Number.isNaN(v));
    const destinyBanks = parseArrayParam(queryParams, "report_destiny_banks[]");
    const stdActive = queryParams.get("std_active");
    const orderBy = parseOrderBy(queryParams.get("orderBy"));

    let query = supabase
      .from("models_streams")
      .select(
        "modstr_id, modstr_earnings_usd, modstr_earnings_eur, modstr_earnings_cop, modstr_time, modstr_earnings_tokens, modstr_earnings_tokens_rate, modstr_earnings_trm, modstr_earnings_percent, modstr_rtefte_model, modstr_date, modstr_period, modstr_source, modacc_id, std_id, user_id, models_accounts(modacc_app, modacc_username), studios(std_id, std_name, user_id_owner, std_active), users(user_name, user_surname, user_bank_entity), studios_models(stdshift_id)"
      );

    if (since) query = query.gte("modstr_date", since);
    if (until) query = query.lte("modstr_date", until);
    if (stdIds.length) query = query.in("std_id", stdIds);

    const { data, error } = await query;
    if (error) return { data: { data: [], summary: { bySource: [] } }, error };

    let filtered = data || [];
    if (apps.length) {
      filtered = filtered.filter((row: any) => apps.includes(row.models_accounts?.modacc_app));
    }
    if (shiftIds.length) {
      filtered = filtered.filter((row: any) =>
        shiftIds.includes(row.studios_models?.stdshift_id)
      );
    }
    if (destinyBanks.length) {
      filtered = filtered.filter((row: any) =>
        destinyBanks.includes(row.users?.user_bank_entity)
      );
    }
    if (stdActive === "true" || stdActive === "false") {
      const boolActive = stdActive === "true";
      filtered = filtered.filter((row: any) => row.studios?.std_active === boolActive);
    }

    const { dataset, summary } = await aggregateStreamsByModel(filtered);

    if (orderBy?.field) {
      dataset.sort((a: any, b: any) => {
        const aVal = toNumber(a[orderBy.field]);
        const bVal = toNumber(b[orderBy.field]);
        if (orderBy.direction === "DESC") return bVal - aVal;
        return aVal - bVal;
      });
    }

    return { data: { data: dataset, summary }, error: null };
  },

  async getStudiosLiquidation(params: { query?: string }) {
    const queryParams = normalizeQueryString(params.query);
    const since = queryParams.get("report_since");
    const until = queryParams.get("report_until");
    const stdIds = parseArrayParam(queryParams, "std_ids[]")
      .map(Number)
      .filter((v) => !Number.isNaN(v));
    const stdId = queryParams.get("std_id");
    const apps = parseArrayParam(queryParams, "report_apps[]");
    const shiftIds = parseArrayParam(queryParams, "report_shifts[]")
      .map(Number)
      .filter((v) => !Number.isNaN(v));
    const destinyBanks = parseArrayParam(queryParams, "report_destiny_banks[]");
    const stdActive = queryParams.get("std_active");
    const stdAllyMasterPays = queryParams.get("std_ally_master_pays");
    const orderBy = parseOrderBy(queryParams.get("orderBy"));

    let query = supabase
      .from("models_streams")
      .select(
        "modstr_id, modstr_earnings_usd, modstr_earnings_eur, modstr_earnings_cop, modstr_time, modstr_earnings_tokens, modstr_earnings_tokens_rate, modstr_earnings_trm, modstr_earnings_percent, modstr_rtefte_studio, modstr_date, modstr_period, modstr_source, modacc_id, std_id, models_accounts(modacc_app), studios(std_id, std_name, user_id_owner, std_active, std_ally_master_pays, std_bank_entity), studios_models(stdshift_id)"
      );

    if (since) query = query.gte("modstr_date", since);
    if (until) query = query.lte("modstr_date", until);
    if (stdId) query = query.eq("std_id", stdId);
    if (stdIds.length) query = query.in("std_id", stdIds);

    const { data, error } = await query;
    if (error) return { data: { data: [], summary: { bySource: [] } }, error };

    let filtered = data || [];
    if (apps.length) {
      filtered = filtered.filter((row: any) => apps.includes(row.models_accounts?.modacc_app));
    }
    if (shiftIds.length) {
      filtered = filtered.filter((row: any) =>
        shiftIds.includes(row.studios_models?.stdshift_id)
      );
    }
    if (destinyBanks.length) {
      filtered = filtered.filter((row: any) =>
        destinyBanks.includes(row.studios?.std_bank_entity)
      );
    }
    if (stdActive === "true" || stdActive === "false") {
      const boolActive = stdActive === "true";
      filtered = filtered.filter((row: any) => row.studios?.std_active === boolActive);
    }
    if (stdAllyMasterPays === "true" || stdAllyMasterPays === "false") {
      const boolPays = stdAllyMasterPays === "true";
      filtered = filtered.filter(
        (row: any) => row.studios?.std_ally_master_pays === boolPays
      );
    }

    const { dataset, summary } = await aggregateStreamsByStudio(filtered);

    if (orderBy?.field) {
      dataset.sort((a: any, b: any) => {
        const aVal = toNumber(a[orderBy.field]);
        const bVal = toNumber(b[orderBy.field]);
        if (orderBy.direction === "DESC") return bVal - aVal;
        return aVal - bVal;
      });
    }

    return { data: { data: dataset, summary }, error: null };
  },
};

export default LiquidationSupabaseService;
