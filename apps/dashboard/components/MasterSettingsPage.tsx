
import React, { useState, useEffect } from 'react';
import {
  Settings, Save, Shield, CreditCard, Building2,
  Phone, Globe, Clock, FileText, CheckCircle2,
  History, AlertCircle, RefreshCw
} from 'lucide-react';
import MasterSettingsService from '../MasterSettingsService';
import { GlobalSettings, AuditLog } from '../types';
import { getStoredUser } from '../session';

const MasterSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PAYMENT' | 'SUPPORT' | 'COMPANY' | 'AUDIT'>('PAYMENT');
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Load Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, auditData] = await Promise.all([
        MasterSettingsService.getSettings(),
        MasterSettingsService.getAuditLogs()
      ]);
      setSettings(data);
      setLogs(auditData);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Error al cargar configuración.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    if (!window.confirm('¿Estás seguro de aplicar estos cambios globales? Afectará a todos los usuarios inmediatamente.')) return;

    setSaving(true);
    setMessage(null);
    try {
      const userName = getStoredUser()?.user_name || 'Admin';

      const updated = await MasterSettingsService.updateSettings(settings, userName);
      setSettings(updated);

      // Refresh logs
      const newLogs = await MasterSettingsService.getAuditLogs();
      setLogs(newLogs);

      setMessage({ type: 'success', text: 'Configuración actualizada correctamente.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar cambios.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (section: keyof GlobalSettings, field: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [section]: {
        //@ts-ignore
        ...settings[section],
        [field]: value
      }
    });
  };

  if (loading || !settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <RefreshCw className="animate-spin text-slate-400 mb-4" size={32} />
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Cargando Maestro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <Settings className="text-amber-500" size={32} />
             Configuración Global
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Administración maestra de parámetros del sistema.</p>
        </div>

        {/* Save Actions */}
        <div className="flex items-center gap-4">
           {settings.last_updated && (
             <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Actualización</p>
                <p className="text-xs font-bold text-slate-700">{new Date(settings.last_updated).toLocaleString()} por {settings.updated_by}</p>
             </div>
           )}
           <button
             onClick={handleSave}
             disabled={saving}
             className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-xs uppercase tracking-widest hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
             Guardar Cambios
           </button>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
           {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
           <span className="font-bold text-sm">{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-100 w-fit shadow-sm">
         {[
           { id: 'PAYMENT', label: 'Datos de Pago', icon: CreditCard },
           { id: 'SUPPORT', label: 'Soporte y Contacto', icon: Phone },
           { id: 'COMPANY', label: 'Empresa / Marca', icon: Building2 },
           { id: 'AUDIT', label: 'Auditoría', icon: History },
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
               activeTab === tab.id
               ? 'bg-slate-900 text-amber-400 shadow-md'
               : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
             }`}
           >
             <tab.icon size={14} />
             {tab.label}
           </button>
         ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 p-8 min-h-[500px]">

        {/* PAYMENT SETTINGS */}
        {activeTab === 'PAYMENT' && (
          <div className="max-w-4xl space-y-8 animate-in fade-in">
             <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CreditCard size={24} /></div>
                <div>
                   <h2 className="text-xl font-black text-slate-900">Pasarela y Transferencias</h2>
                   <p className="text-xs text-slate-500 font-medium">Estos datos aparecerán en los recibos y módulos de pago de los usuarios.</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Banco</label>
                   <input type="text" value={settings.payment.bank_name} onChange={e => handleChange('payment', 'bank_name', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo de Cuenta</label>
                   <select value={settings.payment.account_type} onChange={e => handleChange('payment', 'account_type', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all">
                      <option value="AHORROS">Ahorros</option>
                      <option value="CORRIENTE">Corriente</option>
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Número de Cuenta</label>
                   <input type="text" value={settings.payment.account_number} onChange={e => handleChange('payment', 'account_number', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-mono" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Titular de la Cuenta</label>
                   <input type="text" value={settings.payment.account_holder} onChange={e => handleChange('payment', 'account_holder', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">NIT / Cédula Titular</label>
                   <input type="text" value={settings.payment.holder_id} onChange={e => handleChange('payment', 'holder_id', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Email Notificaciones Pagos</label>
                   <input type="email" value={settings.payment.email_notifications} onChange={e => handleChange('payment', 'email_notifications', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                </div>
                <div className="md:col-span-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Instrucciones Adicionales</label>
                   <textarea rows={3} value={settings.payment.instructions} onChange={e => handleChange('payment', 'instructions', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-600 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none" />
                </div>
             </div>
          </div>
        )}

        {/* SUPPORT SETTINGS */}
        {activeTab === 'SUPPORT' && (
          <div className="max-w-4xl space-y-8 animate-in fade-in">
             <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Phone size={24} /></div>
                <div>
                   <h2 className="text-xl font-black text-slate-900">Canales de Soporte</h2>
                   <p className="text-xs text-slate-500 font-medium">Información visible en el widget de ayuda y pie de página.</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">WhatsApp Soporte</label>
                   <input type="text" value={settings.support.whatsapp_number} onChange={e => handleChange('support', 'whatsapp_number', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Email Soporte</label>
                   <input type="email" value={settings.support.email_support} onChange={e => handleChange('support', 'email_support', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Horario de Atención</label>
                   <input type="text" value={settings.support.hours_operation} onChange={e => handleChange('support', 'hours_operation', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">URL Centro de Ayuda</label>
                   <input type="text" value={settings.support.help_center_url} onChange={e => handleChange('support', 'help_center_url', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
             </div>
          </div>
        )}

        {/* COMPANY SETTINGS */}
        {activeTab === 'COMPANY' && (
          <div className="max-w-4xl space-y-8 animate-in fade-in">
             <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Building2 size={24} /></div>
                <div>
                   <h2 className="text-xl font-black text-slate-900">Identidad Corporativa</h2>
                   <p className="text-xs text-slate-500 font-medium">Datos legales y de marca para facturación.</p>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre Comercial (Marca)</label>
                   <input type="text" value={settings.company.brand_name} onChange={e => handleChange('company', 'brand_name', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Razón Social</label>
                   <input type="text" value={settings.company.legal_name} onChange={e => handleChange('company', 'legal_name', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">NIT / Tax ID</label>
                   <input type="text" value={settings.company.nit} onChange={e => handleChange('company', 'nit', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Dirección Principal</label>
                   <input type="text" value={settings.company.address} onChange={e => handleChange('company', 'address', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ciudad</label>
                   <input type="text" value={settings.company.city} onChange={e => handleChange('company', 'city', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">País</label>
                   <input type="text" value={settings.company.country} onChange={e => handleChange('company', 'country', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
             </div>
          </div>
        )}

        {/* AUDIT LOG */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl"><History size={24} /></div>
                <div>
                   <h2 className="text-xl font-black text-slate-900">Registro de Cambios</h2>
                   <p className="text-xs text-slate-500 font-medium">Histórico de modificaciones en la configuración maestra.</p>
                </div>
             </div>

             <div className="border border-slate-100 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-50">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
                         <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {logs.map(log => (
                         <tr key={log.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-xs font-bold text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-900">{log.user}</td>
                            <td className="px-6 py-4">
                               <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-100">{log.action}</span>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600">{log.details}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MasterSettingsPage;
