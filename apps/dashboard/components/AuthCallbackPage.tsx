import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let timeoutId: number | undefined;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/dashboard", { replace: true });
        return;
      }
      timeoutId = window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2500);
    };

    checkSession();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm font-bold">Autenticando...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
