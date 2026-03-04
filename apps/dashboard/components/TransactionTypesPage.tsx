import React from "react";
import CrudPage from "./admin/CrudPage";
import TransactionTypeSupabaseService from "../services/supabase/TransactionTypeSupabaseService";

type TransactionTypeRow = {
  transtype_id: number;
  transtype_group: string;
  transtype_name: string;
  transtype_behavior: string;
  transtype_value: number;
  transtype_rtefte: boolean;
  created_at?: string;
};

const TransactionTypesPage: React.FC = () => {
  return (
    <CrudPage<TransactionTypeRow>
      title="Tipos de transferencia"
      description="Configura las categorias de ingresos y egresos."
      idKey="transtype_id"
      pathPrefix="/transactions_types"
      searchPlaceholder="Buscar por nombre o grupo..."
      columns={[
        { key: "transtype_group", label: "Grupo" },
        { key: "transtype_name", label: "Nombre" },
        { key: "transtype_behavior", label: "Comportamiento" },
        {
          key: "transtype_value",
          label: "Valor",
          render: (row) => `${row.transtype_value ?? 0}`,
        },
        {
          key: "transtype_rtefte",
          label: "Rte. Fte",
          render: (row) => (row.transtype_rtefte ? "SI" : "NO"),
        },
      ]}
      fields={[
        {
          key: "transtype_group",
          label: "Grupo",
          type: "select",
          required: true,
          options: [
            { label: "INGRESOS", value: "INGRESOS" },
            { label: "EGRESOS", value: "EGRESOS" },
          ],
        },
        {
          key: "transtype_name",
          label: "Nombre",
          type: "text",
          required: true,
        },
        {
          key: "transtype_behavior",
          label: "Comportamiento",
          type: "select",
          required: true,
          options: [
            { label: "ESTANDAR", value: "ESTANDAR" },
            { label: "TIENDA", value: "TIENDA" },
            { label: "SALDO PENDIENTE", value: "SALDO PENDIENTE" },
            { label: "COMISION", value: "COMISION" },
          ],
        },
        {
          key: "transtype_value",
          label: "Valor",
          type: "number",
          required: true,
        },
        {
          key: "transtype_rtefte",
          label: "Aplica Rte. Fte",
          type: "checkbox",
        },
      ]}
      service={{
        list: async ({ search }) => {
          const query = search
            ? new URLSearchParams({ transtype_name: search })
            : undefined;
          const response = await TransactionTypeSupabaseService.getTransactionsTypes({
            query,
          });
          return response.data.data as TransactionTypeRow[];
        },
        get: async (id) => {
          const response = await TransactionTypeSupabaseService.getTransactionType({
            id: Number(id),
          });
          return response.data.data?.[0] ?? null;
        },
        create: async (payload) => {
          await TransactionTypeSupabaseService.addTransactionType({
            transtype_group: String(payload.transtype_group || ""),
            transtype_name: String(payload.transtype_name || ""),
            transtype_behavior: String(payload.transtype_behavior || ""),
            transtype_rtefte: Boolean(payload.transtype_rtefte),
            transtype_value: Number(payload.transtype_value || 0),
          });
        },
        update: async (id, payload) => {
          await TransactionTypeSupabaseService.editTransactionType({
            id: Number(id),
            transtype_group: String(payload.transtype_group || ""),
            transtype_name: String(payload.transtype_name || ""),
            transtype_behavior: String(payload.transtype_behavior || ""),
            transtype_rtefte: Boolean(payload.transtype_rtefte),
            transtype_value: Number(payload.transtype_value || 0),
          });
        },
        remove: async (id) => {
          await TransactionTypeSupabaseService.delTransactionType({
            id: Number(id),
          });
        },
      }}
    />
  );
};

export default TransactionTypesPage;
