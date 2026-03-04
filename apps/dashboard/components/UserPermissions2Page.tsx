import React, { useEffect, useMemo, useState } from "react";
import CrudPage from "./admin/CrudPage";
import UserPermission2Service from "../UserPermission2Service";
import User2Service from "../User2Service";

type UserOption = { label: string; value: number };

const UserPermissions2Page: React.FC = () => {
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await User2Service.getUsers2();
        const data = response.data?.data || [];
        setUsers(
          data.map((user: any) => ({
            label: `${user.user_name || ""} ${user.user_surname || ""}`.trim(),
            value: user.user_id,
          }))
        );
      } catch (err) {
        console.error("Error cargando usuarios", err);
      }
    };
    loadUsers();
  }, []);

  const userOptions = useMemo(
    () => users.map((u) => ({ label: u.label, value: u.value })),
    [users]
  );

  return (
    <CrudPage
      title="Permisos Usuarios (Legacy)"
      description="Permisos adicionales por usuario."
      idKey="userperm_id"
      columns={[
        { key: "userperm_id", label: "ID" },
        {
          key: "user2",
          label: "Usuario",
          render: (row: any) =>
            row.user2
              ? `${row.user2.user_name || ""} ${row.user2.user_surname || ""}`.trim()
              : "-",
        },
        { key: "userperm_feature", label: "Caracteristica" },
        { key: "userperm_state", label: "Estado" },
        { key: "created_at", label: "Creado" },
      ]}
      fields={[
        {
          key: "user_id",
          label: "Usuario",
          type: "select",
          required: true,
          options: userOptions,
        },
        { key: "userperm_feature", label: "Caracteristica", required: true },
        { key: "userperm_state", label: "Estado", required: true },
      ]}
      searchPlaceholder="Buscar permisos..."
      pathPrefix="/users_permissions2"
      service={{
        list: async ({ search }) => {
          const response = await UserPermission2Service.getUsersPermissions2({ search });
          return response.data?.data || [];
        },
        get: async (id) => {
          const response = await UserPermission2Service.getUserPermission2({
            id: Number(id),
          });
          return response.data?.data?.[0] || null;
        },
        create: async (payload) => {
          await UserPermission2Service.addUserPermission2({
            ...payload,
            user_id: Number(payload.user_id),
          });
        },
        update: async (id, payload) => {
          await UserPermission2Service.editUserPermission2({
            id: Number(id),
            ...payload,
            user_id: Number(payload.user_id),
          });
        },
        remove: async (id) => {
          await UserPermission2Service.delUserPermission2({ id: Number(id) });
        },
      }}
    />
  );
};

export default UserPermissions2Page;
