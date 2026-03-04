import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import AuthService from "../AuthService";

const RecoveryPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { userParam, tokenParam } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const segments = location.pathname.split("/").filter(Boolean);
    return {
      userParam: params.get("u") || segments[1] || "",
      tokenParam: params.get("t") || segments[2] || "",
    };
  }, [location.pathname, location.search]);

  const isChangeMode = Boolean(userParam && tokenParam);

  const handleRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    setLoading(true);
    try {
      await AuthService.recoveryPassword(email);
      setNotice({
        type: "success",
        message: "Correo enviado. Revisa tu bandeja de entrada.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        message: "No se pudo enviar el correo. Verifica el email.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (!password || password !== confirm) {
      setNotice({ type: "error", message: "Las contrasenas no coinciden." });
      return;
    }

    setLoading(true);
    try {
      await AuthService.newPassword({ u: userParam, t: tokenParam, password });
      setNotice({ type: "success", message: "Contrasena actualizada." });
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setNotice({
        type: "error",
        message: "El enlace no es valido o expiro.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {isChangeMode ? "Cambiar contrasena" : "Recuperar contrasena"}
            </h1>
            <p className="text-xs text-slate-500">
              {isChangeMode
                ? "Define una nueva contrasena."
                : "Te enviaremos un enlace de recuperacion."}
            </p>
          </div>
        </div>

        {notice && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
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

        {!isChangeMode ? (
          <form onSubmit={handleRecovery} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-amber-500/10"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-900 text-amber-400 font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleChange} className="space-y-4">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Actualizar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default RecoveryPasswordPage;
