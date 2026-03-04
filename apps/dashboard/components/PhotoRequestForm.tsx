import React, { useState, useEffect } from 'react';
import { X, Zap, Clock, Calendar, AlertCircle, ShieldCheck } from 'lucide-react';
import PhotoService from '../PhotoService';
import { MOCK_USERS } from '../constants';
import { PhotoRestrictionStatus } from '../types';

// Mock User Context (Should match PhotographyPage)
const CURRENT_USER = {
    id: 3990, 
    name: 'Jennifer Zuluaga',
    role: 'ADMIN' 
};

export const PhotoRequestForm: React.FC<{ onClose: () => void, onSubmit: (data: any) => void }> = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        services: ['FOTO'], // Array of services: FOTO, VIDEO
        objective: 'CONTENIDO', location: 'Sede Principal',
        proposed_date: '', proposed_time: '', duration_minutes: 60,
        style_references: '', requires_makeup: false, makeup_pref: '',
        models: CURRENT_USER.role === 'MODELO' ? CURRENT_USER.name : '' // Comma separated names
    });
    const [availability, setAvailability] = useState<any>(null);
    const [restrictionStatus, setRestrictionStatus] = useState<PhotoRestrictionStatus | null>(null);
    const [checkingRestriction, setCheckingRestriction] = useState(false);

    useEffect(() => {
        PhotoService.getAvailability().then(setAvailability);
        
        // If current user is a model, check their restriction immediately
        if (CURRENT_USER.role === 'MODELO') {
            checkRestriction(CURRENT_USER.id);
        }
    }, []);

    useEffect(() => {
        if (CURRENT_USER.role !== 'MODELO' && formData.models) {
            const firstModel = formData.models.split(',')[0].trim();
            if (firstModel) {
                const timer = setTimeout(() => {
                    // Find user ID by name in MOCK_USERS
                    const normalized = firstModel.toLowerCase();
                    const user = MOCK_USERS.find((u) => {
                        const fullName = `${u.user_name} ${u.user_surname}`.trim().toLowerCase();
                        return fullName === normalized || u.user_name.toLowerCase() === normalized;
                    });
                    if (user) {
                        checkRestriction(user.user_id);
                    } else {
                        setRestrictionStatus(null);
                    }
                }, 800);
                return () => clearTimeout(timer);
            }
        } else if (CURRENT_USER.role !== 'MODELO' && !formData.models) {
            setRestrictionStatus(null);
        }
    }, [formData.models]);

    const checkRestriction = async (userId: number) => {
        setCheckingRestriction(true);
        const status = await PhotoService.checkUserRestriction(userId);
        setRestrictionStatus(status);
        setCheckingRestriction(false);
    };

    const handleSubmit = () => {
        const modelList = formData.models.split(',').map(m => m.trim()).filter(m => m !== '');
        const finalModels = modelList.length > 0 ? modelList : ['Jennifer Zuluaga']; // Default if empty for demo

        finalModels.forEach(model => {
            const type = formData.services.join(' + ');
            onSubmit({
                ...formData,
                type: type || 'FOTO',
                requester_name: model // Overriding requester name for each request
            });
        });
    };

    const toggleService = (service: string) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.includes(service)
                ? prev.services.filter(s => s !== service)
                : [...prev.services, service]
        }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-black text-xl text-slate-900 tracking-tight">Nueva Solicitud</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Crea un nuevo shoot fotográfico</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400"><X size={20} /></button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    {restrictionStatus?.isRestricted && (
                        <div className="p-6 bg-rose-50 rounded-[32px] border border-rose-100 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-rose-900 uppercase tracking-tight">Restricción Activa</p>
                                    <p className="text-xs text-rose-800/70 font-medium mt-1 leading-relaxed">
                                        Has alcanzado el límite de frecuencia para sesiones. Debes esperar a que se cumpla el periodo de gracia.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-white rounded-2xl border border-rose-100/50">
                                    <span className="block text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Última Sesión</span>
                                    <span className="text-xs font-black text-rose-900">
                                        {new Date(restrictionStatus.lastRequestDate!).toLocaleDateString('es-ES')}
                                    </span>
                                </div>
                                <div className="p-4 bg-white rounded-2xl border border-rose-100/50">
                                    <span className="block text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Desbloqueo</span>
                                    <span className="text-xs font-black text-rose-900">
                                        {new Date(restrictionStatus.unlockDate!).toLocaleDateString('es-ES')}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-rose-500 text-white rounded-2xl text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Faltan {restrictionStatus.daysRemaining} días</p>
                            </div>

                            {['ADMIN', 'SUPER_ADMIN'].includes(CURRENT_USER.role) && (
                                <div className="mt-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                    <ShieldCheck size={16} className="text-emerald-600" />
                                    <p className="text-[10px] font-bold text-emerald-800">Como Administrador, puedes ignorar este aviso y proceder.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {availability && (
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                            <Clock size={16} className="text-indigo-600 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Disponibilidad del Fotógrafo</p>
                                <p className="text-[9px] text-indigo-700 font-bold mt-1">
                                    Días: {availability.workingDays.join(', ')} <br />
                                    Horario: {availability.startTime} - {availability.endTime}
                                </p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Servicios Requeridos</label>
                        <div className="flex gap-3">
                            {['FOTO', 'VIDEO'].map(s => (
                                <button 
                                    key={s}
                                    onClick={() => toggleService(s)}
                                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.services.includes(s) ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Modelos (Separadas por coma para múltiples solicitudes)</label>
                        <input 
                            type="text" 
                            placeholder="Ej: Jennifer Zuluaga, Ana Acero..." 
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/5 transition-all" 
                            value={formData.models} 
                            onChange={e => setFormData({...formData, models: e.target.value})} 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Sede / Estudio</label>
                            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/5 transition-all" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                                <option value="Sede Principal">Sede Principal</option>
                                <option value="Bogotá - Norte">Bogotá - Norte</option>
                                <option value="Bogotá - Sur">Bogotá - Sur</option>
                                <option value="Medellín">Medellín</option>
                                <option value="Cali">Cali</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Objetivo</label>
                            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/5 transition-all" value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})}>
                                <option value="CATALOGO">Catálogo</option>
                                <option value="CONTENIDO">Contenido Diario</option>
                                <option value="REDES">Redes Sociales</option>
                                <option value="PERFIL">Perfil Web</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Fecha y Hora Preferida</label>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <input type="date" className="w-full p-4 bg-white rounded-2xl text-sm font-bold border border-slate-100 outline-none focus:border-amber-400 transition-all" value={formData.proposed_date} onChange={e => setFormData({...formData, proposed_date: e.target.value})} />
                            </div>
                            <div className="w-32">
                                <input type="time" className="w-full p-4 bg-white rounded-2xl text-sm font-bold border border-slate-100 outline-none focus:border-amber-400 transition-all" value={formData.proposed_time} onChange={e => setFormData({...formData, proposed_time: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Referencias / Estilo</label>
                        <textarea className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-medium h-32 resize-none outline-none focus:ring-4 focus:ring-amber-500/5 transition-all" placeholder="Pega links de Pinterest, IG o describe el mood..." value={formData.style_references} onChange={e => setFormData({...formData, style_references: e.target.value})} />
                    </div>

                    <div className="p-6 bg-indigo-50/50 rounded-[32px] border border-indigo-100 flex flex-col gap-4">
                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">¿Requiere Maquilladora?</span>
                            <div className={`w-12 h-6 rounded-full relative transition-all ${formData.requires_makeup ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${formData.requires_makeup ? 'left-7' : 'left-1'}`}></div>
                                <input type="checkbox" className="hidden" checked={formData.requires_makeup} onChange={e => setFormData({...formData, requires_makeup: e.target.checked})} />
                            </div>
                        </label>
                        {formData.requires_makeup && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <input type="text" placeholder="Preferencia de maquilladora (Opcional)" className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-500/10" value={formData.makeup_pref} onChange={e => setFormData({...formData, makeup_pref: e.target.value})} />
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Descartar</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={restrictionStatus?.isRestricted && CURRENT_USER.role === 'MODELO'}
                        className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 ${restrictionStatus?.isRestricted && CURRENT_USER.role === 'MODELO' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-amber-400 hover:bg-black shadow-slate-900/20'}`}
                    >
                        <Zap size={16} /> Enviar Solicitud
                    </button>
                </div>
            </div>
        </div>
    );
};
