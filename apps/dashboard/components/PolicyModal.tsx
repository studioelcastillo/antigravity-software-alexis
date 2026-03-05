
import React from 'react';
import { X, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Policy } from '../AuthService';

interface PolicyModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  policy: Policy | null;
}

const PolicyModal: React.FC<PolicyModalProps> = ({ open, onClose, onAccept, onReject, policy }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl text-slate-900 shadow-lg shadow-amber-500/20">
               <FileText size={20} />
            </div>
            <div>
               <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Política de Datos</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">El Castillo Group SAS</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {policy ? (
            <div className="text-slate-600 text-sm leading-relaxed space-y-4 font-medium whitespace-pre-line">
              {policy.pol_description}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
               <div className="w-12 h-12 border-4 border-slate-100 border-t-amber-500 rounded-full animate-spin mb-4" />
               <p className="text-xs font-bold uppercase tracking-widest">Cargando documento...</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => {
              onReject();
              onClose();
            }}
            className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-xs uppercase tracking-widest"
          >
            No acepto
          </button>
          <button 
            onClick={() => {
              onAccept();
              onClose();
            }}
            disabled={!policy}
            className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-amber-400 font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
          >
            <CheckCircle2 size={18} />
            ACEPTO LA POLÍTICA DE TRATAMIENTO
          </button>
        </div>
      </div>
    </div>
  );
};

export default PolicyModal;
