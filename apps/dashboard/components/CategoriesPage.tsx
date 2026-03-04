import React from "react";
import CrudPage from "./admin/CrudPage";
import CategorySupabaseService from "../services/supabase/CategorySupabaseService";

type CategoryRow = {
  cate_id: number;
  cate_name: string;
  created_at?: string;
};

const CategoriesPage: React.FC = () => {
  return (
    <CrudPage<CategoryRow>
      title="Categorias"
      description="Gestiona las categorias de productos y servicios."
      idKey="cate_id"
      pathPrefix="/categories"
      searchPlaceholder="Buscar por nombre de categoria..."
      columns={[
        { key: "cate_id", label: "ID" },
        { key: "cate_name", label: "Nombre" },
        {
          key: "created_at",
          label: "Creada",
          render: (row) =>
            row.created_at
              ? new Date(row.created_at).toLocaleString("es-CO")
              : "",
        },
      ]}
      fields={[
        {
          key: "cate_name",
          label: "Nombre",
          type: "text",
          required: true,
        },
      ]}
      service={{
        list: async ({ search }) => {
          const response = await CategorySupabaseService.getCategories({
            searchterm: search,
          });
          return response.data.data as CategoryRow[];
        },
        get: async (id) => {
          const response = await CategorySupabaseService.getCategory({
            id: Number(id),
          });
          return response.data.data?.[0] ?? null;
        },
        create: async (payload) => {
          await CategorySupabaseService.addCategory({
            cate_name: String(payload.cate_name || ""),
          });
        },
        update: async (id, payload) => {
          await CategorySupabaseService.editCategory({
            id: Number(id),
            cate_name: String(payload.cate_name || ""),
          });
        },
        remove: async (id) => {
          await CategorySupabaseService.delCategory({ id: Number(id) });
        },
      }}
    />
  );
};

export default CategoriesPage;
