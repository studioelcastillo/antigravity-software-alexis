
import React, { useState, useEffect, useMemo } from 'react';
import {
  Share2, Search, Filter, Plus, CheckCircle2, Clock,
  MoreVertical, Calendar as CalIcon, LayoutGrid, List,
  Smartphone, UserCheck, Users, ShieldCheck, Zap,
  Instagram, Twitter, Facebook, Music2, ArrowRight,
  ExternalLink, ChevronRight, CheckCircle, AlertCircle, RefreshCw,
  Settings, X, Check, FileText, Image as ImageIcon, Video, Link2, Lock,
  Info
} from 'lucide-react';
import ContentSalesService from '../ContentSalesService';
import { ContentTask, ContentPlatform, ContentAsset, ContentTaskStatus } from '../types';
import Avatar from './Avatar';
import UserService from '../UserService';
import { getStoredUser } from '../session';

const ContentSalesPage: React.FC = () => {
  const sessionUser = getStoredUser();
  const studioId = sessionUser?.std_id ? String(sessionUser.std_id) : '';
  const [activeTab, setActiveTab] = useState<'PRIORITY' | 'CALENDAR' | 'INBOX' | 'CONFIG'>('PRIORITY');
  const [tasks, setTasks] = useState<ContentTask[]>([]);
  const [platforms, setPlatforms] = useState<ContentPlatform[]>([]);
  const [inboxAssets, setInboxAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const [t, p, a] = await Promise.all([
            ContentSalesService.getEligibleModels(studioId),
            ContentSalesService.getPlatforms(),
            ContentSalesService.getAssets('PENDING_REVIEW')
        ]);
        setTasks(t);
        setPlatforms(p);
        setInboxAssets(a);
    } finally {
        setLoading(false);
    }
  };

  const handleMarkDone = async (taskId: string) => {
      if(!confirm("¿Confirmas que el contenido de hoy ha sido publicado exitosamente?")) return;
      await ContentSalesService.markAsDone(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleApproveAsset = async (assetId: string) => {
      if(!confirm("¿Aprobar este contenido para publicación?")) return;
      await ContentSalesService.updateAssetStatus(assetId, 'APPROVED');
      setInboxAssets(prev => prev.filter(a => a.id !== assetId));
  };

  const handleRejectAsset = async (assetId: string) => {
      if(!confirm("¿Rechazar este contenido?")) return;
      await ContentSalesService.updateAssetStatus(assetId, 'REJECTED');
      setInboxAssets(prev => prev.filter(a => a.id !== assetId));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t =>
        t.model_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-slate-900 text-amber-400 rounded-2xl shadow-xl shadow-slate-900/20"><Share2 size={32} /></div>
              Venta de Contenido
           </h2>
           <p className="text-sm text-slate-500 mt-2 font-medium">Gestión de redes y cumplimiento operativo (Regla 10h SM).</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
            <button onClick={loadData} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm transition-all">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setIsTaskModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95">
                <Plus size={18} /> Crear Tarea de Subida
            </button>
        </div>
      </div>

      <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-[28px] border border-slate-200/60 w-full md:w-fit shadow-sm gap-1 overflow-x-auto no-scrollbar">
          {[
              { id: 'PRIORITY', label: 'Elegibilidad & Cola', icon: UserCheck },
              { id: 'CALENDAR', label: 'Calendario Pubs', icon: CalIcon },
              { id: 'INBOX', label: 'Contenido Recibido', icon: Smartphone },
              { id: 'CONFIG', label: 'Plataformas', icon: Settings },
          ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-6 py-3.5 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap relative ${activeTab === tab.id ? 'bg-slate-900 text-amber-400 shadow-xl shadow-slate-900/30' : 'text-slate-500 hover:text-slate-900 hover:bg-white'}`}
              >
                  <tab.icon size={16} />
                  {tab.label}
                  {tab.id === 'INBOX' && inboxAssets.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white">
                          {inboxAssets.length}
                      </span>
                  )}
              </button>
          ))}
      </div>

      <div className="min-h-[600px] transition-all duration-300">
          {activeTab === 'PRIORITY' && (
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Modelos Pendientes de Contenido</h3>
                        <p className="text-xs text-slate-500 font-medium italic">Modelos que cumplen &gt;10h en SM y requieren post diario.</p>
                      </div>
                      <div className="relative group w-full md:w-80">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" placeholder="Buscar modelo..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-amber-500/5 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                      </div>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead>
                              <tr className="bg-slate-50/50">
                                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo / Horas SM</th>
                                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plataformas</th>
                                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {filteredTasks.map(task => (
                                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-8 py-5">
                                          <div className="flex items-center gap-4">
                                              <Avatar name={task.model_name} src={task.model_avatar} size="md" />
                                              <div>
                                                  <p className="text-sm font-black text-slate-800">{task.model_name}</p>
                                                  <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg w-fit mt-1">{task.streamate_hours}H SEMANA</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-8 py-5 text-xs font-bold text-slate-500">{task.assigned_name || 'Sin Asignar'}</td>
                                      <td className="px-8 py-5">
                                          <div className="flex gap-1.5">
                                              {task.platforms.map(p => <div key={p} className="p-1.5 bg-slate-100 rounded-lg"><Zap size={12}/></div>)}
                                          </div>
                                      </td>
                                      <td className="px-8 py-5 text-right">
                                          <button onClick={() => handleMarkDone(task.id)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle2 size={18} /></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}
          {activeTab === 'INBOX' && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 animate-in fade-in">
                  {inboxAssets.map(asset => (
                      <div key={asset.id} className="aspect-[3/4] bg-white rounded-[32px] overflow-hidden relative group border border-slate-100">
                          <img src={asset.preview_url} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
                              <p className="text-white text-[10px] font-black uppercase">{asset.model_name}</p>
                              <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleApproveAsset(asset.id)} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase">Aprobar</button>
                                  <button onClick={() => handleRejectAsset(asset.id)} className="p-2 bg-red-500 text-white rounded-lg"><X size={12}/></button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {isTaskModalOpen && <ContentTaskModal onClose={() => setIsTaskModalOpen(false)} onSubmit={() => {setIsTaskModalOpen(false); loadData();}} platforms={platforms} />}
    </div>
  );
};

const ContentTaskModal: React.FC<{ onClose: () => void, onSubmit: () => void, platforms: ContentPlatform[] }> = ({ onClose, onSubmit, platforms }) => {
    const [selectedModelId, setSelectedModelId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [models, setModels] = useState<any[]>([]);
    const [modelsLoading, setModelsLoading] = useState(true);
    const [modelsError, setModelsError] = useState('');

    useEffect(() => {
        let isActive = true;
        const loadModels = async () => {
            setModelsLoading(true);
            setModelsError('');
            try {
                const response = await UserService.getUsersDatatable({ start: 0, length: 100, profiles: '3' });
                if (!isActive) return;
                setModels(response.data?.data || []);
            } catch (error) {
                if (!isActive) return;
                setModelsError('No se pudo cargar la lista de modelos.');
            } finally {
                if (isActive) setModelsLoading(false);
            }
        };
        loadModels();
        return () => {
            isActive = false;
        };
    }, []);

    const handleSubmit = async () => {
        if (!selectedModelId) {
            alert("Selecciona un modelo");
            return;
        }
        setIsSubmitting(true);
        const model = models.find((u: any) => u.user_id.toString() === selectedModelId);

        await ContentSalesService.createTask({
            model_user_id: Number(selectedModelId),
            model_name: model ? `${model.user_name} ${model.user_surname || ''}` : 'Modelo',
            model_avatar: model?.user_photo_url,
            streamate_hours: 0,
            platforms: platforms.map(p => p.id)
        });

        setIsSubmitting(false);
        onSubmit();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl p-10">
                <h3 className="text-2xl font-black text-slate-900 mb-6">Planificar Tarea de Subida</h3>
                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Seleccionar Modelo</label>
                        <select
                            value={selectedModelId}
                            onChange={(e) => setSelectedModelId(e.target.value)}
                            disabled={modelsLoading}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-amber-500"
                        >
                            <option value="">
                                {modelsLoading ? 'Cargando modelos...' : '-- Elegir Modelo --'}
                            </option>
                            {models.map((model: any) => (
                                <option key={model.user_id} value={model.user_id}>
                                    {`${model.user_name} ${model.user_surname || ''}`.trim()}
                                </option>
                            ))}
                        </select>
                        {modelsError && (
                            <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                                {modelsError}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-slate-900 text-amber-400 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar Tarea'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ContentSalesPage;
