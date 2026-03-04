import React from "react";
import CrudPage from "./admin/CrudPage";
import ExchangeRateSupabaseService from "../services/supabase/ExchangeRateSupabaseService";

type ExchangeRateRow = {
  exrate_id: number;
  exrate_date: string;
  exrate_from: string;
  exrate_to: string;
  exrate_rate: number;
  exrate_type: string;
  created_at?: string;
};

const ExchangeRatesPage: React.FC = () => {
  return (
    <CrudPage<ExchangeRateRow>
      title="Tasas de cambio"
      description="Gestiona las tasas de cambio manuales."
      idKey="exrate_id"
      pathPrefix="/exchanges_rates"
      searchPlaceholder="Buscar por fecha o moneda..."
      columns={[
        {
          key: "exrate_date",
          label: "Fecha",
          render: (row) =>
            row.exrate_date
              ? new Date(row.exrate_date).toLocaleDateString("es-CO")
              : "",
        },
        { key: "exrate_from", label: "Origen" },
        { key: "exrate_to", label: "Destino" },
        {
          key: "exrate_rate",
          label: "Tasa",
          render: (row) => `${row.exrate_rate ?? 0}`,
        },
        { key: "exrate_type", label: "Tipo" },
      ]}
      fields={[
        {
          key: "exrate_date",
          label: "Fecha",
          type: "date",
          required: true,
        },
        {
          key: "exrate_from",
          label: "Moneda origen",
          type: "select",
          required: true,
          options: [
            { label: "USD", value: "USD" },
            { label: "EUR", value: "EUR" },
          ],
        },
        {
          key: "exrate_to",
          label: "Moneda destino",
          type: "select",
          required: true,
          options: [{ label: "COP", value: "COP" }],
        },
        {
          key: "exrate_rate",
          label: "Tasa",
          type: "number",
          required: true,
        },
        {
          key: "exrate_type",
          label: "Tipo",
          type: "text",
          readOnly: true,
        },
      ]}
      service={{
        list: async ({ search }) => {
          const query = search
            ? new URLSearchParams({ exrate_date: search })
            : undefined;
          const response = await ExchangeRateSupabaseService.getExchangesRates({
            query,
          });
          return response.data.data as ExchangeRateRow[];
        },
        get: async (id) => {
          const response = await ExchangeRateSupabaseService.getExchangeRate({
            id: Number(id),
          });
          return response.data.data?.[0] ?? null;
        },
        create: async (payload) => {
          await ExchangeRateSupabaseService.addExchangeRate({
            exrate_date: String(payload.exrate_date || ""),
            exrate_from: String(payload.exrate_from || ""),
            exrate_to: String(payload.exrate_to || "COP"),
            exrate_rate: Number(payload.exrate_rate || 0),
            exrate_type: "MANUAL",
          });
        },
        update: async (id, payload) => {
          await ExchangeRateSupabaseService.editExchangeRate({
            id: Number(id),
            exrate_date: String(payload.exrate_date || ""),
            exrate_from: String(payload.exrate_from || ""),
            exrate_to: String(payload.exrate_to || "COP"),
            exrate_rate: Number(payload.exrate_rate || 0),
            exrate_type: String(payload.exrate_type || "MANUAL"),
          });
        },
        remove: async (id) => {
          await ExchangeRateSupabaseService.delExchangeRate({ id: Number(id) });
        },
      }}
    />
  );
};

export default ExchangeRatesPage;
