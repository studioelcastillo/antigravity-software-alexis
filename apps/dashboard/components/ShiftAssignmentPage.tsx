import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, CalendarDays, Users, Target, Clock, Settings, Search, Filter, Plus, ChevronDown, CheckCircle2, AlertCircle, XCircle, ArrowRight, Save, Trash2, Edit2, TrendingUp, ChevronRight, DollarSign, Activity, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSunday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import ShiftService from '../ShiftService';

const ShiftAssignmentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'planner' | 'models' | 'dashboard' | 'attendance' | 'settings'>('planner');
  const [plannerSubTab, setPlannerSubTab] = useState<'monitors' | 'models' | 'sundays'>('monitors');

  // Date Range State (Synced with Dashboard)
  const [startDate, setStartDate] = useState(() => {
    return localStorage.getItem('dashboard_since') || format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    return localStorage.getItem('dashboard_until') || format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  });

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('dashboard_since', startDate);
    localStorage.setItem('dashboard_until', endDate);
  }, [startDate, endDate]);

  // Fetch real data
  const { data: staffData, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['activeStaff'],
    queryFn: ShiftService.getActiveStaff,
    staleTime: 1000 * 60 * 5,
  });

  const { data: fetchedShifts, isLoading: isLoadingShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => ShiftService.getShifts(),
    staleTime: 1000 * 60 * 60,
  });

  // State for interactive data
  const [shifts, setShifts] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [allActiveMonitors, setAllActiveMonitors] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  // Sync fetched data to state
  useEffect(() => {
    if (staffData) {
      setAllActiveMonitors(staffData.monitors);
      // Initialize with some monitors if empty, or keep existing
      if (monitors.length === 0 && staffData.monitors.length > 0) {
        setMonitors(staffData.monitors.slice(0, 3)); // Just show first 3 by default to not clutter
        setSelectedMonitorId(staffData.monitors[0].id);
      }
      if (models.length === 0) {
        setModels(staffData.models);
      }
    }
  }, [staffData]);

  useEffect(() => {
    if (fetchedShifts) {
      setShifts(fetchedShifts);
    }
  }, [fetchedShifts]);

  // Modals & Popovers
  const [showAddMonitorModal, setShowAddMonitorModal] = useState(false);
  const [editingCell, setEditingCell] = useState<{ monitorId: string, date: string } | null>(null);
  const [bulkSelection, setBulkSelection] = useState<{ monitorId: string, dates: string[] } | null>(null);
  const [editingShift, setEditingShift] = useState<any | null>(null);
  const [isCreatingShift, setIsCreatingShift] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    dailyMinutes: 480,
    tolerance: 0,
    penaltyAmount: 50000,
    doubleLate: true,
    doubleMissing: true,
    notAccumulative: true
  });

  // Derived Data
  const days = useMemo(() => {
    try {
      return eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    } catch (e) {
      return [];
    }
  }, [startDate, endDate]);

  const sundays = useMemo(() => days.filter(d => isSunday(d)), [days]);

  // KPI calculations for the Dashboard tab
  const totalMeta = useMemo(() => models.reduce((acc, m) => acc + (Number(m.target) || 0), 0), [models]);
  const totalSold = useMemo(() => models.reduce((acc, m) => acc + (Number(m.current_sales) || 0), 0), [models]);
  const pctAvance = useMemo(() => totalMeta > 0 ? ((totalSold / totalMeta) * 100).toFixed(1) : '0.0', [totalMeta, totalSold]);

  // Handlers
  const handleAttendanceAction = (id: string, action: 'pay' | 'waive') => {
    setAttendanceRecords(prev => prev.map(record => {
      if (record.id !== id) return record;
      if (action === 'pay') {
        return { ...record, paid: true, penaltyApplied: false };
      }
      if (action === 'waive') {
        return { ...record, penaltyApplied: false };
      }
      return record;
    }));
  };

  const handleAddMonitor = (monitorId: string) => {
    if (monitors.find(m => m.id === monitorId)) return;
    const monitorData = allActiveMonitors.find(m => m.id === monitorId);
    if (monitorData) {
      setMonitors([...monitors, { ...monitorData, currentShift: 's1', modelsCount: 0, targetSum: 0, schedule: {} }]);
    }
    setShowAddMonitorModal(false);
  };

  const handleUpdateShift = (monitorId: string, date: string, shiftId: string | null) => {
    setMonitors(prev => prev.map(m => {
      if (m.id !== monitorId) return m;
      return {
        ...m,
        schedule: {
          ...m.schedule,
          [date]: shiftId
        }
      };
    }));
    setEditingCell(null);
  };

  const handleBulkUpdateShift = (monitorId: string, shiftId: string | null) => {
    if (!bulkSelection) return;

    setMonitors(prev => prev.map(m => {
      if (m.id !== monitorId) return m;
      const newSchedule = { ...m.schedule };
      bulkSelection.dates.forEach(dateStr => {
        newSchedule[dateStr] = shiftId;
      });
      return {
        ...m,
        schedule: newSchedule,
        currentShift: shiftId || m.currentShift
      };
    }));
    setBulkSelection(null);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;

    if (isCreatingShift) {
      const newShift = {
        ...editingShift,
        id: `s${shifts.length + 1}`,
        duration: 480, // Default or calculated
        type: editingShift.name.toLowerCase(),
        active: true
      };
      setShifts([...shifts, newShift]);
    } else {
      setShifts(prev => prev.map(s => s.id === editingShift.id ? editingShift : s));
    }

    setEditingShift(null);
    setIsCreatingShift(false);
  };

  const toggleBulkDate = (monitorId: string, dateStr: string) => {
    setBulkSelection(prev => {
      if (prev?.monitorId !== monitorId) {
        return { monitorId, dates: [dateStr] };
      }

      const isSelected = prev.dates.includes(dateStr);
      if (isSelected) {
        const newDates = prev.dates.filter(d => d !== dateStr);
        if (newDates.length === 0) return null;
        return { ...prev, dates: newDates };
      } else {
        return { ...prev, dates: [...prev.dates, dateStr] };
      }
    });
  };

  const toggleSelectAll = (monitorId: string) => {
    const allDates = days.map(d => format(d, 'yyyy-MM-dd'));

    setBulkSelection(prev => {
      if (prev?.monitorId === monitorId && prev.dates.length === allDates.length) {
        return null; // Deselect all if already all selected
      }
      return { monitorId, dates: allDates };
    });
  };

  const getShiftForMonitorDay = (monitor: any, dateStr: string, isSun: boolean) => {
    if (monitor.schedule && monitor.schedule[dateStr] !== undefined) {
      return monitor.schedule[dateStr]; // Can be null (descanso) or shiftId
    }
    // Default behavior if not explicitly set
    return isSun ? null : monitor.currentShift;
  };

  const selectedMonitor = monitors.find(m => m.id === selectedMonitorId);

  if (isLoadingStaff || isLoadingShifts) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium">Cargando datos del planificador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-indigo-600" size={28} />
            Asignación de Modelos y Turnos
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestiona turnos, metas, asistencia y penalizaciones de tu equipo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
            <Save size={16} />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-white px-6 border-b border-slate-200">
        <div className="flex space-x-6 overflow-x-auto custom-scrollbar">
          {[
            { id: 'planner', label: 'Planificador', icon: Calendar },
            { id: 'models', label: 'Modelos por Monitor', icon: Users },
            { id: 'dashboard', label: 'Metas y Progreso', icon: Target },
            { id: 'attendance', label: 'Asistencia y Penalizaciones', icon: Clock },
            { id: 'settings', label: 'Configuración', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 border-b-2 font-bold text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

        {/* TAB: PLANIFICADOR */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            {/* Sub-tabs for Planner */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              {[
                { id: 'monitors', label: 'Monitores por Turno' },
                { id: 'models', label: 'Modelos a Monitores' },
                { id: 'sundays', label: 'Domingos y Descansos' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setPlannerSubTab(sub.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    plannerSubTab === sub.id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-lg font-black text-slate-800">
                  {plannerSubTab === 'monitors' && 'Asignación de Turnos a Monitores'}
                  {plannerSubTab === 'models' && 'Asignación de Modelos a Monitores'}
                  {plannerSubTab === 'sundays' && 'Gestión de Domingos y Descansos'}
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Date Range Picker */}
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                    />
                    <span className="text-slate-400 font-bold">hasta</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                    />
                  </div>

                  {(plannerSubTab === 'monitors' || plannerSubTab === 'sundays') && (
                    <button
                      onClick={() => setShowAddMonitorModal(true)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <Plus size={16} /> Agregar Monitor
                    </button>
                  )}
                </div>
              </div>

              {/* Planner Grid UI */}
              {plannerSubTab === 'monitors' && (
                <div className="overflow-x-auto pb-32 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr>
                        <th className="p-3 border-b border-slate-200 bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-widest min-w-[200px] sticky left-0 z-10">Monitor</th>
                        {days.map(day => (
                          <th key={day.toISOString()} className="p-3 border-b border-slate-200 bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-widest text-center min-w-[100px]">
                            {format(day, 'EEE dd', { locale: es })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monitors.map(monitor => (
                        <tr key={monitor.id} className={`transition-colors ${bulkSelection?.monitorId === monitor.id ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
                          <td className={`p-3 font-bold text-slate-800 border-r border-slate-100 sticky left-0 z-10 transition-colors ${bulkSelection?.monitorId === monitor.id ? 'bg-indigo-50' : 'bg-white'}`}>
                            <div className="flex justify-between items-center">
                              <div>
                                {monitor.name}
                                <div className="text-[10px] text-slate-400 font-medium">Patrón: {shifts.find(s => s.id === monitor.currentShift)?.name || 'Ninguno'}</div>
                              </div>
                              <div className="relative">
                                <button
                                  onClick={() => toggleSelectAll(monitor.id)}
                                  className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                                    bulkSelection?.monitorId === monitor.id && bulkSelection.dates.length === days.length
                                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                                      : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200'
                                  }`}
                                >
                                  {bulkSelection?.monitorId === monitor.id && bulkSelection.dates.length === days.length ? 'Deseleccionar' : 'Seleccionar todo'}
                                </button>

                                {bulkSelection?.monitorId === monitor.id && (
                                  <div className="absolute top-0 left-full ml-4 w-64 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-200 p-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="text-xs font-black text-slate-900 mb-3 border-b border-slate-100 pb-2 flex justify-between items-center uppercase tracking-widest">
                                      <span>Asignar a {bulkSelection.dates.length} días</span>
                                      <button onClick={() => setBulkSelection(null)} className="text-slate-400 hover:text-rose-500 transition-colors"><XCircle size={18}/></button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {[...shifts].sort((a, b) => {
                                        const order = ['MAÑANA', 'TARDE', 'NOCHE', '4 HORAS', '12 HORAS', 'SATÉLITE'];
                                        const indexA = order.indexOf(a.name.toUpperCase());
                                        const indexB = order.indexOf(b.name.toUpperCase());
                                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                        if (indexA !== -1) return -1;
                                        if (indexB !== -1) return 1;
                                        return a.name.localeCompare(b.name);
                                      }).map(s => (
                                        <button
                                          key={s.id}
                                          onClick={() => handleBulkUpdateShift(monitor.id, s.id)}
                                          className="w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-600 hover:text-white rounded-xl transition-all flex items-center justify-between group"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 group-hover:bg-white transition-colors"></div>
                                            {s.name}
                                          </div>
                                          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                      ))}
                                      <div className="pt-2 mt-2 border-t border-slate-100">
                                        <button
                                          onClick={() => handleBulkUpdateShift(monitor.id, null)}
                                          className="w-full text-left px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2"
                                        >
                                          <div className="w-2 h-2 rounded-full bg-rose-300"></div>
                                          Descanso (Limpiar)
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          {days.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isSun = isSunday(day);
                            const assignedShiftId = getShiftForMonitorDay(monitor, dateStr, isSun);
                            const shift = assignedShiftId ? shifts.find(s => s.id === assignedShiftId) : null;
                            const isEditing = editingCell?.monitorId === monitor.id && editingCell?.date === dateStr;
                            const isSelected = bulkSelection?.monitorId === monitor.id && bulkSelection.dates.includes(dateStr);

                            return (
                              <td key={dateStr} className={`p-2 border-r border-slate-100 text-center relative group transition-all duration-300 ${isSelected ? 'bg-indigo-50/80 scale-[0.98]' : ''}`}>
                                {isEditing ? (
                                  <div className="absolute top-0 left-0 w-full z-20 bg-white shadow-xl rounded-lg border border-slate-200 p-2 min-w-[150px]">
                                    <div className="text-xs font-bold text-slate-500 mb-2 border-b pb-1 flex justify-between items-center">
                                      {format(day, 'dd MMM', { locale: es })}
                                      <button onClick={() => setEditingCell(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={14}/></button>
                                    </div>
                                    <div className="space-y-1">
                                      {shifts.map(s => (
                                        <button
                                          key={s.id}
                                          onClick={() => handleUpdateShift(monitor.id, dateStr, s.id)}
                                          className="w-full text-left px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors"
                                        >
                                          {s.name}
                                        </button>
                                      ))}
                                      <button
                                        onClick={() => handleUpdateShift(monitor.id, dateStr, null)}
                                        className="w-full text-left px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-md transition-colors border-t border-slate-100 mt-1"
                                      >
                                        Descanso
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => {
                                      if (bulkSelection?.monitorId === monitor.id) {
                                        toggleBulkDate(monitor.id, dateStr);
                                      } else {
                                        setEditingCell({ monitorId: monitor.id, date: dateStr });
                                      }
                                    }}
                                    className={`text-xs font-bold py-2 px-1 rounded-lg border cursor-pointer transition-all duration-300 transform ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-105 z-10'
                                        : shift
                                          ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                                          : 'bg-slate-50 text-slate-400 border-slate-200 border-dashed hover:bg-slate-100'
                                    }`}
                                  >
                                    {isSelected ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <CheckCircle2 size={10} />
                                        <span>{shift ? shift.name : 'Descanso'}</span>
                                      </div>
                                    ) : (
                                      shift ? shift.name : 'Descanso'
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {plannerSubTab === 'models' && (
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                        <th className="p-4">Modelo</th>
                        <th className="p-4">Monitor Asignado (Rango Seleccionado)</th>
                        <th className="p-4 text-center">Estado</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {models.map(model => (
                        <tr key={model.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{model.name}</td>
                          <td className="p-4">
                            <select
                              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 font-medium"
                              value={model.monitorId || ''}
                              onChange={(e) => {
                                const newMonitorId = e.target.value || null;
                                setModels(models.map(m => m.id === model.id ? {...m, monitorId: newMonitorId} : m));
                              }}
                            >
                              <option value="">Sin Asignar</option>
                              {allActiveMonitors.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded border border-emerald-200">ACTIVO</span>
                          </td>
                          <td className="p-4 text-right">
                            <button className="text-slate-400 hover:text-indigo-600 font-medium text-sm">Ver Historial</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {plannerSubTab === 'sundays' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="text-amber-500 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-amber-800">Gestión de Domingos</h4>
                      <p className="text-sm text-amber-700 mt-1">Define qué monitores trabajan los domingos en el rango seleccionado ({format(parseISO(startDate), 'dd MMM', { locale: es })} - {format(parseISO(endDate), 'dd MMM', { locale: es })}).</p>
                    </div>
                  </div>

                  {sundays.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-medium border-2 border-dashed border-slate-200 rounded-xl">
                      No hay domingos en el rango de fechas seleccionado.
                    </div>
                  ) : (
                    <div className="overflow-x-auto pb-32">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr>
                            <th className="p-3 border-b border-slate-200 bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-widest min-w-[200px]">Monitor</th>
                            {sundays.map(sun => (
                              <th key={sun.toISOString()} className="p-3 border-b border-slate-200 bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-widest text-center">
                                {format(sun, 'EEEE dd MMM', { locale: es })}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monitors.map(monitor => (
                            <tr key={monitor.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-bold text-slate-800 border-r border-slate-100">
                                {monitor.name}
                              </td>
                              {sundays.map(sun => {
                                const dateStr = format(sun, 'yyyy-MM-dd');
                                const assignedShiftId = getShiftForMonitorDay(monitor, dateStr, true);

                                return (
                                  <td key={dateStr} className="p-3 border-r border-slate-100">
                                    <select
                                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-bold"
                                      value={assignedShiftId || 'rest'}
                                      onChange={(e) => handleUpdateShift(monitor.id, dateStr, e.target.value === 'rest' ? null : e.target.value)}
                                    >
                                      <option value="rest">Descanso</option>
                                      {shifts.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.startTime})</option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: MODELOS POR MONITOR */}
        {activeTab === 'models' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Monitor List (Left Sidebar) */}
              <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-250px)]">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <Users size={18} className="text-indigo-500" /> Monitores
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {monitors.map(monitor => (
                    <button
                      key={monitor.id}
                      onClick={() => setSelectedMonitorId(monitor.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex justify-between items-center group ${
                        selectedMonitorId === monitor.id
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-1'
                          : 'hover:bg-slate-50 border border-transparent text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{monitor.name}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${selectedMonitorId === monitor.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {models.filter(m => m.monitorId === monitor.id).length} principales • {models.filter(m => m.secondaryMonitorId === monitor.id).length} secundarios
                        </p>
                      </div>
                      <ChevronRight size={16} className={`${selectedMonitorId === monitor.id ? 'text-white' : 'text-slate-300 group-hover:text-indigo-500'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Models Assignment (Main Area) */}
              <div className="lg:col-span-9 space-y-6">
                {selectedMonitor ? (
                  <>
                    {/* Header for Selected Monitor */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de {selectedMonitor.name}</h2>
                        <p className="text-slate-500 font-medium text-sm mt-1">Asigna modelos principales y secundarios, y define sus metas semanales.</p>
                      </div>
                      <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                        <Target size={20} className="text-indigo-600" />
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Meta del Equipo</p>
                          <p className="text-lg font-black text-indigo-700 leading-none mt-1">
                            ${models.filter(m => m.monitorId === selectedMonitor.id).reduce((acc, m) => acc + (Number(m.target) || 0), 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Models Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800">Modelos Asignadas</h3>
                        <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-md">
                          {models.filter(m => m.monitorId === selectedMonitor.id).length} Total
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              <th className="p-4">Modelo</th>
                              <th className="p-4">Meta Semanal ($)</th>
                              <th className="p-4">Monitor Secundario</th>
                              <th className="p-4 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {models.filter(m => m.monitorId === selectedMonitor.id).map(model => (
                              <tr key={model.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">
                                      {model.name.charAt(0)}
                                    </div>
                                    <span className="font-bold text-slate-800">{model.name}</span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="relative max-w-[120px]">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                    <input
                                      type="number"
                                      className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                      value={model.target}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setModels(models.map(m => m.id === model.id ? {...m, target: val} : m));
                                      }}
                                    />
                                  </div>
                                </td>
                                <td className="p-4">
                                  <select
                                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 font-bold"
                                    value={model.secondaryMonitorId || ''}
                                    onChange={(e) => {
                                      const val = e.target.value || null;
                                      setModels(models.map(m => m.id === model.id ? {...m, secondaryMonitorId: val} : m));
                                    }}
                                  >
                                    <option value="">Ninguno</option>
                                    {monitors.filter(mon => mon.id !== selectedMonitor.id).map(mon => (
                                      <option key={mon.id} value={mon.id}>{mon.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => setModels(models.map(m => m.id === model.id ? {...m, monitorId: null} : m))}
                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Quitar asignación"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Available Models to Assign */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800">Modelos Disponibles</h3>
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Buscar modelo..."
                            className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {models.filter(m => !m.monitorId && m.name.toLowerCase().includes(modelSearchQuery.toLowerCase())).length > 0 ? (
                            models.filter(m => !m.monitorId && m.name.toLowerCase().includes(modelSearchQuery.toLowerCase())).map(model => (
                              <div key={model.id} className="p-3 border border-slate-100 rounded-xl flex items-center justify-between hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs group-hover:bg-indigo-100 group-hover:text-indigo-600">
                                    {model.name.charAt(0)}
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">{model.name}</span>
                                </div>
                                <button
                                  onClick={() => setModels(models.map(m => m.id === model.id ? {...m, monitorId: selectedMonitor.id} : m))}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                                  title="Asignar a este monitor"
                                >
                                  <Plus size={18} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full py-8 text-center text-slate-400">
                              <p className="text-sm font-medium">No hay modelos disponibles para asignar.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center flex flex-col items-center justify-center h-full">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <Users size={40} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Gestión de Modelos</h3>
                    <p className="text-slate-500 font-medium mt-2 max-w-xs mx-auto">
                      Selecciona un monitor de la lista de la izquierda para comenzar a asignar modelos y definir sus metas.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: DASHBOARD DE METAS Y PROGRESO */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Target size={20} /></div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Meta Total (Semana)</h3>
                </div>
                <p className="text-3xl font-black text-slate-800">${totalMeta.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Vendido Actual</h3>
                </div>
                <p className="text-3xl font-black text-emerald-600">${totalSold.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Activity size={20} /></div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">% Avance</h3>
                </div>
                <p className="text-3xl font-black text-amber-500">{pctAvance}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-500" /> Progreso vs Meta (Semanal)
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[]} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                        formatter={(value: number) => [`$${value}`, '']}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                      <Line type="monotone" dataKey="meta" name="Meta Acumulada" stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                      <Line type="monotone" dataKey="real" name="Vendido Real" stroke="#10b981" strokeWidth={4} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-black text-slate-800 mb-6">Progreso por Monitor</h3>
                <div className="space-y-6">
                  {monitors.map(monitor => {
                    const assignedModels = models.filter(m => m.monitorId === monitor.id || m.secondaryMonitorId === monitor.id);
                    const current = assignedModels.reduce((acc, m) => acc + m.currentSales, 0);
                    const target = assignedModels.reduce((acc, m) => acc + (Number(m.target) || 0), 0);
                    const percent = Math.min(100, Math.round((current / target) * 100)) || 0;

                    return (
                      <div key={monitor.id}>
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <p className="font-bold text-slate-800">{monitor.name}</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {assignedModels.length} modelos ({models.filter(m => m.secondaryMonitorId === monitor.id).length} como secundario)
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-800">${current.toLocaleString()} <span className="text-slate-400 font-medium">/ ${target.toLocaleString()}</span></p>
                          </div>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ASISTENCIA Y PENALIZACIONES */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-black text-slate-800">Control Diario de Asistencia</h3>
                <div className="flex gap-2">
                  <input type="date" className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                  <button className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50">
                    <Filter size={16} /> Filtros
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-slate-200">
                      <th className="p-4">Modelo</th>
                      <th className="p-4">Turno</th>
                      <th className="p-4">Ingreso/Salida</th>
                      <th className="p-4 text-center">Min. Trabajados</th>
                      <th className="p-4 text-center">Tarde / Faltante</th>
                      <th className="p-4 text-center">Min. a Pagar (x2)</th>
                      <th className="p-4 text-center">Penalización Fija</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100">
                    {attendanceRecords.map((record) => {
                      const model = models.find(m => m.id === record.modelId);
                      const shift = shifts.find(s => s.id === record.shiftId);
                      return (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-900">{model?.name}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">{shift?.name}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-emerald-600 font-bold">{record.checkin}</span>
                              <span className="text-rose-600 font-bold">{record.checkout}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center font-black">{record.workedMinutes}</td>
                          <td className="p-4 text-center">
                            <div className="flex flex-col items-center">
                              {record.lateMinutes > 0 ? <span className="text-rose-500 font-bold">{record.lateMinutes}m tarde</span> : <span className="text-slate-400">-</span>}
                              {record.missingMinutes > 0 ? <span className="text-rose-500 font-bold">{record.missingMinutes}m falta</span> : null}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {record.minutesToPay > 0 ? (
                              <span className="inline-flex items-center justify-center px-2 py-1 bg-rose-100 text-rose-700 rounded-lg font-black">
                                {record.minutesToPay} min
                              </span>
                            ) : (
                              <span className="text-emerald-500"><CheckCircle2 size={18} className="mx-auto" /></span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {record.penaltyApplied ? (
                              <div className="flex flex-col items-center">
                                <span className="text-rose-600 font-black">${record.penaltyAmount.toLocaleString()}</span>
                                <span className="text-[10px] text-rose-400 font-bold uppercase">Aplicada</span>
                              </div>
                            ) : record.minutesToPay > 0 && record.paid ? (
                              <span className="text-[10px] text-emerald-500 font-bold uppercase bg-emerald-50 px-2 py-1 rounded-md">Tiempo Pagado</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {record.minutesToPay > 0 && !record.paid && (
                                <button
                                  onClick={() => handleAttendanceAction(record.id, 'pay')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Marcar tiempo pagado"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                              )}
                              {record.penaltyApplied && (
                                <button
                                  onClick={() => handleAttendanceAction(record.id, 'waive')}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Quitar penalización"
                                >
                                  <XCircle size={18} />
                                </button>
                              )}
                              <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver detalles">
                                <ArrowRight size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CONFIGURACIÓN */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-indigo-500" /> Turnos (Shift Templates)
              </h3>
              <div className="space-y-4">
                {shifts.map(shift => (
                  <div key={shift.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                    <div>
                      <p className="font-bold text-slate-800">{shift.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{shift.startTime} - {shift.endTime} ({shift.duration} min)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${shift.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {shift.active ? 'Activo' : 'Inactivo'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingShift(shift);
                          setIsCreatingShift(false);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setEditingShift({ name: '', startTime: '00:00', endTime: '00:00', active: true });
                    setIsCreatingShift(true);
                  }}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Crear Nuevo Turno
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-rose-500" /> Reglas de Jornada y Penalizaciones
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Minutos Diarios Requeridos</label>
                    <input
                      type="number"
                      value={settings.dailyMinutes}
                      onChange={(e) => setSettings({...settings, dailyMinutes: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tolerancia Tardanza (min)</label>
                    <input
                      type="number"
                      value={settings.tolerance}
                      onChange={(e) => setSettings({...settings, tolerance: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Penalización Fija (No paga tardanza)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        value={settings.penaltyAmount}
                        onChange={(e) => setSettings({...settings, penaltyAmount: parseInt(e.target.value)})}
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.doubleLate}
                      onChange={(e) => setSettings({...settings, doubleLate: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">Minutos tarde se pagan doble</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.doubleMissing}
                      onChange={(e) => setSettings({...settings, doubleMissing: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">Minutos faltantes se pagan doble</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notAccumulative}
                      onChange={(e) => setSettings({...settings, notAccumulative: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">No acumulable</span>
                      <span className="text-xs text-slate-500 font-medium">Cada día inicia en 0. Las horas extra no compensan otro día.</span>
                    </div>
                  </label>
                </div>

                <div className="pt-4 flex justify-end">
                  <button className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
                    <Save size={16} /> Guardar Configuración
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Shift Edit/Create Modal */}
      {editingShift && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800">{isCreatingShift ? 'Crear Nuevo Turno' : 'Editar Turno'}</h3>
              <button onClick={() => setEditingShift(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveShift} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Turno</label>
                <input
                  type="text"
                  required
                  value={editingShift.name}
                  onChange={(e) => setEditingShift({...editingShift, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej: Mañana, Tarde, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={editingShift.startTime}
                    onChange={(e) => setEditingShift({...editingShift, startTime: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hora Fin</label>
                  <input
                    type="time"
                    required
                    value={editingShift.endTime}
                    onChange={(e) => setEditingShift({...editingShift, endTime: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingShift.active}
                    onChange={(e) => setEditingShift({...editingShift, active: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-bold text-slate-700">Turno Activo</span>
                </label>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingShift(null)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  {isCreatingShift ? 'Crear Turno' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Monitor Modal */}
      {showAddMonitorModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800">Agregar Monitor al Planificador</h3>
              <button onClick={() => setShowAddMonitorModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {allActiveMonitors.filter(m => !monitors.find(mon => mon.id === m.id)).length > 0 ? (
                  allActiveMonitors.filter(m => !monitors.find(mon => mon.id === m.id)).map(monitor => (
                    <button
                      key={monitor.id}
                      onClick={() => handleAddMonitor(monitor.id)}
                      className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left"
                    >
                      <span className="font-bold text-slate-800">{monitor.name}</span>
                      <Plus size={16} className="text-indigo-600" />
                    </button>
                  ))
                ) : (
                  <p className="text-center text-slate-500 font-medium py-4">Todos los monitores activos ya están en el planificador.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ShiftAssignmentPage;
