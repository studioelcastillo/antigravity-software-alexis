import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Edit2, Plus, RefreshCw, Trash2, X } from "lucide-react";

type FieldOption = {
  label: string;
  value: string | number;
};

type CrudField = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "date" | "checkbox";
  options?: FieldOption[];
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
};

type CrudColumn<T> = {
  key: keyof T | string;
  label: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
};

type CrudService<T> = {
  list: (params: { search?: string }) => Promise<T[]>;
  get?: (id: string | number) => Promise<T | null>;
  create: (payload: Partial<T>) => Promise<void>;
  update: (id: string | number, payload: Partial<T>) => Promise<void>;
  remove: (id: string | number) => Promise<void>;
};

type CrudPageProps<T extends Record<string, any>> = {
  title: string;
  description?: string;
  idKey: keyof T;
  columns: CrudColumn<T>[];
  fields: CrudField[];
  service: CrudService<T>;
  searchPlaceholder?: string;
  pathPrefix?: string;
  initialValues?: Record<string, any>;
};

const CrudPage = <T extends Record<string, any>>({
  title,
  description,
  idKey,
  columns,
  fields,
  service,
  searchPlaceholder = "Buscar...",
  pathPrefix,
  initialValues,
}: CrudPageProps<T>) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<Record<string, any>>({});

  const columnsMemo = useMemo(() => columns, [columns]);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await service.list({ search });
      setItems(data);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar la informacion.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!pathPrefix) return;
    const trimmed = location.pathname.replace(/\/+$/, "");
    if (!trimmed.startsWith(pathPrefix)) return;
    const remainder = trimmed.slice(pathPrefix.length);
    if (remainder === "/new") {
      openCreate();
      return;
    }
    if (remainder.startsWith("/edit/") || remainder.startsWith("/show/")) {
      const parts = remainder.split("/").filter(Boolean);
      const targetId = parts[1];
      if (!targetId || !service.get) return;
      const numericId = Number(targetId);
      const idValue = Number.isNaN(numericId) ? targetId : numericId;
      service
        .get(idValue)
        .then((record) => {
          if (!record) return;
          setMode("edit");
          setFormData({ ...record });
          setIsOpen(true);
        })
        .catch(() => {
          // ignore
        });
    }
  }, [location.pathname, pathPrefix, service]);

  const openCreate = () => {
    setMode("create");
    setFormData({ ...(initialValues || {}) });
    setIsOpen(true);
  };

  const openEdit = (row: T) => {
    setMode("edit");
    setFormData({ ...row });
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    if (pathPrefix) {
      const trimmed = location.pathname.replace(/\/+$/, "");
      if (trimmed.startsWith(`${pathPrefix}/`)) {
        navigate(pathPrefix, { replace: true });
      }
    }
  };

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (mode === "create") {
        await service.create(formData as Partial<T>);
      } else {
        const idValue = formData[idKey as string];
        const payload = { ...formData };
        delete payload[idKey as string];
        await service.update(idValue, payload as Partial<T>);
      }
      closeDialog();
      fetchItems();
    } catch (err: any) {
      setError(err?.message || "Error al guardar.");
    }
  };

  const handleDelete = async (row: T) => {
    const idValue = row[idKey] as string | number;
    if (!idValue) return;
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await service.remove(idValue);
      fetchItems();
    } catch (err: any) {
      setError(err?.message || "Error al eliminar.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500 mt-1 font-medium">{description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchItems}
            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
            title="Recargar"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-[#0B1120] font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-xs uppercase tracking-widest"
          >
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-600">
          <AlertCircle size={24} />
          <div className="flex-1">
            <p className="font-bold">Error</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <input
          type="text"
          placeholder={searchPlaceholder}
          className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-medium"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {columnsMemo.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest ${
                      column.className || ""
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={columnsMemo.length + 1} className="px-6 py-4">
                      <div className="h-10 bg-slate-50 rounded-xl"></div>
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnsMemo.length + 1}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    <span className="text-sm font-bold">No hay registros.</span>
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={String(row[idKey])}
                    className="hover:bg-slate-50/50 transition-all"
                  >
                    {columnsMemo.map((column) => (
                      <td key={String(column.key)} className="px-6 py-4 text-sm">
                        {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "")}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(row)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={closeDialog} />
          <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {mode === "create" ? "Nuevo" : "Editar"}
                </p>
                <h3 className="text-lg font-black text-slate-900">{title}</h3>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {fields.map((field) => {
                const value = formData[field.key];
                const commonProps = {
                  id: field.key,
                  name: field.key,
                  required: field.required,
                  readOnly: field.readOnly,
                  className:
                    "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all",
                };

                return (
                  <label key={field.key} className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {field.label}
                    </span>
                    <div className="mt-2">
                      {field.type === "select" ? (
                        <select
                          {...commonProps}
                          value={value ?? ""}
                          onChange={(event) => handleChange(field.key, event.target.value)}
                        >
                          <option value="">Selecciona...</option>
                          {field.options?.map((option) => (
                            <option key={String(option.value)} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center gap-3">
                          <input
                            id={field.key}
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(event) => handleChange(field.key, event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-sm font-medium text-slate-600">{field.label}</span>
                        </div>
                      ) : (
                        <input
                          {...commonProps}
                          type={field.type || "text"}
                          placeholder={field.placeholder}
                          value={value ?? ""}
                          onChange={(event) => handleChange(field.key, event.target.value)}
                        />
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeDialog}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 text-[#0B1120] text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/30"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CrudPage;
