
import React, { useState, useRef, useEffect } from 'react';
import {
  Search, FilePlus, Download, Filter,
  Edit2, Eye, ChevronDown, Clock, CheckCircle, AlertCircle, Camera, UserPlus, X, Zap
} from 'lucide-react';
import PhotoService from '../PhotoService';
import PetitionService from '../PetitionService';
import { PhotoRequestForm } from './PhotoRequestForm';
import { PhotoRequest } from '../types';

interface RequestsPageProps {
  onNavigate?: (id: string) => void;
}

type BaseRequestRow = {
  id: string;
  consecutive: string;
  type: string;
  user: string;
  status: string;
  location: string;
  category?: string;
  createdAt: string;
  scheduledAt: string;
};

type PhotoRequestRow = BaseRequestRow & {
  isPhotoRequest: true;
  original: PhotoRequest;
};

type MockRequestRow = BaseRequestRow & {
  isPhotoRequest: false;
  original: any;
};

type RequestRow = PhotoRequestRow | MockRequestRow;

const CURRENT_USER = {
    id: 3990,
    name: 'Jennifer Zuluaga',
    role: 'ADMIN' // or 'MODELO', 'FOTOGRAFO'
};

const RequestsPage: React.FC<RequestsPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('TODOS');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [isPhotoFormOpen, setIsPhotoFormOpen] = useState(false);
  const [photoRequests, setPhotoRequests] = useState<PhotoRequest[]>([]);
  const [selectedPhotoRequest, setSelectedPhotoRequest] = useState<PhotoRequest | null>(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchPhotoRequests = async () => {
    try {
        const reqs = await PhotoService.getRequests({ studioId: '1' });
        setPhotoRequests(reqs);
    } catch (e) {
        console.error("Error fetching photo requests:", e);
    }
  };

  const fetchPetitions = async () => {
    try {
        const { data, error } = await PetitionService.getPetitions({
            start: 0,
            length: 100,
            sortBy: 'updated_at',
            dir: 'DESC'
        });
        if (data && data.data) {
            setPetitions(data.data as any[]);
        }
    } catch (e) {
        console.error("Error fetching petitions:", e);
    }
  };

  useEffect(() => {
    fetchPhotoRequests();
    fetchPetitions();
  }, []);

  const handleCreatePhotoRequest = async (data: any) => {
      await PhotoService.createRequest({
          ...data,
          requester_id: CURRENT_USER.id,
          requester_name: CURRENT_USER.name
      });
      setIsPhotoFormOpen(false);
      fetchPhotoRequests();
      alert('Solicitud de fotografía creada exitosamente. Está en proceso de revisión.');
  };

  const [petitions, setPetitions] = useState<any[]>([]);

  const handleUpdatePhotoRequestStatus = async (id: string, status: any, notes?: string) => {
      await PhotoService.updateStatus(id, status, CURRENT_USER.name, notes, rescheduleData);
      setSelectedPhotoRequest(null);
      fetchPhotoRequests();
      if (status === 'REJECTED' || status === 'RESCHEDULE_PROPOSED') {
          alert(`Se ha notificado a la modelo sobre el cambio de estado.`);
      } else {
          alert('Estado actualizado y agenda sincronizada.');
      }
  };

  const allRequests: RequestRow[] = [
      ...photoRequests.map((pr): PhotoRequestRow => ({
          id: pr.id,
          consecutive: pr.id.replace('PH-', ''),
          type: `Fotografía (${pr.type})`,
          user: pr.requester_name,
          status: pr.status === 'SENT' ? 'ABIERTA'
                  : ['ACCEPTED', 'CONFIRMED', 'IN_PROGRESS'].includes(pr.status) ? 'EN PROCESO'
                  : ['DELIVERED', 'RATED', 'CLOSED'].includes(pr.status) ? 'TERMINADA'
                  : pr.status === 'RESCHEDULE_PROPOSED' ? 'REPROGRAMADA'
                  : pr.status === 'REJECTED' ? 'RECHAZADA'
                  : 'CANCELADA',
          location: pr.location || 'Sede Principal',
          category: pr.requires_makeup ? 'MAQUILLAJE' : pr.type,
          createdAt: pr.created_at,
          scheduledAt: pr.confirmed_date || `${pr.proposed_date}T${pr.proposed_time}:00`,
          isPhotoRequest: true,
          original: pr
      })),
      ...petitions.map((p): RequestRow => ({
          id: String(p.ptn_id),
          consecutive: String(p.ptn_consecutive || p.ptn_id),
          type: p.ptn_type === 'ACCOUNT_CREATION' ? 'Creación de Cuenta' : p.ptn_type,
          user: `${p.users?.user_name || ''} ${p.users?.user_surname || ''}`.trim() || 'Desconocido',
          status: p.ptn_state === 'PENDIENTE' ? 'ABIERTA'
                  : p.ptn_state === 'EN PROCESO' ? 'EN PROCESO'
                  : p.ptn_state === 'APROBADA' ? 'TERMINADA'
                  : p.ptn_state === 'RECHAZADA' ? 'RECHAZADA'
                  : 'ABIERTA',
          location: p.studios_models?.studios?.std_name || 'Sede Principal',
          category: p.ptn_type === 'ACCOUNT_CREATION' ? 'CUENTA' : 'ADMIN',
          createdAt: p.created_at,
          scheduledAt: p.updated_at,
          isPhotoRequest: false,
          original: p
      }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredRequests = allRequests.filter(req => {
      const matchesStatus = activeTab === 'TODOS' || req.status === activeTab;
      const matchesType = typeFilter === 'TODOS' ||
                         (typeFilter === 'FOTO / VIDEO' && (req.category?.includes('FOTO') || req.category?.includes('VIDEO'))) ||
                         (typeFilter === 'MAQUILLAJE' && req.category === 'MAQUILLAJE') ||
                         (typeFilter === 'CUENTA' && req.category === 'CUENTA');
      return matchesStatus && matchesType;
  });

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'ABIERTA': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'EN PROCESO': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'TERMINADA': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'REPROGRAMADA': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'RECHAZADA': return 'bg-red-50 text-red-600 border-red-100';
      case 'CANCELADA': return 'bg-slate-50 text-slate-400 border-slate-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'ABIERTA': return <AlertCircle size={12} />;
      case 'EN PROCESO': return <Clock size={12} />;
      case 'TERMINADA': return <CheckCircle size={12} />;
      case 'REPROGRAMADA': return <Clock size={12} className="rotate-180" />;
      case 'RECHAZADA': return <X size={12} />;
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Solicitudes</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Gestión y seguimiento de trámites operativos.</p>
        </div>

        {/* Action Button with Dropdown Choice */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-amber-400 font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 text-xs uppercase tracking-widest ring-1 ring-slate-800"
          >
            <FilePlus size={18} />
            NUEVA SOLICITUD
            <ChevronDown size={16} className={`transition-transform duration-300 ${showNewMenu ? 'rotate-180' : ''}`} />
          </button>

          {showNewMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 py-3 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
              <div className="px-4 pb-2 mb-2 border-b border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Tipo</p>
              </div>
              <div className="px-2 space-y-1">
                <button
                  onClick={() => {
                      setShowNewMenu(false);
                      setIsPhotoFormOpen(true);
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-indigo-50 transition-all group text-left"
                >
                  <div className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                    <Camera size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Sesión Fotográfica</p>
                    <p className="text-[10px] text-slate-500 font-medium">Agendar shoot y ver calendario</p>
                  </div>
                </button>

                <button
                  className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-amber-50 transition-all group text-left"
                >
                  <div className="p-2.5 bg-amber-500 text-[#0B1120] rounded-xl shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Creación de Cuenta</p>
                    <p className="text-[10px] text-slate-500 font-medium">Nuevas plataformas para modelos</p>
                  </div>
                </button>

                <button
                  className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all group text-left"
                >
                  <div className="p-2.5 bg-slate-100 text-slate-500 rounded-xl group-hover:scale-110 transition-transform">
                    <FilePlus size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Trámite Administrativo</p>
                    <p className="text-[10px] text-slate-500 font-medium">Cartas, permisos y documentos</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Toolbelt */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col gap-6">
          <div className="relative w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario, nick o consecutivo..."
              className="w-full pl-11 pr-4 py-4 bg-slate-50 border-transparent rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-400 transition-all font-medium"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Filtrar por Estado:</span>
              {['TODOS', 'ABIERTA', 'EN PROCESO', 'REPROGRAMADA', 'TERMINADA', 'RECHAZADA'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeTab === tab
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
                      : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Categoría de Trámite:</span>
              {['TODOS', 'FOTO / VIDEO', 'MAQUILLAJE', 'CUENTA'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setTypeFilter(filter)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    typeFilter === filter
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                      : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {filter.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trámite</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitante</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sede</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">F. Creación</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">F. Programada</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900 tracking-tight">{req.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-slate-700">{req.user}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black tracking-widest ${getStatusStyle(req.status)}`}>
                        {getStatusIcon(req.status)}
                        {req.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">{req.location}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">El Castillo</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-900 font-black">{new Date(req.createdAt).toLocaleDateString('es-ES')}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(req.createdAt).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-indigo-600 font-black">{new Date(req.scheduledAt).toLocaleDateString('es-ES')}</span>
                      <span className="text-[9px] text-indigo-400 font-bold uppercase">{new Date(req.scheduledAt).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </td>
                    <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                            if (req.isPhotoRequest) {
                                setSelectedPhotoRequest(req.original);
                            }
                        }}
                        className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        title="Ver Detalles"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                            if (req.isPhotoRequest) {
                                setSelectedPhotoRequest(req.original);
                            }
                        }}
                        className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                        title="Editar Solicitud"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isPhotoFormOpen && <PhotoRequestForm onClose={() => setIsPhotoFormOpen(false)} onSubmit={handleCreatePhotoRequest} />}

      {selectedPhotoRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedPhotoRequest(null)} />
              <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="font-black text-xl text-slate-900 tracking-tight">Revisar Solicitud</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">#{selectedPhotoRequest.id}</p>
                      </div>
                      <button onClick={() => setSelectedPhotoRequest(null)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400"><X size={20} /></button>
                  </div>
                  <div className="p-8 space-y-6 overflow-y-auto">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modelo</p>
                          <p className="font-bold text-slate-900">{selectedPhotoRequest.requester_name}</p>
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha y Hora Propuesta</p>
                          <p className="font-bold text-slate-900">{selectedPhotoRequest.proposed_date} a las {selectedPhotoRequest.proposed_time}</p>
                      </div>

                      {selectedPhotoRequest.status === 'SENT' && CURRENT_USER.role === 'ADMIN' && (
                          <div className="space-y-4 pt-4 border-t border-slate-100">
                              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Acciones de Aprobación</h4>

                              <button
                                  onClick={() => handleUpdatePhotoRequestStatus(selectedPhotoRequest.id, 'ACCEPTED')}
                                  className="w-full py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
                              >
                                  Aprobar y Agendar
                              </button>

                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sugerir Reprogramación</p>
                                  <div className="flex gap-2">
                                      <input type="date" className="flex-1 p-2 rounded-lg border border-slate-200 text-xs" value={rescheduleData.date} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} />
                                      <input type="time" className="w-24 p-2 rounded-lg border border-slate-200 text-xs" value={rescheduleData.time} onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})} />
                                  </div>
                                  <button
                                      onClick={() => handleUpdatePhotoRequestStatus(selectedPhotoRequest.id, 'RESCHEDULE_PROPOSED', 'Se propuso nueva fecha')}
                                      className="w-full py-2 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition-all"
                                  >
                                      Enviar Propuesta
                                  </button>
                              </div>

                              <button
                                  onClick={() => {
                                      const reason = prompt("Razón del rechazo:");
                                      if (reason) handleUpdatePhotoRequestStatus(selectedPhotoRequest.id, 'REJECTED', reason);
                                  }}
                                  className="w-full py-3 bg-white border border-rose-200 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                              >
                                  Rechazar Solicitud
                              </button>
                          </div>
                      )}

                      {selectedPhotoRequest.status === 'RESCHEDULE_PROPOSED' && CURRENT_USER.role === 'ADMIN' && (
                          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                              <p className="text-xs font-bold text-amber-800">Esperando que la modelo apruebe la reprogramación para el {selectedPhotoRequest.proposed_date} a las {selectedPhotoRequest.proposed_time}.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default RequestsPage;
