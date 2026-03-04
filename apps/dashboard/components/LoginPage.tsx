
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2, ShieldCheck, ExternalLink, X } from 'lucide-react';
import AuthService, { Policy } from '../AuthService';
import { encryptSession } from '../utils/session';
import PolicyModal from './PolicyModal';

interface LoginPageProps {
  onLogin: () => void;
}

type NotificationType = 'success' | 'error' | null;

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  // Form State - Pre-filled with provided test credentials
  const [email, setEmail] = useState('1144184353');
  const [password, setPassword] = useState('84353');
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification State
  const [notification, setNotification] = useState<{type: NotificationType, message: string} | null>(null);

  // Policy State - Pre-accepted for rapid testing
  const [policyAccepted, setPolicyAccepted] = useState(true);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policy, setPolicy] = useState<Policy | null>(null);

  // Load policy on mount
  useEffect(() => {
    const loadPolicy = async () => {
      try {
        const response = await AuthService.getActiveDataPolicy();
        if (response.data && response.data.data) {
          setPolicy(response.data.data);
        }
      } catch (err: any) {
        console.error('Error loading policy:', err);
        showNotification('error', 'No se pudo cargar la política de datos. Verifica tu conexión.');
      }
    };
    loadPolicy();
  }, []);

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message });
    if (type !== 'success') {
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!policy) {
      showNotification('error', 'Error del sistema: La política de datos no está disponible.');
      return;
    }

    if (!policyAccepted) {
      showNotification('error', 'Debes leer y aceptar la política de tratamiento de datos.');
      return;
    }

    setIsLoading(true);

    try {
      const loginResponse = await AuthService.login({
        email,
        password,
        policyId: policy.pol_id,
        policyAnswer: true,
      });

      const resData = loginResponse.data;
      
      // Lógica de validación robusta para éxito:
      const isSuccessful = (resData as any).success === true || 
                          (resData as any).status?.toLowerCase() === 'success' || 
                          (resData as any).message === 'User logged';

      if (isSuccessful && resData.data) {
        const { access_token, token_type, expires_at, user } = resData.data;

        // Persist session
        const sessionUser = {
          access_token,
          token_type,
          expires_at,
          ...user,
        };
        encryptSession('user', sessionUser);
        encryptSession('dashboard_user', sessionUser);
        encryptSession('token', access_token);

        showNotification('success', resData.message || '¡Ingreso exitoso!');
        
        // Redirigir al dashboard
        setTimeout(() => {
          onLogin();
        }, 800);
      } else {
        showNotification('error', resData.message || 'Error en la respuesta del servidor.');
      }
    } catch (err: any) {
      console.error("Full Login Error:", err);
      
      if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message;

        switch (status) {
          case 401: showNotification('error', 'Credenciales inválidas. Verifica tu usuario y clave.'); break;
          case 402: showNotification('error', 'La política de datos es requerida o no se encontró.'); break;
          case 403: showNotification('error', 'Acceso restringido. Debes aceptar los términos actuales.'); break;
          case 422: showNotification('error', 'Datos incompletos o en formato incorrecto.'); break;
          default: showNotification('error', message || `Error del servidor (${status}).`);
        }
      } else {
        showNotification('error', 'No hay conexión con el servidor de producción.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC]">
      
      {/* --- Notification Toast --- */}
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md p-4 rounded-2xl shadow-2xl flex items-center gap-4 border animate-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' 
          ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
          : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          <div className={`p-2 rounded-xl ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
             {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          </div>
          <p className="flex-1 text-sm font-bold">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B1120] relative overflow-hidden flex-col justify-between p-16">
         <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
         </div>

         <div className="relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-[#0B1120] shadow-2xl shadow-amber-500/20 mb-8">
               <Crown size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight leading-tight mb-6">
               Gestión Integral <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">El Castillo Group.</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium max-w-md leading-relaxed">
               Accede al corazón administrativo de la compañía. Control total, seguridad garantizada.
            </p>
         </div>

         <div className="relative z-10 flex items-center gap-4 text-sm font-bold text-slate-500 uppercase tracking-widest">
            <span>© 2025 El Castillo SAS</span>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
            <span>v1.15.0</span>
         </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 relative bg-white">
         <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="text-center lg:text-left">
               <div className="lg:hidden w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 mx-auto mb-6">
                  <Crown size={24} />
               </div>
               <h2 className="text-3xl font-black text-slate-900 tracking-tight">Iniciar Sesión</h2>
               <p className="text-slate-500 mt-2">Bienvenido de nuevo al sistema El Castillo.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 block">Usuario / Identificación</label>
                     <div className="relative group">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <input 
                           type="text" 
                           required
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                           placeholder="Ingresa tu usuario"
                        />
                     </div>
                  </div>
                  
                  <div>
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Contraseña</label>
                        <Link to="/recovery-password" className="text-xs font-bold text-amber-600 hover:text-amber-700">
                          ¿Olvidaste tu contraseña?
                        </Link>
                     </div>
                     <div className="relative group">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <input 
                           type="password" 
                           required
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                           placeholder="••••••••••••"
                        />
                     </div>
                  </div>
               </div>

               {/* Policy Checkbox Section */}
               <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-4">
                  <div className="pt-1">
                     <input 
                        type="checkbox"
                        id="policy-check"
                        checked={policyAccepted}
                        onChange={(e) => setPolicyAccepted(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500 transition-all cursor-pointer"
                     />
                  </div>
                  <label htmlFor="policy-check" className="text-xs font-medium text-slate-500 cursor-pointer leading-relaxed">
                     Acepto el tratamiento de mis datos personales conforme a la 
                     <button 
                        type="button"
                        onClick={() => setPolicyModalOpen(true)}
                        className="text-slate-900 font-black ml-1 hover:text-amber-600 underline flex items-center gap-1 inline-flex"
                     >
                        política de datos <ExternalLink size={12} />
                     </button>
                  </label>
               </div>

               <button 
                  type="submit"
                  disabled={isLoading || !policy}
                  className="w-full bg-slate-900 hover:bg-black text-amber-400 font-bold py-4 rounded-xl shadow-xl shadow-slate-900/10 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isLoading ? (
                     <span className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></span>
                  ) : (
                     <>
                        INGRESAR AL SISTEMA <ArrowRight size={18} />
                     </>
                  )}
               </button>

               {/* Expired License Notice */}
               <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 animate-in fade-in duration-700 delay-300">
                  <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                     <p className="text-sm font-black text-amber-900">¿Tu licencia expiró?</p>
                     <p className="text-xs font-medium text-amber-700 mt-1 leading-relaxed">
                        Inicia sesión normalmente con tus credenciales. El sistema te redirigirá automáticamente a la pasarela de pago segura para que puedas renovar tu acceso.
                     </p>
                  </div>
               </div>
            </form>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
               <ShieldCheck size={14} className="text-emerald-500" /> 
               Conexión Segura de Extremo a Extremo
            </div>
         </div>
      </div>

      {/* Policy Modal Integration */}
      <PolicyModal 
        open={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        onAccept={() => setPolicyAccepted(true)}
        onReject={() => setPolicyAccepted(false)}
        policy={policy}
      />
    </div>
  );
};

export default LoginPage;
