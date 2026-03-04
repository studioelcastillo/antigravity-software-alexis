import React, { useEffect, useMemo, useState } from "react";
import { FileText, Download } from "lucide-react";
import ReportService from "../ReportService";
import { api } from "../api";
import { getStoredUser } from "../session";

type ArchiveOption = {
  label: string;
  reportNumber: number;
  endpoint: string;
};

type Props = {
  reportPeriodSince: string;
  reportPeriodUntil: string;
  reportPeriodState: string;
  reportPeriodLabel: string;
  isModelLiquidation?: boolean;
};

const MODEL_ARCHIVES: ArchiveOption[] = [
  {
    label: "Pagos de modelos",
    reportNumber: 18,
    endpoint: "reports/models_payments_report/report",
  },
  {
    label: "Retefuente de modelos",
    reportNumber: 9,
    endpoint: "reports/models_retefuente_report/report",
  },
];

const STUDIO_ARCHIVES: ArchiveOption[] = [
  {
    label: "Pagos de estudios",
    reportNumber: 18,
    endpoint: "reports/studios_payments_report/report",
  },
  {
    label: "Retefuente de estudios",
    reportNumber: 14,
    endpoint: "reports/studios_retefuente_report/report",
  },
];

const AccountingArchive: React.FC<Props> = ({
  reportPeriodSince,
  reportPeriodUntil,
  reportPeriodState,
  reportPeriodLabel,
  isModelLiquidation = true,
}) => {
  const options = useMemo(
    () => (isModelLiquidation ? MODEL_ARCHIVES : STUDIO_ARCHIVES),
    [isModelLiquidation]
  );
  const [archiveLabel, setArchiveLabel] = useState(options[0]?.label || "");
  const [exportAction, setExportAction] = useState("all");
  const [consecutive, setConsecutive] = useState(1);
  const [loading, setLoading] = useState(false);

  const selectedOption = options.find((opt) => opt.label === archiveLabel);

  useEffect(() => {
    if (options.length) {
      setArchiveLabel(options[0].label);
    }
  }, [options]);

  useEffect(() => {
    const loadConsecutive = async () => {
      if (!selectedOption) return;
      try {
        const response = await ReportService.getConsecutiveReport({
          report_number: selectedOption.reportNumber,
        });
        setConsecutive(response.data?.data ?? 1);
      } catch (err) {
        console.error("Error cargando consecutivo", err);
      }
    };
    loadConsecutive();
  }, [selectedOption]);

  const handleGenerate = () => {
    if (!selectedOption) return;
    const token = getStoredUser()?.access_token || "";
    const baseUrl = (api.defaults.baseURL || "").replace(/\/$/, "");
    const url = new URL(`${baseUrl}/${selectedOption.endpoint}`);

    url.searchParams.set("access_token", token);
    url.searchParams.set("action", exportAction);
    url.searchParams.set("report_since", reportPeriodSince);
    url.searchParams.set("report_until", reportPeriodUntil);
    url.searchParams.set("consecutive", String(consecutive));

    setConsecutive((prev) => prev + 1);
    window.open(url.toString(), "_blank");
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText size={18} className="text-amber-500" />
        <div>
          <h3 className="text-lg font-black text-slate-900">Archivos contables</h3>
          <p className="text-xs text-slate-500">
            {reportPeriodLabel} ({reportPeriodState})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Archivo
          </label>
          <select
            value={archiveLabel}
            onChange={(event) => setArchiveLabel(event.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/10"
          >
            {options.map((opt) => (
              <option key={opt.label} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Consecutivo
          </label>
          <input
            type="number"
            value={consecutive}
            onChange={(event) => setConsecutive(Number(event.target.value || 0))}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/10"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Estado
          </label>
          <div className="flex gap-2">
            {[
              { label: "Todos", value: "all" },
              { label: "Pendientes", value: "pending" },
              { label: "Descargados", value: "downloaded" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setExportAction(item.value)}
                className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  exportAction === item.value
                    ? "bg-amber-500/10 text-amber-600 border-amber-200"
                    : "bg-slate-50 text-slate-500 border-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-amber-400 font-bold rounded-xl hover:bg-black transition-all text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
        >
          <Download size={16} /> Generar
        </button>
      </div>
    </div>
  );
};

export default AccountingArchive;
