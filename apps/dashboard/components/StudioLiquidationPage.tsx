import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Filter, RefreshCw, TrendingUp, DollarSign } from "lucide-react";
import PeriodService from "../PeriodService";
import LiquidationService from "../LiquidationService";
import { supabase } from "../supabaseClient";
import AccountingArchive from "./AccountingArchive";

type PeriodOption = {
  value: number;
  label: string;
  since: string;
  until: string;
  state: string;
};

type Option = { label: string; value: string };

const BANK_OPTIONS: Option[] = [
  { label: "BANCO DE BOGOTA", value: "BANCO DE BOGOTA" },
  { label: "BANCO POPULAR", value: "BANCO POPULAR" },
  { label: "BANCOLOMBIA", value: "BANCOLOMBIA" },
  { label: "BANCO BBVA", value: "BANCO BBVA" },
  { label: "COLPATRIA", value: "COLPATRIA" },
  { label: "BANCO DE OCCIDENTE", value: "BANCO DE OCCIDENTE" },
  { label: "BANCO CAJA SOCIAL", value: "BANCO CAJA SOCIAL" },
  { label: "BANCO DAVIVIENDA", value: "BANCO DAVIVIENDA" },
  { label: "BANCO AV VILLAS", value: "BANCO AV VILLAS" },
  { label: "BANCOOMEVA", value: "BANCOOMEVA" },
  { label: "SCOTIABANK", value: "SCOTIABANK" },
];

const PLATFORM_OPTIONS: Option[] = [
  { label: "LIVEJASMIN", value: "LIVEJASMIN" },
  { label: "STREAMATE", value: "STREAMATE" },
  { label: "IMLIVE", value: "IMLIVE" },
  { label: "FLIRT4FREE", value: "FLIRT4FREE" },
  { label: "SKYPRIVATE", value: "SKYPRIVATE" },
  { label: "XLOVECAM", value: "XLOVECAM" },
  { label: "STREAMRAY", value: "STREAMRAY" },
  { label: "MYFREECAMS", value: "MYFREECAMS" },
  { label: "CHATURBATE", value: "CHATURBATE" },
  { label: "BONGACAMS", value: "BONGACAMS" },
  { label: "CAM4", value: "CAM4" },
  { label: "CAMSODA", value: "CAMSODA" },
  { label: "MYDIRTYHOBBY", value: "MYDIRTYHOBBY" },
  { label: "STRIPCHAT", value: "STRIPCHAT" },
  { label: "ONLYFANS", value: "ONLYFANS" },
  { label: "FANSLY", value: "FANSLY" },
  { label: "XHAMSTER", value: "XHAMSTER" },
  { label: "LOYALFANS", value: "LOYALFANS" },
  { label: "MANYVIDS", value: "MANYVIDS" },
];

const ORDER_OPTIONS: Option[] = [
  { label: "Ingresos (USD)", value: "sum_earnings_usd DESC" },
  { label: "Ingresos (COP)", value: "sum_earnings_cop DESC" },
  { label: "Horas", value: "sum_earnings_time DESC" },
  { label: "A pagar", value: "sum_earnings_total DESC" },
];

