
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Camera, Calendar as CalIcon, Plus, Filter, Clock, MapPin,
  User, CheckCircle2, XCircle, AlertTriangle, UploadCloud,
  Download, Star, BarChart3, Image as ImageIcon, Video,
  MoreVertical, RefreshCw, X, Save, Search, ChevronRight,
  ChevronLeft, Users, Settings2, ShieldCheck, Zap, Bell, Check,
  ShieldAlert, Unlock, Lock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import PhotoService from '../PhotoService';
import { PhotoRequestForm } from './PhotoRequestForm';
import { PhotoRequest, PhotoRequestStatus, PhotoAsset, PhotoCalendarEvent, PhotoDashboardKPI, PhotoRating, PhotoRestrictionConfig } from '../types';
import Avatar from './Avatar';

// Mock User Context (In real app, comes from Auth)
const CURRENT_USER = {
    id: 3990,
    name: 'Jennifer Zuluaga',
    role: 'ADMIN' // Standardized to 'ADMIN'
};

const TEAM_MOCK = [
    { id: 101, name: 'Carlos Foto', role: 'FOTOGRAFO', active: true },
    { id: 102, name: 'Laura Video', role: 'FOTOGRAFO', active: true },
    { id: 3988, name: 'Sofia MUA', role: 'MAQUILLADORA', active: true },
];

// --- SUB-COMPONENTS ---

