import React from "react";
import CrudPage from "./CrudPage";
import tableService from "../../supabase/tableService";
import { supabase } from "../../supabaseClient";
import { RESOURCE_CONFIG, ResourceConfig, ResourceField } from "./resourceConfig";

type ResourcePageProps = {
  resourceKey: string;
};

const normalizePayload = (fields: ResourceField[], payload: Record<string, any>) => {
  const result: Record<string, any> = {};

  fields.forEach((field) => {
    const raw = payload[field.key];
    if (raw === undefined) return;

    if (field.type === "number") {
      if (raw === "" || raw === null) {
        result[field.key] = null;
      } else {
        const value = Number(raw);
        result[field.key] = Number.isNaN(value) ? null : value;
      }
      return;
    }

    if (field.type === "checkbox") {
      result[field.key] = Boolean(raw);
      return;
    }

    if (raw === "") {
      result[field.key] = null;
      return;
    }

    result[field.key] = raw;
  });

  return result;
};

const ResourcePage: React.FC<ResourcePageProps> = ({ resourceKey }) => {
  const config: ResourceConfig | undefined = RESOURCE_CONFIG[resourceKey];

  if (!config) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-bold text-slate-500">Modulo no configurado.</p>
        </div>
      </div>
    );
  }

  return (
    <CrudPage
      title={config.title}
      description={config.description}
      idKey={config.idKey as any}
      columns={config.columns as any}
      fields={config.fields}
      searchPlaceholder="Buscar..."
      pathPrefix={config.path}
      initialValues={config.initialValues}
      service={{
        list: async ({ search }) => {
          const response = await tableService.list(config.table, {
            orderBy: config.orderBy,
            ascending: false,
            search: search && config.searchColumns?.length
              ? { term: search, columns: config.searchColumns }
              : undefined,
          });
          return response.data;
        },
        get: async (id) => {
          const { data, error } = await supabase
            .from(config.table)
            .select("*")
            .eq(config.idKey, id)
            .single();
          if (error || !data) return null;
          return data;
        },
        create: async (payload) => {
          const normalized = normalizePayload(config.fields, payload);
          await tableService.insert(config.table, normalized);
        },
        update: async (id, payload) => {
          const normalized = normalizePayload(config.fields, payload);
          await tableService.update(config.table, config.idKey, id, normalized);
        },
        remove: async (id) => {
          await tableService.remove(config.table, config.idKey, id);
        },
      }}
    />
  );
};

export default ResourcePage;
