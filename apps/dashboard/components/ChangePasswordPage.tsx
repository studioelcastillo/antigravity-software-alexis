import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import AuthService from "../AuthService";

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (!password || password !== confirm) {
      setNotice({ type: "error", message: "Las contrasenas no coinciden." });
      return;
    }

    setLoading(true);
    try {
      await AuthService.changePassword({ password, oldPassword });
      setNotice({ type: "success", message: "Contrasena actualizada." });
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      setNotice({ type: "error", message: "No se pudo actualizar." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Cambiar contrasena</h1>
            <p className="text-xs text-slate-500">Actualiza tu acceso al sistema.</p>
          </div>
        </div>

        {notice && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border mb-4 ${
              notice.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : "bg-red-50 text-red-700 border-red-100"
            }`}
          >
            {notice.type === "success" ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {notice.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Contrasena actual (opcional)
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-amber-500/10"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Nueva contrasena
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-amber-500/10"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Confirmar contrasena
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
              className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-amber-500/10"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Actualizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