const StatusBadge: React.FC<{ status: PhotoRequestStatus }> = ({ status }) => {
    const mapping: Record<string, { label: string, style: string }> = {
        'SENT': { label: 'ABIERTA', style: 'bg-amber-50 text-amber-600 border-amber-100' },
        'ACCEPTED': { label: 'EN PROCESO', style: 'bg-blue-50 text-blue-600 border-blue-100' },
        'CONFIRMED': { label: 'EN PROCESO', style: 'bg-blue-50 text-blue-600 border-blue-100' },
        'IN_PROGRESS': { label: 'EN PROCESO', style: 'bg-blue-50 text-blue-600 border-blue-100' },
        'PHOTOS_TAKEN': { label: 'FOTOS TOMADAS', style: 'bg-purple-50 text-purple-600 border-purple-100' },
        'DELIVERED': { label: 'TERMINADA', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        'RATED': { label: 'TERMINADA', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        'CLOSED': { label: 'TERMINADA', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        'RESCHEDULE_PROPOSED': { label: 'REPROGRAMADA', style: 'bg-orange-50 text-orange-600 border-orange-100' },
        'REJECTED': { label: 'RECHAZADA', style: 'bg-red-50 text-red-600 border-red-100' },
        'CANCELLED': { label: 'CANCELADA', style: 'bg-slate-50 text-slate-400 border-slate-100' },
        'PENDING_CONFIRMATION': { label: 'EN PROCESO', style: 'bg-blue-50 text-blue-600 border-blue-100' },
    };
    const info = mapping[status] || { label: status, style: 'bg-slate-100 text-slate-500' };
    return (
        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${info.style}`}>
            {info.label}
        </span>
    );
};

// --- NEW ENHANCED CALENDAR ---

const PhotoCalendar: React.FC<{
    events: PhotoCalendarEvent[],
    onRefresh: () => void,
    selectedDate: string,
    setSelectedDate: (d: string) => void,
    selectedTeamMemberIds: number[],
    setSelectedTeamMemberIds: React.Dispatch<React.SetStateAction<number[]>>
}> = ({ events, onRefresh, selectedDate, setSelectedDate, selectedTeamMemberIds, setSelectedTeamMemberIds }) => {
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [availability, setAvailability] = useState<any>(null);

    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

    useEffect(() => {
        PhotoService.getAvailability().then(setAvailability);
    }, []);

    const dayEvents = useMemo(() => {
        return events.filter(e => {
            const matchesDate = e.start.startsWith(selectedDate);
            const matchesTeam = selectedTeamMemberIds.length === 0 || selectedTeamMemberIds.includes(e.resourceId);
            return matchesDate && matchesTeam;
        });
    }, [events, selectedDate, selectedTeamMemberIds]);

    const handleBlockSlot = async (hour: number) => {
        const confirmBlock = window.confirm(`¿Deseas bloquear el horario de las ${hour}:00 para el día ${selectedDate}?`);
        if (!confirmBlock) return;

        const start = `${selectedDate}T${hour.toString().padStart(2, '0')}:00:00`;
        const end = `${selectedDate}T${(hour + 1).toString().padStart(2, '0')}:00:00`;

        await PhotoService.blockSlot({
            title: 'BLOQUEADO (Manual)',
            start,
            end,
            type: 'BLOCK',
            resourceId: selectedTeamMemberIds.length > 0 ? selectedTeamMemberIds[0] : 101
        });

        onRefresh();
    };

    const handleBlockDay = async () => {
        const confirmBlock = window.confirm(`¿Deseas bloquear TODO EL DÍA ${selectedDate}?`);
        if (!confirmBlock) return;

        const start = `${selectedDate}T00:00:00`;
        const end = `${selectedDate}T23:59:59`;

        await PhotoService.blockSlot({
            title: 'DÍA BLOQUEADO',
            start,
            end,
            type: 'BLOCK',
            resourceId: selectedTeamMemberIds.length > 0 ? selectedTeamMemberIds[0] : 101
        });

        onRefresh();
    };

    const handleRemoveBlock = async (id: string) => {
        if (window.confirm('¿Deseas eliminar este bloqueo?')) {
            await PhotoService.removeBlock(id);
            onRefresh();
        }
    };

    const getEventStyle = (status?: string, type?: string, title?: string) => {
        if (type === 'BLOCK') {
            if (title === 'DÍA BLOQUEADO') return 'bg-rose-100 border-rose-400 text-rose-800 border-dashed border-2 z-20 shadow-lg';
            return 'bg-slate-100 border-slate-300 text-slate-500 border-dashed border-2';
        }
        switch (status) {
            case 'SENT': return 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'; // ABIERTA
            case 'ACCEPTED':
            case 'CONFIRMED':
            case 'IN_PROGRESS': return 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'; // EN PROCESO
            case 'PHOTOS_TAKEN': return 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm'; // FOTOS TOMADAS
            case 'DELIVERED': return 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'; // TERMINADA
            case 'RESCHEDULE_PROPOSED': return 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm'; // REPROGRAMADA
            case 'REJECTED': return 'bg-red-50 border-red-200 text-red-700 shadow-sm'; // RECHAZADA
            default: return 'bg-slate-50 border-slate-200 text-slate-700 shadow-sm';
        }
    };

    const toggleTeamMember = (id: number) => {
        setSelectedTeamMemberIds(prev =>
            prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {/* Left Column: Date Picker & Resources Config */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <CalIcon size={14} /> Seleccionar Fecha
                    </h4>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-amber-500/5 transition-all mb-4"
                    />
                    <button
                        onClick={handleBlockDay}
                        className="w-full py-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                    >
                        <XCircle size={14} /> Bloquear Día Completo
                    </button>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Users size={14} /> Equipo Operativo
                        </h4>
                        <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"><Settings2 size={16} /></button>
                    </div>
                    <div className="space-y-2">
                        <button
                            onClick={() => setSelectedTeamMemberIds([])}
                            className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${selectedTeamMemberIds.length === 0 ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-50 hover:bg-slate-50'}`}
                        >
                            <span className="text-xs font-bold">Todos los Miembros</span>
                            {selectedTeamMemberIds.length === 0 && <Check size={14} />}
                        </button>
                        {TEAM_MOCK.map(member => (
                            <div
                                key={member.id}
                                onClick={() => toggleTeamMember(member.id)}
                                className={`flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer group border ${selectedTeamMemberIds.includes(member.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar name={member.name} size="xs" />
                                    <div>
                                        <p className={`text-xs font-bold ${selectedTeamMemberIds.includes(member.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{member.name}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{member.role}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedTeamMemberIds.includes(member.id) && <Check size={14} className="text-indigo-600" />}
                                    <div className={`w-2 h-2 rounded-full ${member.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsConfigModalOpen(true)}
                        className="w-full mt-6 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                    >
                        Configurar Horarios
                    </button>
                </div>
            </div>

            {/* Right Column: Hourly Timeline */}
            <div className="lg:col-span-3 bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col h-[750px]">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-900 text-white rounded-2xl shadow-lg"><Clock size={24} /></div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Agenda Diaria</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(d.getDate() - 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm transition-all"><ChevronLeft size={20} /></button>
                        <button onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(d.getDate() + 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm transition-all"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
                    <div className="relative min-h-full">
                        {/* Hour Rows */}
                        {hours.map(hour => (
                            <div key={hour} className="h-20 border-b border-slate-100 flex items-start gap-4 group">
                                <span className="text-[10px] font-black text-slate-400 w-12 text-right pt-1 group-hover:text-amber-500 transition-colors">
                                    {hour.toString().padStart(2, '0')}:00
                                </span>
                                <div
                                    onClick={() => handleBlockSlot(hour)}
                                    className="flex-1 h-full relative group-hover:bg-slate-50/50 transition-colors cursor-pointer rounded-lg"
                                >
                                    {/* Slot action indicator */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-100">
                                            <Plus size={14} className="text-amber-500" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Bloquear Horario</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Event Blocks (Absolute Positioned) */}
                        {dayEvents.map(event => {
                            const startTime = new Date(event.start);
                            const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                            const duration = (new Date(event.end).getTime() - startTime.getTime()) / (1000 * 60 * 60);

                            const top = (startHour - 8) * 80; // 80px per hour
                            const height = Math.max(duration * 80, 40); // Min height for visibility

                            return (
                                <div
                                    key={event.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (event.type === 'BLOCK') handleRemoveBlock(event.id);
                                    }}
                                    className={`absolute left-16 right-4 rounded-2xl border-l-4 p-4 transition-all hover:scale-[1.01] cursor-pointer z-10 animate-in zoom-in-95 duration-500 ${getEventStyle(event.status, event.type, event.title)}`}
                                    style={{ top: `${top}px`, height: `${height}px` }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="overflow-hidden">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
                                                {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(event.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                            <h5 className="font-bold text-sm truncate leading-tight">{event.title}</h5>
                                        </div>
                                        {event.status === 'CONFIRMED' && <ShieldCheck size={16} className="shrink-0" />}
                                        {event.type === 'BLOCK' && <XCircle size={16} className="shrink-0 opacity-40 hover:opacity-100 transition-opacity" />}
                                    </div>
                                    {height > 60 && event.type !== 'BLOCK' && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <Avatar name={event.title} size="xs" />
                                            <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">Shoot Confirmado</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Config Modal */}
            {isConfigModalOpen && availability && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsConfigModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Configurar Disponibilidad</h3>
                            <button onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Días Laborales</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                                        <button
                                            key={day}
                                            onClick={() => {
                                                const newDays = availability.workingDays.includes(day)
                                                    ? availability.workingDays.filter((d: string) => d !== day)
                                                    : [...availability.workingDays, day];
                                                setAvailability({...availability, workingDays: newDays});
                                            }}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${availability.workingDays.includes(day) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-100'}`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hora Inicio</label>
                                    <input
                                        type="time"
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                                        value={availability.startTime}
                                        onChange={(e) => setAvailability({...availability, startTime: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hora Fin</label>
                                    <input
                                        type="time"
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                                        value={availability.endTime}
                                        onChange={(e) => setAvailability({...availability, endTime: e.target.value})}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    await PhotoService.updateAvailability(availability);
                                    setIsConfigModalOpen(false);
                                    alert('Horarios actualizados correctamente');
                                }}
                                className="w-full py-4 bg-slate-900 text-amber-400 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MODALS ---



const RatingsModal: React.FC<{ isOpen: boolean, onClose: () => void, request: PhotoRequest, onSubmit: (r: any) => void }> = ({ isOpen, onClose, request, onSubmit }) => {
    if (!isOpen) return null;
    const [score, setScore] = useState(5);
    const [comment, setComment] = useState('');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-300 flex flex-col items-center">
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[28px] flex items-center justify-center mb-6 shadow-inner">
                    <Star size={40} fill="currentColor" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Calificar Servicio</h3>
                <p className="text-center text-xs text-slate-500 mb-8 font-medium leading-relaxed">Tu opinión nos ayuda a mantener los estándares de calidad del Castillo.</p>

                <div className="flex justify-center gap-3 mb-8">
                    {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setScore(s)} className={`p-2 rounded-2xl transition-all hover:scale-110 active:scale-90 ${score >= s ? 'text-amber-400' : 'text-slate-100'}`}>
                            <Star size={36} fill="currentColor" strokeWidth={1} />
                        </button>
                    ))}
                </div>

                <textarea className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium mb-6 resize-none outline-none focus:ring-4 focus:ring-amber-500/5 transition-all" rows={4} placeholder="Cuéntanos más sobre tu experiencia..." value={comment} onChange={e => setComment(e.target.value)} />

                <button onClick={() => onSubmit({ score, comment })} className="w-full py-4 bg-slate-900 text-amber-400 font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black active:scale-95 transition-all">Enviar Calificación</button>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

const PhotographyPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'BANDEJA' | 'CALENDARIO' | 'DASHBOARD' | 'CONFIGURACION' | 'NOTIFICACIONES' | 'DISPONIBILIDAD'>('BANDEJA');
    const [statusFilter, setStatusFilter] = useState('TODOS');
    const [typeFilter, setTypeFilter] = useState('TODOS');
    const [requests, setRequests] = useState<PhotoRequest[]>([]);
    const [events, setEvents] = useState<PhotoCalendarEvent[]>([]);
    const [stats, setStats] = useState<PhotoDashboardKPI | null>(null);
    const [availability, setAvailability] = useState<any>(null);
    const [restrictionConfig, setRestrictionConfig] = useState<PhotoRestrictionConfig | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<PhotoRequest | null>(null);
    const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
    const [isRatingOpen, setIsRatingOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Calendar Persistence States
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<number[]>([]);

    // New States for Drive Sync & Notifications
    const [driveConnected, setDriveConnected] = useState(false);
    const [driveEmail, setDriveEmail] = useState('');
    const [notifications, setNotifications] = useState<any[]>([
        { id: 'n1', requestId: 'req-mock', modelName: 'Jennifer Zuluaga', message: 'Contenido de catálogo subido a Drive. Carpeta creada.', status: 'PENDING', date: new Date().toISOString() }
    ]);

    // Initial Load
    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        setLoading(true);
        const [reqs, evs, kpis, avail, restr] = await Promise.all([
            PhotoService.getRequests({ studioId: '1', role: CURRENT_USER.role, userId: CURRENT_USER.id }),
            PhotoService.getCalendarEvents(),
            PhotoService.getDashboardStats(),
            PhotoService.getAvailability(),
            PhotoService.getRestrictionConfig()
        ]);
        setRequests(reqs);
        setEvents(evs);
        setStats(kpis);
        setAvailability(avail);
        setRestrictionConfig(restr);
        setLoading(false);
    };

    const handleUpdateAvailability = async (newAvail: any) => {
        await PhotoService.updateAvailability(newAvail);
        setAvailability(newAvail);
        alert('Disponibilidad actualizada correctamente.');
    };

    const handleUpdateRestriction = async (newConfig: Partial<PhotoRestrictionConfig>) => {
        const updated = await PhotoService.updateRestrictionConfig(newConfig);
        setRestrictionConfig(updated);
        alert('Configuración de restricciones actualizada.');
    };

    const handleToggleUnlock = async (userId: number) => {
        if (CURRENT_USER.role !== 'ADMIN' && CURRENT_USER.role !== 'SUPER_ADMIN') {
            alert('Solo el rol Super Admin puede desbloquear modelos.');
            return;
        }
        const updated = await PhotoService.toggleUserUnlock(userId);
        setRestrictionConfig(updated);
    };

    const handleCreateRequest = async (data: any) => {
        await PhotoService.createRequest({
            ...data,
            requester_id: CURRENT_USER.id,
            requester_name: CURRENT_USER.name
        });
        setIsRequestFormOpen(false);
        refreshData();
    };

    const handleStatusChange = async (id: string, status: PhotoRequestStatus) => {
        await PhotoService.updateStatus(id, status, CURRENT_USER.name);
        refreshData();
        if(selectedRequest && selectedRequest.id === id) setSelectedRequest(null);
    };

    const handleUpload = async (file: File) => {
        if (!selectedRequest) return;
        await PhotoService.uploadAsset(selectedRequest.id, file);

        // Simulate Google Drive Sync & Notification creation
        const today = new Date().toISOString().split('T')[0];
        const folderType = file.type.includes('video') ? 'Videos' : 'Fotos';
        const path = `Liv-Stre / El Castillo / 1. El Castillo / ${selectedRequest.requester_name} / Shoot_${today} / ${folderType}`;

        const newNotification = {
            id: `notif_${Date.now()}`,
            requestId: selectedRequest.id,
            modelName: selectedRequest.requester_name,
            message: `Nuevo contenido sincronizado en Drive (${driveEmail}). Ruta: ${path} / ${file.name}`,
            status: 'PENDING',
            date: new Date().toISOString()
        };
        setNotifications(prev => [newNotification, ...prev]);

        refreshData();
        alert(`Archivo subido y sincronizado con Google Drive.\n\nRuta: ${path}\n\nNotificaciones enviadas a la modelo, monitor, monitor secundario, jefe de monitor y administrador.`);
    };

    const handleAcknowledgeNotification = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'ACCEPTED' } : n));
    };

    const handleRating = async (ratingData: any) => {
        if (!selectedRequest) return;
        await PhotoService.submitRating({
            request_id: selectedRequest.id,
            from_user_id: CURRENT_USER.id,
            to_user_id: 0,
            role_target: 'FOTOGRAFO',
            score: ratingData.score,
            aspects: {},
            comment: ratingData.comment
        });
        setIsRatingOpen(false);
        refreshData();
    };

    // --- RENDERERS ---

    const renderInbox = () => {
        const filteredRequests = requests.filter(req => {
            const prStatus = req.status === 'SENT' ? 'ABIERTA'
                  : ['ACCEPTED', 'CONFIRMED', 'IN_PROGRESS', 'PHOTOS_TAKEN'].includes(req.status) ? 'EN PROCESO'
                  : ['DELIVERED', 'RATED', 'CLOSED'].includes(req.status) ? 'TERMINADA'
                  : req.status === 'RESCHEDULE_PROPOSED' ? 'REPROGRAMADA'
                  : req.status === 'REJECTED' ? 'RECHAZADA'
                  : 'CANCELADA';

            const matchesStatus = statusFilter === 'TODOS' || prStatus === statusFilter;
            const category = req.requires_makeup ? 'MAQUILLAJE' : req.type;
            const matchesType = typeFilter === 'TODOS' ||
                                (typeFilter === 'FOTO / VIDEO' && (category?.includes('FOTO') || category?.includes('VIDEO'))) ||
                                (typeFilter === 'MAQUILLAJE' && category === 'MAQUILLAJE');

            return matchesStatus && matchesType;
        });

        const getCardColor = (status: PhotoRequestStatus) => {
            if (['DELIVERED', 'RATED', 'CLOSED'].includes(status)) return 'border-b-emerald-400 bg-emerald-50/10';
            if (status === 'PHOTOS_TAKEN') return 'border-b-purple-400 bg-purple-50/10';
            if (['ACCEPTED', 'CONFIRMED', 'IN_PROGRESS'].includes(status)) return 'border-b-blue-400 bg-blue-50/10';
            if (status === 'SENT') return 'border-b-amber-400 bg-amber-50/10';
            return 'border-b-transparent';
        };

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Filters */}
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Estado:</span>
                        {['TODOS', 'ABIERTA', 'EN PROCESO', 'REPROGRAMADA', 'TERMINADA', 'RECHAZADA'].map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${statusFilter === f ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Categoría:</span>
                        {['TODOS', 'FOTO / VIDEO', 'MAQUILLAJE'].map(f => (
                            <button
                                key={f}
                                onClick={() => setTypeFilter(f)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${typeFilter === f ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredRequests.map(req => (
                        <div key={req.id} onClick={() => setSelectedRequest(req)} className={`bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full border-b-4 hover:scale-[1.02] ${getCardColor(req.status)}`}>
                            {req.priority === 'HIGH' && <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-bl-xl shadow-sm"></div>}

                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <Avatar name={req.requester_name} size="md" />
                                    <div>
                                        <h4 className="font-black text-slate-900 text-base tracking-tight">{req.requester_name}</h4>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                            <MapPin size={10} className="text-amber-500" /> {req.location}
                                        </p>
                                    </div>
                                </div>
                                <StatusBadge status={req.status} />
                            </div>

                            <div className="flex gap-3 mb-6 flex-1">
                                <div className="p-4 bg-slate-50 rounded-2xl flex-1 text-center border border-slate-100 group-hover:bg-white transition-colors">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Shoot</span>
                                    <span className="text-xs font-black text-slate-700 flex flex-col items-center justify-center gap-1">
                                        <div className="flex items-center gap-2">
                                            <CalIcon size={14} className="text-amber-500" />
                                            {req.confirmed_date ? req.confirmed_date.split('T')[0] : req.proposed_date}
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                                            {req.confirmed_date ? req.confirmed_date.split('T')[1].substring(0,5) : req.proposed_time}
                                        </span>
                                    </span>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl flex-1 text-center border border-slate-100 group-hover:bg-white transition-colors">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Creación</span>
                                    <span className="text-xs font-black text-slate-700 flex flex-col items-center justify-center gap-1">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-indigo-500" />
                                            {new Date(req.created_at).toLocaleDateString('es-ES')}
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                                            {new Date(req.created_at).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {req.status === 'DELIVERED' && (
                                <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                                    <div className="p-2 bg-emerald-500 text-white rounded-lg"><CheckCircle2 size={16} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none">Entregables Listos</p>
                                        <p className="text-[9px] text-emerald-600 font-bold mt-1">Material disponible para descarga</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50 opacity-60 group-hover:opacity-100 transition-all">
                                <div className="flex -space-x-2">
                                     {/* Small indicators for MUA / Photo if confirmed */}
                                     {req.requires_makeup && <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center" title="MUA Asignada"><Users size={10} className="text-slate-400"/></div>}
                                </div>
                                <button className="text-[10px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                    Gestionar Solicitud <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderDetailModal = () => {
        if (!selectedRequest) return null;
        const isPhotographer = CURRENT_USER.role !== 'MODELO';
        const canRate = selectedRequest.status === 'DELIVERED';

        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedRequest(null)} />
                <div className="relative bg-white w-full max-w-5xl h-full md:h-[85vh] rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-300">

                    {/* Left: Info */}
                    <div className="w-full md:w-1/3 bg-slate-50 p-10 border-r border-slate-100 overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="mb-10">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-3 py-1 bg-slate-900 text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-[0.2em]">Ficha Operativa</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{selectedRequest.id}</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">Detalles del Shoot</h2>
                        </div>

                        <div className="space-y-8 flex-1">
                            <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Modelo / Solicitante</p>
                                <div className="flex items-center gap-4">
                                    <Avatar name={selectedRequest.requester_name} size="md" />
                                    <div>
                                        <span className="font-black text-slate-800 text-base block">{selectedRequest.requester_name}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Sede Bogotá</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Estado de Producción</p>
                                <div className="flex">
                                    <StatusBadge status={selectedRequest.status} />
                                </div>
                            </div>

                            <div className="bg-amber-50/50 p-6 rounded-[32px] border border-amber-100/50">
                                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <ImageIcon size={12} /> Concepto Creativo
                                </p>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                                    "{selectedRequest.style_references || 'Sin referencias especificadas'}"
                                </p>
                            </div>

                            {/* Actions Group */}
                            <div className="pt-4 space-y-3 mt-auto">
                                {isPhotographer && selectedRequest.status === 'SENT' && (
                                    <>
                                        <button onClick={() => handleStatusChange(selectedRequest.id, 'ACCEPTED')} className="w-full py-4 bg-slate-900 text-amber-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Aceptar Solicitud</button>
                                        <button onClick={() => handleStatusChange(selectedRequest.id, 'RESCHEDULE_PROPOSED')} className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Sugerir Reprogramación</button>
                                    </>
                                )}
                                {isPhotographer && selectedRequest.status === 'ACCEPTED' && (
                                    <button onClick={() => handleStatusChange(selectedRequest.id, 'CONFIRMED')} className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Confirmar Bloque de Hora</button>
                                )}
                                {isPhotographer && selectedRequest.status === 'CONFIRMED' && (
                                    <button onClick={() => handleStatusChange(selectedRequest.id, 'IN_PROGRESS')} className="w-full py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Iniciar Sesión / Shoot</button>
                                )}
                                {isPhotographer && selectedRequest.status === 'IN_PROGRESS' && (
                                    <button onClick={() => handleStatusChange(selectedRequest.id, 'PHOTOS_TAKEN')} className="w-full py-4 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <Camera size={14} /> Marcar Fotos Tomadas
                                    </button>
                                )}
                                {isPhotographer && selectedRequest.status === 'PHOTOS_TAKEN' && (
                                    <button onClick={() => handleStatusChange(selectedRequest.id, 'DELIVERED')} className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <CheckCircle2 size={14} /> Finalizar Edición & Entregar
                                    </button>
                                )}
                                {canRate && (
                                    <button onClick={() => setIsRatingOpen(true)} className="w-full py-4 bg-amber-400 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                                        <Star size={16} fill="currentColor" /> Calificar Experiencia
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Assets & Delivery */}
                    <div className="flex-1 p-10 flex flex-col bg-white">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Repositorio de Entrega</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                    <ShieldCheck size={12} className="text-emerald-500" /> Sincronizado con Google Drive
                                </p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="p-3 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-slate-400 shadow-sm active:scale-90"><X size={24} /></button>
                        </div>

                        <div className="flex-1 bg-slate-50/50 rounded-[40px] border border-slate-200/60 p-8 overflow-y-auto custom-scrollbar shadow-inner">
                            {selectedRequest.assets.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                                        <UploadCloud size={32} className="opacity-20" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Esperando material...</p>
                                    <p className="text-xs font-medium text-slate-400 mt-2 max-w-[200px] text-center leading-relaxed">Los archivos aparecerán aquí una vez que el fotógrafo los suba.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                    {selectedRequest.assets.map(asset => (
                                        <div key={asset.id} className="group relative aspect-square bg-slate-200 rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                            <img src={asset.preview_url} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <a href={asset.drive_url} target="_blank" rel="noreferrer" className="p-3 bg-white rounded-2xl text-slate-900 hover:scale-110 active:scale-95 transition-all shadow-xl">
                                                    <Download size={20} />
                                                </a>
                                                <button className="p-3 bg-white/10 backdrop-blur rounded-2xl text-white hover:bg-white hover:text-slate-900 transition-all shadow-xl">
                                                    <Maximize2 size={20} />
                                                </button>
                                            </div>
                                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                                                <div className="px-2 py-0.5 bg-black/60 backdrop-blur text-white text-[8px] font-black uppercase rounded-lg">
                                                    {asset.type}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Upload Zone (Only Photographer) */}
                        {isPhotographer && (
                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[32px] cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group shadow-sm bg-slate-50/20">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                            <UploadCloud size={24} className="text-slate-300 group-hover:text-indigo-500" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Subir Material al Castillo Drive</span>
                                    </div>
                                    <input type="file" className="hidden" multiple onChange={(e) => { if(e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const handleConnectDrive = () => {
        // En un entorno real, esto redirigiría a la URL de OAuth de Google
        alert("Redirigiendo a la autorización de Google Drive...");
        setTimeout(() => {
            setDriveConnected(true);
            setDriveEmail('estudio@elcastillo.com');
        }, 1500);
    };

    const handleDisconnectDrive = () => {
        setDriveConnected(false);
        setDriveEmail('');
    };

    const renderSettings = () => (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${driveConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                            <UploadCloud size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Integración Google Drive</h3>
                            <p className="text-sm font-medium text-slate-500 mt-1">Conecta tu cuenta para automatizar la creación de carpetas y subida de contenido.</p>
                        </div>
                    </div>
                    <div>
                        {driveConnected ? (
                            <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 size={16} /> Conectado
                            </span>
                        ) : (
                            <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle size={16} /> Sin Conexión
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Estado de Conexión */}
                    <div className="space-y-6 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Estado de la Cuenta</h4>

                        {driveConnected ? (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cuenta Sincronizada</p>
                                    <p className="text-base font-black text-slate-800">{driveEmail}</p>
                                </div>
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <p className="text-xs font-bold text-emerald-800 leading-relaxed">
                                        El software tiene permisos activos para gestionar archivos. Todo el contenido subido por los fotógrafos se enviará automáticamente a esta cuenta.
                                    </p>
                                </div>
                                <button
                                    onClick={handleDisconnectDrive}
                                    className="w-full py-3 bg-white border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                                >
                                    Desconectar Cuenta
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                    Para que la sincronización sea automática y segura, debes otorgar permisos al software iniciando sesión con tu cuenta de Google.
                                </p>
                                <button
                                    onClick={handleConnectDrive}
                                    className="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-3"
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                                        </g>
                                    </svg>
                                    Conectar con Google Drive
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Estructura Lógica */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Estructura Lógica (Automática)</h4>
                        <p className="text-sm font-medium text-slate-500 mb-4">
                            Al subir contenido, el software organizará los archivos en tu Drive exactamente de esta manera:
                        </p>

                        <div className="bg-slate-900 rounded-[24px] p-6 text-slate-300 font-mono text-xs leading-loose shadow-inner overflow-x-auto">
                            <div className="flex items-center gap-2 text-amber-400 font-bold">
                                <span className="text-slate-500">📁</span> Liv-Stre <span className="text-[9px] text-slate-500 font-sans font-normal">(Software)</span>
                            </div>
                            <div className="ml-4 flex items-center gap-2 border-l border-slate-700 pl-4 py-1">
                                <span className="text-slate-500">📁</span> El Castillo <span className="text-[9px] text-slate-500 font-sans font-normal">(Licencia Maestra)</span>
                            </div>

                            {/* Sede Principal */}
                            <div className="ml-8 flex items-center gap-2 border-l border-slate-700 pl-4 py-1">
                                <span className="text-slate-500">📁</span> 1. El Castillo <span className="text-[9px] text-slate-500 font-sans font-normal">(Sede Principal)</span>
                            </div>
                            <div className="ml-12 flex items-center gap-2 border-l border-slate-700 pl-4 py-1 text-white font-bold">
                                <span className="text-slate-500">📁</span> Jennifer Zuluaga <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded ml-2 font-sans">Tercero Creado</span>
                            </div>

                            {/* Shoot 1 */}
                            <div className="ml-16 flex items-center gap-2 border-l border-slate-700 pl-4 py-1">
                                <span className="text-slate-500">📁</span> Shoot_2026-02-25
                            </div>
                            <div className="ml-20 flex items-center gap-2 border-l border-slate-700 pl-4 py-1">
                                <span className="text-slate-500">📁</span> Fotos
                            </div>
                            <div className="ml-24 flex items-center gap-2 border-l border-slate-700 pl-4 py-1 text-emerald-400">
                                <span className="text-slate-500">📄</span> foto_perfil_01.jpg
                            </div>
                            <div className="ml-20 flex items-center gap-2 border-l border-slate-700 pl-4 py-1">
                                <span className="text-slate-500">📁</span> Videos
                            </div>
                            <div className="ml-24 flex items-center gap-2 border-l border-slate-700 pl-4 py-1 text-emerald-400">
                                <span className="text-slate-500">📄</span> video_catalogo_01.mp4
                            </div>

                            {/* Shoot 2 (Ejemplo de otra fecha) */}
                            <div className="ml-16 flex items-center gap-2 border-l border-slate-700 pl-4 py-1 mt-2">
                                <span className="text-slate-500">📁</span> Shoot_2026-03-10 <span className="text-[9px] text-slate-500 font-sans font-normal">(Nueva fecha)</span>
                            </div>
                            <div className="ml-20 flex items-center gap-2 border-l border-slate-700 pl-4 py-1">
                                <span className="text-slate-500">📁</span> Fotos
                            </div>
                            <div className="ml-24 flex items-center gap-2 border-l border-slate-700 pl-4 py-1 text-emerald-400">
                                <span className="text-slate-500">📄</span> foto_sesion_01.jpg
                            </div>

                            {/* Sub-Sede (Ejemplo) */}
                            <div className="ml-12 flex items-center gap-2 border-l border-slate-700 pl-4 py-1 mt-4">
                                <span className="text-slate-500">📁</span> 1.1 El Castillo Norte <span className="text-[9px] text-slate-500 font-sans font-normal">(Sub-sede)</span>
                            </div>
                            <div className="ml-16 flex items-center gap-2 border-l border-slate-700 pl-4 py-1 text-white font-bold">
                                <span className="text-slate-500">📁</span> Camila Rojas <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded ml-2 font-sans">Tercero Creado</span>
                            </div>
                            <div className="ml-20 flex items-center gap-2 border-l border-slate-700 pl-4 py-1">
                                <span className="text-slate-500">📁</span> Shoot_2026-02-26
                            </div>
                            <div className="ml-24 flex items-center gap-2 border-l border-slate-700 pl-4 py-1">
                                <span className="text-slate-500">📁</span> Fotos
                            </div>
                            <div className="ml-24 flex items-center gap-2 border-l border-slate-700 pl-4 py-1">
                                <span className="text-slate-500">📁</span> Videos
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNotifications = () => {
        const pendingCount = notifications.filter(n => n.status === 'PENDING').length;
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Notificaciones de Contenido</h3>
                        <p className="text-xs font-medium text-slate-500 mt-1">Avisos de nuevo material subido a Drive. Deben ser aceptados para desaparecer.</p>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-black uppercase tracking-widest border border-amber-100">
                        {pendingCount} Pendientes
                    </div>
                </div>

                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 bg-white rounded-[32px] border border-slate-100">
                            <Bell size={48} className="mx-auto mb-3 opacity-20" />
                            <p className="font-medium">No hay notificaciones.</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div key={notif.id} className={`p-6 rounded-[24px] border transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${notif.status === 'PENDING' ? 'bg-white border-amber-200 shadow-lg shadow-amber-500/5' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-2xl ${notif.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 text-sm">{notif.modelName}</h4>
                                        <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">
                                            {new Date(notif.date).toLocaleString('es-ES')}
                                        </p>
                                    </div>
                                </div>
                                {notif.status === 'PENDING' ? (
                                    <button
                                        onClick={() => handleAcknowledgeNotification(notif.id)}
                                        className="w-full md:w-auto px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 shrink-0"
                                    >
                                        <Check size={16} /> Entendido / Aceptar
                                    </button>
                                ) : (
                                    <div className="px-4 py-2 bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0">
                                        <CheckCircle2 size={14} /> Aceptado
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };
    const renderAvailability = () => {
        if (!availability || !restrictionConfig) return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <RefreshCw className="animate-spin mb-4" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest">Cargando configuración...</p>
            </div>
        );

        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
                {/* Horarios Section */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Clock size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Horarios de Atención</h3>
                            <p className="text-sm font-medium text-slate-500 mt-1">Configura cuándo estás disponible para recibir solicitudes de fotos/videos.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Días Laborales</h4>
                            <div className="flex flex-wrap gap-2">
                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                                    <button
                                        key={day}
                                        onClick={() => {
                                            const newDays = availability.workingDays.includes(day)
                                                ? availability.workingDays.filter((d: string) => d !== day)
                                                : [...availability.workingDays, day];
                                            handleUpdateAvailability({ ...availability, workingDays: newDays });
                                        }}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${availability.workingDays.includes(day) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Rango Horario</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hora Inicio</p>
                                    <input
                                        type="time"
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                                        value={availability.startTime}
                                        onChange={e => handleUpdateAvailability({ ...availability, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hora Fin</p>
                                    <input
                                        type="time"
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                                        value={availability.endTime}
                                        onChange={e => handleUpdateAvailability({ ...availability, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 p-8 bg-amber-50 rounded-[32px] border border-amber-100 flex items-start gap-4">
                        <div className="p-3 bg-white rounded-2xl text-amber-500 shadow-sm">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Sincronización Activa</p>
                            <p className="text-xs text-amber-800/70 font-medium mt-1 leading-relaxed">
                                Estas horas restringen las opciones que las modelos verán al momento de solicitar una sesión. Si marcas un día como no laboral, el sistema bloqueará automáticamente las solicitudes para esa fecha.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Restricciones Section */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
                            <ShieldAlert size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Restricción de Frecuencia</h3>
                            <p className="text-sm font-medium text-slate-500 mt-1">Configura cada cuántos días una modelo puede volver a solicitar una sesión.</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="max-w-xs">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Días de Restricción</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-rose-500/5 transition-all"
                                    value={restrictionConfig.restrictionDays}
                                    onChange={e => handleUpdateRestriction({ restrictionDays: parseInt(e.target.value) || 0 })}
                                />
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Días</span>
                            </div>
                        </div>

                        {['ADMIN', 'SUPER_ADMIN'].includes(CURRENT_USER.role) && (
                            <div className="pt-8 border-t border-slate-50">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Excepciones Manuales (Desbloqueos)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(restrictionConfig.unlockedUsers || []).map((userId: number) => {
                                        const isUnlocked = true;
                                        return (
                                            <div key={userId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={String(userId)} size="xs" />
                                                    <span className="text-xs font-bold text-slate-700">Usuario #{userId}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleUnlock(userId)}
                                                    className={`p-2 rounded-xl transition-all ${isUnlocked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-300 border border-slate-100 hover:text-rose-500'}`}
                                                    title={isUnlocked ? 'Desbloqueado' : 'Bloqueado por sistema'}
                                                >
                                                    {isUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderDashboard = () => (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Solicitudes Totales</p>
                    <p className="text-4xl font-black text-slate-900 mt-3 tracking-tighter">{stats?.total_requests}</p>
                    <div className="mt-4 flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase">
                        <Zap size={12} /> +12% este mes
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rating Promedio</p>
                    <p className="text-4xl font-black text-amber-500 mt-3 tracking-tighter flex items-center gap-2">
                        {stats?.rating_photographer_avg} <Star size={24} fill="currentColor" strokeWidth={1} />
                    </p>
                    <p className="mt-4 text-slate-400 text-[10px] font-black uppercase">Basado en 45 opiniones</p>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SLA de Entrega</p>
                    <p className="text-4xl font-black text-indigo-600 mt-3 tracking-tighter">{stats?.avg_delivery_time_hours}h</p>
                    <div className="mt-4 flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase">
                        <Clock size={12} /> Objetivo: 48h
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Eficiencia Agenda</p>
                    <p className="text-4xl font-black text-emerald-500 mt-3 tracking-tighter">85%</p>
                    <div className="mt-4 flex items-center gap-2 text-red-400 text-[10px] font-black uppercase">
                        <AlertTriangle size={12} /> {stats?.reschedule_rate}% Reprogramaciones
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-96 flex flex-col">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Embudo de Producción</h4>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.status_distribution}
                                    innerRadius={75}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {stats?.status_distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#10B981', '#F59E0B', '#6366F1', '#EF4444', '#8B5CF6'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '24px', border:'none', boxShadow:'0 10px 30px rgba(0,0,0,0.1)'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-96 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Ranking de Fotógrafos</h4>
                        <button className="text-[10px] font-black text-indigo-500 hover:underline">VER REPORTE COMPLETO</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Shoots</th>
                                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Rating</th>
                                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Tendencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats?.top_photographers.map((p, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={p.name} size="xs" />
                                                <span className="text-sm font-bold text-slate-700">{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-center text-xs font-black text-slate-900">{p.jobs}</td>
                                        <td className="py-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black">
                                                {p.rating} <Star size={10} fill="currentColor" />
                                            </span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 text-emerald-500">
                                                <TrendingUp size={14} />
                                                <span className="text-[10px] font-black">+5.4%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 relative">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 text-amber-400 rounded-2xl shadow-xl shadow-slate-900/20"><Camera size={32} /></div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Módulo de Fotografía</h1>
                            <p className="text-sm text-slate-500 font-medium">Coordinación estética y operativa de la marca El Castillo.</p>
                        </div>
                    </div>
                </div>
                {CURRENT_USER.role === 'MODELO' && (
                    <button
                        onClick={() => setIsRequestFormOpen(true)}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-amber-400 font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-2xl shadow-slate-900/10 active:scale-95 border-b-4 border-slate-800"
                    >
                        <Plus size={18} /> AGENDAR SESIÓN
                    </button>
                )}
            </div>

            {/* Navigation & Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 rounded-[28px] border border-slate-100 shadow-sm gap-4">
                <div className="flex bg-slate-100 p-1 rounded-[22px] w-full md:w-auto overflow-x-auto custom-scrollbar">
                    {[
                        { id: 'BANDEJA', label: 'Gestión Solicitudes', icon: ImageIcon },
                        { id: 'CALENDARIO', label: 'Vista de Agenda', icon: CalIcon },
                        { id: 'NOTIFICACIONES', label: 'Notificaciones', icon: Bell, badge: notifications.filter(n => n.status === 'PENDING').length }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap relative ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <tab.icon size={16} className={`${activeTab === tab.id ? 'text-amber-500' : 'text-slate-400'}`} />
                            {tab.label}
                            {tab.badge ? (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[8px] flex items-center justify-center animate-pulse">
                                    {tab.badge}
                                </span>
                            ) : null}
                        </button>
                    ))}
                    {['ADMIN', 'ADMINISTRADOR', 'MONITOR', 'FOTOGRAFO'].includes(CURRENT_USER.role) && (
                        <>
                            <button
                                onClick={() => setActiveTab('DASHBOARD')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'DASHBOARD' ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <BarChart3 size={16} className={`${activeTab === 'DASHBOARD' ? 'text-amber-500' : 'text-slate-400'}`} />
                                Análisis
                            </button>
                            <button
                                onClick={() => setActiveTab('CONFIGURACION')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'CONFIGURACION' ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <Settings2 size={16} className={`${activeTab === 'CONFIGURACION' ? 'text-amber-500' : 'text-slate-400'}`} />
                                Config Drive
                            </button>
                            <button
                                onClick={() => setActiveTab('DISPONIBILIDAD')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'DISPONIBILIDAD' ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <Clock size={16} className={`${activeTab === 'DISPONIBILIDAD' ? 'text-amber-500' : 'text-slate-400'}`} />
                                Disponibilidad
                            </button>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3 px-4 py-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                         <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                         <input type="text" placeholder="Buscar por modelo o ID..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-amber-500/5 transition-all" />
                    </div>
                    <button onClick={refreshData} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all active:scale-90"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="min-h-[600px] transition-all duration-500">
                {loading && !requests.length ? (
                    <div className="flex flex-col items-center justify-center py-40 text-slate-200">
                        <RefreshCw className="animate-spin mb-6" size={64} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Cargando plataforma de medios...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'BANDEJA' && renderInbox()}
                        {activeTab === 'CALENDARIO' && (
                            <PhotoCalendar
                                events={events}
                                onRefresh={refreshData}
                                selectedDate={selectedDate}
                                setSelectedDate={setSelectedDate}
                                selectedTeamMemberIds={selectedTeamMemberIds}
                                setSelectedTeamMemberIds={setSelectedTeamMemberIds}
                            />
                        )}
                        {activeTab === 'DASHBOARD' && renderDashboard()}
                        {activeTab === 'CONFIGURACION' && renderSettings()}
                        {activeTab === 'NOTIFICACIONES' && renderNotifications()}
                        {activeTab === 'DISPONIBILIDAD' && renderAvailability()}
                    </>
                )}
            </div>

            {/* Modals & Overlays */}
            {isRequestFormOpen && <PhotoRequestForm onClose={() => setIsRequestFormOpen(false)} onSubmit={handleCreateRequest} />}
            {selectedRequest && renderDetailModal()}
            {selectedRequest && isRatingOpen && <RatingsModal isOpen={isRatingOpen} onClose={() => setIsRatingOpen(false)} request={selectedRequest} onSubmit={handleRating} />}

        </div>
    );
};

// Placeholder for Maximize icon which wasn't imported in initial block but used in DetailPane
const Maximize2: React.FC<{ size?: number, className?: string }> = ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
);

const TrendingUp: React.FC<{ size?: number, className?: string }> = ({ size = 20, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
);

export default PhotographyPage;
