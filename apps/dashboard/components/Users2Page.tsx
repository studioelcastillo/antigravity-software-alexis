import React, { useEffect, useMemo, useState } from "react";
import CrudPage from "./admin/CrudPage";
import User2Service from "../User2Service";
import ProfileService from "../ProfileService";

type ProfileOption = { label: string; value: number };

const normalizePayload = (payload: Record<string, any>) => {
  const normalized: Record<string, any> = { ...payload };
  if (normalized.prof_id !== undefined && normalized.prof_id !== "") {
    normalized.prof_id = Number(normalized.prof_id);
  }
  if (normalized.user_active !== undefined) {
    normalized.user_active = Boolean(normalized.user_active);
  }
  return normalized;
};

const Users2Page: React.FC = () => {
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const response = await ProfileService.getProfiles();
        const data = response.data?.data || [];
        setProfiles(
          data.map((profile: any) => ({
            label: profile.prof_name,
            value: profile.prof_id,
          }))
        );
      } catch (err) {
        console.error("Error cargando perfiles", err);
      }
    };
    loadProfiles();
  }, []);

  const profileOptions = useMemo(
    () => profiles.map((p) => ({ label: p.label, value: p.value })),
    [profiles]
  );

  return (
    <CrudPage
      title="Usuarios (Legacy)"
      description="Administracion basica de usuarios y credenciales."
      idKey="user_id"
      columns={[
        { key: "user_id", label: "ID" },
        {
          key: "profile",
          label: "Perfil",
          render: (row: any) => row.profile?.prof_name || "-",
        },
        { key: "user_identification", label: "Identificacion" },
        { key: "user_name", label: "Nombre" },
        { key: "user_surname", label: "Apellido" },
        { key: "user_email", label: "Email" },
        {
          key: "user_active",
          label: "Activo",
          render: (row: any) => (row.user_active ? "SI" : "NO"),
        },
        { key: "created_at", label: "Creado" },
      ]}
      fields={[
        {
          key: "prof_id",
          label: "Perfil",
          type: "select",
          required: true,
          options: profileOptions,
        },
        { key: "user_identification", label: "Identificacion", required: true },
        { key: "user_name", label: "Nombre", required: true },
        { key: "user_surname", label: "Apellido" },
        { key: "user_email", label: "Email" },
        { key: "user_password", label: "Contrasena" },
        { key: "user_active", label: "Activo", type: "checkbox" },
        { key: "user_token_recovery_password", label: "Token recuperacion" },
        { key: "user_telephone", label: "Telefono" },
        { key: "user_address", label: "Direccion" },
      ]}
      searchPlaceholder="Buscar usuarios..."
      pathPrefix="/users2"
      initialValues={{ user_active: true }}
      service={{
        list: async ({ search }) => {
          const response = await User2Service.getUsers2({ search });
          return response.data?.data || [];
        },
        get: async (id) => {
          const response = await User2Service.getUser2({ id: Number(id) });
          return response.data?.data?.[0] || null;
        },
        create: async (payload) => {
          await User2Service.addUser2(normalizePayload(payload));
        },
        update: async (id, payload) => {
          await User2Service.editUser2({
            id: Number(id),
            ...normalizePayload(payload),
          });
        },
        remove: async (id) => {
          await User2Service.delUser2({ id: Number(id) });
        },
      }}
    />
  );
};

export default Users2Page;