const MultiSelect: React.FC<{
  value: string[];
  options: Option[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(event.target.selectedOptions).map((opt) => opt.value);
    onChange(selected);
  };

  return (
    <select
      multiple
      value={value}
      onChange={handleChange}
      className="w-full min-h-[140px] bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/10"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(
    Math.round(value || 0)
  );

const StudioLiquidationPage: React.FC = () => {
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [studios, setStudios] = useState<Option[]>([]);
  const [shifts, setShifts] = useState<Option[]>([]);
  const [stdActive, setStdActive] = useState("true");
  const [stdMasterPays, setStdMasterPays] = useState("");
  const [stdIds, setStdIds] = useState<string[]>([]);
  const [destinyBanks, setDestinyBanks] = useState<string[]>([]);
  const [apps, setApps] = useState<string[]>([]);
  const [shiftIds, setShiftIds] = useState<string[]>([]);
  const [orderBy, setOrderBy] = useState(ORDER_OPTIONS[0].value);
  const [dataset, setDataset] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ bySource: any[] }>({ bySource: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPeriod = useMemo(
    () => periods.find((p) => String(p.value) === selectedPeriodId) || null,
    [periods, selectedPeriodId]
  );

  const totals = useMemo(() => {
    return dataset.reduce(
      (acc, row) => {
        acc.usd += row.sum_earnings_usd || 0;
        acc.eur += row.sum_earnings_eur || 0;
        acc.cop += row.sum_earnings_cop || 0;
        acc.net += row.sum_earnings_net || 0;
        acc.total += row.sum_earnings_total || 0;
        return acc;
      },
      { usd: 0, eur: 0, cop: 0, net: 0, total: 0 }
    );
  }, [dataset]);

  const loadFilters = useCallback(async () => {
    try {
      const [periodRes, studiosRes, shiftsRes] = await Promise.all([
        PeriodService.getPeriodsLimited({ limit: 12 }),
        supabase.from("studios").select("std_id, std_name, std_active"),
        supabase.from("studios_shifts").select("stdshift_id, stdshift_name"),
      ]);

      const periodData = periodRes.data?.data || [];
      const periodOptions = periodData.map((row: any) => ({
        value: row.period_id,
        label: `Periodo ${row.period_start_date} - ${row.period_end_date}`,
        since: row.period_start_date,
        until: row.period_end_date,
        state: row.period_state,
      }));
      setPeriods(periodOptions);
      if (!selectedPeriodId && periodOptions.length) {
        setSelectedPeriodId(String(periodOptions[0].value));
      }

      const studiosOptions = (studiosRes.data || []).map((row: any) => ({
        label: row.std_name,
        value: String(row.std_id),
      }));
      setStudios(studiosOptions);

      const shiftOptions = (shiftsRes.data || []).map((row: any) => ({
        label: row.stdshift_name,
        value: String(row.stdshift_id),
      }));
      setShifts(shiftOptions);
    } catch (err) {
      console.error("Error cargando filtros", err);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  const loadLiquidation = async () => {
    if (!selectedPeriod) {
      setError("Selecciona un periodo para continuar.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("report_since", selectedPeriod.since);
      params.set("report_until", selectedPeriod.until);
      if (stdActive) params.set("std_active", stdActive);
      if (stdMasterPays) params.set("std_ally_master_pays", stdMasterPays);
      stdIds.forEach((id) => params.append("std_ids[]", id));
      destinyBanks.forEach((bank) =>
        params.append("report_destiny_banks[]", bank)
      );
      apps.forEach((app) => params.append("report_apps[]", app));
      shiftIds.forEach((shift) => params.append("report_shifts[]", shift));
      if (orderBy) params.set("orderBy", orderBy);

      const response = await LiquidationService.getStudiosLiquidation({
        query: params.toString(),
      });

      const payload = response.data?.data || [];
      const summaryPayload = response.data?.summary || { bySource: [] };
      setDataset(payload);
      setSummary(summaryPayload);
    } catch (err: any) {
      console.error(err);
      setError("No se pudo cargar la liquidacion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Liquidacion de Estudios
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Consolidado de ingresos por estudio y periodo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadLiquidation}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-amber-400 font-bold rounded-xl hover:bg-black transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Cargar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-700 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
              <Calendar size={12} /> Periodo
            </label>
            <select
              value={selectedPeriodId}
              onChange={(event) => setSelectedPeriodId(event.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/10"
            >
              {periods.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
              <Filter size={12} /> Estudios activos
            </label>
            <select
              value={stdActive}
              onChange={(event) => setStdActive(event.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/10"
            >
              <option value="true">Si</option>
              <option value="false">No</option>
              <option value="">Todos</option>
            </select>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Pago desde master
            </label>
            <select
              value={stdMasterPays}
              onChange={(event) => setStdMasterPays(event.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/10"
            >
              <option value="">Todos</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Estudios
            </label>
            <MultiSelect value={stdIds} options={studios} onChange={setStdIds} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Cuenta destino
            </label>
            <MultiSelect
              value={destinyBanks}
              options={BANK_OPTIONS}
              onChange={setDestinyBanks}
            />
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Plataformas
            </label>
            <MultiSelect value={apps} options={PLATFORM_OPTIONS} onChange={setApps} />
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Turnos
            </label>
            <MultiSelect value={shiftIds} options={shifts} onChange={setShiftIds} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Ordenamiento
            </label>
            <select
              value={orderBy}
              onChange={(event) => setOrderBy(event.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/10"
            >
              {ORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl border border-slate-700 text-white shadow-lg">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">
            Total a pagar
          </p>
          <h3 className="text-2xl font-bold tracking-tight tabular-nums">
            ${formatNumber(totals.total)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Total USD
          </p>
          <h3 className="text-xl font-bold text-emerald-600">
            {formatNumber(totals.usd)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Total EUR
          </p>
          <h3 className="text-xl font-bold text-indigo-600">
            {formatNumber(totals.eur)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Estudios
          </p>
          <h3 className="text-xl font-bold text-slate-700">
            {dataset.length}
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
          <TrendingUp size={18} className="text-amber-500" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Detalle por estudio
          </h3>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Estudio
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Propietario
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                  USD
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                  EUR
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                  COP
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Descuentos
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Otros
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Neto
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Rte/Fte
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-900 uppercase tracking-widest text-right">
                  A pagar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="px-4 py-6">
                      <div className="h-10 bg-slate-50 rounded-xl"></div>
                    </td>
                  </tr>
                ))
              ) : dataset.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign size={28} className="opacity-20" />
                      <span className="text-sm font-bold">Sin datos</span>
                    </div>
                  </td>
                </tr>
              ) : (
                dataset.map((row) => (
                  <tr key={row.std_id} className="hover:bg-amber-50/10">
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {row.std_name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.owner_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">
                      {formatNumber(row.sum_earnings_usd || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-indigo-700">
                      {formatNumber(row.sum_earnings_eur || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {formatNumber(row.sum_earnings_cop || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-500">
                      {formatNumber(row.sum_earnings_discounts || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      {formatNumber(row.sum_earnings_others || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {formatNumber(row.sum_earnings_net || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      {formatNumber(row.sum_earnings_rtefte || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatNumber(row.sum_earnings_total || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {summary.bySource.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <DollarSign size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Resumen por fuente
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.bySource.map((source: any) => (
              <div key={source.modstr_source} className="border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">
                    {source.modstr_source}
                  </h4>
                  <span className="text-xs font-bold text-slate-400">
                    USD {formatNumber(source.sum_earnings_usd)}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {source.incomes.map((income: any) => (
                    <div
                      key={income.modacc_app}
                      className="flex items-center justify-between text-xs text-slate-600"
                    >
                      <span>{income.modacc_app}</span>
                      <span className="font-bold">
                        USD {formatNumber(income.sum_earnings_usd)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPeriod && (
        <AccountingArchive
          reportPeriodSince={selectedPeriod.since}
          reportPeriodUntil={selectedPeriod.until}
          reportPeriodState={selectedPeriod.state}
          reportPeriodLabel={selectedPeriod.label}
          isModelLiquidation={false}
        />
      )}
    </div>
  );
};

export default StudioLiquidationPage;
